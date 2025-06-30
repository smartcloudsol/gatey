import { type FunctionComponent } from "react";
import { useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { type BlockEditProps } from "@wordpress/blocks";
import { type ColorMode, type Direction } from "@aws-amplify/ui-react";

import { type Language } from "../index";
import { type Attribute, type Component } from "./index";
import { Block } from "./block";

export interface EditorBlockProps {
  component?: Component;
  attribute?: Attribute;
  custom?: string;
  colorMode?: ColorMode;
  language?: Language;
  direction?: Direction | "auto";
}

export const Edit: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const blockProps = useBlockProps();
  const { ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  return (
    <div {...innerBlocksProps}>
      <Block {...props} />
    </div>
  );
};
