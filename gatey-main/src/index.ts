import { select, dispatch } from "@wordpress/data";

import {
  store,
  observeStore,
  loadAuthSession,
  loadUserAttributes,
  loadMFAPreferences,
  login,
  logout,
  decryptData,
  isAuthenticated,
  getAmplifyConfig,
  type Account,
} from "@smart-cloud/gatey-core";

import "jquery";

import "./index.css";

const root = document.documentElement;
root.style.setProperty("--gatey-initialized", "none");
root.style.setProperty("--gatey-not-initialized", "flex");
jQuery(() => {
  const cssVariables: string[] = Array.from(document.styleSheets)
    .filter(
      (sheet) =>
        sheet.href === null || sheet.href.startsWith(window.location.origin)
    )
    .reduce(
      (acc: string[], sheet: CSSStyleSheet) =>
        (acc = [
          ...acc,
          ...Array.from(sheet.cssRules).reduce(
            (def: string[], rule: CSSRule) =>
              (def =
                (rule as CSSStyleRule).selectorText === ":root"
                  ? [
                      ...def,
                      ...Array.from((rule as CSSStyleRule).style).filter(
                        (name) => name.startsWith("--gatey")
                      ),
                    ]
                  : def),
            []
          ),
        ]),
      []
    );

  const replaceValues = (key: string, value: string) => {
    jQuery("[" + key + "]:not(:has(*))").text(value);
    jQuery("[" + key + "] *:not(:has(*))").text(value);
    jQuery("." + key + ":not(:has(*))").text(value);
    jQuery("." + key + " *:not(:has(*))").text(value);
  };

  const refresh = async (signedIn: boolean) => {
    if (signedIn) {
      if (Gatey.cognito.getUserAttributes) {
        const attrs = await Gatey.cognito.getUserAttributes();
        if (attrs) {
          Object.keys(attrs).forEach((attr) => {
            replaceValues(
              "gatey-account-attribute-" + attr.replaceAll(":", "-"),
              attrs[attr] as string
            );
            root.style.setProperty(
              "--gatey-account-attribute-" + attr.replaceAll(":", "-"),
              "'" + (attrs[attr] as string) + "'"
            );
          });
        }
      }
      if (Gatey.cognito.getMfaPreferences) {
        const mfaPreferences = await Gatey.cognito.getMfaPreferences();
        root.style.setProperty(
          "--gatey-account-mfa-enabled",
          mfaPreferences?.enabled?.includes("TOTP") ? "flex" : "none"
        );
        root.style.setProperty(
          "--gatey-account-mfa-not-enabled",
          mfaPreferences?.enabled?.includes("TOTP") ? "none" : "flex"
        );
      }
    }

    const authenticated =
      signedIn && Gatey.cognito.isAuthenticated
        ? await Gatey.cognito.isAuthenticated()
        : false;
    root.style.setProperty(
      "--gatey-account-authenticated",
      authenticated ? "flex" : "none"
    );
    root.style.setProperty(
      "--gatey-account-not-authenticated",
      authenticated ? "none" : "flex"
    );
    if (Gatey.cognito.getGroups) {
      const groups = signedIn && (await Gatey.cognito.getGroups());
      cssVariables.forEach((property: string) => {
        if (property.startsWith("--gatey-account-group")) {
          root.style.setProperty(
            property,
            property.includes("-not-") &&
              (!groups ||
                !groups.includes(
                  property.substring("--gatey-account-group-not-".length)
                ))
              ? "flex"
              : "none"
          );
        }
      });
      if (groups) {
        groups.forEach((group) => {
          root.style.setProperty("--gatey-account-group-" + group, "flex");
          root.style.setProperty("--gatey-account-group-not-" + group, "none");
        });
      }
    }
    root.style.setProperty("--gatey-not-initialized", "none");
    root.style.setProperty("--gatey-initialized", "flex");
  };

  store.then(async (store) => {
    const config = select(store).getConfig();
    const decryptedConfig = config
      ? await decryptData(config, select(store).getSalt())
      : undefined;
    const apiConfiguration =
      window.location.hostname.toLowerCase() ===
        decryptedConfig?.secondaryDomain?.toLowerCase().trim() &&
      decryptedConfig.apiConfigurations?.secondary?.apis?.length
        ? decryptedConfig.apiConfigurations.secondary
        : decryptedConfig?.apiConfigurations?.default;

    dispatch(store).setAmplifyConfig(getAmplifyConfig());

    observeStore(
      store,
      (state) => state.signedIn,
      async (signedIn, wasSignedIn) => {
        if (wasSignedIn !== undefined) {
          try {
            if (signedIn && (await isAuthenticated())) {
              login(apiConfiguration?.signInHook).then((nextUrl) => {
                dispatch(store).setNextUrl(nextUrl ?? null);
              });
            } else {
              logout(apiConfiguration?.signOutHook).then((nextUrl) => {
                dispatch(store).setNextUrl(nextUrl ?? null);
              });
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    );

    observeStore(
      store,
      (state) => state.reloadAuthSession,
      (reload) => {
        if (reload) {
          loadAuthSession({ forceRefresh: true }).catch((err) => {
            console.error(err);
            dispatch(store).clearAccount();
          });
        }
      }
    );

    observeStore(
      store,
      (state) => state.reloadUserAttributes,
      (reload) => {
        if (reload) {
          loadUserAttributes()
            .then((userAttributes) =>
              dispatch(store).setAccount({
                ...select(store).getAccount(),
                userAttributes,
              })
            )
            .catch((err) => {
              console.error(err);
              dispatch(store).clearAccount();
            });
        }
      }
    );

    observeStore(
      store,
      (state) => state.reloadMFAPreferences,
      (reload) => {
        if (reload) {
          loadMFAPreferences()
            .then((mfaPreferences) =>
              dispatch(store).setAccount({
                ...select(store).getAccount(),
                mfaPreferences,
              })
            )
            .catch((err) => {
              console.error(err);
              dispatch(store).clearAccount();
            });
        }
      }
    );

    observeStore(
      store,
      (state) => state.account,
      (account) => {
        const signedIn = !!(account as Account)?.username;
        dispatch(store).setSignedIn(signedIn);
        refresh(signedIn);
      }
    );
  });
});
