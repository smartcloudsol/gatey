import { WpSuitePluginBase } from "@smart-cloud/wpsuite-core";
import { Gatey } from "./index";

// gatey-core/src/runtime.ts
export type GateyReadyEvent = "wpsuite:gatey:ready";
export type GateyErrorEvent = "wpsuite:gatey:error";

export type GateyPlugin = WpSuitePluginBase & Gatey;

export function getGateyPlugin(): GateyPlugin {
  return globalThis.WpSuite?.plugins?.gatey as GateyPlugin;
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
