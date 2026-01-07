import {
  type LoginMechanism,
  type SignUpAttribute,
  type SocialProvider,
} from "@aws-amplify/ui";
import { type ResourcesConfig } from "aws-amplify";
import { del, get, head, patch, post, put } from "aws-amplify/api";

import {
  getGateyPlugin,
  getStore,
  waitForGateyReady,
  type GateyErrorEvent,
  type GateyPlugin,
  type GateyReadyEvent,
} from "./runtime";

import {
  clearMfaPreferences,
  getAmplifyConfig,
  getGroups,
  getMfaPreferences,
  getPreferredRole,
  getRoles,
  getScopes,
  getUserAttributes,
  getUsername,
  isAuthenticated,
  isInGroup,
} from "./auth";

import { attachDefaultPluginRuntime } from "@smart-cloud/wpsuite-core";
import {
  createStore,
  getStoreDispatch,
  observeStore,
  type Store,
} from "./store";

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
  reCaptchaPublicKey?: string;
  customTranslationsUrl?: string;
  useRecaptchaNet?: boolean;
  useRecaptchaEnterprise?: boolean;
  enablePoweredBy?: boolean;
}

const signOut = () => {
  getStore()
    .then((store) => {
      observeStore(
        store,
        (state) => state.nextUrl,
        async (nextUrl) => {
          if (nextUrl) {
            window.location.assign(nextUrl as string);
          }
        }
      );
      getStoreDispatch(store).clearAccount();
    })
    .catch((err) => {
      console.error("Gatey signOut error:", err);
    });
};

const setLanguage = (language?: string) => {
  getStore()
    .then((store) => {
      getStoreDispatch(store).setLanguage(language ?? "en");
    })
    .catch((err) => {
      console.error("Gatey setLanguage error:", err);
    });
};

const setDirection = (direction?: "ltr" | "rtl" | "auto") => {
  getStore()
    .then((store) => {
      getStoreDispatch(store).setDirection(direction ?? "auto");
    })
    .catch((err) => {
      console.error("Gatey setDirection error:", err);
    });
};

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

export {
  getGateyPlugin,
  getStore,
  waitForGateyReady,
  type GateyErrorEvent,
  type GateyPlugin,
  type GateyReadyEvent,
};

export {
  clearMfaPreferences,
  getGroups,
  getMfaPreferences,
  getPreferredRole,
  getRoles,
  getScopes,
  getUserAttributes,
  isAuthenticated,
  isInGroup,
};

export {
  configureAmplify,
  getAmplifyConfig,
  loadAuthSession,
  loadMFAPreferences,
  loadUserAttributes,
  login,
  logout,
  type Account,
} from "./auth";

export {
  getStoreDispatch,
  getStoreSelect,
  observeStore,
  sanitizeAuthenticatorConfig,
  type AuthenticatorConfig,
  type CustomTranslations,
  type FormField,
  type State,
  type Store,
} from "./store";

/**
 * @deprecated Use `getStore()` instead. Import with `import { getStore } from '@smart-cloud/gatey-core';`
 */
export const store = async (): Promise<Store> => {
  return getStore();
};

export { TEXT_DOMAIN } from "./constants";

export const initializeGatey = (): GateyPlugin => {
  const wp = globalThis.WpSuite;
  const gatey = getGateyPlugin();
  if (!gatey) {
    throw new Error("Gatey plugin is not available");
  }
  attachDefaultPluginRuntime(gatey);
  gatey.status = gatey.status ?? "initializing";
  const store = createStore();
  gatey.cognito = {
    store: store,
    observeStore,
    setLanguage,
    setDirection,
    getAmplifyConfig,
    isAuthenticated,
    isInGroup,
    getUsername,
    getUserAttributes,
    getMfaPreferences,
    clearMfaPreferences,
    getGroups,
    getRoles,
    getPreferredRole,
    getScopes,
    signOut,
    get,
    post,
    put,
    del,
    head,
    patch,
  };

  store
    .then(() => {
      gatey.status = "available";
      wp?.events?.emit("wpsuite:gatey:ready", {
        key: gatey.key,
        version: gatey.version,
      });
    })
    .catch((err) => {
      gatey.status = "error";
      wp?.events?.emit("wpsuite:gatey:error", {
        key: gatey.key,
        error: String(err),
      });
    });

  return gatey;
};
