import { type ResourcesConfig } from "aws-amplify";
import { type AuthSession, type FetchAuthSessionOptions, type FetchMFAPreferenceOutput, type FetchUserAttributesOutput } from "aws-amplify/auth";
import { type ApiConfiguration } from "./store";
export interface Account {
    username?: string;
    loaded?: boolean;
    userAttributes?: FetchUserAttributesOutput;
    mfaPreferences?: FetchMFAPreferenceOutput;
}
export declare const getAmplifyConfig: () => ResourcesConfig;
export declare const configureAmplify: (resourcesConfig: ResourcesConfig, libraryOptions?: Record<string, unknown>) => void;
export declare const loadAuthSession: (options?: FetchAuthSessionOptions) => Promise<AuthSession>;
export declare const loadUserAttributes: () => Promise<FetchUserAttributesOutput>;
export declare const loadMFAPreferences: () => Promise<FetchMFAPreferenceOutput>;
export declare const loadUser: (checkStorage?: boolean) => Promise<Account>;
export declare const clearMfaPreferences: () => Promise<void>;
export declare const getUsername: () => Promise<string | undefined>;
export declare const getUserAttributes: () => Promise<FetchUserAttributesOutput | undefined>;
export declare const getMfaPreferences: () => Promise<FetchMFAPreferenceOutput | undefined>;
export declare const isAuthenticated: () => Promise<boolean>;
export declare const isInGroup: (group: string) => Promise<boolean>;
export declare const getGroups: () => Promise<string[] | undefined>;
export declare const getRoles: () => Promise<string[] | undefined>;
export declare const getPreferredRole: () => Promise<string | undefined>;
export declare const getScopes: () => Promise<string[] | undefined>;
export declare const login: (signInHook: ApiConfiguration["signInHook"]) => Promise<string | undefined>;
export declare const logout: (signOutHook: ApiConfiguration["signOutHook"]) => Promise<string | undefined>;
