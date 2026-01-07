import {
  useEffect,
  useState,
  type Dispatch,
  type FunctionComponent,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

import {
  defaultDarkModeOverride,
  Theme,
  ThemeProvider,
  type ColorMode,
  type Direction,
} from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import {
  getStoreSelect,
  type AuthenticatorConfig,
  type Store,
} from "@smart-cloud/gatey-core";
import { type Language } from "../index";
import { App } from "./app";
import { type Screen, type Variation } from "./index";

export type PreviewType = "FREE" | "PAID";

export interface ThemeProps extends PropsWithChildren {
  id: string;
  className: string;
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
    className,
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
    () => getStoreSelect(store).getLanguage(),
    []
  );

  const directionInStore: Direction | "auto" | undefined | null = useSelect(
    () => getStoreSelect(store).getDirection(),
    []
  );

  const [languageOverride] = useState<string>(
    new URLSearchParams(window.location.search).get("language") ?? ""
  );

  const [directionOverride] = useState<string>(
    new URLSearchParams(window.location.search).get("direction") ?? ""
  );

  useEffect(() => {
    queueMicrotask(() => {
      const lang = languageInStore || languageOverride || language;
      if (!lang || lang === "system") {
        setCurrentLanguage("");
      } else {
        setCurrentLanguage(lang);
      }
    });
  }, [language, languageOverride, languageInStore]);

  useEffect(() => {
    queueMicrotask(() => {
      const dir = directionInStore || directionOverride || direction;
      if (!dir || dir === "auto") {
        setCurrentDirection(
          currentLanguage === "ar" || currentLanguage === "he" ? "rtl" : "ltr"
        );
      } else {
        setCurrentDirection(dir as Direction);
      }
    });
  }, [currentLanguage, direction, directionInStore, directionOverride]);

  return (
    <ThemeProvider
      theme={theme}
      colorMode={colorMode}
      direction={currentDirection}
    >
      <App
        id={id}
        className={className}
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
      >
        {children}
      </App>
    </ThemeProvider>
  );
};
