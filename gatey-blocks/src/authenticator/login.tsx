import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useElementDetector } from "use-detector-hook";

import { signUp, type SignUpInput, type SignUpOutput } from "aws-amplify/auth";
import { type AuthContext } from "@aws-amplify/ui";

import {
  Authenticator,
  Flex,
  View,
  AccountSettings,
  useAuthenticator,
} from "@aws-amplify/ui-react";

import "@aws-amplify/ui-react/styles.css";

import { useDispatch, useSelect } from "@wordpress/data";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import {
  type Account,
  type AuthenticatorConfig,
  type Store,
} from "@smart-cloud/gatey-core";

import { type AppProps } from "./app";

const parseCustomBlocks = import(
  process.env.GATEY_PREMIUM
    ? "./paid-features/custom-blocks"
    : "./free-features/custom-blocks"
);

declare global {
  interface Window {
    toForgotPassword: () => void;
    toSignIn: () => void;
    toSignUp: () => void;
    resendCode: () => void;
    skipVerification: () => void;
  }
}

type EventDetails = {
  [key: string]: unknown;
};

export interface DefaultComponentOptions {
  Header?: () => React.JSX.Element;
  Footer?: () => React.JSX.Element;
}
export type DefaultComponents = {
  [key in keyof DefaultComponentDescriptors]: DefaultComponentOptions;
} & {
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

export const Login = (
  props: AppProps & { config: AuthenticatorConfig | null | undefined }
) => {
  const {
    id,
    store,
    screen,
    variation,
    isPreview,
    children,
    editorRef,
    config,
  } = props;

  const [components, setComponents] = useState<DefaultComponents>();
  const [screenChanged, setScreenChanged] = useState<boolean>(false);
  const [logoutHandled, setLogoutHandled] = useState<boolean>(false);
  const [loginHandled, setLoginHandled] = useState<boolean>(false);
  const [visible, setVisible] = useState(false);
  const [authenticatorConfig, setAuthenticatorConfig] = useState<
    AuthenticatorConfig | null | undefined
  >();
  const { executeRecaptcha } = useGoogleReCaptcha();

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

  const [wasSignedIn] = useState<boolean>(signedIn && !account?.loaded);

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
  const {
    authStatus,
    route,
    toSignIn,
    toSignUp,
    toForgotPassword,
    toSetupTotp,
    toEditAccount,
    resendCode,
    skipVerification,
  } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
    context.route,
  ]);

  const containerRef: React.Ref<HTMLDivElement> = useRef(null);

  const isVisible = useElementDetector(
    containerRef,
    { threshold: 0 },
    {
      onTriggerExit: () => setVisible(jQuery("#" + id).length > 0),
    }
  );

  const handleReCaptchaVerify = useCallback(async () => {
    if (!executeRecaptcha) {
      console.error("ReCaptcha is not yet available");
      return;
    }

    const token = await executeRecaptcha("signup");
    return token;
  }, [executeRecaptcha]);

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
          const reCaptchaV3Response = await handleReCaptchaVerify();
          if (reCaptchaV3Response) {
            input.options = input.options || { userAttributes: {} };
            input.options.clientMetadata = {
              recaptchaV3Token: reCaptchaV3Response,
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
        setComponents(pcb.default(children, editorRef?.current?.innerHTML))
      );
    } else {
      setComponents({});
    }
  }, [children, editorRef, config]);

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
    if (screen !== "signIn" || isPreview || logoutHandled || !loggingOut) {
      return;
    }
    if (wasSignedIn) {
      setLogoutHandled(true);
      dispatchEvent("signing-out");
      clearAccount();
    } else {
      dispatchEvent("signed-out");
      const url = redirectTo || Gatey.settings?.redirectSignOut || nextUrl;
      if (url) {
        window.location.assign(url);
      } else {
        setLogoutHandled(true);
      }
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
        dispatchEvent("signing-in");
      } else {
        dispatchEvent("signed-in");
        let url = redirectTo || Gatey.settings?.redirectSignIn || nextUrl;
        // prevent redirect loop
        if (url?.endsWith("/")) {
          url = url.substring(0, url.length - 1);
        }
        let path = location.pathname;
        if (path.endsWith("/")) {
          path = path.substring(0, path.length - 1);
        }
        if (url && url !== path + location.search) {
          window.location.assign(url);
        } else {
          setLoginHandled(true);
        }
      }
    }
  }, [
    redirectTo,
    authStatus,
    loggingOut,
    dispatchEvent,
    screen,
    setSignedIn,
    wasSignedIn,
    loginHandled,
    nextUrl,
  ]);

  useEffect(() => {
    window.toForgotPassword = toForgotPassword;
    window.toSignIn = toSignIn;
    window.toSignUp = toSignUp;
    window.resendCode = resendCode;
    window.skipVerification = skipVerification;
  }, [toSignIn, toSignUp, toForgotPassword, resendCode, skipVerification]);

  useEffect(() => {
    if (screen !== "signIn") {
      return;
    }
    if (loginHandled) {
      if (route === "authenticated") {
        dispatchEvent("signed-in");
        if (nextUrl) {
          const url = redirectTo || Gatey.settings?.redirectSignIn || nextUrl;
          if (url) {
            window.location.assign(url);
          }
        }
      } else if (route !== "transition") {
        dispatchEvent("reset");
      }
    }
    if (logoutHandled && nextUrl) {
      dispatchEvent("signed-out");
      const url = redirectTo || Gatey.settings?.redirectSignOut || nextUrl;
      if (url) {
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
                  },
                },
              },
            }
      );
    }
  }, [config, account]);

  return (
    <View ref={containerRef}>
      {visible && (
        <Flex
          justifyContent="center"
          direction="row"
          alignContent="middle"
          style={{ marginTop: "2rem" }}
        >
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
                        ></AccountSettings.ChangePassword>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <Authenticator
                  loginMechanisms={Gatey.settings?.loginMechanisms}
                  services={services}
                  initialState={screen}
                  signUpAttributes={authenticatorConfig?.signUpAttributes}
                  socialProviders={authenticatorConfig?.socialProviders}
                  formFields={authenticatorConfig?.formFields}
                  components={components}
                  forceInitialState={isPreview}
                  variation={variation}
                />
              ))
          }
        </Flex>
      )}
    </View>
  );
};
