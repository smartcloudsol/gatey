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
