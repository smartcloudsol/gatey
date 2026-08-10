import type { WpSuitePluginBase } from "@smart-cloud/wpsuite-core";
import type { Gatey, GateySiteRuntime } from "./index";

// gatey-core/src/runtime.ts
export type GateyReadyEvent = "wpsuite:gatey:ready";
export type GateyErrorEvent = "wpsuite:gatey:error";

export type GateyPlugin = WpSuitePluginBase & Gatey & GateySiteRuntime;

export function getGateyPlugin(): GateyPlugin {
  return globalThis.WpSuite?.plugins?.gatey as GateyPlugin;
}

/**
 * Resolve a page selected in Gatey's WordPress settings to its site's URL.
 *
 * Settings deliberately store a portable page path such as `/sign-in`, but
 * browser navigation interprets that path from the domain root. On a
 * subdirectory Multisite that would escape `/saas-launch/`. PHP's `site_url()`
 * already uses the current blog; this helper gives the browser runtime the
 * same current-site behavior while preserving explicit absolute URLs (for
 * example the WordPress `redirect_to` return URL).
 */
export function resolveGateyTarget(
  target: string | null | undefined,
): string | undefined {
  const value = target?.trim();
  if (!value) {
    return undefined;
  }

  try {
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
      return new URL(value).toString();
    }

    const siteUrl = getGateyPlugin()?.siteUrl?.trim();
    const base = siteUrl || window.location.href;
    // A leading slash is a site-relative path in Gatey's page picker, not an
    // origin-relative one. Keep relative query/hash targets untouched.
    const relative = value.startsWith("/") ? value.replace(/^\/+/, "") : value;

    return new URL(relative, base).toString();
  } catch {
    // Let the caller retain its previous navigation behavior if a host
    // supplied a malformed legacy setting.
    return value;
  }
}

export async function waitForGateyReady(timeoutMs = 8000): Promise<void> {
  const plugin = getGateyPlugin();
  if (plugin?.status === "available") return;
  if (plugin?.status === "error") throw new Error("Gatey failed");

  await new Promise<void>((resolve, reject) => {
    const onReady = () => cleanup(resolve);
    const onError = () => cleanup(() => reject(new Error("Gatey failed")));
    const cleanup = (fn: () => void) => {
      window.removeEventListener("wpsuite:gatey:ready", onReady);
      window.removeEventListener("wpsuite:gatey:error", onError);
      if (t) clearTimeout(t);
      fn();
    };

    window.addEventListener("wpsuite:gatey:ready", onReady, { once: true });
    window.addEventListener("wpsuite:gatey:error", onError, { once: true });

    const t = timeoutMs
      ? window.setTimeout(
          () => cleanup(() => reject(new Error("Gatey timeout"))),
          timeoutMs
        )
      : 0;
  });
}

export async function getStore(timeoutMs = 10000) {
  await waitForGateyReady(timeoutMs);

  const plugin = getGateyPlugin();
  const storePromise = plugin?.cognito?.store;

  if (!storePromise) throw new Error("Gatey store is not available");
  return storePromise; // Promise<Store>
}
