import { Amplify } from "aws-amplify";
import { assertBackendProfileCurrent, getBackendProfileContext } from "@smart-cloud/wpsuite-core";
import type { AuthenticatorServices, WebAuthnMfaCapability } from "@smart-cloud/aws-amplify-ui";
import { authenticatorBindingKey, createBoundCapabilityService } from "./web-authn-mfa-binding";

interface CapabilityVendor {
  getWebAuthnMfaCapability(guard: () => boolean): Promise<WebAuthnMfaCapability>;
}

const configuration = () => Amplify.getConfig().Auth?.Cognito;

/** Stable public metadata key; the UI remounts its actors when identity changes. */
export function getGateyAuthenticatorBindingKey(): string {
  try { return authenticatorBindingKey(configuration(), getBackendProfileContext()); }
  catch { return "gatey-authenticator-unavailable"; }
}

/** The published Core remains usable without the WordPress global (unknown capability). */
export function createGateyWebAuthnMfaServices(
  isMounted: () => boolean = () => true,
): Pick<AuthenticatorServices, "handleGetWebAuthnMfaCapability"> {
  let profile: ReturnType<typeof getBackendProfileContext>;
  try { profile = getBackendProfileContext(); }
  catch { return { handleGetWebAuthnMfaCapability: async () => "unknown" }; }
  return createBoundCapabilityService({
    readConfiguration: configuration,
    readProfile: getBackendProfileContext,
    assertCurrent: () => assertBackendProfileCurrent(profile),
    readCapability: async guard => {
      const vendor = (globalThis as typeof globalThis & {
        WpSuiteAmplify?: Partial<CapabilityVendor>;
      }).WpSuiteAmplify;
      return typeof vendor?.getWebAuthnMfaCapability === "function"
        ? vendor.getWebAuthnMfaCapability(guard) : "unknown";
    },
  }, isMounted);
}
