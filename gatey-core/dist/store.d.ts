import { type FormFieldOptionValue } from "@aws-amplify/ui";
import { type CustomProvider } from "@aws-amplify/ui-react";
import { type ResourcesConfig } from "aws-amplify";
import { StoreDescriptor } from "@wordpress/data";
import { type SubscriptionType } from "@smart-cloud/wpsuite-core";
import { type Account } from "./auth";
export declare const getAccountFromStorage: (apiConfiguration?: ApiConfiguration) => Promise<Account>;
/**
 * Ensures we only keep runtime keys that are part of AuthenticatorConfig.
 *
 * Defensive: upstream getConfig("gatey") or persisted site.settings may include
 * additional keys, but the admin UI and core should only operate on AuthenticatorConfig.
 */
export declare const sanitizeAuthenticatorConfig: (input: unknown) => AuthenticatorConfig;
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
export interface FormField {
    name: string;
    type: string;
    values?: Array<FormFieldOptionValue>;
}
export interface ApiOptions {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: never;
    withCredentials?: boolean;
}
export interface API {
    name: string;
    endpoint: string;
    region?: string;
    authorization: "IAM" | "ID_TOKEN" | "ACCESS_TOKEN";
}
export interface ApiConfiguration {
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
export interface AuthenticatorConfig {
    customProviders: CustomProvider[];
    formFields: FormField[];
    apiConfigurations: {
        default: ApiConfiguration;
        secondary?: ApiConfiguration;
    };
    subscriptionType?: SubscriptionType;
}
export interface CustomTranslations {
    [key: string]: Record<string, string>;
}
export interface State {
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
export type Store = StoreDescriptor;
export type StoreSelectors = {
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
export type StoreActions = typeof actions;
export declare const getStoreDispatch: (store: Store) => StoreActions;
export declare const getStoreSelect: (store: Store) => StoreSelectors;
export declare const createStore: () => Promise<Store>;
export declare const observeStore: (observableStore: Store, selector: (state: State) => ResourcesConfig | Account | boolean | number | string | null | undefined, onChange: (nextValue: ResourcesConfig | Account | boolean | number | string | null | undefined, previousValue: ResourcesConfig | Account | boolean | number | string | null | undefined) => void) => () => void;
export {};
