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

import { type Screen, type Variation } from "./index";
import { App } from "./app";

const theme = {
  name: "gatey-theme",
  overrides: [defaultDarkModeOverride],
};

try {
  const observers: Record<string, MutationObserver> = {};
  function observe(id: string, cb: (id: string) => void) {
    if (observers[id]) {
      observers[id].disconnect();
    }
    observers[id] = new MutationObserver((_, obs) => {
      const el = document.querySelector("#" + id);
      if (el) {
        cb(id);
        obs.disconnect();
        delete observers[id];
      }
    });
    observers[id].observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  function findElement(id: string, cb: (id: string) => void) {
    const el = document.querySelector("#" + id);
    if (el) {
      cb(id);
      return;
    }
    observe(id, cb);
  }

  const call = async (id: string) => {
    const el = document.querySelector("#" + id);
    if (el) {
      jQuery(el).on("done.gatey-authenticator", () => {
        jQuery(el).remove();
        observe(id, call);
      });
      jQuery(el).on("cancel.gatey-authenticator", () => {
        jQuery(el).remove();
        observe(id, call);
      });
      const isPreview = el.getAttribute("data-is-preview") === "true";
      const screen = el.getAttribute("data-screen") as Screen;
      const variation = el.getAttribute("data-variation") as Variation;
      const colorMode = el.getAttribute("data-color-mode") as ColorMode;
      const signingInMessage = el.getAttribute("data-signing-in-message") || "";
      const signingOutMessage =
        el.getAttribute("data-signing-out-message") || "";
      const redirectingMessage =
        el.getAttribute("data-redirecting-message") || "";
      const root = createRoot(el);
      const fulfilledStore = await store;
      root.render(
        <StrictMode>
          <ThemeProvider theme={theme} colorMode={colorMode}>
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

  jQuery(document).on("gatey-block", (_, id) => findElement(id, call));
} catch (err) {
  console.error(err);
}
