/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 *
 * When this file is defined as the value of the `viewScript` property
 * in `block.json` it will be enqueued on the front end of the site.
 *
 * Example:
 *
 * ```js
 * {
 *   "viewScript": "file:./view.js"
 * }
 * ```
 *
 * If you're not making any changes to this file because your project doesn't need any
 * JavaScript running in the front-end, then you should delete this file and remove
 * the `viewScript` property from `block.json`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import {
  defaultDarkModeOverride,
  ThemeProvider,
  type ColorMode,
} from "@aws-amplify/ui-react";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

import "jquery";

import { store } from "@smart-cloud/gatey-core";

import { type Screen, type Variation, type Language } from "./index";
import { App } from "./app";

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

const cache = new Map<string, string>();
try {
  const call = async (id: string) => {
    const el = document.querySelector("#" + id);
    if (el) {
      const isPreview = el.getAttribute("data-is-preview") === "true";
      const screen = el.getAttribute("data-screen") as Screen;
      const variation = el.getAttribute("data-variation") as Variation;
      const colorMode = el.getAttribute("data-color-mode") as ColorMode;
      const language = el.getAttribute("data-language") as Language;
      let direction = el.getAttribute("data-direction") as
        | "auto"
        | "ltr"
        | "rtl";
      if (!direction || direction === "auto") {
        direction = language === "ar" || language === "he" ? "rtl" : "ltr";
      }
      const showOpenButton =
        el.getAttribute("data-show-open-button") === "true";
      let openButtonTitle = el.getAttribute("data-open-button-title") || "";
      if (showOpenButton && !openButtonTitle) {
        switch (screen) {
          case "signIn":
            openButtonTitle = "Sign In";
            break;
          case "signUp":
            openButtonTitle = "Sign Up";
            break;
          case "forgotPassword":
            openButtonTitle = "Forgot Password";
            break;
          case "changePassword":
            openButtonTitle = "Change Password";
            break;
          case "editAccount":
            openButtonTitle = "Edit Account";
            break;
          case "setupTotp":
            openButtonTitle = "Setup TOTP";
            break;
        }
      }
      const signingInMessage = el.getAttribute("data-signing-in-message") || "";
      const signingOutMessage =
        el.getAttribute("data-signing-out-message") || "";
      const redirectingMessage =
        el.getAttribute("data-redirecting-message") || "";
      const root = createRoot(el);
      const fulfilledStore = await store;
      if (cache.has(id)) {
        el.innerHTML = cache.get(id) || "";
      } else {
        cache.set(id, el.innerHTML || "");
      }
      root.render(
        <StrictMode>
          <ThemeProvider
            theme={theme}
            colorMode={colorMode}
            direction={direction}
          >
            {Gatey.settings?.reCaptchaPublicKey ? (
              <GoogleReCaptchaProvider
                reCaptchaKey={Gatey.settings?.reCaptchaPublicKey}
                language="en"
                useRecaptchaNet={true}
                scriptProps={{ async: true, defer: true }}
              >
                <App
                  id={id}
                  store={fulfilledStore}
                  screen={screen}
                  variation={variation}
                  language={language}
                  showOpenButton={showOpenButton}
                  openButtonTitle={openButtonTitle}
                  signingInMessage={signingInMessage}
                  signingOutMessage={signingOutMessage}
                  redirectingMessage={redirectingMessage}
                  isPreview={isPreview}
                  nonce={Gatey?.nonce}
                >
                  {el.children?.length && el.children[0].innerHTML}
                </App>
              </GoogleReCaptchaProvider>
            ) : (
              <App
                id={id}
                store={fulfilledStore}
                screen={screen}
                variation={variation}
                language={language}
                showOpenButton={showOpenButton}
                openButtonTitle={openButtonTitle}
                signingInMessage={signingInMessage}
                signingOutMessage={signingOutMessage}
                redirectingMessage={redirectingMessage}
                isPreview={isPreview}
                nonce={Gatey?.nonce}
              >
                {el.children?.length && el.children[0].innerHTML}
              </App>
            )}
          </ThemeProvider>
        </StrictMode>
      );
    }
  };

  jQuery(document).on("gatey-block", (_, id) => call(id));
} catch (err) {
  console.error(err);
}
