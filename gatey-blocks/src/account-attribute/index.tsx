import { registerBlockType, type BlockAttributes } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";
import { Edit } from "./edit";
import { Save } from "./save";
import metadata from "./block.json";

export type Attributes = {
  component?: "div" | "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  attribute?: string;
  custom?: string;
};

const icon = (
  <svg
    width="800px"
    height="800px"
    viewBox="0 0 48 48"
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Account Attribute</title>
    <path d="M0 0h48v48H0z" fill="none" />
    <g id="account-attribute">
      <path
        fill="true"
        d="M31.278,25.525C34.144,23.332,36,19.887,36,16c0-6.627-5.373-12-12-12c-6.627,0-12,5.373-12,12
		c0,3.887,1.856,7.332,4.722,9.525C9.84,28.531,5,35.665,5,44h38C43,35.665,38.16,28.531,31.278,25.525z M16,16c0-4.411,3.589-8,8-8
		s8,3.589,8,8c0,4.411-3.589,8-8,8S16,20.411,16,16z M24,28c6.977,0,12.856,5.107,14.525,12H9.475C11.144,33.107,17.023,28,24,28z"
      />
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
  textdomain: TEXT_DOMAIN,
  edit: Edit,
  save: Save,
  icon: icon,
});
