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
 * same current-site behavior while preserving explicitly configured absolute
 * URLs. Query-string `redirect_to` return URLs use
 * `resolveGateyRedirectTarget()` instead.
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

/**
 * Resolve an explicit return URL supplied by a `redirect_to` query parameter.
 *
 * This has deliberately different semantics from a saved Gatey page setting:
 * `/sign-in` in settings is portable and site-relative, whereas a return URL
 * such as `/saas-launch/profile` already names an origin-relative request.
 * Do not rebase the latter on the current Multisite blog path.
 *
 * Absolute return URLs are accepted only when they remain on the current
 * browser origin. This prevents an untrusted query parameter becoming an open
 * redirect after a successful sign-in. Bare legacy values keep the normal
 * site-relative resolution behaviour.
 */
export function resolveGateyRedirectTarget(
  target: string | null | undefined,
): string | undefined {
  const value = target?.trim();
  if (!value) {
    return undefined;
  }

  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(value);
  const isOriginRelative = value.startsWith("/");

  if (!isAbsolute && !isOriginRelative) {
    return resolveGateyTarget(value);
  }

  try {
    const currentUrl = new URL(window.location.href);
    const returnUrl = new URL(value, currentUrl.origin);

    return returnUrl.origin === currentUrl.origin
      ? returnUrl.toString()
      : undefined;
  } catch {
    return undefined;
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
