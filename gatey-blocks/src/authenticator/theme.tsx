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

import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import {
  defaultDarkModeOverride,
  ThemeProvider,
  type ColorMode,
} from "@aws-amplify/ui-react";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

import { useSelect } from "@wordpress/data";

import {
  type AuthenticatorConfig,
  type CustomTranslations,
  type Store,
} from "@smart-cloud/gatey-core";
import {
  type Screen,
  type Variation,
  type Language,
  type Direction,
} from "./index";
import { App } from "./app";

I18n.putVocabularies(translations);

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

export type PreviewType = "FREE" | "BASIC" | "PROFESSIONAL";

export interface AppProps extends PropsWithChildren {
  id: string;
  screen?: Screen;
  variation?: Variation;
  colorMode?: ColorMode;
  language?: Language;
  direction?: Direction;
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

export const Theme: FunctionComponent<AppProps> = (props: AppProps) => {
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
  } = props;

  const [currentLanguage, setCurrentLanguage] = useState<string>();
  const [currentDirection, setCurrentDirection] = useState<Direction>();

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getCustomTranslations: () => CustomTranslations | undefined | null;
      }
    ) => select(store).getCustomTranslations(),
    []
  );

  const languageInStore: string | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getLanguage: () => string | undefined | null;
      }
    ) => select(store).getLanguage(),
    []
  );

  const directionInStore: Direction | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getDirection: () => Direction | undefined | null;
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
    I18n.putVocabularies(customTranslations || {});
    if (languageOverride) {
      I18n.setLanguage(languageOverride);
      setCurrentLanguage(languageOverride);
    } else if (languageInStore) {
      I18n.setLanguage(languageInStore);
      setCurrentLanguage(languageInStore);
    } else if (language) {
      I18n.setLanguage(language);
      setCurrentLanguage(language);
    }
  }, [language, languageOverride, languageInStore, customTranslations]);

  useEffect(() => {
    const dir = directionOverride || directionInStore || direction;
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
      direction={currentDirection as "ltr" | "rtl"}
    >
      {Gatey.settings?.reCaptchaPublicKey && screen === "signUp" ? (
        <GoogleReCaptchaProvider
          reCaptchaKey={Gatey.settings?.reCaptchaPublicKey}
          language="en"
          useRecaptchaNet={true}
          scriptProps={{ async: true, defer: true }}
        >
          <App
            id={id}
            store={store}
            editorRef={editorRef}
            screen={screen}
            variation={variation}
            language={currentLanguage as Language}
            showOpenButton={showOpenButton}
            openButtonTitle={openButtonTitle}
            signingInMessage={signingInMessage}
            signingOutMessage={signingOutMessage}
            redirectingMessage={redirectingMessage}
            isPreview={isPreview}
            nonce={Gatey?.nonce}
          >
            {children}
          </App>
        </GoogleReCaptchaProvider>
      ) : (
        <App
          id={id}
          store={store}
          editorRef={editorRef}
          screen={screen}
          variation={variation}
          language={currentLanguage as Language}
          showOpenButton={showOpenButton}
          openButtonTitle={openButtonTitle}
          signingInMessage={signingInMessage}
          signingOutMessage={signingOutMessage}
          redirectingMessage={redirectingMessage}
          isPreview={isPreview}
          nonce={Gatey?.nonce}
        >
          {children}
        </App>
      )}
    </ThemeProvider>
  );
};
