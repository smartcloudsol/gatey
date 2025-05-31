import { useEffect, useState, type FunctionComponent } from "react";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
} from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import {
  ComboboxControl,
  RadioControl,
  PanelBody,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { select, useDispatch, useSelect } from "@wordpress/data";

import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";

import { type ComponentAttributes } from "./index";

interface Attributes {
  anchor: string;
}

interface EditorBlock {
  clientId: string;
  attributes: Attributes;
  innerBlocks: EditorBlock[];
}

export const Edit: FunctionComponent<BlockEditProps<ComponentAttributes>> = (
  props: BlockEditProps<ComponentAttributes>
) => {
  const { clientId, attributes, setAttributes } = props;
  const { component, part } = attributes;

  const [customPart, setCustomPart] = useState<string>();

  const blockProps = useBlockProps();
  const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  const block: EditorBlock | undefined = useSelect(
    (s: typeof select) => s("core/block-editor").getBlock(clientId),
    [clientId]
  );
  const dispatch = useDispatch("core/block-editor");

  useEffect(() => {
    let attr: string | undefined;
    if (component && component !== "Global") {
      attr = component;
    }
    if (part) {
      attr = attr ? attr + "-" + part : part;
    }
    if (block && attr) {
      setCustomPart(attr);
      if (block.attributes.anchor !== attr) {
        dispatch.updateBlock(clientId, {
          attributes: {
            ...attributes,
            anchor: attr,
          },
        });
      }
    }
  }, [attributes, clientId, component, part, dispatch, block]);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <ComboboxControl
            label={__("Component", TEXT_DOMAIN)}
            value={component || ""}
            options={[
              { label: "-", value: "Global" },
              { label: "Change Password", value: "ChangePassword" },
              { label: "Confirm Sign In", value: "ConfirmSignIn" },
              { label: "Confirm Sign Up", value: "ConfirmSignUp" },
              {
                label: "Confirm Reset Password",
                value: "ConfirmResetPassword",
              },
              { label: "Confirm Verify User", value: "ConfirmVerifyUser" },
              { label: "Edit Account", value: "EditAccount" },
              { label: "Force New Password", value: "ForceNewPassword" },
              { label: "Forgot Password", value: "ForgotPassword" },
              { label: "Setup TOTP", value: "SetupTotp" },
              { label: "Sign In", value: "SignIn" },
              { label: "Sign Up", value: "SignUp" },
              { label: "Verify User", value: "VerifyUser" },
            ]}
            onChange={(value) => {
              if (value as ComponentAttributes["component"]) {
                setAttributes({
                  component: value as ComponentAttributes["component"],
                });
              }
            }}
          />
          <RadioControl
            label={__("Part", TEXT_DOMAIN)}
            selected={part || ""}
            options={[
              { label: __("Header", TEXT_DOMAIN), value: "Header" },
              { label: __("Footer", TEXT_DOMAIN), value: "Footer" },
            ]}
            onChange={(value) => {
              if (value === "Header" || value === "Footer") {
                setAttributes({ part: value });
              }
            }}
          />
        </PanelBody>
      </InspectorControls>
      <div {...innerBlocksProps}>
        <details custom-part={customPart}>
          <summary>{customPart}</summary>
          {children}
        </details>
      </div>
    </>
  );
};
