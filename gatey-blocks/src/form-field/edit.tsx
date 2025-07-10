import {
  useCallback,
  useState,
  useEffect,
  type FunctionComponent,
} from "react";
import {
  defaultFormFieldOptions,
  authFieldsWithDefaults,
  type AuthFieldsWithDefaults,
} from "@aws-amplify/ui";
import { Text } from "@aws-amplify/ui-react";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  ComboboxControl,
  CheckboxControl,
  PanelBody,
  TextControl,
  TextareaControl,
  Button,
  Flex,
  FlexBlock,
  __experimentalDivider as Divider,
} from "@wordpress/components";
import { trash } from "@wordpress/icons";
import { __ } from "@wordpress/i18n";

import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";

import { type Attribute } from "./index";
import { formFieldOptions } from "../index";

export interface EditorBlockProps {
  attribute?: Attribute;
  custom?: string;
  type?: string;
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
  values?: { value: string; label: string }[];
}

export const Edit: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const { context, attributes, setAttributes } = props;
  const {
    attribute,
    custom,
    type,
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
    values = [],
  } = attributes;

  const { "gatey/custom-block/component": component } = context;

  const [attributeName, setAttributeName] = useState<string>("");

  const blockProps = useBlockProps();
  const { ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  const updatePair = useCallback(
    (index: number, field: string, newVal: string) => {
      const next = values.map((item, i) =>
        i === index ? { ...item, [field]: newVal } : item
      );
      setAttributes({ values: next });
    },
    [setAttributes, values]
  );

  const addPair = useCallback(() => {
    setAttributes({ values: [...values, { value: "", label: "" }] });
  }, [setAttributes, values]);

  const removePair = useCallback(
    (index: number) => {
      setAttributes({ values: values.filter((_, i) => i !== index) });
    },
    [setAttributes, values]
  );

  const changeAttributes = useCallback((attributeValue: string) => {
    if (defaultFormFieldOptions[attributeValue as AuthFieldsWithDefaults]) {
      const options =
        defaultFormFieldOptions[attributeValue as AuthFieldsWithDefaults];
      return {
        attribute: attributeValue as Attribute,
        custom: "",
        type: options?.type || "text",
        required: options?.isRequired || false,
        hidden: options?.hidden || false,
        label: options?.label || "",
        labelHidden: options?.labelHidden || false,
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
      type: "text",
      required: false,
      hidden: false,
      label: "",
      labelHidden: false,
      placeholder: "",
      autocomplete: "off",
      defaultValue: "",
      defaultChecked: false,
      values: [],
    };
  }, []);

  useEffect(() => {
    if (attribute) {
      if (
        authFieldsWithDefaults.includes(attribute as AuthFieldsWithDefaults)
      ) {
        setAttributeName(attribute as string);
      } else if (attribute === "custom") {
        setAttributeName("custom:" + (custom || ""));
      } else {
        setAttributeName(custom || "");
      }
    } else {
      setAttributeName(custom || "");
    }
  }, [attribute, custom]);

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
  ffOptions.push({ label: __("Transient", TEXT_DOMAIN), value: "transient" });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <ComboboxControl
            label={__("Attribute", TEXT_DOMAIN)}
            value={attribute || "transient"}
            options={ffOptions}
            onChange={(value) => {
              setAttributes(changeAttributes(value as string));
            }}
          />
          {(!attribute ||
            attribute === "custom" ||
            attribute === "transient") && (
            <TextControl
              label={__("Custom Attribute", TEXT_DOMAIN)}
              value={custom ?? ""}
              onChange={(value) => {
                setAttributes({
                  custom: value as string,
                });
              }}
              placeholder={__("Enter custom attribute:", TEXT_DOMAIN)}
            />
          )}
          <ComboboxControl
            label={__("Type", TEXT_DOMAIN)}
            value={type || "text"}
            options={[
              { label: __("Text", TEXT_DOMAIN), value: "text" },
              { label: __("Password", TEXT_DOMAIN), value: "password" },
              { label: __("Checkbox", TEXT_DOMAIN), value: "checkbox" },
              { label: __("Radio", TEXT_DOMAIN), value: "radio" },
              { label: __("Select", TEXT_DOMAIN), value: "select" },
              { label: __("Phone Number", TEXT_DOMAIN), value: "tel" },
              { label: __("Country", TEXT_DOMAIN), value: "country" },
            ]}
            onChange={(value) => {
              setAttributes({
                type: value as string,
              });
            }}
          />
          {type === "checkbox" && (
            <CheckboxControl
              label={__("Checked by default", TEXT_DOMAIN)}
              checked={defaultChecked || false}
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
                  defaultValue: value as string,
                });
              }}
              placeholder={__("Enter default value:", TEXT_DOMAIN)}
            />
          )}
          <CheckboxControl
            label={__("Required", TEXT_DOMAIN)}
            checked={required || false}
            onChange={(value) => {
              setAttributes({ required: value });
            }}
            help={__("Make this field mandatory.", TEXT_DOMAIN)}
          />
          <CheckboxControl
            label={__("Hidden", TEXT_DOMAIN)}
            checked={hidden || false}
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
                label: value as string,
              });
            }}
            placeholder={__("Enter label:", TEXT_DOMAIN)}
          />
          <CheckboxControl
            label={__("Label Hidden", TEXT_DOMAIN)}
            checked={labelHidden || false}
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
                placeholder: value as string,
              });
            }}
            placeholder={__("Enter placeholder:", TEXT_DOMAIN)}
          />
          <TextControl
            label={__("Auto Complete", TEXT_DOMAIN)}
            value={autocomplete || "off"}
            onChange={(value) => {
              setAttributes({ autocomplete: value as string });
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
                    dialCode: value as string,
                  });
                }}
                placeholder={__("Enter dial code:", TEXT_DOMAIN)}
                help={__(
                  "Enter a single dial code starting with “+” (e.g., +1).",
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
                "Enter country codes separated by commas:",
                TEXT_DOMAIN
              )}
              help={__(
                "Enter 3‑letter ISO 3166‑1 alpha‑3 country codes, separated by commas (example: USA, HUN). To remove a code, highlight it together with its comma and press Delete.",
                TEXT_DOMAIN
              )}
            />
          )}
        </PanelBody>
        {(type === "select" || type === "radio") && (
          <PanelBody title={__("Options", TEXT_DOMAIN)}>
            {values.map((pair, index) => (
              <Flex key={index} align="top" gap="8px" direction="column">
                <FlexBlock style={{ display: "flex", alignItems: "center" }}>
                  <TextControl
                    label={__("Value", TEXT_DOMAIN)}
                    value={pair.value}
                    onChange={(v) => updatePair(index, "value", v)}
                    placeholder={__("Enter value", TEXT_DOMAIN)}
                    className="option-value"
                  />
                  <Button
                    icon={trash}
                    label="Remove"
                    onClick={() => removePair(index)}
                    isDestructive
                    style={{ alignSelf: "end" }}
                  />
                </FlexBlock>
                <FlexBlock>
                  <TextareaControl
                    label={__("Label", TEXT_DOMAIN)}
                    value={pair.label}
                    onChange={(v) => updatePair(index, "label", v)}
                    placeholder={__("Enter label", TEXT_DOMAIN)}
                    rows={4}
                  />
                </FlexBlock>
                <Divider />
              </Flex>
            ))}
            <Button
              variant="secondary"
              onClick={addPair}
              style={{ marginTop: "12px" }}
            >
              Add option
            </Button>
          </PanelBody>
        )}
      </InspectorControls>
      <div
        {...innerBlocksProps}
        data-attribute={attribute || "transient"}
        data-custom={custom}
        data-type={type || "text"}
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
        data-values={values.length > 0 ? btoa(JSON.stringify(values)) : ""}
      >
        <Text as="p">{attributeName}</Text>{" "}
      </div>
    </>
  );
};
