import type { ConfirmSignInInput, ConfirmSignInOutput } from "aws-amplify/auth";

/** Keep successful authentication when the pool has no remembered-device metadata. */
export async function confirmSignInWithDevicePreference(
  input: ConfirmSignInInput,
  operations: {
    confirm: (input: ConfirmSignInInput) => Promise<ConfirmSignInOutput>;
    remember: () => Promise<void>;
    forget: () => Promise<void>;
  },
): Promise<ConfirmSignInOutput> {
  const result = await operations.confirm(input);
  if (!result.isSignedIn) return result;
  const preference = (input.options as { rememberDevice?: string } | undefined)?.rememberDevice;
  if (preference === "on") {
    try {
      await operations.remember();
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "DeviceMetadataNotFoundException") throw error;
    }
  } else if (preference !== "hidden") {
    await operations.forget();
  }
  return result;
}
