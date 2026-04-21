import { PasswordlessSettings, type LoginMechanism, type SignUpAttribute, type SocialProvider } from "@aws-amplify/ui";
import { type ResourcesConfig } from "aws-amplify";
import { del, get, head, patch, post, put } from "aws-amplify/api";
import { getGateyPlugin, getStore, waitForGateyReady, type GateyErrorEvent, type GateyPlugin, type GateyReadyEvent } from "./runtime";
import { clearMfaPreferences, getAmplifyConfig, getGroups, getMfaPreferences, getPreferredRole, getRoles, getScopes, getUserAttributes, getUsername, isAuthenticated, isInGroup } from "./auth";
import { observeStore, type Store } from "./store";
export interface RoleMapping {
    cognitoGroup?: string;
    wordpressRole?: string;
}
export interface Settings {
    userPoolConfigurations: {
        default: ResourcesConfig;
        secondary?: ResourcesConfig;
    };
    secondaryUserPoolDomains?: string;
    mappings: RoleMapping[];
    loginMechanisms: LoginMechanism[];
    signUpAttributes: SignUpAttribute[];
    socialProviders?: SocialProvider[];
    integrateWpLogin: boolean;
    cookieExpiration?: number;
    signInPage?: string;
    redirectSignIn?: string;
    redirectSignOut?: string;
    customTranslationsUrl?: string;
    enablePoweredBy?: boolean;
    debugLoggingEnabled?: boolean;
    hideSignUp?: boolean;
    passwordlessSettings?: PasswordlessSettings;
}
declare const signOut: () => void;
declare const setLanguage: (language?: string) => void;
declare const setDirection: (direction?: "ltr" | "rtl" | "auto") => void;
export interface Cognito {
    readonly store: Promise<Store>;
    readonly observeStore: typeof observeStore;
    readonly setLanguage: typeof setLanguage;
    readonly setDirection: typeof setDirection;
    readonly getUsername: typeof getUsername;
    readonly getUserAttributes: typeof getUserAttributes;
    readonly getMfaPreferences: typeof getMfaPreferences;
    readonly clearMfaPreferences: typeof clearMfaPreferences;
    readonly isAuthenticated: typeof isAuthenticated;
    readonly isInGroup: typeof isInGroup;
    readonly getGroups: typeof getGroups;
    readonly getRoles: typeof getRoles;
    readonly getScopes: typeof getScopes;
    readonly getPreferredRole: typeof getPreferredRole;
    readonly signOut: typeof signOut;
    readonly getAmplifyConfig: typeof getAmplifyConfig;
    readonly get: typeof get;
    readonly post: typeof post;
    readonly put: typeof put;
    readonly del: typeof del;
    readonly head: typeof head;
    readonly patch: typeof patch;
    toSignIn?: () => void;
    toSignUp?: () => void;
    toForgotPassword?: () => void;
}
export interface Gatey {
    cognito: Cognito;
    settings: Settings;
    nonce: string;
    restUrl: string;
}
export { getGateyPlugin, getStore, waitForGateyReady, type GateyErrorEvent, type GateyPlugin, type GateyReadyEvent, };
export { clearMfaPreferences, getGroups, getMfaPreferences, getPreferredRole, getRoles, getScopes, getUserAttributes, isAuthenticated, isInGroup, };
export { configureAmplify, getAmplifyConfig, loadAuthSession, loadMFAPreferences, loadUserAttributes, login, logout, type Account, } from "./auth";
export { getStoreDispatch, getStoreSelect, observeStore, sanitizeAuthenticatorConfig, type AuthenticatorConfig, type CustomTranslations, type FormField, type State, type Store, } from "./store";
/**
 * @deprecated Use `getStore()` instead. Import with `import { getStore } from '@smart-cloud/gatey-core';`
 */
export declare const store: () => Promise<Store>;
export { TEXT_DOMAIN } from "./constants";
export declare const initializeGatey: () => GateyPlugin;
