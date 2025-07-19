import {
  createRef,
  useState,
  useEffect,
  type FunctionComponent,
  type ReactNode,
} from "react";
import { InspectorControls, BlockControls } from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import { useLayoutEffect, useRef } from "@wordpress/element";
import {
  ComboboxControl,
  CheckboxControl,
  RadioControl,
  TextControl,
  TextareaControl,
  PanelBody,
  ToolbarGroup,
  ToolbarDropdownMenu,
  ToolbarButton,
} from "@wordpress/components";
import { seen, check, settings, currencyDollar, close } from "@wordpress/icons";
import { __ } from "@wordpress/i18n";

import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "@aws-amplify/auth";
import { get } from "@aws-amplify/api";

import { translate } from "@aws-amplify/ui";

import {
  defaultDarkModeOverride,
  ThemeProvider,
  type Direction,
} from "@aws-amplify/ui-react";

import {
  AuthenticatorConfig,
  store,
  TEXT_DOMAIN,
  type Store,
} from "@smart-cloud/gatey-core";

import {
  colorModeOptions,
  directionOptions,
  languageOptions,
  type Language,
} from "../index";
import { type Screen } from "./index";
import { EditorBlockProps } from "./edit";
import { type PreviewType } from "./theme";
import { App } from "./app";
import { RecaptchaProvider } from "./recaptcha";

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

export interface Attributes {
  anchor: string;
}

export interface EditorBlock {
  attributes: Attributes;
  innerBlocks: EditorBlock[];
}

const apiUrl =
  window.location.host === "dev.wpsuite.io"
    ? "https://api.wpsuite.io/dev"
    : "https://api.wpsuite.io";

const configUrl =
  window.location.host === "dev.wpsuite.io"
    ? "https://wpsuite.io/static/config/dev.json"
    : "https://wpsuite.io/static/config/prod.json";

const currentPlan = __(" (your current plan)", TEXT_DOMAIN);

const useScopedCssCompat = (id: string, css: string) => {
  const latestCss = useRef(css);
  latestCss.current = css;

  useLayoutEffect(() => {
    const iframe = document.querySelector(
      'iframe[name="editor-canvas"], iframe.block-editor-iframe'
    ) as HTMLIFrameElement | null;
    const doc = iframe?.contentDocument;
    if (!doc?.head) return;

    let tag = doc.getElementById(id) as HTMLStyleElement | null;
    if (!tag) {
      tag = doc.createElement("style");
      tag.id = id;
      doc.head.appendChild(tag);
    }
    if (tag.textContent !== latestCss.current) {
      tag.textContent = latestCss.current;
    }
    return () => tag?.remove();
  }, [id, css]);
};

export const Block: FunctionComponent<
  BlockEditProps<EditorBlockProps> & { children: ReactNode }
> = (
  props: BlockEditProps<EditorBlockProps> & {
    children: ReactNode;
  }
) => {
  const { children, attributes, setAttributes } = props;
  const {
    screen,
    variation,
    colorMode,
    language,
    direction,
    showOpenButton,
    openButtonTitle,
    signingInMessage,
    signingOutMessage,
    redirectingMessage,
    totpIssuer,
    uid,
    customCSS,
  } = attributes;

  const [amplifyConfigured, setAmplifyConfigured] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [siteSettings, setSiteSettings] =
    useState<AuthenticatorConfig | null>();
  const [siteSubscriptionType, setSiteSubscriptionType] = useState<
    string | null
  >();
  const [fulfilledStore, setFulfilledStore] = useState<Store>();
  const [previewMode, setPreviewMode] = useState<PreviewType>();
  const [previewScreen, setPreviewScreen] = useState<Screen>(
    screen || "signIn"
  );
  const [themeDirection, setThemeDirection] = useState<Direction>();
  const [title, setTitle] = useState<string>();
  const [currentLanguage, setCurrentLanguage] = useState<string>();

  const [showCustomization, setShowCustomization] = useState<boolean>(false);
  const [previewZIndex, setPreviewZIndex] = useState<number>();

  const editorRef = createRef<HTMLDivElement>();

  const scopedCSS = attributes.customCSS?.replace(
    /selector/g,
    `.wp-block-css-box-${uid}`
  );

  useScopedCssCompat(`css-${uid}`, scopedCSS || "");

  useEffect(() => {
    if (amplifyConfigured && !loadingSubscription) {
      setLoadingSubscription(true);
      if (Gatey.siteSettings.accountId && Gatey.siteSettings.siteId) {
        get({
          apiName: "backend",
          path:
            "/account/" +
            Gatey.siteSettings.accountId +
            "/site/" +
            Gatey.siteSettings.siteId +
            (Gatey.siteSettings.siteKey ? "/settings" : ""),
          options: {
            headers: Gatey.siteSettings.siteKey
              ? {
                  "X-Site-Key": Gatey.siteSettings.siteKey,
                }
              : {},
          },
        })
          .response.then((response) => response.body.json())
          .then((response) => {
            const site = response as unknown as {
              settings: AuthenticatorConfig;
              subscriptionType: string;
            };
            setSiteSettings(site?.settings ?? null);
            setSiteSubscriptionType(site?.subscriptionType ?? null);
          })
          .catch((err) => {
            console.error("Error:", (err as Error).message);
            setSiteSettings(null);
            setSiteSubscriptionType(null);
          });
      } else {
        setSiteSettings(null);
        setSiteSubscriptionType(null);
      }
    }
  }, [amplifyConfigured, loadingSubscription]);

  useEffect(() => {
    if (amplifyConfigured && siteSettings !== undefined) {
      Amplify.configure({});
    }
  }, [amplifyConfigured, siteSettings]);

  useEffect(() => {
    store.then((fulfilledStore) => {
      setFulfilledStore(fulfilledStore);
    });
    fetch(configUrl)
      .then((response) => response.json())
      .then((data) => {
        if (data?.userPoolId && data?.appClientPlugin && data?.identityPoolId) {
          Amplify.configure(
            {
              Auth: {
                Cognito: {
                  userPoolId: data.userPoolId,
                  userPoolClientId: data.appClientPlugin,
                  identityPoolId: data.identityPoolId,
                },
              },
              API: {
                REST: {
                  backend: {
                    endpoint: apiUrl,
                  },
                  backendWithIam: {
                    endpoint: apiUrl,
                  },
                },
              },
            },
            {
              API: {
                REST: {
                  headers: async (options: { apiName: string }) => {
                    if (options.apiName === "backend") {
                      try {
                        const authSession = await fetchAuthSession();
                        if (authSession?.tokens?.accessToken) {
                          return {
                            Authorization: `Bearer ${authSession.tokens.accessToken}`,
                          };
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                    return {};
                  },
                },
              },
            } as Record<string, unknown>
          );
          setAmplifyConfigured(true);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        setAmplifyConfigured(true);
      });
  }, []);

  useEffect(() => {
    if (language) {
      setCurrentLanguage(language);
    }
    if (showOpenButton) {
      let title;
      switch (screen) {
        default:
        case "signIn":
          title = translate("Sign In");
          break;
        case "signUp":
          title = translate("Sign Up");
          break;
        case "forgotPassword":
          title = translate("Forgot Password");
          break;
        case "changePassword":
          title = translate("Change Password");
          break;
        case "editAccount":
          title = translate("Edit Account");
          break;
        case "setupTotp":
          title = translate("Setup TOTP");
          break;
      }
      setTitle(title);
    }
  }, [screen, language, showOpenButton, setAttributes]);

  useEffect(() => {
    let td = direction;
    if (!direction || direction === "auto") {
      td = language === "ar" || language === "he" ? "rtl" : "ltr";
    }
    setThemeDirection(td as Direction);
  }, [direction, language]);

  return (
    <div ref={editorRef}>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <ComboboxControl
            label={__("Initial Screen", TEXT_DOMAIN)}
            value={screen || "signIn"}
            options={
              process.env.GATEY_PREMIUM
                ? [
                    {
                      label: __("Sign In (default)", TEXT_DOMAIN),
                      value: "signIn",
                    },
                    { label: __("Sign Up", TEXT_DOMAIN), value: "signUp" },
                    {
                      label: __("Forgot Password", TEXT_DOMAIN),
                      value: "forgotPassword",
                    },
                    {
                      label: __("Edit Account", TEXT_DOMAIN),
                      value: "editAccount",
                    },
                    {
                      label: __("Change Password", TEXT_DOMAIN),
                      value: "changePassword",
                    },
                    {
                      label: __("Setup TOTP", TEXT_DOMAIN),
                      value: "setupTotp",
                    },
                  ]
                : [
                    {
                      label: __("Sign In (default)", TEXT_DOMAIN),
                      value: "signIn",
                    },
                    { label: __("Sign Up", TEXT_DOMAIN), value: "signUp" },
                  ]
            }
            onChange={(value) => {
              if (
                value === "forgotPassword" ||
                value === "signIn" ||
                value === "signUp" ||
                value === "setupTotp" ||
                value === "editAccount" ||
                value === "changePassword"
              ) {
                setAttributes({ screen: value });
                setPreviewScreen(value as Screen);
              }
            }}
            help={__(
              "Choose the first screen that the authenticator shows.",
              TEXT_DOMAIN
            )}
          />
          <RadioControl
            label={__("Variation", TEXT_DOMAIN)}
            selected={variation || "default"}
            options={[
              { label: __("Default", TEXT_DOMAIN), value: "default" },
              { label: __("Modal", TEXT_DOMAIN), value: "modal" },
            ]}
            onChange={(value) => {
              if (value === "default" || value === "modal") {
                setAttributes({ variation: value });
              }
            }}
            help={__(
              "Choose whether the authenticator appears as a full page (Default) or a modal dialog (Modal).",
              TEXT_DOMAIN
            )}
          />
          <RadioControl
            label={__("Color Mode", TEXT_DOMAIN)}
            selected={colorMode || "system"}
            options={colorModeOptions}
            onChange={(value) => {
              if (value === "system" || value === "light" || value === "dark") {
                setAttributes({ colorMode: value });
              }
            }}
            help={__(
              "Select the authenticator’s color scheme—Light, Dark, or System (follows the user’s system preference).",
              TEXT_DOMAIN
            )}
          />
          <ComboboxControl
            label={__("Language", TEXT_DOMAIN)}
            value={language || "system"}
            options={languageOptions}
            onChange={(value) => {
              if (value as Language) {
                setAttributes({ language: value as Language });
              }
            }}
            help={__("Set the authenticator’s display language.", TEXT_DOMAIN)}
          />
          <RadioControl
            label={__("Direction", TEXT_DOMAIN)}
            selected={direction || "auto"}
            options={directionOptions}
            onChange={(value) => {
              if (value === "auto" || value === "ltr" || value === "rtl") {
                setAttributes({ direction: value });
              }
            }}
            help={__(
              "Choose the authenticator’s layout direction—Auto (default; follows the selected language), Left‑to‑Right, or Right‑to‑Left.",
              TEXT_DOMAIN
            )}
          />
          <TextControl
            label={__("TOTP Issuer", TEXT_DOMAIN)}
            value={totpIssuer || ""}
            placeholder="AWSCognito"
            onChange={(value) => {
              setAttributes({ totpIssuer: value });
            }}
            help={__(
              "Enter the issuer name that will appear in the authenticator app (e.g., “My Company”).",
              TEXT_DOMAIN
            )}
          />
          <CheckboxControl
            label={__("Show Open Button", TEXT_DOMAIN)}
            checked={showOpenButton || false}
            onChange={(value) => {
              setAttributes({ showOpenButton: value });
            }}
            help={__(
              "Hide the authenticator behind a button. The button label defaults to the current screen title, or you can customise it in Open Button Title.",
              TEXT_DOMAIN
            )}
          />
          <TextControl
            label={__("Open Button Title", TEXT_DOMAIN)}
            value={openButtonTitle || ""}
            placeholder={title || ""}
            onChange={(value) => {
              setAttributes({ openButtonTitle: value });
            }}
            help={__(
              "Override the button label. Leave empty to use the current screen’s default title.",
              TEXT_DOMAIN
            )}
          />
          <TextControl
            label={__("Signing In Message", TEXT_DOMAIN)}
            value={signingInMessage || ""}
            onChange={(value) => {
              setAttributes({ signingInMessage: value });
            }}
            help={__(
              "Specify the text that appears to the user while sign‑in is in progress.",
              TEXT_DOMAIN
            )}
          />
          <TextControl
            label={__("Signing Out Message", TEXT_DOMAIN)}
            value={signingOutMessage || ""}
            onChange={(value) => {
              setAttributes({ signingOutMessage: value });
            }}
            help={__(
              "Specify the text that appears to the user while sign‑out is in progress.",
              TEXT_DOMAIN
            )}
          />
          <TextControl
            label={__("Redirecting Message", TEXT_DOMAIN)}
            value={redirectingMessage || ""}
            onChange={(value) => {
              setAttributes({ redirectingMessage: value });
            }}
            help={__(
              "Specify the text that appears to the user while they are being redirected.",
              TEXT_DOMAIN
            )}
          />
        </PanelBody>
        <PanelBody title={__("Custom CSS", TEXT_DOMAIN)}>
          <TextareaControl
            __nextHasNoMarginBottom
            value={customCSS || ""}
            onChange={(v) => setAttributes({ customCSS: v })}
            help={__(
              "Add custom CSS styles for the authenticator. Use the `selector` keyword to target the authenticator block.",
              TEXT_DOMAIN
            )}
          />
        </PanelBody>{" "}
      </InspectorControls>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarDropdownMenu
            icon={currencyDollar}
            label="Preview Mode"
            controls={[
              {
                icon: previewMode === "FREE" ? check : null,
                title:
                  __("Free", TEXT_DOMAIN) +
                  (!siteSubscriptionType ? currentPlan : ""),
                onClick: () => setPreviewMode("FREE"),
              },
              {
                icon: previewMode === "PAID" ? check : null,
                title:
                  __("Paid", TEXT_DOMAIN) +
                  (siteSubscriptionType === "PAID" ? currentPlan : ""),
                onClick: () => setPreviewMode("PAID"),
              },
            ]}
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarDropdownMenu
            icon={seen}
            label="Preview Screen"
            controls={
              process.env.GATEY_PREMIUM
                ? [
                    {
                      icon: previewScreen === "signIn" ? check : null,
                      title: __("Sign In (default)", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("signIn"),
                    },
                    {
                      icon: previewScreen === "signUp" ? check : null,
                      title: __("Sign Up", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("signUp"),
                    },
                    {
                      icon: previewScreen === "forgotPassword" ? check : null,
                      title: __("Forgot Password", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("forgotPassword"),
                    },
                    {
                      icon: previewScreen === "editAccount" ? check : null,
                      title: __("Edit Account", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("editAccount"),
                    },
                    {
                      icon: previewScreen === "changePassword" ? check : null,
                      title: __("Change Password", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("changePassword"),
                    },
                    {
                      icon: previewScreen === "setupTotp" ? check : null,
                      title: __("Setup TOTP", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("setupTotp"),
                    },
                  ]
                : [
                    {
                      icon: previewScreen === "signIn" ? check : null,
                      title: __("Sign In (default)", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("signIn"),
                    },
                    {
                      icon: previewScreen === "signUp" ? check : null,
                      title: __("Sign Up", TEXT_DOMAIN),
                      onClick: () => setPreviewScreen("signUp"),
                    },
                  ]
            }
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarButton
            icon={showCustomization ? close : settings}
            label={__(
              showCustomization ? "Hide Customization" : "Show Customization",
              TEXT_DOMAIN
            )}
            onClick={() => {
              setShowCustomization(!showCustomization);
            }}
          />
        </ToolbarGroup>
      </BlockControls>
      <div style={{ position: "relative", zIndex: previewZIndex }}>
        {fulfilledStore && siteSettings !== undefined ? (
          <ThemeProvider
            theme={theme}
            colorMode={colorMode}
            direction={themeDirection}
          >
            {Gatey.settings?.reCaptchaPublicKey ? (
              <RecaptchaProvider
                siteKey={Gatey.settings?.reCaptchaPublicKey}
                useEnterprise={Gatey.settings?.useRecaptchaEnterprise}
                useRecaptchaNet={Gatey.settings?.useRecaptchaNet}
              >
                <App
                  id={`gatey-authenticator-block-${uid}`}
                  className={`wp-block-css-box-${uid}`}
                  screen={previewScreen}
                  variation={variation}
                  language={currentLanguage as Language}
                  direction={themeDirection}
                  showOpenButton={showOpenButton}
                  openButtonTitle={openButtonTitle}
                  signingInMessage={signingInMessage}
                  signingOutMessage={signingOutMessage}
                  redirectingMessage={redirectingMessage}
                  store={fulfilledStore}
                  nonce={Gatey.nonce}
                  editorRef={editorRef}
                  isPreview={true}
                  previewMode={previewMode}
                  setPreviewMode={setPreviewMode}
                  setPreviewZIndex={setPreviewZIndex}
                  siteSettings={siteSettings}
                  siteSubscriptionType={siteSubscriptionType}
                >
                  {children}
                </App>
              </RecaptchaProvider>
            ) : (
              <App
                id={`gatey-authenticator-block-${uid}`}
                className={`wp-block-css-box-${uid}`}
                screen={previewScreen}
                variation={variation}
                language={currentLanguage as Language}
                direction={themeDirection}
                showOpenButton={showOpenButton}
                openButtonTitle={openButtonTitle}
                signingInMessage={signingInMessage}
                signingOutMessage={signingOutMessage}
                redirectingMessage={redirectingMessage}
                store={fulfilledStore}
                nonce={Gatey.nonce}
                editorRef={editorRef}
                isPreview={true}
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                setPreviewZIndex={setPreviewZIndex}
                siteSettings={siteSettings}
                siteSubscriptionType={siteSubscriptionType}
              >
                {children}
              </App>
            )}
          </ThemeProvider>
        ) : (
          <>{__("Loading configuration...", TEXT_DOMAIN)}</>
        )}
        <div style={{ display: showCustomization ? "block" : "none" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
