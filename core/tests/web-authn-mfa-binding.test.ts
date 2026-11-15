import assert from "node:assert/strict";
import { test } from "node:test";
import { authenticatorBindingKey, createBoundCapabilityService } from "../src/web-authn-mfa-binding.ts";

const configuration = () => ({ userPoolId: "eu-central-1_fixture", userPoolClientId: "client", identityPoolId: "eu-central-1:identity" });
const profile = () => ({ id: "development", generation: 1, bindingRevision: 2, identity: { userPoolId: "eu-central-1_fixture", awsRegion: "eu-central-1" } });

test("binding maps are unordered, values and list order retain strict meaning", () => {
  const left = profile();
  const right = { identity: { awsRegion: "eu-central-1", userPoolId: "eu-central-1_fixture" }, bindingRevision: 2, generation: 1, id: "development" };
  const key = authenticatorBindingKey(configuration(), left);
  assert.equal(key, authenticatorBindingKey({ identityPoolId: "eu-central-1:identity", userPoolClientId: "client", userPoolId: "eu-central-1_fixture" }, right));
  assert.equal(key, authenticatorBindingKey(configuration(), JSON.parse(JSON.stringify(right))));
  for (const changed of [{ ...right, generation: "1" }, { ...right, generation: 3 }, { ...right, identity: { awsRegion: "eu-central-1" } }]) {
    assert.notEqual(key, authenticatorBindingKey(configuration(), changed));
  }
  assert.notEqual(authenticatorBindingKey(configuration(), { list: [1, 2] }), authenticatorBindingKey(configuration(), { list: [2, 1] }));
  assert.equal(key.includes("credentials"), false);
});

test("read is guarded before and after asynchronous vendor resolution", async () => {
  let selected = profile();
  let resolve!: (value: "supported") => void;
  const service = createBoundCapabilityService({ readConfiguration: configuration, readProfile: () => selected, assertCurrent() {}, readCapability: () => new Promise(done => { resolve = done; }) });
  const pending = service.handleGetWebAuthnMfaCapability();
  selected = { ...selected, bindingRevision: 3 };
  resolve("supported");
  assert.equal(await pending, "unknown");
});

test("closed view, stale profile and failed/malformed readers cannot grant capability", async () => {
  let reads = 0;
  const source = { readConfiguration: configuration, readProfile: profile, assertCurrent() {}, async readCapability() { reads++; return "supported" as const; } };
  assert.equal(await createBoundCapabilityService(source, () => false).handleGetWebAuthnMfaCapability(), "unknown");
  assert.equal(reads, 0);
  assert.equal(await createBoundCapabilityService({ ...source, assertCurrent() { throw new Error("stale"); } }).handleGetWebAuthnMfaCapability(), "unknown");
  assert.equal(await createBoundCapabilityService({ ...source, async readCapability() { throw new Error("denied"); } }).handleGetWebAuthnMfaCapability(), "unknown");
  assert.equal(await createBoundCapabilityService(source).handleGetWebAuthnMfaCapability(), "supported");
});

test("vendor guard rejects actual pool/client/endpoint changes during the read", async () => {
  let config: Record<string, unknown> = configuration();
  const service = createBoundCapabilityService({ readConfiguration: () => config, readProfile: profile, assertCurrent() {}, async readCapability(guard) {
    assert.equal(guard(), true);
    config = { ...config, userPoolEndpoint: "https://different.example" };
    assert.equal(guard(), false);
    return "supported";
  } });
  assert.equal(await service.handleGetWebAuthnMfaCapability(), "unknown");
});
