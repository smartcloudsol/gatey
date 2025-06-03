import {
  createRef,
  useState,
  useEffect,
  type FunctionComponent,
  type ReactNode,
} from "react";
import { InspectorControls, BlockControls } from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  ComboboxControl,
  RadioControl,
  TextControl,
  PanelBody,
  ToolbarGroup,
  ToolbarDropdownMenu,
} from "@wordpress/components";
import { seen, check, currencyDollar } from "@wordpress/icons";
import { __ } from "@wordpress/i18n";

import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "@aws-amplify/auth";
import { get } from "@aws-amplify/api";

import { defaultDarkModeOverride, ThemeProvider } from "@aws-amplify/ui-react";

import {
  AuthenticatorConfig,
  store,
  TEXT_DOMAIN,
  type Store,
} from "@smart-cloud/gatey-core";

import { type Screen } from "./index";
import { EditorBlockProps } from "./edit";
import { App, type PreviewType } from "./app";

export interface Attributes {
  anchor: string;
}

export interface EditorBlock {
  clientId: string;
  attributes: Attributes;
  innerBlocks: EditorBlock[];
}

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

const apiUrl =
  window.location.host === "dev.wpsuite.io"
    ? "https://api.wpsuite.io/dev"
    : "https://api.wpsuite.io";

const configUrl =
  window.location.host === "dev.wpsuite.io"
    ? "https://wpsuite.io/static/config/dev.json"
    : "https://wpsuite.io/static/config/prod.json";

const currentPlan = __(" (your current plan)", TEXT_DOMAIN);

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
    signingInMessage,
    signingOutMessage,
    redirectingMessage,
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
  const [previewScreen, setPreviewScreen] = useState<Screen>("signIn");

  const editorRef = createRef<HTMLDivElement>();

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
            Gatey.siteSettings.siteId,
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

  return (
    <div ref={editorRef}>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <ComboboxControl
            label={__("Initial Screen", TEXT_DOMAIN)}
            value={screen || ""}
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
              }
            }}
            help={__(
              "This will set the initial screen of the authenticator.",
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
              "This will set the variation of the authenticator. 'Default' is a full page, 'Modal' is a modal dialog.",
              TEXT_DOMAIN
            )}
          />
          <RadioControl
            label={__("Color Mode", TEXT_DOMAIN)}
            selected={colorMode || "system"}
            options={[
              { label: __("Light", TEXT_DOMAIN), value: "light" },
              { label: __("Dark", TEXT_DOMAIN), value: "dark" },
              { label: __("System", TEXT_DOMAIN), value: "system" },
            ]}
            onChange={(value) => {
              if (value === "system" || value === "light" || value === "dark") {
                setAttributes({ colorMode: value });
              }
            }}
            help={__(
              "This will set the color mode for the authenticator. 'System' will use the user's system preference.",
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
              "This message will be displayed while the user is signing in.",
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
              "This message will be displayed while the user is signing out.",
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
              "This message will be displayed while the user is being redirected.",
              TEXT_DOMAIN
            )}
          />
        </PanelBody>
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
                icon: previewMode === "BASIC" ? check : null,
                title:
                  __("Basic", TEXT_DOMAIN) +
                  (siteSubscriptionType === "BASIC" ? currentPlan : ""),
                onClick: () => setPreviewMode("BASIC"),
              },
              {
                icon: previewMode === "PROFESSIONAL" ? check : null,
                title:
                  __("Pro+", TEXT_DOMAIN) +
                  (siteSubscriptionType && siteSubscriptionType !== "BASIC"
                    ? currentPlan
                    : ""),
                onClick: () => setPreviewMode("PROFESSIONAL"),
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
      </BlockControls>
      <>
        {fulfilledStore && siteSettings !== undefined ? (
          <ThemeProvider theme={theme} colorMode={colorMode}>
            <App
              id="gatey-block"
              screen={previewScreen}
              variation={variation}
              signingInMessage={signingInMessage}
              signingOutMessage={signingOutMessage}
              redirectingMessage={redirectingMessage}
              store={fulfilledStore}
              nonce={Gatey.nonce}
              editorRef={editorRef}
              isPreview={true}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              siteSettings={siteSettings}
              siteSubscriptionType={siteSubscriptionType}
            >
              {children}
            </App>
          </ThemeProvider>
        ) : (
          <>Loading configuration...</>
        )}
        {children}
      </>
    </div>
  );
};
