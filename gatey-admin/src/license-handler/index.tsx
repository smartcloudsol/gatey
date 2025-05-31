import "@aws-amplify/ui-react/styles.css";
import { Card, Skeleton } from "@mantine/core";
import { type AuthenticatorConfig } from "@smart-cloud/gatey-core";
import {
  useEffect,
  type Dispatch,
  type SetStateAction,
  type FunctionComponent,
  type PropsWithChildren,
} from "react";
import { Settings } from "./settings";

export interface LicenseHandlerProps extends PropsWithChildren {
  amplifyConfigured: boolean;
  apiUrl: string;
  stripePublicKey: string;
  pricingTable: string;
  config: AuthenticatorConfig | null | undefined;
  accountId?: string;
  siteId?: string;
  siteKey?: string;
  nonce: string;
  setResolvedConfig: Dispatch<
    SetStateAction<AuthenticatorConfig | null | undefined>
  >;
  setSiteId: Dispatch<SetStateAction<string | undefined>>;
  setSiteKey: Dispatch<SetStateAction<string | undefined>>;
}

export const LicenseHandler: FunctionComponent<LicenseHandlerProps> = (
  props: LicenseHandlerProps
) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <Skeleton
      visible={props.amplifyConfigured === undefined}
      width="100%"
      mt="md"
    >
      <Card p="sm" withBorder mt="md">
        <Settings {...props} />
      </Card>
    </Skeleton>
  );
};
