import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type AuthContext } from "@smart-cloud/aws-amplify-ui";
import { confirmSignIn, forgetDevice, rememberDevice, signUp, type SignUpInput, type SignUpOutput } from "aws-amplify/auth";
import { confirmSignInWithDevicePreference } from "./confirm-sign-in";

import {
  AccountSettings,
  Authenticator,
  Flex,
  Heading,
  Link,
  Text,
  useAuthenticator,
  useAuthenticatorI18n,
  View,
  type Direction,
} from "@smart-cloud/aws-amplify-ui-react";

import "@smart-cloud/aws-amplify-ui-react/styles.css";

import { useSelect } from "@wordpress/data";
import { guardianReturnMessages, signInMessages } from "./gatey-translations";

import {
  createGateyWebAuthnMfaServices,
  getGateyAuthenticatorBindingKey,
  getGateyPlugin,
  resolveGateyRedirectTarget,
  resolveGateyTarget,
  waitForGateyReady,
  getStoreDispatch,
  getStoreSelect,
  type Account,
  type AuthenticatorConfig,
} from "@smart-cloud/gatey-core";

import { getWpSuite, getRecaptcha } from "@smart-cloud/wpsuite-core";
import { type ThemeProps } from "./theme";

type EventDetails = {
  [key: string]: unknown;
};

export interface DefaultComponentOptions {
  Header?: () => React.JSX.Element;
  Footer?: () => React.JSX.Element;
}
export interface DefaultComponentOptionsWithFormFields
  extends DefaultComponentOptions {
  FormFields?: () => React.JSX.Element;
}
export type DefaultComponents = {
  [key in keyof DefaultComponentDescriptors]: DefaultComponentOptions;
} & {
  SignUp?: DefaultComponentOptionsWithFormFields;
  EditAccount?: DefaultComponentOptionsWithFormFields;
  Header?: () => React.JSX.Element;
  Footer?: () => React.JSX.Element;
};

export type DefaultComponentDescriptorKeys =
  | "Header"
  | "Footer"
  | "SignIn"
  | "SignUp"
  | "ForgotPassword"
  | "EditAccount"
  | "PasskeySettings"
  | "RememberedDevices"
  | "SetupTotp"
  | "ConfirmSignIn"
  | "ConfirmSignUp"
  | "ConfirmResetPassword"
  | "ConfirmVerifyUser"
  | "ForceNewPassword"
  | "VerifyUser"
  | "ChangePassword";

export type DefaultComponentDescriptors = {
  [key in DefaultComponentDescriptorKeys]?: string[] | null;
};

const gatey = getGateyPlugin();
const wpsuite = getWpSuite();

const normalizeRedirectUrl = (url: string): string => {
  const resolved = new URL(url, window.location.href);
  const normalizedPath = resolved.pathname.replace(/\/+$/, "") || "/";

  return `${resolved.origin}${normalizedPath}${resolved.search}`;
};

export const Login = (
  props: ThemeProps & {
    bindingKey: string;
    config: AuthenticatorConfig | null | undefined;
    containerRef: React.RefObject<HTMLDivElement>;
  },
) => {
  const {
    store,
    screen,
    variation,
    language,
    direction,
    signingInMessage,
    signingOutMessage,
    redirectingMessage,
    totpIssuer,
    isPreview,
    children,
    editorRef,
    config,
    containerRef,
    bindingKey,
  } = props;

  const lifecycle = useRef({ mounted: true, generation: 0 });
  useEffect(() => {
    lifecycle.current.mounted = true;
    const invalidate = () => {
      lifecycle.current.mounted = false;
      lifecycle.current.generation += 1;
    };
    window.addEventListener("wpsuite:backend-profile-changed", invalidate);
    return () => {
      invalidate();
      window.removeEventListener("wpsuite:backend-profile-changed", invalidate);
    };
  }, []);
  const mfaServices = useMemo(
    () => ({
      handleGetWebAuthnMfaCapability: async () => {
        const generation = lifecycle.current.generation;
        const isCurrent = () =>
          lifecycle.current.mounted &&
          lifecycle.current.generation === generation &&
          getGateyAuthenticatorBindingKey() === bindingKey;
        return createGateyWebAuthnMfaServices(isCurrent).handleGetWebAuthnMfaCapability();
      },
    }),
    [bindingKey],
  );

  const { translate } = useAuthenticatorI18n();
  const [logoutHandled, setLogoutHandled] = useState<boolean>(false);
  const [loginHandled, setLoginHandled] = useState<boolean>(false);
  const [message, setMessage] = useState<string>();
  const [navigationTarget, setNavigationTarget] = useState<string>();
  const [editorContent, setEditorContent] = useState<string | undefined>();
  const [customBlockParser, setCustomBlockParser] =
    useState<
      (
        config: AuthenticatorConfig,
        isPreview: boolean,
        account: Account | undefined,
        children: React.ReactNode,
        editorContent: string | undefined,
      ) => DefaultComponents
    >();

  const account: Account | undefined = useSelect(
    () => getStoreSelect(store).getAccount(),
    [],
  );

  const nextUrl: string | undefined | null = useSelect(
    () => getStoreSelect(store).getNextUrl(),
    [],
  );

  const signedIn: boolean = useSelect(
    () => getStoreSelect(store).isSignedIn(),
    [],
  );

  const {
    clearAccount,
    reloadUserAttributes,
    reloadMFAPreferences,
    setSignedIn,
  }: {
    clearAccount: () => void;
    reloadUserAttributes: () => void;
    reloadMFAPreferences: () => void;
    setSignedIn: (signedIn: boolean) => void;
  } = getStoreDispatch(store);

  const params = new URLSearchParams(window.location.search);

  const {
    authStatus,
    isPending,
    route,
    toSignIn,
    toSignUp,
    toForgotPassword,
    toSetupTotp,
    toEditAccount,
    toPasskeySettings,
    toRememberedDevices,
  } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
    context.isPending,
    context.route,
  ]);

  const [wasSignedIn] = useState<boolean>(() => signedIn && !account?.loaded);
  const [loggingOut] = useState<boolean>(
    wasSignedIn && params.get("loggedout") === "true",
  );
  const [redirectTo] = useState<string | null>(params.get("redirect_to"));
  const [guardianReturn] = useState(() => params.get("wpsuite_guardian") === "1");
  const [wordpressReauth] = useState(() => params.get("reauth") === "1");
  const reauthStarted = useRef(false);
  const returnStarted = useRef(false);
  const [returnStatus, setReturnStatus] = useState("");
  const resolvedRedirectTo = useMemo(
    () => resolveGateyRedirectTarget(redirectTo),
    [redirectTo],
  );

  useEffect(() => {
    if (!navigationTarget) return;
    // Let the redirect status paint before leaving the page.
    let navigationFrame = 0;
    const statusFrame = window.requestAnimationFrame(() => {
      navigationFrame = window.requestAnimationFrame(() => {
        if (lifecycle.current.mounted) window.location.assign(navigationTarget);
      });
    });
    return () => {
      window.cancelAnimationFrame(statusFrame);
      window.cancelAnimationFrame(navigationFrame);
    };
  }, [navigationTarget]);

  const handleReCaptchaVerify = useCallback(async () => {
    if (!wpsuite?.siteSettings?.reCaptchaPublicKey) {
      return;
    }
    const { execute } = await getRecaptcha(
      wpsuite.siteSettings?.useRecaptchaEnterprise || false,
    );

    if (!execute) {
      return;
    }

    const token = await execute(wpsuite.siteSettings?.reCaptchaPublicKey, {
      action: "signup",
    });
    return token;
  }, []);

  const dispatchEvent = useCallback(
    (name: string, details?: EventDetails) => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const payload = {
        screen: screen,
        ...details,
      };

      jQuery(container).trigger(
        name + ".smartcloud-gatey-authenticator",
        payload,
      );
    },
    [containerRef, screen],
  );

  const redirectIfNeeded = useCallback((target: string | null | undefined, afterSignIn = false) => {
    if (guardianReturn && afterSignIn) {
      if (returnStarted.current) return true;
      returnStarted.current = true;
      setMessage(undefined);
      setReturnStatus(guardianReturnMessages.checking);
      void (async () => {
        try {
          if (!resolvedRedirectTo || normalizeRedirectUrl(resolvedRedirectTo) === normalizeRedirectUrl(window.location.href)) {
            throw new Error("Invalid return URL");
          }
          const destination = new URL(resolvedRedirectTo);
          const key = "wpsuite:guardian:return";
          const previous = JSON.parse(window.sessionStorage.getItem(key) || "null");
          if (previous?.path === destination.pathname && previous.until > Date.now()) {
            setReturnStatus(guardianReturnMessages.cookieMissing);
            return;
          }
          await waitForGateyReady();
          const cognito = gatey.cognito as typeof gatey.cognito & {
            prepareProtectedReturn?: (url: string) => Promise<"ready" | "denied" | "unavailable">;
          };
          const result = await cognito.prepareProtectedReturn?.(destination.href);
          if (result === "denied") {
            setReturnStatus(guardianReturnMessages.denied);
            return;
          }
          if (result !== "ready") throw new Error("Protected return unavailable");
          window.sessionStorage.setItem(key, JSON.stringify({ path: destination.pathname, until: Date.now() + 120_000 }));
          setNavigationTarget(destination.href);
        } catch {
          setReturnStatus(guardianReturnMessages.unavailable);
        }
      })();
      return true;
    }
    const resolvedTarget = resolveGateyTarget(target);
    if (!resolvedTarget) {
      return false;
    }

    try {
      if (
        normalizeRedirectUrl(resolvedTarget) ===
        normalizeRedirectUrl(window.location.href)
      ) {
        return false;
      }
    } catch {
      if (resolvedTarget === window.location.href) {
        return false;
      }
    }

    if (
      afterSignIn &&
      wasSignedIn &&
      wordpressReauth &&
      resolvedRedirectTo &&
      gatey.settings.integrateWpLogin &&
      gatey.restUrl?.startsWith("http")
    ) {
      if (reauthStarted.current) return true;
      reauthStarted.current = true;
      setReturnStatus(signingInMessage ?? signInMessages.signingIn);
      const generation = lifecycle.current.generation;
      const isCurrent = () =>
        lifecycle.current.mounted && lifecycle.current.generation === generation;

      void (async () => {
        try {
          const key = "wpsuite:gatey:wordpress-return";
          const target = normalizeRedirectUrl(resolvedTarget);
          const previous = JSON.parse(window.sessionStorage.getItem(key) || "null");
          if (previous?.target === target && previous.until > Date.now()) {
            setReturnStatus(signInMessages.wordpressSessionFailed);
            return;
          }

          await waitForGateyReady();
          if (!isCurrent()) return;
          const response = await gatey.cognito.post({ apiName: "admin", path: "/login" }).response;
          const result = await response.body.json();
          if (!isCurrent()) return;
          if (!result || typeof result !== "object" || !("success" in result) || result.success !== true) {
            throw new Error("WordPress session was not restored");
          }

          window.sessionStorage.setItem(key, JSON.stringify({ target, until: Date.now() + 10_000 }));
          setNavigationTarget(resolvedTarget);
        } catch {
          if (isCurrent()) setReturnStatus(signInMessages.wordpressSessionFailed);
        }
      })();
      return true;
    }

    setNavigationTarget(resolvedTarget);
    return true;
  }, [guardianReturn, resolvedRedirectTo, signingInMessage, wasSignedIn, wordpressReauth]);

  const services: AuthContext["services"] = useMemo(
    () => ({
      ...mfaServices,
      async done(): Promise<void> {
        if (screen === "editAccount") {
          reloadUserAttributes();
        }
        if (screen === "setupTotp") {
          reloadMFAPreferences();
        }
        dispatchEvent("done");
      },
      async handleCancel(): Promise<void> {
        dispatchEvent("cancel");
      },
      handleConfirmSignIn: (input) => confirmSignInWithDevicePreference(input, { confirm: confirmSignIn, remember: rememberDevice, forget: forgetDevice }),
      async handleSignUp(input: SignUpInput): Promise<SignUpOutput> {
        if (wpsuite?.siteSettings?.reCaptchaPublicKey) {
          const recaptchaToken = await handleReCaptchaVerify();
          if (recaptchaToken) {
            input.options = input.options || { userAttributes: {} };
            input.options.validationData = {
              recaptchaToken,
            };
          }
        }
        return signUp(input).catch((err) => {
          throw err;
        });
      },
    }),
    [
      mfaServices,
      screen,
      dispatchEvent,
      reloadUserAttributes,
      reloadMFAPreferences,
      handleReCaptchaVerify,
    ],
  );

  useEffect(() => {
    if (editorRef?.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  }, [children, editorRef]);

  useEffect(() => {
    import(
      /* webpackChunkName: "custom-block-parser" */
      process.env.WPSUITE_PREMIUM
        ? "./paid-features/custom-blocks"
        : "./free-features/custom-blocks"
    ).then((module) => {
      setCustomBlockParser(() => module.default);
    });
  }, []);

  const components = useMemo(() => {
    if (config === undefined || customBlockParser === undefined) {
      return undefined;
    }
    if (children && config !== null) {
      return customBlockParser(
        config,
        isPreview,
        account,
        children,
        editorContent,
      );
    }
    return {};
  }, [
    config,
    children,
    isPreview,
    account,
    editorContent,
    customBlockParser,
  ]);

  useEffect(() => {
    if (screen || route === "setup") {
      const sc = route === "setup" ? screen : route;
      switch (sc) {
        case "signUp":
          toSignUp();
          break;
        case "forgotPassword":
          toForgotPassword();
          break;
        case "setupTotp":
          toSetupTotp();
          break;
        case "editAccount":
          toEditAccount();
          break;
        case "passkeySettings":
          toPasskeySettings();
          break;
        case "rememberedDevices":
          toRememberedDevices();
          break;
        case "signIn":
          toSignIn();
          break;
      }
    }
  }, [
    screen,
    route,
    toForgotPassword,
    toSignIn,
    toSignUp,
    toSetupTotp,
    toEditAccount,
    toPasskeySettings,
    toRememberedDevices,
  ]);

  useEffect(() => {
    if (route === "signUp" && gatey.settings?.hideSignUp) {
      queueMicrotask(() => {
        toSignIn();
      });
    }
  }, [route, toSignIn, toSignUp]);

  useEffect(() => {
    gatey.cognito.toSignIn = toSignIn;
    gatey.cognito.toSignUp = toSignUp;
    gatey.cognito.toForgotPassword = toForgotPassword;
    gatey.cognito.toPasskeySettings = toPasskeySettings;
    gatey.cognito.toRememberedDevices = toRememberedDevices;
  }, [
    toForgotPassword,
    toPasskeySettings,
    toRememberedDevices,
    toSignIn,
    toSignUp,
  ]);

  useEffect(() => {
    if (screen !== "signIn" || isPreview || logoutHandled || !loggingOut) {
      return;
    }
    queueMicrotask(() => {
      clearAccount();
      setMessage(signingOutMessage ?? signInMessages.signingOut);
      dispatchEvent("signing-out");
      setLogoutHandled(true);
    });
  }, [
    loggingOut,
    isPreview,
    logoutHandled,
    screen,
    dispatchEvent,
    clearAccount,
    signingOutMessage,
  ]);

  useEffect(() => {
    if (
      !isPreview &&
      screen === "signIn" &&
      !loggingOut &&
      authStatus === "authenticated" &&
      !loginHandled
    ) {
      queueMicrotask(() => {
        if (!wasSignedIn) {
          setLoginHandled(true);
          setSignedIn(true);
          setMessage(signingInMessage ?? signInMessages.signingIn);
          dispatchEvent("signing-in");
        } else {
          dispatchEvent("signed-in");

          const url =
            resolvedRedirectTo ||
            nextUrl ||
            gatey.settings.redirectSignIn ||
            gatey.settings.signInPage;

          if (!redirectIfNeeded(url, true)) {
            setLoginHandled(true);
          }
        }
      });
    }
  }, [
    authStatus,
    resolvedRedirectTo,
    isPreview,
    loggingOut,
    dispatchEvent,
    screen,
    setSignedIn,
    wasSignedIn,
    loginHandled,
    redirectIfNeeded,
    nextUrl,
    signingInMessage,
  ]);

  useEffect(() => {
    if (screen !== "signIn") {
      return;
    }
    queueMicrotask(() => {
      if (loginHandled) {
        if (authStatus === "authenticated") {
          dispatchEvent("signed-in");
          if (nextUrl !== undefined) {
            const url =
              resolvedRedirectTo ||
              nextUrl ||
              gatey.settings.redirectSignIn ||
              gatey.settings.signInPage;
            redirectIfNeeded(url, true);
          }
        } else if (authStatus === "unauthenticated" && route !== "transition") {
          setMessage(undefined);
          dispatchEvent("reset");
        }
      }
      if (logoutHandled && nextUrl !== undefined) {
        dispatchEvent("signed-out");
        const url =
          resolvedRedirectTo ||
          nextUrl ||
          gatey.settings.redirectSignOut ||
          gatey.settings.signInPage;
        redirectIfNeeded(url);
      }
    });
  }, [
    authStatus,
    resolvedRedirectTo,
    route,
    nextUrl,
    loginHandled,
    logoutHandled,
    dispatchEvent,
    redirectIfNeeded,
    screen,
  ]);

  useEffect(() => {
    dispatchEvent("open");
  }, [dispatchEvent]);

  let totpUsername =
    account?.userAttributes?.preferred_username ?? account?.username;
  if (!gatey.settings?.loginMechanisms.includes("username")) {
    totpUsername = gatey.settings?.loginMechanisms.includes("email")
      ? account?.userAttributes?.email
      : account?.userAttributes?.phone_number;
  }

  const statusMessage = navigationTarget
    ? redirectingMessage ?? signInMessages.redirecting
    : returnStatus || message || (
      !isPreview && screen === "signIn" && (authStatus === "configuring" || isPending)
        ? signInMessages.checking
        : undefined
    );

  return (
    <View
      ref={containerRef}
      width={!variation || variation === "default" ? "100%" : "0"}
    >
      <Flex>
        {
          /*!loggingOut &&*/
          components &&
            config !== undefined &&
            (screen === "changePassword" ? (
              <View data-amplify-authenticator data-variation={variation}>
                <View data-amplify-container>
                  <View data-amplify-router>
                    <View
                      data-amplify-form
                      data-amplify-authenticator-changepassword
                    >
                      <AccountSettings.ChangePassword
                        forceInitialState={isPreview}
                        header={components.ChangePassword?.Header}
                        footer={components.ChangePassword?.Footer}
                        onSuccess={() => dispatchEvent("done")}
                        onCancel={services.handleCancel}
                        variation={variation}
                      ></AccountSettings.ChangePassword>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                {statusMessage && (
                  <View data-amplify-authenticator data-variation={variation}>
                    <View data-amplify-container>
                      <View data-amplify-router>
                        <View
                          data-amplify-form
                          data-amplify-authenticator-message
                          style={{
                            textAlign: "center",
                          }}
                        >
                          <Heading level={4} role="status">
                            {translate(statusMessage)}
                          </Heading>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
                {!navigationTarget && !loggingOut && (
                  <>
                    <Authenticator
                      key={bindingKey}
                      loginMechanisms={gatey.settings?.loginMechanisms}
                      language={language}
                      textDirection={direction as Direction}
                      services={services}
                      initialState={screen}
                      signUpAttributes={gatey.settings?.signUpAttributes}
                      socialProviders={gatey.settings?.socialProviders}
                      hideSignUp={gatey.settings?.hideSignUp}
                      customProviders={config?.customProviders}
                      passwordless={gatey.settings?.passwordlessSettings}
                      components={components}
                      forceInitialState={isPreview}
                      variation={variation}
                      totpIssuer={totpIssuer}
                      totpUsername={totpUsername}
                    />
                    {(route === "signIn" || route === "signUp") && (
                      <View
                        data-amplify-authenticator
                        hidden={!gatey.settings?.enablePoweredBy}
                        className={
                          gatey.settings?.enablePoweredBy
                            ? undefined
                            : "sr-only"
                        }
                        marginTop="2px"
                      >
                        <View data-amplify-container>
                          <View
                            data-amplify-router={route}
                            style={{ border: 0, boxShadow: "none" }}
                          >
                            <Text
                              as="p"
                              variation="tertiary"
                              textAlign="right"
                              fontSize="var(--amplify-components-textfield-font-size)"
                            >
                              Powered by{" "}
                              <Link
                                as="a"
                                href="https://wpsuite.io/gatey/"
                                isExternal={true}
                                fontWeight={400}
                              >
                                WPSuite Gatey
                              </Link>
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </div>
            ))
        }
      </Flex>
    </View>
  );
};
