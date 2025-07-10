import { useEffect, type FunctionComponent } from "react";

import { type BlockEditProps } from "@wordpress/blocks";
import { useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";

import { type ColorMode, type Direction } from "@aws-amplify/ui-react";

import { type Language } from "../index";
import { type Screen, type Variation } from "./index";
import { Block } from "./block";

import "./index.css";

export interface EditorBlockProps {
  screen?: Screen;
  variation?: Variation;
  colorMode?: ColorMode;
  language?: Language;
  direction?: Direction | "auto";
  showOpenButton?: boolean;
  openButtonTitle?: string;
  signingInMessage?: string;
  signingOutMessage?: string;
  redirectingMessage?: string;
  totpIssuer?: string;
  uid?: string;
  customCSS?: string;
}

export const Edit: FunctionComponent<BlockEditProps<EditorBlockProps>> = (
  props: BlockEditProps<EditorBlockProps>
) => {
  const { clientId, attributes, setAttributes } = props;
  const { uid } = attributes;
  const blockProps = useBlockProps({
    className: `wp-block-css-box-${uid}`,
  });
  const { children, ...innerBlocksProps } = useInnerBlocksProps(blockProps);

  useEffect(() => {
    if (!uid) {
      setAttributes({ uid: clientId.slice(0, 8) });
    }
  }, [clientId, setAttributes, uid]);

  return (
    <div {...innerBlocksProps}>
      <Block children={children} {...props} />
    </div>
  );
};
