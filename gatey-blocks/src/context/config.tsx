import { type AuthenticatorConfig } from "@smart-cloud/gatey-core";
import { createContext } from "@wordpress/element";

/** null as default lets consumers detect “no provider” */
const ConfigContext = createContext<AuthenticatorConfig | null>(null);

export { ConfigContext };
