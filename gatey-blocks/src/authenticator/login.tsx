import { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useElementDetector } from "use-detector-hook";

import { signUp, type SignUpInput, type SignUpOutput } from "aws-amplify/auth";
import { type AuthContext } from "@aws-amplify/ui";

import {
  Authenticator,
  Flex,
  View,
  Heading,
  Text,
  Link,
  AccountSettings,
  useAuthenticator,
  type Direction,
} from "@aws-amplify/ui-react";

import "@aws-amplify/ui-react/styles.css";

import { useDispatch, useSelect } from "@wordpress/data";

import {
  type Account,
  type AuthenticatorConfig,
  type Store,
} from "@smart-cloud/gatey-core";

import { type ThemeProps } from "./theme";
import { useRecaptcha } from "./recaptcha";

const parseCustomBlocks = import(
  process.env.GATEY_PREMIUM
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

const recaptchaHook = Gatey.settings?.reCaptchaPublicKey
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

  const [components, setComponents] = useState<DefaultComponents>();
  const [screenChanged, setScreenChanged] = useState<boolean>(false);
  const [logoutHandled, setLogoutHandled] = useState<boolean>(false);
  const [loginHandled, setLoginHandled] = useState<boolean>(false);
  const [visible, setVisible] = useState(false);
  const [authenticatorConfig, setAuthenticatorConfig] = useState<
    AuthenticatorConfig | null | undefined
  >();
  const [message, setMessage] = useState<string>();
  const [redirecting, setRedirecting] = useState<boolean>(false);

  const { executeRecaptcha, isReady: recaptchaIsReady } = recaptchaHook();

  const account: Account | undefined = useSelect(
    (select: (store: Store) => { getAccount: () => Account | undefined }) =>
      select(store).getAccount(),
    []
  );

  const nextUrl: string | undefined | null = useSelect(
    (
      select: (store: Store) => { getNextUrl: () => string | undefined | null }
    ) => select(store).getNextUrl(),
    []
  );

  const signedIn: boolean = useSelect(
    (select: (store: Store) => { isSignedIn: () => boolean }) =>
      select(store).isSignedIn(),
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
  } = useDispatch(store);

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
      onTriggerExit: () => setVisible(jQuery("#" + id).length > 0),
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
        if (Gatey.settings?.reCaptchaPublicKey) {
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

  useEffect(() => {
    setScreenChanged(true);
  }, [screen]);

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
    }
  }, [isVisible]);

  useEffect(() => {
    if (config === undefined) {
      return;
    }
    if (children && config !== null) {
      parseCustomBlocks.then((pcb) =>
        setComponents(
          pcb.default(
            isPreview,
            account,
            children,
            editorRef?.current?.innerHTML,
            direction
          )
        )
      );
    } else {
      setComponents({});
    }
  }, [children, editorRef, config, language, account, direction, isPreview]);

  useEffect(() => {
    if (screenChanged) {
      switch (screen) {
        case "signUp":
          toSignIn();
          toSignUp();
          break;
        case "forgotPassword":
          toSignIn();
          toForgotPassword();
          break;
        case "setupTotp":
          toSignIn();
          toSetupTotp();
          break;
        case "editAccount":
          toSignIn();
          toEditAccount();
          break;
        case "signIn":
          toSignIn();
          break;
      }
      setScreenChanged(false);
    }
  }, [
    screen,
    screenChanged,
    toForgotPassword,
    toSignIn,
    toSignUp,
    toSetupTotp,
    toEditAccount,
  ]);

  useEffect(() => {
    Gatey.cognito.toSignIn = toSignIn;
    Gatey.cognito.toSignUp = toSignUp;
    Gatey.cognito.toForgotPassword = toForgotPassword;
  }, [toForgotPassword, toSignIn, toSignUp]);

  useEffect(() => {
    if (screen !== "signIn" || isPreview || logoutHandled || !loggingOut) {
      return;
    }
    if (wasSignedIn) {
      setLogoutHandled(true);
      setMessage(signingOutMessage);
      dispatchEvent("signing-out");
      clearAccount();
    } else {
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
      setLogoutHandled(true);
    }
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
          Gatey.settings.redirectSignIn ||
          Gatey.settings.signInPage;
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
    if (loginHandled) {
      if (route === "authenticated") {
        dispatchEvent("signed-in");
        if (nextUrl !== undefined) {
          const url =
            redirectTo ||
            nextUrl ||
            Gatey.settings.redirectSignIn ||
            Gatey.settings.signInPage;
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
    if (config !== undefined) {
      let totpUsername =
        account?.userAttributes?.preferred_username ?? account?.username;
      if (!Gatey.settings?.loginMechanisms.includes("username")) {
        totpUsername = Gatey.settings?.loginMechanisms.includes("email")
          ? account?.userAttributes?.email
          : account?.userAttributes?.phone_number;
      }
      setAuthenticatorConfig(
        config === null
          ? null
          : {
              ...config,
              formFields: {
                ...config?.formFields,
                setupTotp: {
                  ...config?.formFields?.setupTotp,
                  QR: {
                    ...config?.formFields?.setupTotp?.QR,
                    totpUsername: totpUsername,
                    totpIssuer: totpIssuer,
                  },
                },
              },
            }
      );
    }
  }, [config, account, totpIssuer]);

  useEffect(() => {
    if (route === "setup") {
      setScreenChanged(true);
    }
  }, [route]);

  return (
    <View ref={containerRef} style={{ margin: 0, padding: 0 }}>
      {visible && recaptchaIsReady && (
        <Flex justifyContent="center" direction="row" alignContent="middle">
          {
            /*!loggingOut &&*/
            components &&
              authenticatorConfig !== undefined &&
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
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <Authenticator
                    loginMechanisms={Gatey.settings?.loginMechanisms}
                    language={language}
                    textDirection={direction as Direction}
                    services={services}
                    initialState={screen}
                    signUpAttributes={Gatey.settings?.signUpAttributes}
                    socialProviders={authenticatorConfig?.socialProviders}
                    formFields={authenticatorConfig?.formFields}
                    components={components}
                    forceInitialState={isPreview}
                    variation={variation}
                  >
                    {((redirecting && redirectingMessage) ||
                      (!redirecting && message)) && (
                      <View
                        data-amplify-authenticator
                        data-variation={variation}
                      >
                        <View
                          data-amplify-container
                          style={{ placeSelf: "stretch" }}
                        >
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
                                  {Gatey.cognito.translate(redirectingMessage!)}
                                </Heading>
                              ) : (
                                <Heading level={4}>
                                  {Gatey.cognito.translate(message!)}
                                </Heading>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </Authenticator>
                  {config === null &&
                    (route === "signIn" || route === "signUp") && (
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
                    )}
                </div>
              ))
          }
        </Flex>
      )}
    </View>
  );
};
