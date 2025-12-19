import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useElementDetector } from "use-detector-hook";

import { translate, type AuthContext } from "@aws-amplify/ui";
import { signUp, type SignUpInput, type SignUpOutput } from "aws-amplify/auth";

import {
  AccountSettings,
  Authenticator,
  Flex,
  Heading,
  Link,
  Text,
  useAuthenticator,
  View,
  type Direction,
} from "@aws-amplify/ui-react";

import "@aws-amplify/ui-react/styles.css";

import { useSelect } from "@wordpress/data";

import {
  getGateyPlugin,
  getStoreDispatch,
  getStoreSelect,
  type Account,
  type AuthenticatorConfig,
} from "@smart-cloud/gatey-core";

import { useRecaptcha } from "./recaptcha";
import { type ThemeProps } from "./theme";

const parseCustomBlocks = await import(
  process.env.WPSUITE_PREMIUM
    ? "./paid-features/custom-blocks"
    : "./free-features/custom-blocks"
);

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

const recaptchaHook = gatey.settings?.reCaptchaPublicKey
  ? useRecaptcha
  : () => ({ executeRecaptcha: null, isReady: true });

export const Login = (
  props: ThemeProps & {
    config: AuthenticatorConfig | null | undefined;
    containerRef: React.RefObject<HTMLDivElement>;
  }
) => {
  const {
    id,
    className,
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
  } = props;

  const [logoutHandled, setLogoutHandled] = useState<boolean>(false);
  const [loginHandled, setLoginHandled] = useState<boolean>(false);
  const [componentVisible, setComponentVisible] = useState(true);
  const [message, setMessage] = useState<string>();
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [editorContent, setEditorContent] = useState<string | undefined>();

  const { executeRecaptcha, isReady: recaptchaIsReady } = recaptchaHook();

  const account: Account | undefined = useSelect(
    () => getStoreSelect(store).getAccount(),
    []
  );

  const nextUrl: string | undefined | null = useSelect(
    () => getStoreSelect(store).getNextUrl(),
    []
  );

  const signedIn: boolean = useSelect(
    () => getStoreSelect(store).isSignedIn(),
    []
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

  const [params] = useSearchParams();

  const [loggingOut] = useState<boolean>(params.get("loggedout") === "true");
  const [redirectTo] = useState<string | null>(params.get("redirect_to"));
  const [reauth] = useState<string | null>(params.get("reauth"));

  const {
    authStatus,
    route,
    toSignIn,
    toSignUp,
    toForgotPassword,
    toSetupTotp,
    toEditAccount,
  } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
    context.route,
  ]);

  const [wasSignedIn] = useState<boolean>(
    signedIn && !account?.loaded && reauth !== "1"
  );

  const isVisible = useElementDetector(
    containerRef,
    { threshold: 0 },
    {
      onTriggerExit: () => setComponentVisible(jQuery("#" + id).length > 0),
    }
  );

  const handleReCaptchaVerify = useCallback(async () => {
    if (!executeRecaptcha || !recaptchaIsReady) {
      console.error(
        "ReCaptcha is not available",
        executeRecaptcha,
        recaptchaIsReady
      );
      return;
    }

    const token = await executeRecaptcha("signup");
    return token;
  }, [executeRecaptcha, recaptchaIsReady]);

  const dispatchEvent = useCallback(
    (name: string, details?: EventDetails) => {
      if (containerRef.current) {
        jQuery(containerRef.current).trigger(name + ".gatey-authenticator", {
          screen: screen,
          ...details,
        });
      }
    },
    [containerRef, screen]
  );

  const services: AuthContext["services"] = useMemo(
    () => ({
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
      async handleSignUp(input: SignUpInput): Promise<SignUpOutput> {
        if (gatey.settings?.reCaptchaPublicKey) {
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
      screen,
      dispatchEvent,
      reloadUserAttributes,
      reloadMFAPreferences,
      handleReCaptchaVerify,
    ]
  );

  const visible = useMemo(() => {
    return isVisible && componentVisible;
  }, [isVisible, componentVisible]);

  useEffect(() => {
    if (editorRef?.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  }, [children, editorRef]);

  const components = useMemo(() => {
    if (config === undefined) {
      return undefined;
    }
    if (children && config !== null) {
      const pcb = parseCustomBlocks;
      return pcb.default(
        config,
        isPreview,
        account,
        children,
        editorContent,
        direction
      );
    }
    return {};
  }, [config, children, isPreview, account, editorContent, direction]);

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
  ]);

  useEffect(() => {
    gatey.cognito.toSignIn = toSignIn;
    gatey.cognito.toSignUp = toSignUp;
    gatey.cognito.toForgotPassword = toForgotPassword;
  }, [toForgotPassword, toSignIn, toSignUp]);

  useEffect(() => {
    if (screen !== "signIn" || isPreview || logoutHandled || !loggingOut) {
      return;
    }
    queueMicrotask(() => {
      if (wasSignedIn) {
        setMessage(signingOutMessage);
        dispatchEvent("signing-out");
        clearAccount();
      } else {
        dispatchEvent("signed-out");
        const url =
          redirectTo ||
          nextUrl ||
          gatey.settings.redirectSignOut ||
          gatey.settings.signInPage;
        if (url) {
          setRedirecting(true);
          window.location.assign(url);
        }
      }
      setLogoutHandled(true);
    });
  }, [
    redirectTo,
    loggingOut,
    isPreview,
    logoutHandled,
    screen,
    dispatchEvent,
    store,
    wasSignedIn,
    nextUrl,
    clearAccount,
    signingOutMessage,
  ]);

  useEffect(() => {
    if (
      screen === "signIn" &&
      !loggingOut &&
      authStatus === "authenticated" &&
      !loginHandled
    ) {
      queueMicrotask(() => {
        if (!wasSignedIn) {
          setLoginHandled(true);
          setSignedIn(true);
          setMessage(signingInMessage);
          dispatchEvent("signing-in");
        } else {
          dispatchEvent("signed-in");

          let url =
            redirectTo ||
            nextUrl ||
            gatey.settings.redirectSignIn ||
            gatey.settings.signInPage;
          // prevent redirect loop
          if (url?.endsWith("/")) {
            url = url.substring(0, url.length - 1);
          }
          let path = location.pathname;
          if (path.endsWith("/")) {
            path = path.substring(0, path.length - 1);
          }
          if (url && url !== path + location.search) {
            setRedirecting(true);
            window.location.assign(url);
          } else {
            setLoginHandled(true);
          }
        }
      });
    }
  }, [
    authStatus,
    redirectTo,
    loggingOut,
    dispatchEvent,
    screen,
    setSignedIn,
    wasSignedIn,
    loginHandled,
    nextUrl,
    signingInMessage,
  ]);

  useEffect(() => {
    if (screen !== "signIn") {
      return;
    }
    queueMicrotask(() => {
      if (loginHandled) {
        if (route === "authenticated") {
          dispatchEvent("signed-in");
          if (nextUrl !== undefined) {
            const url =
              redirectTo ||
              nextUrl ||
              gatey.settings.redirectSignIn ||
              gatey.settings.signInPage;
            if (url) {
              setRedirecting(true);
              window.location.assign(url);
            }
          }
        } else if (route !== "transition") {
          setMessage(undefined);
          dispatchEvent("reset");
        }
      }
      /*
      if (logoutHandled && nextUrl !== undefined) {
        dispatchEvent("signed-out");
        const url =
          redirectTo ||
          nextUrl ||
          Gatey.settings.redirectSignOut ||
          Gatey.settings.signInPage;
        if (url) {
          setRedirecting(true);
          window.location.assign(url);
        }
      }
      */
    });
  }, [
    redirectTo,
    route,
    nextUrl,
    loginHandled,
    logoutHandled,
    dispatchEvent,
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

  return (
    <View
      ref={containerRef}
      className={className}
      width={!variation || variation === "default" ? "100%" : "0"}
    >
      {visible && recaptchaIsReady && (
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
                  {redirecting && redirectingMessage ? (
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
                            <Heading level={4}>
                              {translate(redirectingMessage!)}
                            </Heading>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Authenticator
                        loginMechanisms={gatey.settings?.loginMechanisms}
                        language={language}
                        textDirection={direction as Direction}
                        services={services}
                        initialState={screen}
                        signUpAttributes={gatey.settings?.signUpAttributes}
                        socialProviders={gatey.settings?.socialProviders}
                        customProviders={config?.customProviders}
                        components={components}
                        forceInitialState={isPreview}
                        variation={variation}
                        totpIssuer={totpIssuer}
                        totpUsername={totpUsername}
                      >
                        {!redirecting && message && (
                          <View
                            data-amplify-authenticator
                            data-variation={variation}
                          >
                            <View data-amplify-container>
                              <View data-amplify-router>
                                <View
                                  data-amplify-form
                                  data-amplify-authenticator-message
                                  style={{
                                    textAlign: "center",
                                  }}
                                >
                                  {redirecting ? (
                                    <Heading level={4}>
                                      {translate(redirectingMessage!)}
                                    </Heading>
                                  ) : (
                                    <Heading level={4}>
                                      {translate(message!)}
                                    </Heading>
                                  )}
                                </View>
                              </View>
                            </View>
                          </View>
                        )}
                      </Authenticator>
                      {(route === "signIn" || route === "signUp") && (
                        <View
                          data-amplify-authenticator
                          hidden={!gatey.settings?.enablePoweredBy}
                          className={
                            gatey.settings?.enablePoweredBy
                              ? undefined
                              : "sr-only"
                          }
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
      )}
    </View>
  );
};
