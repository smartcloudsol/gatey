import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveGateyRedirectTarget,
  resolveGateyTarget,
} from "../src/runtime.ts";

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

test("resolves explicit same-origin redirect targets without duplicating a Multisite path", () => {
  globalWithGatey.WpSuite = {
    plugins: {
      gatey: { siteUrl: "https://preview.wpsuite.io/saas-launch/" },
    },
  };
  globalWithGatey.window = {
    location: { href: "https://preview.wpsuite.io/saas-launch/sign-in/" },
  } as Window;

  assert.equal(
    resolveGateyRedirectTarget("/saas-launch/profile?from=signin#security"),
    "https://preview.wpsuite.io/saas-launch/profile?from=signin#security",
  );
  assert.equal(
    resolveGateyRedirectTarget(
      "https://preview.wpsuite.io/knowledge-hub/getting-started/",
    ),
    "https://preview.wpsuite.io/knowledge-hub/getting-started/",
  );
  assert.equal(
    resolveGateyRedirectTarget("profile"),
    "https://preview.wpsuite.io/saas-launch/profile",
  );
});

test("rejects cross-origin redirect targets", () => {
  assert.equal(
    resolveGateyRedirectTarget("https://untrusted.example/redirect"),
    undefined,
  );
  assert.equal(resolveGateyRedirectTarget("//untrusted.example/"), undefined);
});
