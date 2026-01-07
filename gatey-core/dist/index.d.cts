import { FormFieldOptionValue, LoginMechanism, SignUpAttribute, SocialProvider } from '@aws-amplify/ui';
import { ResourcesConfig } from 'aws-amplify';
import { get, post, put, del, head, patch } from 'aws-amplify/api';
import { CustomProvider } from '@aws-amplify/ui-react';
import { StoreDescriptor } from '@wordpress/data';
import { SubscriptionType, WpSuitePluginBase } from '@smart-cloud/wpsuite-core';
import { FetchUserAttributesOutput, FetchMFAPreferenceOutput, FetchAuthSessionOptions, AuthSession } from 'aws-amplify/auth';

interface Account {
    username?: string;
    loaded?: boolean;
    userAttributes?: FetchUserAttributesOutput;
    mfaPreferences?: FetchMFAPreferenceOutput;
}
declare const getAmplifyConfig: () => ResourcesConfig;
declare const configureAmplify: (resourcesConfig: ResourcesConfig, libraryOptions?: Record<string, unknown>) => void;
declare const loadAuthSession: (options?: FetchAuthSessionOptions) => Promise<AuthSession>;
declare const loadUserAttributes: () => Promise<FetchUserAttributesOutput>;
declare const loadMFAPreferences: () => Promise<FetchMFAPreferenceOutput>;
declare const clearMfaPreferences: () => Promise<void>;
declare const getUsername: () => Promise<string | undefined>;
declare const getUserAttributes: () => Promise<FetchUserAttributesOutput | undefined>;
declare const getMfaPreferences: () => Promise<FetchMFAPreferenceOutput | undefined>;
declare const isAuthenticated: () => Promise<boolean>;
declare const isInGroup: (group: string) => Promise<boolean>;
declare const getGroups: () => Promise<string[] | undefined>;
declare const getRoles: () => Promise<string[] | undefined>;
declare const getPreferredRole: () => Promise<string | undefined>;
declare const getScopes: () => Promise<string[] | undefined>;
declare const login: (signInHook: ApiConfiguration["signInHook"]) => Promise<string | undefined>;
declare const logout: (signOutHook: ApiConfiguration["signOutHook"]) => Promise<string | undefined>;

/**
 * Ensures we only keep runtime keys that are part of AuthenticatorConfig.
 *
 * Defensive: upstream getConfig("gatey") or persisted site.settings may include
 * additional keys, but the admin UI and core should only operate on AuthenticatorConfig.
 */
declare const sanitizeAuthenticatorConfig: (input: unknown) => AuthenticatorConfig;
declare const actions: {
    setAmplifyConfig(amplifyConfig: ResourcesConfig): {
        type: string;
        amplifyConfig: ResourcesConfig;
    };
    setAccount(account: Account): {
        type: string;
        account: Account;
    };
    clearAccount(): {
        type: string;
    };
    setSignedIn(signedIn: boolean): {
        type: string;
        signedIn: boolean;
    };
    setNextUrl(nextUrl: string | undefined | null): {
        type: string;
        nextUrl: string | null | undefined;
    };
    setLanguage(language: string | undefined | null): {
        type: string;
        language: string | null | undefined;
    };
    setDirection(direction: "ltr" | "rtl" | "auto" | undefined | null): {
        type: string;
        direction: "ltr" | "rtl" | "auto" | null | undefined;
    };
    reloadAuthSession(): {
        type: string;
    };
    reloadUserAttributes(): {
        type: string;
    };
    reloadMFAPreferences(): {
        type: string;
    };
};
interface FormField {
    name: string;
    type: string;
    values?: Array<FormFieldOptionValue>;
}
interface ApiOptions {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: never;
    withCredentials?: boolean;
}
interface API {
    name: string;
    endpoint: string;
    region?: string;
    authorization: "IAM" | "ID_TOKEN" | "ACCESS_TOKEN";
}
interface ApiConfiguration {
    domains?: string;
    apis: API[];
    signInHook?: {
        apiName: string;
        path: string;
        options?: ApiOptions;
    };
    signOutHook?: {
        apiName: string;
        path: string;
        options?: ApiOptions;
    };
}
interface AuthenticatorConfig {
    customProviders: CustomProvider[];
    formFields: FormField[];
    apiConfigurations: {
        default: ApiConfiguration;
        secondary?: ApiConfiguration;
    };
    subscriptionType?: SubscriptionType;
}
interface CustomTranslations {
    [key: string]: Record<string, string>;
}
interface State {
    amplifyConfig: ResourcesConfig;
    account: Account;
    signedIn: boolean;
    nextUrl: string | undefined | null;
    config: AuthenticatorConfig | null;
    language: string | undefined | null;
    direction: "ltr" | "rtl" | "auto" | undefined | null;
    customTranslations: CustomTranslations | null;
    reloadAuthSession: number;
    reloadUserAttributes: number;
    reloadMFAPreferences: number;
}
type Store = StoreDescriptor;
type StoreSelectors = {
    getAmplifyConfig(): ResourcesConfig;
    getAccount(): Account;
    getNextUrl(): string | null | undefined;
    isSignedIn(): boolean;
    getConfig(): AuthenticatorConfig | null;
    getCustomTranslations(): CustomTranslations | null;
    getLanguage(): string | undefined | null;
    getDirection(): "ltr" | "rtl" | "auto" | undefined | null;
    getState(): State;
};
type StoreActions = typeof actions;
declare const getStoreDispatch: (store: Store) => StoreActions;
declare const getStoreSelect: (store: Store) => StoreSelectors;
declare const observeStore: (observableStore: Store, selector: (state: State) => ResourcesConfig | Account | boolean | number | string | null | undefined, onChange: (nextValue: ResourcesConfig | Account | boolean | number | string | null | undefined, previousValue: ResourcesConfig | Account | boolean | number | string | null | undefined) => void) => () => void;

type GateyReadyEvent = "wpsuite:gatey:ready";
type GateyErrorEvent = "wpsuite:gatey:error";
type GateyPlugin = WpSuitePluginBase & Gatey;
declare function getGateyPlugin(): GateyPlugin;
declare function waitForGateyReady(timeoutMs?: number): Promise<void>;
declare function getStore(timeoutMs?: number): Promise<Store>;

declare const TEXT_DOMAIN = "gatey";

interface RoleMapping {
    cognitoGroup?: string;
    wordpressRole?: string;
}
interface Settings {
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
    reCaptchaPublicKey?: string;
    customTranslationsUrl?: string;
    useRecaptchaNet?: boolean;
    useRecaptchaEnterprise?: boolean;
    enablePoweredBy?: boolean;
}
declare const signOut: () => void;
declare const setLanguage: (language?: string) => void;
declare const setDirection: (direction?: "ltr" | "rtl" | "auto") => void;
interface Cognito {
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
interface Gatey {
    cognito: Cognito;
    settings: Settings;
    nonce: string;
    restUrl: string;
}

/**
 * @deprecated Use `getStore()` instead. Import with `import { getStore } from '@smart-cloud/gatey-core';`
 */
declare const store: () => Promise<Store>;

declare const initializeGatey: () => GateyPlugin;

export { type Account, type AuthenticatorConfig, type Cognito, type CustomTranslations, type FormField, type Gatey, type GateyErrorEvent, type GateyPlugin, type GateyReadyEvent, type RoleMapping, type Settings, type State, type Store, TEXT_DOMAIN, clearMfaPreferences, configureAmplify, getAmplifyConfig, getGateyPlugin, getGroups, getMfaPreferences, getPreferredRole, getRoles, getScopes, getStore, getStoreDispatch, getStoreSelect, getUserAttributes, initializeGatey, isAuthenticated, isInGroup, loadAuthSession, loadMFAPreferences, loadUserAttributes, login, logout, observeStore, sanitizeAuthenticatorConfig, store, waitForGateyReady };
