import { registerBlockType, type BlockAttributes } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";
import { Edit } from "./edit";
import { Save } from "./save";
import metadata from "./block.json";

import "./index.css";

export type Screen =
  | "signIn"
  | "signUp"
  | "forgotPassword"
  | "setupTotp"
  | "editAccount"
  | "changePassword";

export type Variation = "default" | "modal";

const icon = (
  <svg
    width="800px"
    height="800px"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Authenticator</title>
    <g id="Layer_2" data-name="Layer 2">
      <g id="invisible_box" data-name="invisible box">
        <rect width="48" height="48" fill="none" />
      </g>
      <g id="authenticator" data-name="icons Q2">
        <path d="M24,2S6,7.1,6,8V26.2c0,9.2,13.3,17.3,17,19.5a1.8,1.8,0,0,0,2,0c3.8-2.1,17-10.3,17-19.5V8C42,7.1,24,2,24,2Zm0,39.6a54,54,0,0,1-8.4-6.1A25.3,25.3,0,0,1,24,34a24.8,24.8,0,0,1,8.4,1.5A44.7,44.7,0,0,1,24,41.6ZM38,26.2c0,1.6-.8,3.7-2.6,6.1A30.9,30.9,0,0,0,24,30a30,30,0,0,0-11.3,2.3c-1.9-2.4-2.7-4.5-2.7-6.1V10.5c2.9-1.1,8.7-2.8,14-4.3,5.3,1.5,11.1,3.3,14,4.3Z" />
        <path d="M24,14a4,4,0,1,1-4,4,4,4,0,0,1,4-4m0-4a8,8,0,1,0,8,8,8,8,0,0,0-8-8Z" />
      </g>
    </g>
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
  edit: Edit,
  save: Save,
  icon: icon,
  textdomain: TEXT_DOMAIN,
});
