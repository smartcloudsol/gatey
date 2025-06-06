import { type FunctionComponent } from "react";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  ComboboxControl,
  TextControl,
  PanelBody,
  SelectControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";

import { type Attributes } from "./index";

export const Edit: FunctionComponent<BlockEditProps<Attributes>> = (
  props: BlockEditProps<Attributes>
) => {
  const { attributes, setAttributes } = props;
  const { component, attribute, custom } = attributes;

  const Component = component || "div";

  const blockProps = useBlockProps();
  const { ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  return (
    <>
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
            onChange={(value) => setAttributes({ component: value })}
          />
          <ComboboxControl
            label={__("Attribute", TEXT_DOMAIN)}
            value={attribute || ""}
            options={[
              { label: "Username", value: "sub" },
              { label: "Preferred Username", value: "preferred_username" },
              { label: "Email", value: "email" },
              { label: "Phone Number", value: "phone_number" },
              { label: "Name", value: "name" },
              { label: "First Name", value: "given_name" },
              { label: "Last Name", value: "family_name" },
              { label: "Middle Name", value: "middle_name" },
              { label: "Nickname", value: "nickname" },
              { label: "Gender", value: "gender" },
              { label: "Birthdate", value: "birthdate" },
              { label: "Address", value: "address" },
              { label: "Picture", value: "picture" },
              { label: "Website", value: "website" },
              { label: "Zoneinfo", value: "zoneinfo" },
              { label: "Locale", value: "locale" },
              { label: "Custom", value: "custom" },
            ]}
            onChange={(value) => {
              if (value as Attributes["attribute"]) {
                setAttributes({
                  attribute: value as Attributes["attribute"],
                });
              }
            }}
          />
          {attribute === "custom" && (
            <TextControl
              label={__("Custom Attribute", TEXT_DOMAIN)}
              value={custom ?? ""}
              onChange={(value) => {
                if (value as Attributes["custom"]) {
                  setAttributes({
                    custom: value as Attributes["custom"],
                  });
                }
              }}
              placeholder={__("Enter custom attribute:", TEXT_DOMAIN)}
            />
          )}
        </PanelBody>
      </InspectorControls>
      <div {...innerBlocksProps}>
        <Component>
          {attribute + (attribute === "custom" ? "-" + custom : "")}
        </Component>
      </div>
    </>
  );
};
