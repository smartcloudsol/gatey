import type { AuthenticatorServices } from "@smart-cloud/aws-amplify-ui";
/** Stable public metadata key; the UI remounts its actors when identity changes. */
export declare function getGateyAuthenticatorBindingKey(): string;
/** The published Core remains usable without the WordPress global (unknown capability). */
export declare function createGateyWebAuthnMfaServices(isMounted?: () => boolean): Pick<AuthenticatorServices, "handleGetWebAuthnMfaCapability">;
