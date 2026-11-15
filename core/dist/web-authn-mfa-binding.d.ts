import type { WebAuthnMfaCapability } from "@smart-cloud/aws-amplify-ui";
/** Public identity metadata only. Tokens and credentials never belong in a UI key. */
export interface CapabilityBindingSource {
    readConfiguration(): unknown;
    readProfile(): unknown;
    assertCurrent(): void;
    readCapability(guard: () => boolean): Promise<WebAuthnMfaCapability>;
}
export declare function authenticatorBindingKey(configuration: unknown, profile: unknown): string;
export declare function createBoundCapabilityService(source: CapabilityBindingSource, isMounted?: () => boolean): {
    handleGetWebAuthnMfaCapability(): Promise<WebAuthnMfaCapability>;
};
