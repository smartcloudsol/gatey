import { type FunctionComponent } from "react";

import { type BlockEditProps } from "@wordpress/blocks";
import { useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";

import { type ColorMode } from "@aws-amplify/ui-react";

import { type Screen, type Variation } from "./index";
import { Block } from "./block";

export interface EditorBlockProps {
  screen?: Screen;
  variation?: Variation;
  colorMode?: ColorMode;
  showOpenButton?: boolean;
  openButtonTitle?: string;
  signingInMessage?: string;
  signingOutMessage?: string;
  redirectingMessage?: string;
}

export const Edit: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const blockProps = useBlockProps();
  const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  return (
    <div {...innerBlocksProps}>
      <Block children={children} {...props} />
    </div>
  );
};
