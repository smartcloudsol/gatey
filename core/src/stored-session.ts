export function isExplicitlyUnauthenticated(error: unknown): boolean {
  return error instanceof Error && error.name === "UserUnAuthenticatedException";
}

/** Run an initial lookup, cleaning up only when authentication is definitively absent. */
export async function lookupUserOrAnonymous<T>(lookup: () => Promise<T>, cleanup: () => Promise<unknown>, anonymous: T): Promise<T> {
  try {
    return await lookup();
  } catch (error) {
    if (!isExplicitlyUnauthenticated(error)) throw error;
    try { await cleanup(); } catch { /* Preserve the existing anonymous fallback. */ }
    return anonymous;
  }
}

/** Verify a cached account without treating transport or profile failures as logout. */
export async function verifyStoredSession(
  fetchSession: () => Promise<{ tokens?: { accessToken?: { payload: { exp?: number } } } }>,
): Promise<boolean> {
  try {
    const session = await fetchSession();
    const expiry = session.tokens?.accessToken?.payload.exp;
    if (typeof expiry === "number" && expiry > Date.now() / 1000) return true;
    // An empty or expired result does not establish why verification failed.
    throw new Error("The stored session could not be verified.");
  } catch (error) {
    // Amplify exposes this error when the user is explicitly unauthenticated.
    // Generic NotAuthorizedException can also originate from identity-pool IAM
    // credential retrieval, so it cannot by itself justify signing the user out.
    if (isExplicitlyUnauthenticated(error)) return false;
    throw error;
  }
}
