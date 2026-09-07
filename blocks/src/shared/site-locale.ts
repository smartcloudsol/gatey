import { useMemo, useSyncExternalStore } from "react";
import { getSiteLocaleRuntime } from "@smart-cloud/wpsuite-core";
export function useSiteLocale() {
  const runtime = useMemo(() => getSiteLocaleRuntime(), []);
  return useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
}
