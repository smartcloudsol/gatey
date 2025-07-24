import "@wordpress/block-editor";
import type { ComponentType } from "react";

declare module "@wordpress/block-editor" {
  export interface LinkControlValue {
    url?: string;
    title?: string;
    opensInNewTab?: boolean;
    nofollow?: boolean;
  }

  export interface LinkControlProps {
    label: string;
    value: LinkControlValue;
    onChange(value: LinkControlValue): void;
    settings?: Array<{
      id: string;
      title: string;
    }>;
  }

  export const LinkControl: ComponentType<LinkControlProps>;
}
