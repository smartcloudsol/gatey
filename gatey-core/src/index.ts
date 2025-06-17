import { type ResourcesConfig } from "aws-amplify";
import { get, post, put, del, head, patch } from "aws-amplify/api";
import { type LoginMechanism } from "@aws-amplify/ui";
import { dispatch } from "@wordpress/data";

import {
  getAmplifyConfig,
  isAuthenticated,
  isInGroup,
  getUsername,
  getUserAttributes,
  getMfaPreferences,
  getGroups,
  getRoles,
  getPreferredRole,
  getScopes,
  clearMfaPreferences,
} from "./auth";

import { createStore, observeStore, type Store } from "./store";

declare global {
  const Gatey: Gatey;
}

export interface RoleMapping {
  cognitoGroup?: string;
  wordpressRole?: string;
}

export interface Settings {
  userPoolConfigurations: {
    default: ResourcesConfig;
    secondary?: ResourcesConfig;
  };
  mappings: RoleMapping[];
  loginMechanisms: LoginMechanism[];
  integrateWpLogin: boolean;
  cookieExpiration?: number;
  signInPage?: string;
  redirectSignIn?: string;
  redirectSignOut?: string;
  reCaptchaPublicKey?: string;
  customTranslationsUrl?: string;
}

export interface SiteSettings {
  accountId?: string;
  siteId?: string;
  lastUpdate?: number;
  subscriber?: boolean;
  siteKey?: string;
}

const signOut = () => {
  Gatey.cognito.store.then((store) => {
    observeStore(
      store,
      (state) => state.nextUrl,
      async (nextUrl) => {
        if (nextUrl) {
          window.location.assign(nextUrl as string);
        }
      }
    );
    dispatch(store).clearAccount();
  });
};

const setLanguage = (language?: string) => {
  Gatey.cognito.store.then((store) => {
    dispatch(store).setLanguage(language ?? "en");
  });
};

const setDirection = (direction?: "ltr" | "rtl" | "auto") => {
  Gatey.cognito.store.then((store) => {
    dispatch(store).setDirection(direction ?? "auto");
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
}

export interface Gatey {
  cognito: Cognito;
  settings: Settings;
  siteSettings: SiteSettings;
  nonce: string;
  restUrl: string;
  uploadUrl: string;
}

export {
  isAuthenticated,
  isInGroup,
  getUserAttributes,
  getMfaPreferences,
  clearMfaPreferences,
  getGroups,
  getRoles,
  getScopes,
  getPreferredRole,
};

export {
  configureAmplify,
  getAmplifyConfig,
  loadAuthSession,
  loadUserAttributes,
  loadMFAPreferences,
  login,
  logout,
  type Account,
} from "./auth";

export {
  observeStore,
  type Store,
  type State,
  type CustomTranslations,
  type AuthenticatorConfig,
} from "./store";

export { deobfuscate, decryptData } from "./utils";

export { TEXT_DOMAIN } from "./constants";

let initialized = !!Gatey.cognito?.store;
export const store = Gatey.cognito?.store ?? createStore();

if (!initialized) {
  Gatey.cognito = {
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
}
initialized = true;
