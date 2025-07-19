import { ResourcesConfig } from 'aws-amplify';
import { get, post, put, del, head, patch } from 'aws-amplify/api';
import { SocialProvider, FormFieldOptionValue, LoginMechanism, SignUpAttribute } from '@aws-amplify/ui';
import { FetchUserAttributesOutput, FetchMFAPreferenceOutput, FetchAuthSessionOptions, AuthSession } from 'aws-amplify/auth';
import { StoreDescriptor, ReduxStoreConfig } from '@wordpress/data/build-types/types';

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
declare const selectors: {
    getAmplifyConfig(state: State): ResourcesConfig;
    getAccount(state: State): Account;
    getNextUrl(state: State): string | null | undefined;
    isSignedIn(state: State): boolean;
    getConfig(state: State): AuthenticatorConfig | null;
    getCustomTranslations(state: State): CustomTranslations | null;
    getLanguage(state: State): string | null | undefined;
    getDirection(state: State): "ltr" | "rtl" | "auto" | null | undefined;
    getState(state: State): State;
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
    socialProviders: SocialProvider[];
    formFields: FormField[];
    apiConfigurations: {
        default: ApiConfiguration;
        secondary?: ApiConfiguration;
    };
    subscriptionType?: SubscriptionType;
    secondaryDomain?: string;
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
type SubscriptionType = "BASIC" | "PROFESSIONAL" | "AGENCY";
type Store = StoreDescriptor<ReduxStoreConfig<State, typeof actions, typeof selectors>>;
declare const observeStore: (observableStore: Store, selector: (state: State) => ResourcesConfig | Account | boolean | number | string | null | undefined, onChange: (nextValue: ResourcesConfig | Account | boolean | number | string | null | undefined, previousValue: ResourcesConfig | Account | boolean | number | string | null | undefined) => void) => any;

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

declare const deobfuscate: (blob: string, key: number) => string;
declare const decryptData: (encryptedText: string, salt: number) => Promise<AuthenticatorConfig | undefined>;

declare const TEXT_DOMAIN = "gatey";

declare global {
    const Gatey: Gatey;
}
interface RoleMapping {
    cognitoGroup?: string;
    wordpressRole?: string;
}
interface Settings {
    userPoolConfigurations: {
        default: ResourcesConfig;
        secondary?: ResourcesConfig;
    };
    mappings: RoleMapping[];
    loginMechanisms: LoginMechanism[];
    signUpAttributes: SignUpAttribute[];
    integrateWpLogin: boolean;
    cookieExpiration?: number;
    signInPage?: string;
    redirectSignIn?: string;
    redirectSignOut?: string;
    reCaptchaPublicKey?: string;
    customTranslationsUrl?: string;
    useRecaptchaNet?: boolean;
    useRecaptchaEnterprise?: boolean;
}
interface SiteSettings {
    accountId?: string;
    siteId?: string;
    lastUpdate?: number;
    subscriber?: boolean;
    siteKey?: string;
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
    siteSettings: SiteSettings;
    nonce: string;
    restUrl: string;
    uploadUrl: string;
}

declare const store: Promise<Store>;

export { type Account, type AuthenticatorConfig, type Cognito, type CustomTranslations, type FormField, Gatey, type RoleMapping, type Settings, type SiteSettings, type State, type Store, type SubscriptionType, TEXT_DOMAIN, clearMfaPreferences, configureAmplify, decryptData, deobfuscate, getAmplifyConfig, getGroups, getMfaPreferences, getPreferredRole, getRoles, getScopes, getUserAttributes, isAuthenticated, isInGroup, loadAuthSession, loadMFAPreferences, loadUserAttributes, login, logout, observeStore, store };
