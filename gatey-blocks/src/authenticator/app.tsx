import { Amplify, type ResourcesConfig } from "aws-amplify";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FunctionComponent,
} from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import { translate } from "@aws-amplify/ui";
import { Authenticator, Button, translations } from "@aws-amplify/ui-react";
import { I18n } from "aws-amplify/utils";

import { useSelect } from "@wordpress/data";

import {
  getStoreSelect,
  type AuthenticatorConfig,
  type CustomTranslations,
} from "@smart-cloud/gatey-core";
import { ConfigContext } from "../context/config";
import { Login } from "./login";
import { type ThemeProps } from "./theme";

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
    variation,
  } = props;

  const [show, setShow] = useState(false);

  const containerRef = useRef(null);

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    () => getStoreSelect(store).getConfig(),
    []
  );

  const amplifyConfig: ResourcesConfig | undefined = useSelect(
    () => getStoreSelect(store).getAmplifyConfig(),
    []
  );

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
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
        setPreviewMode(decryptedConfig?.subscriptionType ? "PAID" : "FREE");
      }
    } else if (setPreviewMode) {
      setPreviewMode(siteSubscriptionType ? "PAID" : "FREE");
    }
  }, [
    decryptedConfig,
    siteSettings,
    setPreviewMode,
    siteSubscriptionType,
    decryptedConfig?.subscriptionType,
  ]);

  const previewFilteredConfig = useMemo(() => {
    let fc = undefined;
    if (isPreview && previewMode) {
      switch (previewMode) {
        case "FREE":
          fc = null;
          break;
        case "PAID":
          fc = siteSettings ?? decryptedConfig ?? ({} as AuthenticatorConfig);
          break;
      }
    }
    return fc;
  }, [siteSettings, decryptedConfig, previewMode, isPreview]);

  const filteredConfig = useMemo(() => {
    return isPreview && previewMode ? previewFilteredConfig : decryptedConfig;
  }, [decryptedConfig, isPreview, previewFilteredConfig, previewMode]);

  const amplifyConfigured = useMemo(() => {
    if (isPreview) {
      Amplify.configure({});
      return true;
    }
    if (amplifyConfig?.Auth) {
      Amplify.configure(amplifyConfig);
      return true;
    }
    return false;
  }, [amplifyConfig, isPreview]);

  const currentLanguage = useMemo(() => {
    I18n.putVocabularies(customTranslations || {});
    if (!language || language === "system") {
      I18n.setLanguage("");
      return undefined;
    }
    I18n.setLanguage(language);
    return language;
  }, [language, customTranslations]);

  const title = useMemo(() => {
    if (showOpenButton) {
      if (!openButtonTitle) {
        switch (screen) {
          case "signIn":
            return translate("Sign In");
          case "signUp":
            return translate("Sign Up");
          case "forgotPassword":
            return translate("Forgot Password");
          case "changePassword":
            return translate("Change Password");
            break;
          case "editAccount":
            return translate("Edit Account");
          case "setupTotp":
            return translate("Setup TOTP");
        }
      } else {
        return translate(openButtonTitle);
      }
    }
  }, [screen, showOpenButton, openButtonTitle]);

  useEffect(() => {
    if (isPreview && setPreviewZIndex) {
      setPreviewZIndex(show ? 1000 : undefined);
    }
  }, [isPreview, setPreviewZIndex, show]);

  return (
    filteredConfig !== undefined &&
    amplifyConfigured && (
      <ConfigContext.Provider value={filteredConfig}>
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
                    {showOpenButton && (variation === "modal" || !show) && (
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
      </ConfigContext.Provider>
    )
  );
};
