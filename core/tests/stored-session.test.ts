import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupUserOrAnonymous, resolveCachedAccount, verifyStoredSession } from "../src/stored-session.ts";

test("only an explicitly unauthenticated session permits cached-account logout", async () => {
  for (const name of ["TimeoutError", "BackendProfileChangedError", "NotAuthorizedException", "TypeError"]) {
    const error = Object.assign(new Error(name), { name });
    let account = "saved";
    let logoutCalls = 0;
    await assert.rejects(async () => {
      if (!await verifyStoredSession(async () => { throw error; })) { account = ""; logoutCalls++; }
    }, error);
    assert.equal(account, "saved");
    assert.equal(logoutCalls, 0);
  }
  const unauthenticated = Object.assign(new Error("signed out"), { name: "UserUnAuthenticatedException" });
  let account = "saved";
  let logoutCalls = 0;
  if (!await verifyStoredSession(async () => { throw unauthenticated; })) { account = ""; logoutCalls++; }
  assert.equal(account, "");
  assert.equal(logoutCalls, 1);
});

test("absent tokens are anonymous; valid tokens pass and inconclusive results fail closed", async () => {
  assert.equal(await verifyStoredSession(async () => ({ tokens: { accessToken: { payload: { exp: Date.now() / 1000 + 60 } } } })), true);
  assert.equal(await verifyStoredSession(async () => ({})), false);
  await assert.rejects(verifyStoredSession(async () => ({ tokens: {} })), /could not be verified/);
  await assert.rejects(verifyStoredSession(async () => ({ tokens: { accessToken: { payload: { exp: 1 } } } })), /could not be verified/);
});

test("stale display account is removed before anonymous startup, while errors preserve it", async () => {
  const cached = { username: "saved" };
  let stored: typeof cached | object = cached;
  let clears = 0;
  const clear = () => { stored = {}; clears++; };
  const account = await resolveCachedAccount(cached, () => verifyStoredSession(async () => ({})), clear);
  assert.deepEqual(account, {});
  assert.deepEqual(stored, {});
  assert.equal(clears, 1);

  stored = cached;
  assert.equal(await resolveCachedAccount(cached, () => verifyStoredSession(async () => ({ tokens: { accessToken: { payload: { exp: Date.now() / 1000 + 60 } } } })), clear), cached);
  for (const error of [Object.assign(new Error("offline"), { name: "TimeoutError" }), Object.assign(new Error("credentials"), { name: "NotAuthorizedException" }), new Error("profile changed")]) {
    await assert.rejects(resolveCachedAccount(cached, async () => { throw error; }, clear), error);
  }
  await assert.rejects(resolveCachedAccount(cached, () => verifyStoredSession(async () => ({ tokens: {} })), clear));
  await assert.rejects(resolveCachedAccount(cached, () => verifyStoredSession(async () => ({ tokens: { accessToken: { payload: { exp: 1 } } } })), clear));
  assert.equal(stored, cached);
  assert.equal(clears, 1);
});

test("initial user lookup preserves session on verification failures and cleans up explicit unauthentication", async () => {
  let cleanups = 0;
  const cleanup = async () => { cleanups++; };
  for (const name of ["TimeoutError", "BackendProfileChangedError", "NotAuthorizedException", "TypeError"]) {
    const error = Object.assign(new Error(name), { name });
    await assert.rejects(lookupUserOrAnonymous(async () => { throw error; }, cleanup, {}), error);
    assert.equal(cleanups, 0);
  }
  const error = Object.assign(new Error("signed out"), { name: "UserUnAuthenticatedException" });
  assert.deepEqual(await lookupUserOrAnonymous(async () => { throw error; }, cleanup, {}), {});
  assert.equal(cleanups, 1);
  assert.deepEqual(await lookupUserOrAnonymous(async () => ({}), cleanup, {}), {});
  assert.equal(cleanups, 1);
  assert.deepEqual(await lookupUserOrAnonymous(async () => ({ username: "user" }), cleanup, {}), { username: "user" });
});
