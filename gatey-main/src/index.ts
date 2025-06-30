import { select, dispatch } from "@wordpress/data";

import { countries } from "country-data-list";
import {
  store,
  observeStore,
  loadAuthSession,
  loadUserAttributes,
  loadMFAPreferences,
  login,
  logout,
  isAuthenticated,
  getAmplifyConfig,
  type Account,
  type AuthenticatorConfig,
} from "@smart-cloud/gatey-core";

import "jquery";

import "./index.css";

const root = document.documentElement;
root.style.setProperty("--gatey-initialized", "none");
root.style.setProperty("--gatey-not-initialized", "flex");
jQuery(() => {
  let decryptedConfig: AuthenticatorConfig | undefined | null;
  let allAttributeKeys: string[];

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
    jQuery("[" + key + "]:not(:has(*))").html(value);
    jQuery("[" + key + "] *:not(:has(*))").html(value);
    jQuery("." + key + ":not(:has(*))").html(value);
    jQuery("." + key + " *:not(:has(*))").html(value);
  };

  const refresh = async (signedIn: boolean) => {
    if (signedIn) {
      if (Gatey.cognito.getUserAttributes) {
        const attrs = await Gatey.cognito.getUserAttributes();
        const processedAttrs: string[] = [];
        if (attrs) {
          Object.keys(attrs).forEach((attr) => {
            const field =
              (decryptedConfig?.formFields?.signUp &&
                decryptedConfig?.formFields?.signUp[attr]) ??
              (decryptedConfig?.formFields?.editAccount &&
                decryptedConfig?.formFields?.editAccount[attr]);
            let value = attrs[attr] as string;
            if (value) {
              if (field?.type === "country") {
                const country = countries.all.find(
                  (country) =>
                    country.alpha3?.toLocaleLowerCase() ===
                      value.toLocaleLowerCase() ||
                    country.alpha2?.toLocaleLowerCase() ===
                      value.toLocaleLowerCase()
                );
                if (country) {
                  value = Gatey.cognito.translate(country.name);
                }
              } else if (field?.type === "select" || field?.type === "radio") {
                const options = field?.values ?? [];
                const option = options.find((option) => option.value === value);
                if (option) {
                  value = Gatey.cognito.translate(option.label);
                }
              }
            }
            replaceValues(
              "gatey-account-attribute-" + attr.replaceAll(":", "-"),
              value ?? "&nbsp;"
            );
            root.style.setProperty(
              "--gatey-account-attribute-" + attr.replaceAll(":", "-"),
              "'" + (value ?? "") + "'"
            );
            processedAttrs.push(attr);
          });
        }
        allAttributeKeys?.forEach((key) => {
          if (!processedAttrs.includes(key)) {
            replaceValues(
              "gatey-account-attribute-" + key.replaceAll(":", "-"),
              "&nbsp;"
            );
            root.style.setProperty(
              "--gatey-account-attribute-" + key.replaceAll(":", "-"),
              "''"
            );
          }
        });
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
    decryptedConfig = select(store).getConfig();
    const apiConfiguration =
      window.location.hostname.toLowerCase() ===
        decryptedConfig?.secondaryDomain?.toLowerCase().trim() &&
      decryptedConfig.apiConfigurations?.secondary?.apis?.length
        ? decryptedConfig.apiConfigurations.secondary
        : decryptedConfig?.apiConfigurations?.default;
    const allAttrs = [];
    if (decryptedConfig?.formFields?.signUp) {
      allAttrs.push(...Object.keys(decryptedConfig.formFields.signUp));
    }
    if (decryptedConfig?.formFields?.editAccount) {
      allAttrs.push(...Object.keys(decryptedConfig.formFields.editAccount));
    }
    allAttributeKeys = Array.from(new Set(allAttrs));
    Gatey.settings.signUpAttributes.forEach((attr) => {
      if (!allAttributeKeys.includes(attr)) {
        allAttributeKeys.push(attr);
      }
    });

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

    observeStore(
      store,
      (state) => state.language,
      () => {
        Gatey.cognito
          .isAuthenticated()
          .then((authenticated) => refresh(authenticated));
      }
    );

    observeStore(
      store,
      (state) => state.direction,
      () => {
        Gatey.cognito
          .isAuthenticated()
          .then((authenticated) => refresh(authenticated));
      }
    );
  });
});
