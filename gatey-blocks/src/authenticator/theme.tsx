import {
  useEffect,
  useState,
  type RefObject,
  type Dispatch,
  type ReactNode,
  type PropsWithChildren,
  type FunctionComponent,
  type SetStateAction,
} from "react";

import {
  defaultDarkModeOverride,
  Theme,
  ThemeProvider,
  type ColorMode,
  type Direction,
} from "@aws-amplify/ui-react";

import { RecaptchaProvider } from "./recaptcha";

import { useSelect } from "@wordpress/data";

import { type AuthenticatorConfig, type Store } from "@smart-cloud/gatey-core";
import { type Language } from "../index";
import { type Screen, type Variation } from "./index";
import { App } from "./app";

export type PreviewType = "FREE" | "PAID";

export interface ThemeProps extends PropsWithChildren {
  id: string;
  screen?: Screen;
  variation?: Variation;
  colorMode?: ColorMode;
  language?: Language;
  direction?: Direction | "auto";
  showOpenButton?: boolean;
  openButtonTitle?: string;
  signingInMessage?: string;
  signingOutMessage?: string;
  redirectingMessage?: string;
  totpIssuer?: string;
  store: Store;
  isPreview: boolean;
  nonce: string;
  editorRef?: RefObject<HTMLDivElement>;
  children?: ReactNode;
  previewMode?: PreviewType;
  setPreviewMode?: Dispatch<SetStateAction<PreviewType | undefined>>;
  setPreviewZIndex?: Dispatch<SetStateAction<number | undefined>>;
  siteSettings?: AuthenticatorConfig | null;
  siteSubscriptionType?: string | null;
}

export const ThemedApp: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const {
    id,
    isPreview,
    store,
    editorRef,
    children,
    showOpenButton,
    openButtonTitle,
    language,
    screen,
    variation,
    colorMode,
    direction,
    signingInMessage,
    signingOutMessage,
    redirectingMessage,
    totpIssuer,
  } = props;

  const theme: Theme = {
    name: "gatey-theme-" + id,
    overrides: [defaultDarkModeOverride],
  };

  const [currentLanguage, setCurrentLanguage] = useState<string>();
  const [currentDirection, setCurrentDirection] = useState<Direction>();

  const languageInStore: string | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getLanguage: () => string | undefined | null;
      }
    ) => select(store).getLanguage(),
    []
  );

  const directionInStore: Direction | "auto" | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getDirection: () => Direction | "auto" | undefined | null;
      }
    ) => select(store).getDirection(),
    []
  );

  const [languageOverride] = useState<string>(
    new URLSearchParams(window.location.search).get("language") ?? ""
  );

  const [directionOverride] = useState<string>(
    new URLSearchParams(window.location.search).get("direction") ?? ""
  );

  useEffect(() => {
    const lang = languageInStore || languageOverride || language;
    if (!lang || lang === "system") {
      setCurrentLanguage("");
    } else {
      setCurrentLanguage(lang);
    }
  }, [language, languageOverride, languageInStore]);

  useEffect(() => {
    const dir = directionInStore || directionOverride || direction;
    if (!dir || dir === "auto") {
      setCurrentDirection(
        currentLanguage === "ar" || currentLanguage === "he" ? "rtl" : "ltr"
      );
    } else {
      setCurrentDirection(dir as Direction);
    }
  }, [currentLanguage, direction, directionInStore, directionOverride]);

  return (
    <ThemeProvider
      theme={theme}
      colorMode={colorMode}
      direction={currentDirection}
    >
      {Gatey.settings?.reCaptchaPublicKey ? (
        <RecaptchaProvider
          siteKey={Gatey.settings?.reCaptchaPublicKey}
          useEnterprise={Gatey.settings?.useRecaptchaEnterprise}
          useRecaptchaNet={Gatey.settings?.useRecaptchaNet}
        >
          <App
            id={id}
            store={store}
            editorRef={editorRef}
            screen={screen}
            variation={variation}
            language={currentLanguage as Language}
            direction={currentDirection}
            showOpenButton={showOpenButton}
            openButtonTitle={openButtonTitle}
            signingInMessage={signingInMessage}
            signingOutMessage={signingOutMessage}
            redirectingMessage={redirectingMessage}
            totpIssuer={totpIssuer}
            isPreview={isPreview}
            nonce={Gatey?.nonce}
          >
            {children}
          </App>
        </RecaptchaProvider>
      ) : (
        <App
          id={id}
          store={store}
          editorRef={editorRef}
          screen={screen}
          variation={variation}
          language={currentLanguage as Language}
          direction={currentDirection}
          showOpenButton={showOpenButton}
          openButtonTitle={openButtonTitle}
          signingInMessage={signingInMessage}
          signingOutMessage={signingOutMessage}
          redirectingMessage={redirectingMessage}
          totpIssuer={totpIssuer}
          isPreview={isPreview}
          nonce={Gatey?.nonce}
        >
          {children}
        </App>
      )}
    </ThemeProvider>
  );
};
