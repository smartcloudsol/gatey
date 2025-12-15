import {
  useMemo,
  useState,
  type FunctionComponent,
  type PropsWithChildren,
} from "react";

import {
  defaultDarkModeOverride,
  ThemeProvider,
  type ColorMode,
  type Direction,
} from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import { getStoreSelect, type Store } from "@smart-cloud/gatey-core";
import { type Language } from "../index";
import { Attr } from "./attr";
import { type Attribute, type Component } from "./index";

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

  const currentLanguage = useMemo(() => {
    const lang = languageInStore || languageOverride || language;
    if (!lang || lang === "system") {
      return "";
    } else {
      return lang;
    }
  }, [language, languageOverride, languageInStore]);

  const currentDirection = useMemo(() => {
    const dir = directionInStore || directionOverride || direction;
    if (!dir || dir === "auto") {
      return currentLanguage === "ar" || currentLanguage === "he"
        ? "rtl"
        : "ltr";
    } else {
      return dir as Direction;
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
