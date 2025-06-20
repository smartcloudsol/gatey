import {
  useEffect,
  useState,
  useRef,
  type RefObject,
  type Dispatch,
  type ReactNode,
  type PropsWithChildren,
  type FunctionComponent,
  type SetStateAction,
} from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Amplify, type ResourcesConfig } from "aws-amplify";

import { I18n } from "aws-amplify/utils";
import { translate } from "@aws-amplify/ui";
import { translations, Authenticator, Button } from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import { type AuthenticatorConfig, type Store } from "@smart-cloud/gatey-core";
import { type Screen, type Variation, type Language } from "./index";
import { Login } from "./login";

import "./app.module.css";

I18n.putVocabularies(translations);

export type PreviewType = "FREE" | "BASIC" | "PROFESSIONAL";

export interface AppProps extends PropsWithChildren {
  id: string;
  screen?: Screen;
  variation?: Variation;
  language?: Language;
  showOpenButton?: boolean;
  openButtonTitle?: string;
  signingInMessage?: string;
  signingOutMessage?: string;
  redirectingMessage?: string;
  store: Store;
  isPreview: boolean;
  nonce: string;
  editorRef?: RefObject<HTMLDivElement>;
  children?: ReactNode;
  previewMode?: PreviewType;
  setPreviewMode?: Dispatch<SetStateAction<PreviewType | undefined>>;
  siteSettings?: AuthenticatorConfig | null;
  siteSubscriptionType?: string | null;
}

export const App: FunctionComponent<AppProps> = (props: AppProps) => {
  const {
    id,
    isPreview,
    previewMode,
    setPreviewMode,
    siteSettings = null,
    siteSubscriptionType = null,
    store,
    showOpenButton,
    openButtonTitle,
    editorRef,
    screen,
    language,
  } = props;

  const [title, setTitle] = useState<string>();

  const [filteredConfig, setFilteredConfig] = useState<
    AuthenticatorConfig | null | undefined
  >(undefined);

  const [nextFilteredConfig, setNextFilteredConfig] = useState<
    AuthenticatorConfig | null | undefined
  >(undefined);

  const [amplifyConfigured, setAmplifyConfigured] = useState(false);

  const [show, setShow] = useState(false);

  const containerRef = useRef(null);

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    (
      select: (store: Store) => {
        getConfig: () => AuthenticatorConfig | null;
      }
    ) => select(store).getConfig(),
    []
  );

  const amplifyConfig: ResourcesConfig | undefined = useSelect(
    (
      select: (store: Store) => {
        getAmplifyConfig: () => ResourcesConfig | undefined;
      }
    ) => select(store).getAmplifyConfig(),
    []
  );

  useEffect(() => {
    if (containerRef.current) {
      jQuery(containerRef.current).on("done.gatey-authenticator", () => {
        if (editorRef?.current) {
          setShow(false);
        } else {
          jQuery(document).trigger("gatey-block", id);
        }
      });
      jQuery(containerRef.current).on("cancel.gatey-authenticator", () => {
        if (editorRef?.current) {
          setShow(false);
        } else {
          jQuery(document).trigger("gatey-block", id);
        }
      });
    }
  }, [editorRef, containerRef, show, id]);

  useEffect(() => {
    if (decryptedConfig) {
      if (setPreviewMode) {
        setNextFilteredConfig(undefined);
        setPreviewMode(
          decryptedConfig?.subscriptionType === "BASIC"
            ? "BASIC"
            : "PROFESSIONAL"
        );
      }
    } else if (setPreviewMode) {
      setNextFilteredConfig(undefined);
      setPreviewMode(
        siteSubscriptionType
          ? siteSubscriptionType === "BASIC"
            ? "BASIC"
            : "PROFESSIONAL"
          : "FREE"
      );
    }
  }, [
    decryptedConfig,
    siteSettings,
    setPreviewMode,
    siteSubscriptionType,
    decryptedConfig?.subscriptionType,
  ]);

  useEffect(() => {
    if (isPreview && previewMode) {
      let fc = undefined;
      switch (previewMode) {
        case "FREE":
          fc = null;
          break;
        case "BASIC":
          fc = {
            socialProviders: [],
            signUpAttributes: [],
            formFields: {},
            apiConfigurations: {
              default: { apis: [] },
            },
          };
          break;
        case "PROFESSIONAL":
          fc = siteSettings ?? decryptedConfig;
          break;
      }
      setFilteredConfig(undefined);
      setNextFilteredConfig(fc);
    } else {
      setFilteredConfig(decryptedConfig);
    }
  }, [
    siteSettings,
    siteSubscriptionType,
    decryptedConfig,
    previewMode,
    setPreviewMode,
    isPreview,
  ]);

  useEffect(() => {
    if (nextFilteredConfig !== undefined) {
      setFilteredConfig(nextFilteredConfig);
    }
  }, [nextFilteredConfig]);

  useEffect(() => {
    if (!isPreview && amplifyConfig?.Auth) {
      Amplify.configure(amplifyConfig);
      setAmplifyConfigured(true);
    }
  }, [amplifyConfig, isPreview, store]);

  useEffect(() => {
    if (showOpenButton) {
      if (!openButtonTitle) {
        switch (screen) {
          case "signIn":
            setTitle(translate("Sign In"));
            break;
          case "signUp":
            setTitle(translate("Sign Up"));
            break;
          case "forgotPassword":
            setTitle(translate("Forgot Password"));
            break;
          case "changePassword":
            setTitle(translate("Change Password"));
            break;
          case "editAccount":
            setTitle(translate("Edit Account"));
            break;
          case "setupTotp":
            setTitle(translate("Setup TOTP"));
            break;
        }
      } else {
        setTitle(translate(openButtonTitle));
      }
    }
  }, [screen, language, showOpenButton, openButtonTitle]);

  return (
    filteredConfig !== undefined &&
    (isPreview || amplifyConfigured) && (
      <Authenticator.Provider>
        <Router>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  {showOpenButton && (
                    <Button
                      className="amplify-button amplify-field-group__control amplify-button--primary amplify-button--opener"
                      disabled={show}
                      isFullWidth={true}
                      onClick={() => {
                        setShow(true);
                      }}
                    >
                      {title}
                    </Button>
                  )}
                  {(!showOpenButton || show) && (
                    <Login
                      containerRef={containerRef}
                      {...props}
                      config={filteredConfig}
                    />
                  )}
                </>
              }
            />
          </Routes>
        </Router>
      </Authenticator.Provider>
    )
  );
};
