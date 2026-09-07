import { createContext } from "react";
import type { Direction } from "@smart-cloud/aws-amplify-ui-react";

/** Keep custom component identities stable when the surrounding locale changes. */
export const CustomPartDirectionContext = createContext<Direction>("ltr");
