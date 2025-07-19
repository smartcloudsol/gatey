/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReactNode } from "react";
import {
  type AuthenticatorConfig,
  type Account,
} from "@smart-cloud/gatey-core";
import { type DefaultComponents } from "../login";
import { type Direction } from "@aws-amplify/ui-react";

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
