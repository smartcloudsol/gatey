import { useEffect, useRef, useState, ReactNode, FC } from "react";

import { RecaptchaContext } from "./useRecaptcha";

/* -----------------------------------------------------------------
 *                            Types
 * -----------------------------------------------------------------*/

/**
 * Minimal, runtime‑safe subset of the grecaptcha API we actually use.
 */
interface GrecaptchaLite {
  /** Runs when the library is fully initialized. */
  ready(cb: () => void): void;
  /** Generates a token with an action. */
  execute(siteKey: string, opts: { action: string }): Promise<string>;
  /** Enterprise namespace (only exists in Enterprise builds). */
  enterprise?: GrecaptchaLite;
}

declare global {
  // Augment the Window interface so we don't need `as any`.
  interface Window {
    grecaptcha?: GrecaptchaLite;
  }
}

/* -----------------------------------------------------------------
 *                        Provider komponens
 * -----------------------------------------------------------------*/

interface RecaptchaProviderProps {
  siteKey: string;
  useEnterprise?: boolean;
  useRecaptchaNet?: boolean;
  language?: string;
  children: ReactNode;
}

export const RecaptchaProvider: FC<RecaptchaProviderProps> = ({
  siteKey,
  useEnterprise = false,
  useRecaptchaNet = false,
  language = "en",
  children,
}) => {
  const grecaptchaRef = useRef<GrecaptchaLite | null>(null);
  const [isReady, setIsReady] = useState(false);
  const readyResolverRef = useRef<() => void>();
  // Promise that resolves the moment grecaptcha is ready (singleton)
  const readyPromiseRef = useRef<Promise<void>>(
    new Promise((res) => {
      readyResolverRef.current = res;
    })
  );
  /* ----------------------
   * 1) Script injection
   * ---------------------*/
  useEffect(() => {
    const host = useRecaptchaNet ? "recaptcha.net" : "www.google.com";
    const scriptId = `${
      useEnterprise ? "recaptcha-enterprise" : "recaptcha-v3"
    }-${language ?? "auto"}`;
    if (document.getElementById(scriptId)) return; // már be van szúrva

    const params = new URLSearchParams({ render: siteKey });
    if (language) params.set("hl", language);

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://${host}/recaptcha/${
      useEnterprise ? "enterprise.js" : "api.js"
    }?${params.toString()}`;
    document.body.appendChild(script);
  }, [language, siteKey, useEnterprise, useRecaptchaNet]);

  /* ----------------------
   * 2) Wait until ready
   * ---------------------*/
  useEffect(() => {
    let cancelled = false;

    const pollForReady = (attemptsLeft = 40) => {
      const gre = useEnterprise
        ? window.grecaptcha?.enterprise
        : window.grecaptcha;
      if (gre && typeof gre.ready === "function") {
        gre.ready(() => {
          if (cancelled) return;
          grecaptchaRef.current = gre;
          setIsReady(true);
          readyResolverRef.current?.();
        });
        return;
      }
      if (attemptsLeft > 0) {
        setTimeout(() => pollForReady(attemptsLeft - 1), 50);
      } else {
        console.error("[RecaptchaProvider] grecaptcha failed to initialise");
      }
    };

    pollForReady();
    return () => {
      cancelled = true;
    };
  }, [useEnterprise]);

  /* ----------------------
   * 3) Public execute API
   * ---------------------*/
  const executeRecaptcha = async (action = "default"): Promise<string> => {
    // Wait until library is ready
    if (!isReady || !grecaptchaRef.current) {
      // Wait for the promise to
      await readyPromiseRef.current;
    }
    return grecaptchaRef.current!.execute(siteKey, { action });
  };

  return (
    <RecaptchaContext.Provider value={{ executeRecaptcha, isReady }}>
      {children}
    </RecaptchaContext.Provider>
  );
};
