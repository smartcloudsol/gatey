import { createRef, useState, useEffect, type FunctionComponent } from "react";
import { InspectorControls } from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  ComboboxControl,
  RadioControl,
  SelectControl,
  TextControl,
  PanelBody,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import {
  defaultDarkModeOverride,
  ThemeProvider,
  type Direction,
} from "@aws-amplify/ui-react";

import { store, TEXT_DOMAIN, type Store } from "@smart-cloud/gatey-core";

import {
  formFieldOptions,
  colorModeOptions,
  directionOptions,
  languageOptions,
  type Language,
} from "../index";
import { type Attribute, type Component } from "./index";
import { EditorBlockProps } from "./edit";
import { Attr } from "./attr";

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

export const Block: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const { attributes, setAttributes } = props;
  const { component, attribute, custom, colorMode, language, direction } =
    attributes;

  const [fulfilledStore, setFulfilledStore] = useState<Store>();

  const [themeDirection, setThemeDirection] = useState<Direction>();
  const [currentLanguage, setCurrentLanguage] = useState<string>();

  const editorRef = createRef<HTMLDivElement>();

  useEffect(() => {
    if (language) {
      setCurrentLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    let td = direction;
    if (!direction || direction === "auto") {
      td = language === "ar" || language === "he" ? "rtl" : "ltr";
    }
    setThemeDirection(td as Direction);
  }, [direction, language]);

  useEffect(() => {
    store.then((fulfilledStore) => {
      setFulfilledStore(fulfilledStore);
    });
  }, []);

  return (
    <div ref={editorRef}>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <SelectControl
            label={__("Component", TEXT_DOMAIN)}
            value={component}
            options={[
              { label: "div", value: "div" },
              { label: "p", value: "p" },
              { label: "span", value: "span" },
              { label: "h1", value: "h1" },
              { label: "h2", value: "h2" },
              { label: "h3", value: "h3" },
              { label: "h4", value: "h4" },
              { label: "h5", value: "h5" },
              { label: "h6", value: "h6" },
            ]}
            onChange={(value) => {
              if (value as Component) {
                setAttributes({
                  component: value as Component,
                });
              }
            }}
            help={__(
              "Specify the HTML element (e.g., <div>, <span>, <input>) that will render this account attribute.",
              TEXT_DOMAIN
            )}
          />
          <ComboboxControl
            label={__("Attribute", TEXT_DOMAIN)}
            value={attribute || ""}
            options={[
              { label: __("Username", TEXT_DOMAIN), value: "sub" },
              ...formFieldOptions,
            ]}
            onChange={(value) => {
              if (value as Attribute) {
                setAttributes({
                  attribute: value as Attribute,
                });
              }
            }}
            help={__(
              "Select the account attribute to display—either a standard Cognito attribute (e.g., email, given_name) or a custom attribute.",
              TEXT_DOMAIN
            )}
          />
          {attribute === "custom" && (
            <TextControl
              label={__("Custom Attribute", TEXT_DOMAIN)}
              value={custom ?? ""}
              onChange={(value) => {
                if (value as string) {
                  setAttributes({
                    custom: value as string,
                  });
                }
              }}
              placeholder={__("Enter custom attribute:", TEXT_DOMAIN)}
              help={__(
                "Enter the name of the custom attribute (e.g.,country).",
                TEXT_DOMAIN
              )}
            />
          )}
          <RadioControl
            label={__("Color Mode", TEXT_DOMAIN)}
            selected={colorMode || "system"}
            options={colorModeOptions}
            onChange={(value) => {
              if (value === "system" || value === "light" || value === "dark") {
                setAttributes({ colorMode: value });
              }
            }}
            help={__(
              "Choose the account attribute’s color scheme—Light, Dark, or System (follows the user’s system preference).",
              TEXT_DOMAIN
            )}
          />
          <ComboboxControl
            label={__("Language", TEXT_DOMAIN)}
            value={language || "system"}
            options={languageOptions}
            onChange={(value) => {
              if (value as Language) {
                setAttributes({ language: value as Language });
              }
            }}
            help={__(
              "Set the display language for this account attribute. The chosen language controls the built‑in country selector list and any custom select or radio fields that have translated option labels.",
              TEXT_DOMAIN
            )}
          />
          <RadioControl
            label={__("Direction", TEXT_DOMAIN)}
            selected={direction || "auto"}
            options={directionOptions}
            onChange={(value) => {
              if (value === "auto" || value === "ltr" || value === "rtl") {
                setAttributes({ direction: value });
              }
            }}
            help={__(
              "Choose the layout direction for this account attribute—Auto (default; follows the selected language), Left‑to‑Right, or Right‑to‑Left for RTL languages.",
              TEXT_DOMAIN
            )}
          />
        </PanelBody>
      </InspectorControls>
      {fulfilledStore && (
        <ThemeProvider
          theme={theme}
          colorMode={colorMode}
          direction={themeDirection}
        >
          <Attr
            id="gatey-account-attribute-block"
            isPreview={true}
            store={fulfilledStore}
            component={component || "div"}
            attribute={attribute || "sub"}
            custom={custom}
            language={currentLanguage as Language}
            direction={themeDirection}
          />
        </ThemeProvider>
      )}
    </div>
  );
};
