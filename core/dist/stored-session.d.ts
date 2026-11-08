export declare function isExplicitlyUnauthenticated(error: unknown): boolean;
/** Run an initial lookup, cleaning up only when authentication is definitively absent. */
export declare function lookupUserOrAnonymous<T>(lookup: () => Promise<T>, cleanup: () => Promise<unknown>, anonymous: T): Promise<T>;
/** Verify a cached account without treating transport or profile failures as logout. */
export declare function verifyStoredSession(fetchSession: () => Promise<{
    tokens?: {
        accessToken?: {
            payload: {
                exp?: number;
            };
        };
    };
}>): Promise<boolean>;
/** Discard only the cached display account when the session is absent. */
export declare function resolveCachedAccount<T extends object>(account: T, verify: () => Promise<boolean>, clear: () => void): Promise<T>;
