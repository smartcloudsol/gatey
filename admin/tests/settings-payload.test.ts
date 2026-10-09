import assert from "node:assert/strict";
import test from "node:test";
import type { Settings } from "@smart-cloud/gatey-core";
import { serializeGateySettings } from "../src/settings-payload.ts";

test("settings saves discard stale regions for both pools while preserving configured access", () => {
  const pool = (id: string) => ({
    Auth: { Cognito: { userPoolId: id, userPoolClientId: "client", identityPoolId: "eu-west-1:identity", loginWith: { oauth: { domain: "login.example.com" } } } },
    API: { GraphQL: { region: "us-east-1", endpoint: "https://api.example.com", defaultAuthMode: "userPool" } },
  });
  const settings = {
    userPoolConfigurations: { default: pool("eu-west-2_Default"), secondary: pool("ap-southeast-2_Secondary"), domains: ["example.com"] },
    integrateWpLogin: true,
    mappings: [{ cognitoGroup: "editors", wordpressRole: "editor" }],
    signInPage: "/signin",
  };
  const before = structuredClone(settings);
  const result = JSON.parse(serializeGateySettings(settings as unknown as Settings));
  for (const name of ["default", "secondary"] as const) {
    assert.equal(Object.hasOwn(result.userPoolConfigurations[name].API.GraphQL, "region"), false);
    result.userPoolConfigurations[name].API.GraphQL.region = "us-east-1";
  }
  assert.deepEqual(result, settings, "Only the server-owned region is omitted.");
  assert.deepEqual(settings, before, "Serializing does not mutate a form or another save request.");
});

test("unconfigured pools do not gain invented API settings", () => {
  for (const settings of [{}, { userPoolConfigurations: {} }, { userPoolConfigurations: { default: { Auth: { Cognito: { userPoolId: "eu-west-1_New" } } } } }]) {
    assert.deepEqual(JSON.parse(serializeGateySettings(settings as Settings)), settings);
  }
});
