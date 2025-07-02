import { createContext, useContext } from "react";
/* -----------------------------------------------------------------
 *                       Context / Public API
 * -----------------------------------------------------------------*/

interface RecaptchaContextValue {
  executeRecaptcha: (action?: string) => Promise<string>;
  isReady: boolean;
}

export const RecaptchaContext = createContext<
  RecaptchaContextValue | undefined
>(undefined);

export const useRecaptcha = (): RecaptchaContextValue => {
  const ctx = useContext(RecaptchaContext);
  if (!ctx)
    throw new Error("useRecaptcha must be used inside <RecaptchaProvider>");
  return ctx;
};
