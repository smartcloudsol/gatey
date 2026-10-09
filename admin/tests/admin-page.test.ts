import assert from "node:assert/strict";
import test from "node:test";
import { GATEY_ADMIN_PAGES, guardGateyAdminPage, resolveGateyAdminPage } from "../src/admin-page.ts";

test("deep links select each actual Gatey section and unknown input falls back", () => {
  for (const page of GATEY_ADMIN_PAGES) assert.equal(resolveGateyAdminPage(`?page=gatey&section=${page}`), page);
  for (const search of ["", "?section=unknown", "?section[]=user-pools", "?section=../delete"]) assert.equal(resolveGateyAdminPage(search), "general");
});

test("configuration hydration preserves a target and local pages survive disconnected setup", () => {
  assert.equal(guardGateyAdminPage("api-settings", false, false), "api-settings");
  assert.equal(guardGateyAdminPage("api-settings", true, true), "api-settings");
  assert.equal(guardGateyAdminPage("api-settings", true, false), "general");
  for (const page of ["user-pools", "wordpress-login"] as const) assert.equal(guardGateyAdminPage(page, true, false), page);
});
