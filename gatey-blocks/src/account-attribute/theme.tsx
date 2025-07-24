import {
  useEffect,
  useState,
  type PropsWithChildren,
  type FunctionComponent,
} from "react";

import {
  defaultDarkModeOverride,
  ThemeProvider,
  type ColorMode,
  type Direction,
} from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import { type Store } from "@smart-cloud/gatey-core";
import { type Language } from "../index";
import { type Component, type Attribute } from "./index";
import { Attr } from "./attr";

export type PreviewType = "FREE" | "PAID";

export interface ThemeProps extends PropsWithChildren {
  id: string;
  isPreview: boolean;
  store: Store;
  component: Component;
  attribute: Attribute;
  custom?: string;
  colorMode?: ColorMode;
  language?: Language;
  direction?: Direction | "auto";
  link?: {
    url?: string;
    opensInNewTab?: boolean;
    nofollow?: boolean;
  };
  prefix?: string;
  postfix?: string;
}

export const Theme: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const {
    id,
    isPreview,
    store,
    component,
    attribute,
    custom,
    colorMode,
    language,
    direction,
    link = {},
    prefix,
    postfix,
  } = props;

  const theme = {
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
      <Attr
        id={id}
        isPreview={isPreview}
        store={store}
        component={component}
        attribute={attribute}
        custom={custom}
        language={currentLanguage as Language}
        direction={currentDirection}
        link={link}
        prefix={prefix}
        postfix={postfix}
      />
    </ThemeProvider>
  );
};
