import type { AuthFieldsWithDefaults } from "@smart-cloud/aws-amplify-ui";
import {
  getAmplifyConfig,
  getStoreSelect,
  initializeGatey,
  isAuthenticated,
  loadAuthSession,
  loadMFAPreferences,
  loadUserAttributes,
  login,
  logout,
  observeStore,
  type Account,
  type AuthenticatorConfig,
} from "@smart-cloud/gatey-core";
import { dispatch } from "@wordpress/data";
import { I18n } from "aws-amplify/utils";

import "jquery";
import { observe } from "./observer";

import "./index.css";

const root = document.documentElement;
root.style.setProperty("--gatey-initialized", "none");
root.style.setProperty("--gatey-not-initialized", "flex");

function onDomReady(fn: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

type AccountUi = Pick<
  typeof import("@smart-cloud/aws-amplify-ui"),
  "defaultFormFieldOptions" | "translate" | "translations"
> & Pick<typeof import("@smart-cloud/aws-amplify-ui-react"), "countries">;

function accountUi(): AccountUi | undefined {
  const vendor = (globalThis as unknown as { WpSuiteAmplify?: Partial<AccountUi> }).WpSuiteAmplify;
  if (vendor?.defaultFormFieldOptions && vendor.translate && vendor.translations && vendor.countries) {
    return vendor as AccountUi;
  }
  return undefined;
}

let accountUiRequest: Promise<AccountUi | undefined> | undefined;
function loadAccountUi(): Promise<AccountUi | undefined> {
  const loaded = accountUi();
  if (loaded) return Promise.resolve(loaded);
  const runtime = globalThis as unknown as {
    WpSuite?: { constants?: { gatey?: { amplifyUiHref?: string } } };
  };
  const url = runtime.WpSuite?.constants?.gatey?.amplifyUiHref;
  if (!url) return Promise.resolve(undefined);
  accountUiRequest ??= new Promise<AccountUi | undefined>((resolve) => {
    const script = document.createElement("script");
    script.src = url;
    script.addEventListener("load", () => resolve(accountUi()), { once: true });
    script.addEventListener("error", () => {
      script.remove();
      resolve(undefined);
    }, { once: true });
    document.head.append(script);
  }).then((ui) => {
    if (!ui) accountUiRequest = undefined;
    return ui;
  });
  return accountUiRequest;
}

onDomReady(async () => {
  const gatey = initializeGatey();
  observe();

  try {
    const key = "wpsuite:guardian:return";
    const previous = JSON.parse(window.sessionStorage.getItem(key) || "null");
    if (previous?.path === window.location.pathname) window.sessionStorage.removeItem(key);
  } catch {
    // A protected return will report an unavailable session store on the sign-in page.
  }

  const store = gatey.cognito.store;

  let decryptedConfig: AuthenticatorConfig | undefined | null;
  let allAttributeKeys: string[];

  const cssVariables: string[] = Array.from(document.styleSheets)
    .filter(
      (sheet) =>
        sheet.href === null || sheet.href.startsWith(window.location.origin),
    )
    .reduce((acc: string[], sheet: CSSStyleSheet) => {
      try {
        const varsFromSheet = Array.from(sheet.cssRules).reduce(
          (def: string[], rule: CSSRule) => {
            const styleRule = rule as CSSStyleRule;

            return styleRule.selectorText === ":root"
              ? [
                  ...def,
                  ...Array.from(styleRule.style).filter((name) =>
                    name.startsWith("--gatey"),
                  ),
                ]
              : def;
          },
          [],
        );
        return [...acc, ...varsFromSheet];
      } catch {
        /**  */
      }

      return acc;
    }, []);

  const replaceValues = (
    key: string,
    attribute: string,
    custom: string,
    value: string,
  ) => {
    let attr =
      "[smartcloud-gatey-account-attribute][data-attribute='" +
      attribute +
      "']";
    if (attribute === "custom") {
      attr += "[data-custom='" + custom + "']";
    }
    let valueToDisplay = value || "";
    // iterate through all the elements that matches the attribute
    jQuery(attr).each((_, element) => {
      const prefix = jQuery(element).attr("data-prefix");
      const postfix = jQuery(element).attr("data-postfix");
      if (prefix) {
        valueToDisplay = prefix + valueToDisplay;
      }
      if (postfix) {
        valueToDisplay += postfix;
      }
      jQuery(element).children(":not(:has(*))").html(valueToDisplay);
      jQuery(element).children(" *:not(:has(*))").html(valueToDisplay);
    });
    jQuery("." + key + ":not(:has(*))").html(valueToDisplay);
    jQuery("." + key + " *:not(:has(*))").html(valueToDisplay);
  };

  let accountRefresh = 0;
  const refresh = async (signedIn: boolean) => {
    const revision = ++accountRefresh;
    if (signedIn) {
      if (gatey.cognito.getUserAttributes) {
        const attrs = await gatey.cognito.getUserAttributes();
        if (revision !== accountRefresh) return;
        const processedAttrs: string[] = [];
        if (attrs) {
          const formFields = decryptedConfig?.formFields ?? [];
          const needsLabels = formFields.some((field) =>
            !!attrs[field.name] &&
            (field.type === "country" || field.type === "select" || field.type === "radio"),
          );
          const ui = needsLabels ? await loadAccountUi() : undefined;
          if (revision !== accountRefresh) return;
          if (ui) {
            const customTranslations = getStoreSelect(await store).getCustomTranslations();
            if (revision !== accountRefresh) return;
            I18n.putVocabularies(ui.translations);
            I18n.putVocabularies(customTranslations || {});
          }
          Object.keys(attrs).forEach((attr) => {
            const field =
              ui?.defaultFormFieldOptions[attr as AuthFieldsWithDefaults] ??
              formFields.find((field) => field.name === attr);
            let value = attrs[attr] as string;
            if (value) {
              if (ui && field?.type === "country") {
                const country = ui.countries.all.find(
                  (country) =>
                    country.alpha3?.toLocaleLowerCase() ===
                      value.toLocaleLowerCase() ||
                    country.alpha2?.toLocaleLowerCase() ===
                      value.toLocaleLowerCase(),
                );
                if (country) {
                  value = ui.translate(country.name);
                }
              } else if (ui && (field?.type === "select" || field?.type === "radio")) {
                const options = field?.values ?? [];
                const option = options.find((option) => option.value === value);
                if (option) {
                  value = ui.translate(option.label);
                }
              }
            }
            replaceValues(
              "smartcloud-gatey-account-attribute-" + attr.replaceAll(":", "-"),
              attr.startsWith("custom:") ? "custom" : attr,
              attr.startsWith("custom:") ? attr.substring(7) : "",
              value ?? "&nbsp;",
            );
            root.style.setProperty(
              "--gatey-account-attribute-" + attr.replaceAll(":", "-"),
              "'" + (value ?? "") + "'",
            );
            processedAttrs.push(attr);
          });
        }
        allAttributeKeys?.forEach((key) => {
          if (!processedAttrs.includes(key)) {
            replaceValues(
              "gatey-account-attribute-" + key.replaceAll(":", "-"),
              key.startsWith("custom:") ? "custom" : key,
              key.startsWith("custom:") ? key.substring(7) : "",
              "&nbsp;",
            );
            root.style.setProperty(
              "--gatey-account-attribute-" + key.replaceAll(":", "-"),
              "''",
            );
          }
        });
      }
      if (gatey.cognito.getMfaPreferences) {
        const mfaPreferences = await gatey.cognito.getMfaPreferences();
        if (revision !== accountRefresh) return;
        root.style.setProperty(
          "--gatey-account-mfa-enabled",
          mfaPreferences?.enabled?.includes("TOTP") ? "flex" : "none",
        );
        root.style.setProperty(
          "--gatey-account-mfa-not-enabled",
          mfaPreferences?.enabled?.includes("TOTP") ? "none" : "flex",
        );
      }
    }

    const authenticated =
      signedIn && gatey.cognito.isAuthenticated
        ? await gatey.cognito.isAuthenticated()
        : false;
    if (revision !== accountRefresh) return;
    root.style.setProperty(
      "--gatey-account-authenticated",
      authenticated ? "flex" : "none",
    );
    root.style.setProperty(
      "--gatey-account-not-authenticated",
      authenticated ? "none" : "flex",
    );
    if (gatey.cognito.getGroups) {
      const groups = signedIn && (await gatey.cognito.getGroups());
      cssVariables.forEach((property: string) => {
        if (property.startsWith("--gatey-account-group")) {
          root.style.setProperty(
            property,
            property.includes("-not-") &&
              (!groups ||
                !groups.includes(
                  property.substring("--gatey-account-group-not-".length),
                ))
              ? "flex"
              : "none",
          );
        }
      });
      if (groups) {
        groups.forEach((group) => {
          root.style.setProperty(
            "--gatey-account-group-" + group.toLocaleLowerCase(),
            "flex",
          );
          root.style.setProperty(
            "--gatey-account-group-not-" + group.toLocaleLowerCase(),
            "none",
          );
        });
      }
    }
    root.style.setProperty("--gatey-not-initialized", "none");
    root.style.setProperty("--gatey-initialized", "flex");
  };

  store.then(async (store) => {
    decryptedConfig = getStoreSelect(store).getConfig();
    const apiConfiguration =
      decryptedConfig?.apiConfigurations?.secondary?.domains &&
      window.location.hostname
        .toLowerCase()
        .match(
          decryptedConfig.apiConfigurations.secondary?.domains.toLowerCase(),
        ) &&
      decryptedConfig.apiConfigurations?.secondary?.apis?.length
        ? decryptedConfig.apiConfigurations.secondary
        : decryptedConfig?.apiConfigurations?.default;
    const signInHook = apiConfiguration?.signInHook;
    const hookApi = apiConfiguration?.apis.find((api) => api.name === signInHook?.apiName);
    const guardianUrl = (() => {
      if (!signInHook || !hookApi) return;
      try {
        const url = new URL(hookApi.endpoint.replace(/\/$/, "") + signInHook.path);
        if (
          url.origin === window.location.origin &&
          url.protocol === "https:" &&
          url.pathname === "/issue-cookie" &&
          !url.username && !url.password &&
          (url.searchParams.get("action") ?? "signin") === "signin" &&
          (signInHook.options?.queryParams?.action ?? "signin") === "signin"
        ) return url;
      } catch {
        return;
      }
    })();
    Object.assign(gatey.cognito, {
      async prepareProtectedReturn(target: string): Promise<"ready" | "denied" | "unavailable"> {
        if (!guardianUrl) return "unavailable";
        try {
          const destination = new URL(target);
          if (destination.origin !== guardianUrl.origin || destination.username || destination.password) {
            return "unavailable";
          }
          const session = await loadAuthSession({ forceRefresh: true });
          const token = session.tokens?.accessToken;
          if (!token) return "unavailable";
          const url = new URL(guardianUrl);
          url.searchParams.set("action", "signin");
          url.searchParams.set("return_path", destination.pathname);
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token.toString()}` },
            credentials: "same-origin",
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(8000),
          });
          if (response.status === 403) return "denied";
          return response.status === 204 && response.headers.get("X-WPSuite-Guardian-Return") === "ready"
            ? "ready"
            : "unavailable";
        } catch {
          return "unavailable";
        }
      },
    });
    const allAttrs = [];
    if (decryptedConfig?.formFields) {
      allAttrs.push(...Object.keys(decryptedConfig.formFields));
    }
    allAttributeKeys = Array.from(new Set(allAttrs));
    gatey.settings.signUpAttributes.forEach((attr) => {
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
              const guardianReturn = guardianUrl &&
                new URLSearchParams(window.location.search).get("wpsuite_guardian") === "1";
              login(guardianReturn ? undefined : signInHook).then((nextUrl) => {
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
      },
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
      },
    );

    observeStore(
      store,
      (state) => state.reloadUserAttributes,
      (reload) => {
        if (reload) {
          loadUserAttributes()
            .then((userAttributes) =>
              dispatch(store).setAccount({
                ...getStoreSelect(store).getAccount(),
                userAttributes,
              }),
            )
            .catch((err) => {
              console.error(err);
              dispatch(store).clearAccount();
            });
        }
      },
    );

    observeStore(
      store,
      (state) => state.reloadMFAPreferences,
      (reload) => {
        if (reload) {
          loadMFAPreferences()
            .then((mfaPreferences) =>
              dispatch(store).setAccount({
                ...getStoreSelect(store).getAccount(),
                mfaPreferences,
              }),
            )
            .catch((err) => {
              console.error(err);
              dispatch(store).clearAccount();
            });
        }
      },
    );

    observeStore(
      store,
      (state) => state.account,
      (account) => {
        const signedIn = !!(account as Account)?.username;
        dispatch(store).setSignedIn(signedIn);
        refresh(signedIn);
      },
    );

    observeStore(
      store,
      (state) => state.language,
      () => {
        const ui = accountUi();
        if (ui) I18n.putVocabularies(ui.translations);
        I18n.putVocabularies(
          getStoreSelect(store).getCustomTranslations() || {},
        );
        gatey.cognito
          .isAuthenticated()
          .then((authenticated) => refresh(authenticated));
      },
    );

    observeStore(
      store,
      (state) => state.direction,
      () => {
        gatey.cognito
          .isAuthenticated()
          .then((authenticated) => refresh(authenticated));
      },
    );
  });
});
