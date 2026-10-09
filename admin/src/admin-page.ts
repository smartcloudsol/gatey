export const GATEY_ADMIN_PAGES = [
  "general", "user-pools", "wordpress-login", "api-settings",
  "custom-fields", "custom-providers",
] as const;

export type GateyAdminPage = typeof GATEY_ADMIN_PAGES[number];

export function resolveGateyAdminPage(search: string): GateyAdminPage {
  const requested = new URLSearchParams(search).get("section");
  return GATEY_ADMIN_PAGES.find(page => page === requested) ?? "general";
}

/** Local sections stay available without a Pro connection; loading is not denial. */
export function guardGateyAdminPage(page: GateyAdminPage, ready: boolean, proAvailable: boolean): GateyAdminPage {
  return ready && !proAvailable && ["api-settings", "custom-fields", "custom-providers"].includes(page)
    ? "general" : page;
}
