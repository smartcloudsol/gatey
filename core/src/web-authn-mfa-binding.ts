import type { WebAuthnMfaCapability } from "@smart-cloud/aws-amplify-ui";

/** Public identity metadata only. Tokens and credentials never belong in a UI key. */
export interface CapabilityBindingSource {
  readConfiguration(): unknown;
  readProfile(): unknown;
  assertCurrent(): void;
  readCapability(guard: () => boolean): Promise<WebAuthnMfaCapability>;
}

function canonical(value: unknown): unknown {
  if (value === undefined) return ["undefined"];
  if (value === null || typeof value !== "object") return [typeof value, value];
  if (Array.isArray(value)) return ["list", value.map(canonical)];
  return ["map", Object.keys(value).sort().map(key =>
    [key, canonical((value as Record<string, unknown>)[key])])];
}

export function authenticatorBindingKey(configuration: unknown, profile: unknown): string {
  const source = configuration && typeof configuration === "object"
    ? configuration as Record<string, unknown> : {};
  // Deliberately select identity fields: OAuth settings and secrets are not keys.
  const selected = ["userPoolId", "userPoolClientId", "identityPoolId",
    "userPoolEndpoint", "identityPoolEndpoint"].map(key => source[key]);
  return JSON.stringify(canonical([selected, profile]));
}

export function createBoundCapabilityService(
  source: CapabilityBindingSource,
  isMounted: () => boolean = () => true,
): { handleGetWebAuthnMfaCapability(): Promise<WebAuthnMfaCapability> } {
  let captured: string | undefined;
  try { captured = authenticatorBindingKey(source.readConfiguration(), source.readProfile()); }
  catch { /* An unavailable or stale profile is unknown, never assumed supported. */ }
  const current = () => {
    try {
      source.assertCurrent();
      return isMounted() && captured !== undefined &&
        authenticatorBindingKey(source.readConfiguration(), source.readProfile()) === captured;
    } catch { return false; }
  };
  return {
    async handleGetWebAuthnMfaCapability() {
      if (!current()) return "unknown";
      try {
        const capability = await source.readCapability(current);
        return current() && ["supported", "unsupported", "unknown"].includes(capability)
          ? capability : "unknown";
      } catch { return "unknown"; }
    },
  };
}
