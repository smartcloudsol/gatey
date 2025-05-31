import { type ReactNode } from "react";
import { registerBlockType, type BlockAttributes } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";
import { Edit } from "./edit";
import { Save } from "./save";
import metadata from "./block.json";

export type ComponentAttributes = {
  component?:
    | "Global"
    | "ConfirmSignIn"
    | "ConfirmSignUp"
    | "ConfirmResetPassword"
    | "ConfirmVerifyUser"
    | "ForceNewPassword"
    | "ForgotPassword"
    | "SetupTotp"
    | "SignIn"
    | "SignUp"
    | "VerifyUser";
  part?: "Header" | "Footer";
  children?: ReactNode;
};

const icon = (
  <svg
    width="800px"
    height="800px"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
  >
    <title>Custom Block</title>
    <path
      stroke="#000000"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9.5 5H9a2 2 0 0 0-2 2v2c0 1-.6 3-3 3 1 0 3 .6 3 3v2a2 2 0 0 0 2 2h.5m5-14h.5a2 2 0 0 1 2 2v2c0 1 .6 3 3 3-1 0-3 .6-3 3v2a2 2 0 0 1-2 2h-.5"
    />
  </svg>
);

/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
registerBlockType(metadata.name, {
  attributes: metadata.attributes as BlockAttributes,
  title: metadata.title,
  category: metadata.category,
  description: metadata.description,
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  icon: icon,
});
