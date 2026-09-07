import { resolveComponentLocale, getLocaleDirection } from "@smart-cloud/wpsuite-core";
import { useSiteLocale } from "../shared/site-locale";
import {
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
} from "@smart-cloud/aws-amplify-ui-react";

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
  themeOverrides?: string;
  store: Store;
  isPreview: boolean;
  editorRef?: RefObject<HTMLDivElement>;
  children?: ReactNode;
  previewMode?: PreviewType;
  setPreviewMode?: Dispatch<SetStateAction<PreviewType | undefined>>;
  setPreviewZIndex?: Dispatch<SetStateAction<number | undefined>>;
  siteSettings?: AuthenticatorConfig | null;
  siteSubscriptionType?: string | null;
  previewUsesShadowRoot?: boolean;
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
    themeOverrides,
    previewUsesShadowRoot,
  } = props;

  const theme: Theme = {
    name: "gatey-theme-" + id,
    overrides: [defaultDarkModeOverride],
  };


  const languageInStore: string | undefined | null = useSelect(
    () => getStoreSelect(store).getLanguage(),
    [],
  );

  const directionInStore: Direction | "auto" | undefined | null = useSelect(
    () => getStoreSelect(store).getDirection(),
    [],
  );

  const site = useSiteLocale();
  const [directionOverride] = useState<string>(
    new URLSearchParams(window.location.search).get("direction") ?? "",
  );

  const currentLanguage = resolveComponentLocale(language, languageInStore, site.locale);
  const dir = direction || directionInStore || directionOverride;
  const currentDirection = !dir || dir === "auto" ? getLocaleDirection(currentLanguage) : dir as Direction;

  return (
    <ThemeProvider
      theme={theme}
      colorMode={colorMode}
      direction={currentDirection}
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
        themeOverrides={themeOverrides}
        previewUsesShadowRoot={previewUsesShadowRoot}
        isPreview={isPreview}
      >
        {children}
      </App>
    </ThemeProvider>
  );
};
