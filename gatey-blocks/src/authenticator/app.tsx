import { useEffect, useState, useRef, type FunctionComponent } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Amplify, type ResourcesConfig } from "aws-amplify";

import { I18n } from "aws-amplify/utils";
import { translations, Authenticator, Button } from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import {
  type AuthenticatorConfig,
  type CustomTranslations,
  type Store,
} from "@smart-cloud/gatey-core";
import { type Language } from "../index";
import { type ThemeProps } from "./theme";
import { Login } from "./login";

import "./app.module.css";

I18n.putVocabularies(translations);

export const App: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const {
    id,
    className,
    isPreview,
    previewMode,
    setPreviewMode,
    setPreviewZIndex,
    siteSettings = null,
    siteSubscriptionType = null,
    store,
    showOpenButton,
    openButtonTitle,
    editorRef,
    screen,
    language,
  } = props;

  const [currentLanguage, setCurrentLanguage] = useState<Language>();

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

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getCustomTranslations: () => CustomTranslations | undefined | null;
      }
    ) => select(store).getCustomTranslations(),
    []
  );

  useEffect(() => {
    if (containerRef.current) {
      jQuery(containerRef.current).on("done.gatey-authenticator", () => {
        if (editorRef?.current) {
          setShow(false);
        } else {
          jQuery(document).trigger("gatey-authenticator-block", id);
        }
      });
      jQuery(containerRef.current).on("cancel.gatey-authenticator", () => {
        if (editorRef?.current) {
          setShow(false);
        } else {
          jQuery(document).trigger("gatey-authenticator-block", id);
        }
      });
    }
  }, [editorRef, containerRef, show, id]);

  useEffect(() => {
    if (decryptedConfig) {
      if (setPreviewMode) {
        setNextFilteredConfig(undefined);
        setPreviewMode(decryptedConfig?.subscriptionType ? "PAID" : "FREE");
      }
    } else if (setPreviewMode) {
      setNextFilteredConfig(undefined);
      setPreviewMode(siteSubscriptionType ? "PAID" : "FREE");
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
        case "PAID":
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
    I18n.putVocabularies(customTranslations || {});
    if (!language || language === "system") {
      I18n.setLanguage("");
      setCurrentLanguage(undefined);
    } else {
      I18n.setLanguage(language);
      setCurrentLanguage(language);
    }
  }, [language, customTranslations]);

  useEffect(() => {
    if (showOpenButton) {
      if (!openButtonTitle) {
        switch (screen) {
          case "signIn":
            setTitle(Gatey.cognito.translate("Sign In"));
            break;
          case "signUp":
            setTitle(Gatey.cognito.translate("Sign Up"));
            break;
          case "forgotPassword":
            setTitle(Gatey.cognito.translate("Forgot Password"));
            break;
          case "changePassword":
            setTitle(Gatey.cognito.translate("Change Password"));
            break;
          case "editAccount":
            setTitle(Gatey.cognito.translate("Edit Account"));
            break;
          case "setupTotp":
            setTitle(Gatey.cognito.translate("Setup TOTP"));
            break;
        }
      } else {
        setTitle(Gatey.cognito.translate(openButtonTitle));
      }
    }
  }, [screen, language, showOpenButton, openButtonTitle]);

  useEffect(() => {
    if (isPreview && setPreviewZIndex) {
      setPreviewZIndex(show ? 1000 : undefined);
    }
  }, [isPreview, setPreviewZIndex, show]);

  return (
    filteredConfig !== undefined &&
    (isPreview || amplifyConfigured) && (
      <Authenticator.Provider>
        <Router>
          <Routes>
            <Route
              path="*"
              element={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {showOpenButton && (
                    <Button
                      className={`amplify-button amplify-field-group__control amplify-button--primary amplify-button--opener ${className}`}
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
                      language={currentLanguage}
                    />
                  )}
                </div>
              }
            />
          </Routes>
        </Router>
      </Authenticator.Provider>
    )
  );
};
