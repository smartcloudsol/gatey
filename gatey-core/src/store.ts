import { type APIConfig } from "@aws-amplify/core";
import { type FormFieldOptionValue } from "@aws-amplify/ui";
import { type CustomProvider } from "@aws-amplify/ui-react";
import { type ResourcesConfig } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { I18n } from "aws-amplify/utils";

import {
  createReduxStore,
  dispatch,
  register,
  select,
  StoreDescriptor,
  subscribe,
} from "@wordpress/data";

import {
  getConfig,
  type SiteSettings,
  type SubscriptionType,
} from "@smart-cloud/wpsuite-core";

import {
  configureAmplify,
  loadAuthSession,
  loadUser,
  logout,
  type Account,
} from "./auth";

import { ACCOUNT } from "./constants";

let siteSettings: SiteSettings;
if (typeof WpSuite !== "undefined") {
  siteSettings = WpSuite.siteSettings;
} else {
  siteSettings = {} as SiteSettings;
}

const storeAccountInStorage = (account: Account): void => {
  if (account?.username) {
    window.localStorage.setItem(ACCOUNT, JSON.stringify(account));
  } else {
    window.localStorage.removeItem(ACCOUNT);
  }
};

export const getAccountFromStorage = async (
  apiConfiguration?: ApiConfiguration
): Promise<Account> => {
  let account: Account = JSON.parse(
    window.localStorage.getItem(ACCOUNT) ?? "{}"
  );
  let saved = false;
  if (!account?.username) {
    try {
      account = await loadUser(false);
      if (account?.username) {
        storeAccountInStorage(account);
        account.loaded = true;
        saved = true;
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    try {
      const authSession = await fetchAuthSession();
      if (
        authSession?.tokens?.accessToken?.payload?.exp &&
        authSession.tokens.accessToken.payload.exp > new Date().getTime() / 1000
      ) {
        saved = true;
      }
    } catch (err) {
      console.error(err);
    }
  }
  if (!saved && account?.username) {
    storeAccountInStorage({});
    Gatey.cognito.store.then(async (store) => {
      await logout(apiConfiguration?.signOutHook);
      getStoreDispatch(store).clearAccount();
      //window.location.assign("");
    });
  }
  return account;
};

const initAmplify = async (
  config: AuthenticatorConfig | undefined
): Promise<void> => {
  const hostname = window.location.hostname.toLowerCase().split(":")[0];
  const rc =
    Gatey.settings?.secondaryUserPoolDomains &&
    hostname
      .toLowerCase()
      .match(Gatey.settings.secondaryUserPoolDomains.toLowerCase()) &&
    Gatey.settings?.userPoolConfigurations.secondary?.Auth?.Cognito?.userPoolId
      ? Gatey.settings?.userPoolConfigurations.secondary
      : Gatey.settings?.userPoolConfigurations.default;
  const resourceConfig: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolClientId: "",
        userPoolId: "",
        identityPoolId: "",
        ...rc.Auth?.Cognito,
        loginWith: {
          oauth: {
            domain: "",
            scopes: [],
            responseType: "code",
            ...rc.Auth?.Cognito?.loginWith?.oauth,
            redirectSignIn: [
              window.location.origin + Gatey?.settings?.signInPage,
            ],
            redirectSignOut: [
              window.location.origin + Gatey?.settings?.signInPage,
            ],
          },
        },
      },
    },
    API: {
      ...rc.API,
      REST: {
        ...rc.API?.REST,
        admin: {
          endpoint: Gatey.restUrl,
        },
      },
    },
  };
  const apiConfiguration =
    config?.apiConfigurations?.secondary?.domains &&
    hostname
      .toLowerCase()
      .match(config.apiConfigurations.secondary?.domains.toLowerCase()) &&
    config.apiConfigurations?.secondary?.apis?.length
      ? config.apiConfigurations.secondary
      : config?.apiConfigurations?.default;

  apiConfiguration?.apis?.forEach((api) => {
    const c = resourceConfig.API?.REST as APIConfig["REST"];
    if (c) {
      c[api.name] = {
        endpoint: api.endpoint,
        region: api.region,
      };
    }
  });

  const libraryOptions = {
    API: {
      REST: {
        headers: async (options: { apiName: string }) => {
          const api = apiConfiguration?.apis?.find(
            (api) => api.name === options.apiName
          );
          if (
            options.apiName === "admin" ||
            api?.authorization === "ID_TOKEN" ||
            api?.authorization === "ACCESS_TOKEN"
          ) {
            try {
              const authSession = await loadAuthSession();
              if (
                authSession?.tokens?.idToken &&
                authSession?.tokens?.accessToken
              ) {
                return {
                  Authorization: `Bearer ${
                    options.apiName === "admin" ||
                    api?.authorization === "ID_TOKEN"
                      ? authSession.tokens.idToken.toString()
                      : authSession.tokens.accessToken.toString()
                  }`,
                };
              }
            } catch (err) {
              console.error(err);
              Gatey.cognito.store.then((store) => {
                getStoreDispatch(store).clearAccount();
              });
            }
          }
          return {};
        },
      },
    },
  };

  configureAmplify(resourceConfig, libraryOptions);
};

const getCustomTranslations = async (): Promise<CustomTranslations | null> => {
  let translations: CustomTranslations | null = null;
  if (Gatey.settings.customTranslationsUrl) {
    translations = await fetch(
      Gatey.settings.customTranslationsUrl +
        (Gatey.settings.customTranslationsUrl.includes("?") ? "&" : "?") +
        "t=" +
        siteSettings.lastUpdate
    )
      .then((response) => (response.ok ? response.text() : null))
      .then((response) =>
        response ? (JSON.parse(response) as CustomTranslations) : null
      )
      .catch(() => null);
  }
  return translations ?? null;
};

const getDefaultState = async (): Promise<State> => {
  const config = (await getConfig("gatey")) as unknown as AuthenticatorConfig;
  initAmplify(config);
  const hostname = window.location.hostname.toLowerCase().split(":")[0];
  const apiConfiguration =
    config?.apiConfigurations?.secondary?.domains &&
    hostname
      .toLowerCase()
      .match(config.apiConfigurations.secondary?.domains.toLowerCase()) &&
    config.apiConfigurations?.secondary?.apis?.length
      ? config.apiConfigurations.secondary
      : config?.apiConfigurations?.default;
  const account = await getAccountFromStorage(apiConfiguration);
  const customTranslations = await getCustomTranslations();

  return {
    config: config,
    amplifyConfig: {} as ResourcesConfig,
    account: account,
    signedIn: !!account?.username && !account.loaded,
    nextUrl: undefined,
    language: undefined,
    direction: undefined,
    customTranslations: customTranslations,
    reloadAuthSession: 0,
    reloadUserAttributes: 0,
    reloadMFAPreferences: 0,
  };
};

const actions = {
  setAmplifyConfig(amplifyConfig: ResourcesConfig) {
    return {
      type: "SET_AMPLIFY_CONFIG",
      amplifyConfig,
    };
  },

  setAccount(account: Account) {
    return {
      type: "SET_ACCOUNT",
      account,
    };
  },

  clearAccount() {
    return {
      type: "CLEAR_ACCOUNT",
    };
  },

  setSignedIn(signedIn: boolean) {
    return {
      type: "SET_SIGNED_IN",
      signedIn,
    };
  },

  setNextUrl(nextUrl: string | undefined | null) {
    return {
      type: "SET_NEXT_URL",
      nextUrl,
    };
  },

  setLanguage(language: string | undefined | null) {
    if (!language || language === "system") {
      I18n.setLanguage("");
    } else {
      I18n.setLanguage(language);
    }
    return {
      type: "SET_LANGUAGE",
      language,
    };
  },

  setDirection(direction: "ltr" | "rtl" | "auto" | undefined | null) {
    return {
      type: "SET_DIRECTION",
      direction,
    };
  },

  reloadAuthSession() {
    return {
      type: "RELOAD_AUTH_SESSION",
    };
  },

  reloadUserAttributes() {
    return {
      type: "RELOAD_USER_ATTRIBUTES",
    };
  },

  reloadMFAPreferences() {
    return {
      type: "RELOAD_MFA_PREFERENCE",
    };
  },
};

const selectors = {
  getAmplifyConfig(state: State) {
    return state.amplifyConfig;
  },
  getAccount(state: State) {
    return state.account;
  },
  getNextUrl(state: State) {
    return state.nextUrl;
  },
  isSignedIn(state: State) {
    return state.signedIn;
  },
  getConfig(state: State) {
    return state.config;
  },
  getCustomTranslations(state: State) {
    return state.customTranslations;
  },
  getLanguage(state: State) {
    return state.language;
  },
  getDirection(state: State) {
    return state.direction;
  },
  getState(state: State) {
    return state;
  },
};

const resolvers = {
  /*
  getAccount:
    () =>
    async ({ dispatch }: { dispatch: typeof actions }) => {
      const account = await getAccountFromStorage();
      dispatch.setAccount(account);
    },
  */
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

export const getStoreDispatch = (store: Store): StoreActions =>
  dispatch(store) as unknown as StoreActions;

export const getStoreSelect = (store: Store): StoreSelectors =>
  select(store) as unknown as StoreSelectors;

export const createStore = async (): Promise<Store> => {
  const DEFAULT_STATE = await getDefaultState();
  const store = createReduxStore("wpsuite/gatey", {
    reducer(state = DEFAULT_STATE, action) {
      switch (action.type) {
        case "SET_AMPLIFY_CONFIG":
          return {
            ...state,
            amplifyConfig: action.amplifyConfig,
          };
        case "SET_ACCOUNT":
          storeAccountInStorage(action.account);
          return {
            ...state,
            account: action.account,
          };

        case "CLEAR_ACCOUNT":
          storeAccountInStorage({});
          return {
            ...state,
            account: {},
          };

        case "RELOAD_AUTH_SESSION": {
          const reload = Math.random();
          return {
            ...state,
            reloadAuthSession:
              state.reloadAuthSession !== reload ? reload : reload + 1,
          };
        }

        case "RELOAD_USER_ATTRIBUTES": {
          const reload = Math.random();
          return {
            ...state,
            reloadUserAttributes:
              state.reloadUserAttributes !== reload ? reload : reload + 1,
          };
        }

        case "RELOAD_MFA_PREFERENCE": {
          const reload = Math.random();
          return {
            ...state,
            reloadMFAPreferences:
              state.reloadMFAPreferences !== reload ? reload : reload + 1,
          };
        }

        case "SET_SIGNED_IN":
          return {
            ...state,
            signedIn: action.signedIn,
          };

        case "SET_NEXT_URL":
          return {
            ...state,
            nextUrl: action.nextUrl,
          };

        case "SET_LANGUAGE":
          return {
            ...state,
            language: action.language,
          };

        case "SET_DIRECTION":
          return {
            ...state,
            direction: action.direction,
          };
      }

      return state;
    },
    actions,
    selectors,
    resolvers,
  });

  register(store);
  return store;
};

export const observeStore = (
  observableStore: Store,
  selector: (
    state: State
  ) => ResourcesConfig | Account | boolean | number | string | null | undefined,
  onChange: (
    nextValue:
      | ResourcesConfig
      | Account
      | boolean
      | number
      | string
      | null
      | undefined,
    previousValue:
      | ResourcesConfig
      | Account
      | boolean
      | number
      | string
      | null
      | undefined
  ) => void
) => {
  let currentValue:
    | ResourcesConfig
    | Account
    | boolean
    | number
    | string
    | null
    | undefined;

  function handleChange() {
    const state = getStoreSelect(observableStore).getState();
    const nextValue = selector(state);

    if (nextValue !== currentValue) {
      const oldValue = currentValue;
      currentValue = nextValue;
      onChange(currentValue, oldValue);
    }
  }

  const unsubscribe = subscribe(handleChange, observableStore);
  handleChange();
  return unsubscribe;
};
