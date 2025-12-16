import {
  InspectorControls,
  useBlockProps,
  useInnerBlocksProps,
} from "@wordpress/block-editor";
import { createBlock, type BlockEditProps } from "@wordpress/blocks";
import {
  Button,
  ComboboxControl,
  PanelBody,
  RadioControl,
} from "@wordpress/components";
import { select, useDispatch } from "@wordpress/data";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, type FunctionComponent } from "react";

import {
  AuthMachineState,
  FormFieldComponents,
  getSortedFormFields,
} from "@aws-amplify/ui";

import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";

import { type ComponentAttributes } from "./index";

const HeaderFooterOptions = [
  { label: __("Header", TEXT_DOMAIN), value: "Header" },
  { label: __("Footer", TEXT_DOMAIN), value: "Footer" },
];

const HeaderFooterFormFieldsOptions = [
  { label: __("Header", TEXT_DOMAIN), value: "Header" },
  { label: __("Form Fields", TEXT_DOMAIN), value: "FormFields" },
  { label: __("Footer", TEXT_DOMAIN), value: "Footer" },
];

export const Edit: FunctionComponent<BlockEditProps<ComponentAttributes>> = (
  props: BlockEditProps<ComponentAttributes>
) => {
  const { clientId, attributes, setAttributes } = props;
  const { component, part } = attributes;

  const blockProps = useBlockProps();
  const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  const coreEditor = select("core/block-editor");

  const { insertBlocks, updateBlock } = useDispatch("core/block-editor");

  const addChild = useCallback(() => {
    let route: FormFieldComponents | undefined;
    switch (component) {
      case "SignUp":
        route = "signUp";
        break;
      case "EditAccount":
        route = "editAccount";
        break;
    }
    if (!route) {
      return;
    }
    const ids = coreEditor.getClientIdsOfDescendants([clientId]);
    const children = getSortedFormFields(route, {
      context: {
        config: {
          loginMechanisms: Gatey.settings.loginMechanisms,
          signUpAttributes: Gatey.settings.signUpAttributes,
        },
      },
    } as AuthMachineState)
      .filter(
        ([field]) =>
          !ids.find((id: string) => {
            const b = coreEditor.getBlock(id)!;
            return (
              b.name === "gatey/form-field" && b.attributes.attribute === field
            );
          })
      )
      .map(([field, options]) => {
        return createBlock("gatey/form-field", {
          ...options,
          attribute: field,
          required: options.isRequired,
          type: options.type || "text",
        });
      });
    if (children.length > 0) {
      insertBlocks(children, undefined, clientId);
    }
  }, [component, coreEditor, clientId, insertBlocks]);

  useEffect(() => {
    let attr: string | undefined;
    if (component && component !== "Global") {
      attr = component;
    }
    if (part) {
      attr = attr ? attr + "-" + part : part;
    }
    const block = coreEditor.getBlock(clientId);
    if (block && attr) {
      if (block.attributes.anchor !== attr) {
        updateBlock(clientId, {
          attributes: {
            ...attributes,
            anchor: attr,
          },
        });
      }
    }
  }, [attributes, clientId, component, part, updateBlock, coreEditor]);

  const customPart = useMemo(() => {
    let attr: string | undefined;
    if (component && component !== "Global") {
      attr = component;
    }
    if (part) {
      attr = attr ? attr + "-" + part : part;
    }
    return attr;
  }, [component, part]);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Settings", TEXT_DOMAIN)}>
          <ComboboxControl
            label={__("Component", TEXT_DOMAIN)}
            value={component || "Global"}
            options={[
              { label: __("Global", TEXT_DOMAIN), value: "Global" },
              {
                label: __("Change Password", TEXT_DOMAIN),
                value: "ChangePassword",
              },
              {
                label: __("Confirm Sign In", TEXT_DOMAIN),
                value: "ConfirmSignIn",
              },
              {
                label: __("Confirm Sign Up", TEXT_DOMAIN),
                value: "ConfirmSignUp",
              },
              {
                label: __("Confirm Reset Password", TEXT_DOMAIN),
                value: "ConfirmResetPassword",
              },
              {
                label: __("Confirm Verify User", TEXT_DOMAIN),
                value: "ConfirmVerifyUser",
              },
              { label: __("Edit Account", TEXT_DOMAIN), value: "EditAccount" },
              {
                label: __("Force New Password", TEXT_DOMAIN),
                value: "ForceNewPassword",
              },
              {
                label: __("Forgot Password", TEXT_DOMAIN),
                value: "ForgotPassword",
              },
              { label: __("Setup TOTP", TEXT_DOMAIN), value: "SetupTotp" },
              { label: __("Sign In", TEXT_DOMAIN), value: "SignIn" },
              { label: __("Sign Up", TEXT_DOMAIN), value: "SignUp" },
              { label: __("Verify User", TEXT_DOMAIN), value: "VerifyUser" },
            ]}
            onChange={(value) => {
              if (value as ComponentAttributes["component"]) {
                setAttributes({
                  component: value as ComponentAttributes["component"],
                });
              }
            }}
            help={__(
              "Select the authenticator screen you want to customise. The custom block’s content will be injected into the chosen screen.",
              TEXT_DOMAIN
            )}
          />
          <RadioControl
            label={__("Part", TEXT_DOMAIN)}
            selected={part || ""}
            options={
              component === "SignUp" || component === "EditAccount"
                ? HeaderFooterFormFieldsOptions
                : HeaderFooterOptions
            }
            onChange={(value) => {
              if (value as ComponentAttributes["part"]) {
                setAttributes({ part: value as ComponentAttributes["part"] });
              }
            }}
            help={__(
              "Choose which part of that screen to override. The custom block’s children will be rendered in the selected section.",
              TEXT_DOMAIN
            )}
          />
          {(component === "SignUp" || component === "EditAccount") &&
            part === "FormFields" && (
              <Button
                variant="primary"
                onClick={addChild}
                style={{ width: "100%" }}
              >
                {__("Add Missing Form Fields", TEXT_DOMAIN)}
              </Button>
            )}
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
