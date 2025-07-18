import { registerBlockType, type BlockAttributes } from "@wordpress/blocks";
import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";
import { Edit } from "./edit";
import { Save } from "./save";
import metadata from "./block.json";
import "./index.css";

export type Attribute =
  | "sub"
  | "preferred_username"
  | "email"
  | "phone_number"
  | "name"
  | "given_name"
  | "family_name"
  | "middle_name"
  | "nickname"
  | "gender"
  | "birthdate"
  | "address"
  | "picture"
  | "website"
  | "zoneinfo"
  | "locale"
  | "custom";

const icon = (
  <svg
    width="800px"
    height="800px"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5.5 8.557A2.08 2.08 0 0 1 7 8v1c-.74 0-.948.417-1 .571v5.86c.048.143.251.569 1 .569v1a2.08 2.08 0 0 1-1.5-.557A2.08 2.08 0 0 1 4 17v-1c.74 0 .948-.417 1-.571v-5.86C4.952 9.426 4.749 9 4 9V8a2.08 2.08 0 0 1 1.5.557zM23 6.5v12a1.502 1.502 0 0 1-1.5 1.5h-19A1.502 1.502 0 0 1 1 18.5v-12A1.502 1.502 0 0 1 2.5 5h19A1.502 1.502 0 0 1 23 6.5zm-1 0a.5.5 0 0 0-.5-.5h-19a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h19a.5.5 0 0 0 .5-.5zM12 17h1v-1h-1zm-2 0h1v-1h-1zm-2 0h1v-1H8zm6 0h1v-1h-1zm4 0h1v-1h-1zm-2 0h1v-1h-1z" />
    <path fill="none" d="M0 0h24v24H0z" />
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
