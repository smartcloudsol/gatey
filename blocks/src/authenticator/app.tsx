import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FunctionComponent,
} from "react";

import { translate } from "@smart-cloud/aws-amplify-ui";
import {
  Authenticator,
  Button,
  translations,
} from "@smart-cloud/aws-amplify-ui-react";
import { I18n } from "aws-amplify/utils";

import { useSelect } from "@wordpress/data";

import {
  getStoreSelect,
  type AuthenticatorConfig,
  type CustomTranslations,
} from "@smart-cloud/gatey-core";
import { ConfigContext } from "../context/config";
import { ThemeOverridesStyle } from "../shared/themeOverrides";
import { Login } from "./login";
import { type ThemeProps } from "./theme";

I18n.putVocabularies(translations);

type HostEventPayload = Record<string, unknown> | undefined;
type HostEventName = "done" | "cancel";

function getHostEventTarget(container: HTMLElement): HTMLElement {
  const rootNode = container.getRootNode();

  if (rootNode instanceof ShadowRoot && rootNode.host instanceof HTMLElement) {
    return rootNode.host;
  }

  return container;
}

function getHostDomEventName(name: HostEventName): string {
  return `smartcloud-gatey-authenticator-${name}`;
}

function dispatchHostEvent(
  container: HTMLElement,
  name: HostEventName,
  details?: HostEventPayload,
): void {
  const hostTarget = getHostEventTarget(container);
  const payload = details ?? {};

  jQuery(hostTarget).trigger(name + ".smartcloud-gatey-authenticator", payload);
  hostTarget.dispatchEvent(
    new CustomEvent(getHostDomEventName(name), {
      bubbles: true,
      composed: true,
      detail: payload,
    }),
  );
}

export const App: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const rootClassName = "smartcloud-gatey-authenticator-theme-root";
  const {
    id,
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
    themeOverrides,
    previewUsesShadowRoot,
  } = props;

  const [show, setShow] = useState(false);

  const containerRef = useRef(null);

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    () => getStoreSelect(store).getConfig(),
    [],
  );

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const $container = jQuery(container);
    const handleDone = (
      _event: JQuery.TriggeredEvent,
      details?: HostEventPayload,
    ) => {
      dispatchHostEvent(container, "done", details);

      if (editorRef?.current) {
        setShow(false);
      } else {
        jQuery(document).trigger("smartcloud-gatey-authenticator-block", [
          id,
          true,
        ]);
      }
    };
    const handleCancel = (
      _event: JQuery.TriggeredEvent,
      details?: HostEventPayload,
    ) => {
      dispatchHostEvent(container, "cancel", details);

      if (editorRef?.current) {
        setShow(false);
      } else {
        jQuery(document).trigger("smartcloud-gatey-authenticator-block", [
          id,
          true,
        ]);
      }
    };

    $container.on("done.smartcloud-gatey-authenticator", handleDone);
    $container.on("cancel.smartcloud-gatey-authenticator", handleCancel);

    return () => {
      $container.off("done.smartcloud-gatey-authenticator", handleDone);
      $container.off("cancel.smartcloud-gatey-authenticator", handleCancel);
    };
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
          case "passkeySettings":
            return translate("Passkey Settings");
          case "rememberedDevices":
            return translate("Remembered Devices");
          case "setupTotp":
            return translate("Setup TOTP");
        }
      } else {
        return translate(openButtonTitle);
      }
    }
  }, [screen, showOpenButton, openButtonTitle]);

  const openButtonAccessibleLabel = title || translate("Open");

  useEffect(() => {
    if (isPreview && setPreviewZIndex) {
      setPreviewZIndex(show ? 1000 : undefined);
    }
  }, [isPreview, setPreviewZIndex, show]);

  return (
    filteredConfig !== undefined &&
    screen !== undefined && (
      <ConfigContext.Provider value={filteredConfig}>
        <Authenticator.Provider>
          <div
            className={rootClassName}
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <ThemeOverridesStyle
              themeOverrides={themeOverrides}
              isPreview={isPreview}
              previewRootClassName={rootClassName}
              previewUsesShadowRoot={previewUsesShadowRoot}
            />
            {showOpenButton && (variation === "modal" || !show) && (
              <Button
                className={`amplify-button amplify-field-group__control amplify-button--primary amplify-button--opener`}
                disabled={show}
                isFullWidth={true}
                aria-label={openButtonAccessibleLabel}
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
        </Authenticator.Provider>
      </ConfigContext.Provider>
    )
  );
};
