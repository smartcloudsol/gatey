import { createRef, useState, useEffect, type FunctionComponent } from "react";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
  BlockControls,
  LinkControl,
  type LinkControlValue,
} from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  ToolbarGroup,
  ToolbarButton,
  ComboboxControl,
  RadioControl,
  SelectControl,
  TextControl,
  PanelBody,
  Popover,
} from "@wordpress/components";
import { link as linkOn, linkOff } from "@wordpress/icons";
import { __ } from "@wordpress/i18n";

import {
  defaultDarkModeOverride,
  ThemeProvider,
  type ColorMode,
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

import { Attr } from "./attr";

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

export interface EditorBlockProps {
  component?: Component;
  attribute?: Attribute;
  custom?: string;
  colorMode?: ColorMode;
  language?: Language;
  direction?: Direction | "auto";
  link?: LinkControlValue;
  prefix?: string;
  postfix?: string;
}

export const Edit: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const { attributes, setAttributes } = props;
  const {
    component,
    attribute,
    custom,
    colorMode,
    language,
    direction,
    link = {},
    prefix,
    postfix,
  } = attributes;

  const [isEditing, setIsEditing] = useState(false);

  const [fulfilledStore, setFulfilledStore] = useState<Store>();

  const [themeDirection, setThemeDirection] = useState<Direction>();
  const [currentLanguage, setCurrentLanguage] = useState<string>();

  const editorRef = createRef<HTMLDivElement>();

  const blockProps = useBlockProps();
  const { ...innerBlocksProps } = useInnerBlocksProps(blockProps);

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
    <div {...innerBlocksProps}>
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
                setAttributes({
                  component: value as Component,
                });
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
                setAttributes({
                  attribute: value as Attribute,
                });
              }}
              placeholder={__("Select an attribute", TEXT_DOMAIN)}
              allowReset
              help={__(
                "Select the account attribute to display—either a standard Cognito attribute (e.g., “email”, “given_name”) or a custom attribute.",
                TEXT_DOMAIN
              )}
            />
            {attribute === "custom" && (
              <TextControl
                label={__("Custom Attribute", TEXT_DOMAIN)}
                value={custom ?? ""}
                onChange={(value) => {
                  setAttributes({
                    custom: value as string,
                  });
                }}
                placeholder={__("Enter custom attribute", TEXT_DOMAIN)}
                help={__(
                  "Enter the name of the custom attribute (e.g., “country”).",
                  TEXT_DOMAIN
                )}
              />
            )}
            <TextControl
              label={__("Prefix", TEXT_DOMAIN)}
              value={prefix ?? ""}
              onChange={(value) => {
                setAttributes({
                  prefix: value as string,
                });
              }}
              placeholder={__("Enter prefix", TEXT_DOMAIN)}
              help={__("Enter the prefix (e.g., “Hi, ”).", TEXT_DOMAIN)}
            />
            <TextControl
              label={__("Postfix", TEXT_DOMAIN)}
              value={postfix ?? ""}
              onChange={(value) => {
                setAttributes({
                  postfix: value as string,
                });
              }}
              placeholder={__("Enter postfix", TEXT_DOMAIN)}
              help={__("Enter the postfix (e.g., “!”).", TEXT_DOMAIN)}
            />
            <RadioControl
              label={__("Color Mode", TEXT_DOMAIN)}
              selected={colorMode || "system"}
              options={colorModeOptions}
              onChange={(value) => {
                setAttributes({ colorMode: value as ColorMode });
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
                setAttributes({ language: value as Language });
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
                setAttributes({ direction: value as Direction | "auto" });
              }}
              help={__(
                "Choose the layout direction for this account attribute—Auto (default; follows the selected language), Left‑to‑Right, or Right‑to‑Left for RTL languages.",
                TEXT_DOMAIN
              )}
            />
          </PanelBody>
        </InspectorControls>
        <BlockControls>
          <ToolbarGroup>
            {link.url && (
              <ToolbarButton
                icon={linkOff}
                label="Remove link"
                onClick={() => setAttributes({ link: { url: "" } })}
              />
            )}
            <ToolbarButton
              icon={linkOn}
              label={link.url ? "Edit link" : "Add link"}
              onClick={() => setIsEditing(true)}
              isPressed={isEditing}
            />
          </ToolbarGroup>
        </BlockControls>
        {isEditing && (
          <Popover
            onClose={() => setIsEditing(false)}
            focusOnMount="firstElement"
          >
            <LinkControl
              label={__("Link", TEXT_DOMAIN)}
              value={link}
              onChange={(value) => {
                if (value as LinkControlValue) {
                  setAttributes({
                    link: value as LinkControlValue,
                  });
                }
              }}
              settings={[
                {
                  id: "opensInNewTab",
                  title: __("Open in new tab", TEXT_DOMAIN),
                },
                {
                  id: "nofollow",
                  title: __("Add nofollow", TEXT_DOMAIN),
                },
              ]}
            />
          </Popover>
        )}
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
              link={link}
              prefix={prefix}
              postfix={postfix}
            />
          </ThemeProvider>
        )}
      </div>
    </div>
  );
};
