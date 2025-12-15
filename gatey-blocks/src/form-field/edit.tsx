import {
  authFieldsWithDefaults,
  defaultFormFieldOptions,
  type AuthFieldsWithDefaults,
} from "@aws-amplify/ui";
import { Text } from "@aws-amplify/ui-react";
import {
  InspectorControls,
  useBlockProps,
  useInnerBlocksProps,
} from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  CheckboxControl,
  ComboboxControl,
  PanelBody,
  TextControl,
} from "@wordpress/components";
import { select, useDispatch, useSelect } from "@wordpress/data";
import { useContext } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, type FunctionComponent } from "react";

import { TEXT_DOMAIN, type AuthenticatorConfig } from "@smart-cloud/gatey-core";

import { ConfigContext } from "../context/config";
import { formFieldOptions } from "../index";
import { type Attribute } from "./index";

export interface EditorBlockProps {
  attribute?: Attribute;
  custom?: string;
  required?: boolean;
  hidden?: boolean;
  label?: string;
  labelHidden?: boolean;
  placeholder?: string;
  autocomplete?: string;
  defaultValue?: string;
  defaultChecked?: boolean;
  dialCode?: string;
  dialCodeList?: string[];
  countryCodeList?: string[];
}

export const Edit: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const { context, attributes, setAttributes, clientId } = props;
  const {
    attribute,
    custom,
    required,
    hidden,
    label,
    labelHidden,
    placeholder,
    autocomplete,
    defaultValue,
    defaultChecked,
    dialCode,
    dialCodeList,
    countryCodeList,
  } = attributes;

  const { "gatey/custom-block/component": component } = context;

  const block = useSelect(
    (s: typeof select) => s("core/block-editor").getBlock(clientId),
    [clientId]
  );

  const ctx = useContext<AuthenticatorConfig | null>(ConfigContext);

  const { updateBlock } = useDispatch("core/block-editor");

  const blockProps = useBlockProps();
  const { ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  const changeAttributes = useCallback((attributeValue: string) => {
    if (defaultFormFieldOptions[attributeValue as AuthFieldsWithDefaults]) {
      const options =
        defaultFormFieldOptions[attributeValue as AuthFieldsWithDefaults];
      return {
        attribute: attributeValue as Attribute,
        custom: "",
        required: options?.isRequired ?? false,
        hidden: options?.hidden ?? false,
        label: options?.label || "",
        labelHidden: options?.labelHidden ?? false,
        placeholder: options?.placeholder || "",
        defaultValue: "",
        defaultChecked: false,
        autocomplete: options?.autocomplete || "off",
        dialCode: options?.dialCode,
        dialCodeList: options?.dialCodeList,
        countryCodeList: options?.countryCodeList,
      };
    }
    return {
      attribute: attributeValue as Attribute,
      custom: "",
      required: false,
      hidden: false,
      label: "",
      labelHidden: false,
      placeholder: "",
      autocomplete: "off",
      defaultValue: "",
      defaultChecked: false,
    };
  }, []);

  useEffect(() => {
    let attr = "";
    if (attribute) {
      if (
        authFieldsWithDefaults.includes(attribute as AuthFieldsWithDefaults)
      ) {
        attr = attribute as string;
      } else if (attribute === "custom") {
        attr = "custom:" + (custom || "");
      } else {
        attr = custom || "";
      }
    } else {
      attr = custom || "";
    }
    if (block && attr !== undefined && block.attributes.anchor !== attr) {
      updateBlock(clientId, {
        attributes: {
          ...attributes,
          anchor: attr,
        },
      });
    }
  }, [attribute, attributes, block, clientId, custom, updateBlock]);

  const attributeName = useMemo(() => {
    let attr = "";
    if (attribute) {
      if (
        authFieldsWithDefaults.includes(attribute as AuthFieldsWithDefaults)
      ) {
        attr = attribute as string;
      } else if (attribute === "custom") {
        attr = "custom:" + (custom || "");
      } else {
        attr = custom || "";
      }
    } else {
      attr = custom || "";
    }
    return attr;
  }, [attribute, custom]);

  const type = useMemo(() => {
    if (attributeName in defaultFormFieldOptions) {
      return (
        defaultFormFieldOptions[attributeName as AuthFieldsWithDefaults].type ||
        "text"
      );
    } else if (ctx?.formFields) {
      return (
        ctx?.formFields.find((ff) => ff.name === attributeName)?.type || "text"
      );
    }
  }, [ctx, attributeName]);

  const ffOptions = [];
  ffOptions.push({ label: __("Username", TEXT_DOMAIN), value: "username" });
  if (component === "SignUp") {
    ffOptions.push({
      label: __("Password", TEXT_DOMAIN),
      value: "password",
    });
    ffOptions.push({
      label: __("Confirm Password", TEXT_DOMAIN),
      value: "confirm_password",
    });
  }
  formFieldOptions.forEach((option) => ffOptions.push(option));

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <ComboboxControl
            label={__("Attribute", TEXT_DOMAIN)}
            value={attribute || ""}
            options={ffOptions}
            onChange={(value) => {
              setAttributes(changeAttributes(value as string));
            }}
            placeholder={__("Select an attribute", TEXT_DOMAIN)}
            allowReset
          />
          {attribute === "custom" && (
            <TextControl
              label={__("Custom Attribute", TEXT_DOMAIN)}
              value={custom ?? ""}
              onChange={(value) => {
                setAttributes({
                  custom: value,
                });
              }}
              placeholder={__("Enter custom attribute", TEXT_DOMAIN)}
            />
          )}
          {type === "checkbox" && (
            <CheckboxControl
              label={__("Checked by default", TEXT_DOMAIN)}
              checked={defaultChecked ?? false}
              onChange={(value) => {
                setAttributes({ defaultChecked: value });
              }}
              help={__("Make this field checked by default.", TEXT_DOMAIN)}
            />
          )}
          {(type === "radio" || type === "select" || type === "country") && (
            <TextControl
              label={__("Default Value", TEXT_DOMAIN)}
              value={defaultValue || ""}
              onChange={(value) => {
                setAttributes({
                  defaultValue: value,
                });
              }}
              placeholder={__("Enter default value", TEXT_DOMAIN)}
            />
          )}
          <CheckboxControl
            label={__("Required", TEXT_DOMAIN)}
            checked={required ?? false}
            onChange={(value) => {
              setAttributes({ required: value });
            }}
            help={__("Make this field mandatory.", TEXT_DOMAIN)}
          />
          <CheckboxControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={hidden ?? false}
            onChange={(value) => {
              setAttributes({ hidden: value });
            }}
            help={__("Hide this field from users.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Label", TEXT_DOMAIN)}
            value={label || ""}
            onChange={(value) => {
              setAttributes({
                label: value,
              });
            }}
            placeholder={__("Enter label", TEXT_DOMAIN)}
          />
          <CheckboxControl
            label={__("Label Hidden", TEXT_DOMAIN)}
            checked={labelHidden ?? false}
            onChange={(value) => {
              setAttributes({ labelHidden: value });
            }}
            help={__("Hide the label for this field.", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Placeholder", TEXT_DOMAIN)}
            value={placeholder || ""}
            onChange={(value) => {
              setAttributes({
                placeholder: value,
              });
            }}
            placeholder={__("Enter placeholder", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Auto Complete", TEXT_DOMAIN)}
            value={autocomplete || "off"}
            onChange={(value) => {
              setAttributes({ autocomplete: value });
            }}
            help={__("Desired autocomplete HTML attribute.", TEXT_DOMAIN)}
          />
          {type === "tel" && (
            <>
              <TextControl
                label={__("Dial Code", TEXT_DOMAIN)}
                value={dialCode || ""}
                onChange={(value) => {
                  setAttributes({
                    dialCode: value,
                  });
                }}
                placeholder={__("Enter dial code", TEXT_DOMAIN)}
                help={__(
                  "Enter a single dial code starting with “+” (e.g., “+1”).",
                  TEXT_DOMAIN
                )}
              />
              <TextControl
                label={__("Dial Code List", TEXT_DOMAIN)}
                value={dialCodeList?.join(", ") || ""}
                onChange={(value) => {
                  setAttributes({
                    dialCodeList: value
                      .split(",")
                      .map((item) => item.trim().toUpperCase()),
                  });
                }}
                placeholder={__(
                  "Enter dial codes separated by commas:",
                  TEXT_DOMAIN
                )}
                help={__(
                  "Enter one or more dial codes, each starting with “+” (example: +36, +44). Separate codes with commas. To remove a code, highlight it together with its comma and press Delete.",
                  TEXT_DOMAIN
                )}
              />
            </>
          )}
          {type === "country" && (
            <TextControl
              label={__("Country Code List", TEXT_DOMAIN)}
              value={countryCodeList?.join(", ") || ""}
              onChange={(value) => {
                setAttributes({
                  countryCodeList: value
                    .split(",")
                    .map((item) => item.trim().toUpperCase()),
                });
              }}
              placeholder={__(
                "Enter country codes separated by commas",
                TEXT_DOMAIN
              )}
              help={__(
                "Enter 3‑letter ISO 3166‑1 alpha‑3 country codes, separated by commas (example: USA, HUN). To remove a code, highlight it together with its comma and press Delete.",
                TEXT_DOMAIN
              )}
            />
          )}
        </PanelBody>
      </InspectorControls>
      <div
        {...innerBlocksProps}
        data-attribute={attribute}
        data-custom={custom}
        data-default-checked={defaultChecked}
        data-required={required}
        data-hidden={hidden}
        data-label={label}
        data-label-hidden={labelHidden}
        data-placeholder={placeholder}
        data-autocomplete={autocomplete || "off"}
        data-dial-code={dialCode || ""}
        data-dial-code-list={dialCodeList?.join(", ") || ""}
        data-country-code-list={countryCodeList?.join(", ") || ""}
      >
        <Text as="p">{attributeName}</Text>{" "}
      </div>
    </>
  );
};
