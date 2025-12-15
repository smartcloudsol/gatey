/* eslint-disable @typescript-eslint/no-unused-vars */
import { type Direction } from "@aws-amplify/ui-react";
import {
  type Account,
  type AuthenticatorConfig,
} from "@smart-cloud/gatey-core";
import { ReactNode } from "react";
import { type DefaultComponents } from "../login";

export default function parseCustomBlocks(
  _config: AuthenticatorConfig,
  _isPreview: boolean,
  _account: Account | null,
  _children: ReactNode,
  _content: string | null,
  _direction: Direction
): DefaultComponents {
  return {};
}
