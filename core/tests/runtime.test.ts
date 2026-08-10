import assert from "node:assert/strict";
import test from "node:test";

import { resolveGateyTarget } from "../src/runtime.ts";

const globalWithGatey = globalThis as typeof globalThis & {
  WpSuite?: { plugins?: { gatey?: { siteUrl?: string } } };
  window: Window;
};

test("resolves portable page settings inside a subdirectory Multisite site", () => {
  globalWithGatey.WpSuite = {
    plugins: {
      gatey: { siteUrl: "https://preview.wpsuite.io/saas-launch/" },
    },
  };
  globalWithGatey.window = {
    location: { href: "https://preview.wpsuite.io/saas-launch/sign-in/" },
  } as Window;

  assert.equal(
    resolveGateyTarget("/"),
    "https://preview.wpsuite.io/saas-launch/",
  );
  assert.equal(
    resolveGateyTarget("/sign-in"),
    "https://preview.wpsuite.io/saas-launch/sign-in",
  );
});

test("preserves an explicit WordPress redirect target", () => {
  assert.equal(
    resolveGateyTarget(
      "https://preview.wpsuite.io/saas-launch/wp-admin/?reauth=1",
    ),
    "https://preview.wpsuite.io/saas-launch/wp-admin/?reauth=1",
  );
});
