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
  const call = async ({
    id,
    screen,
    variation,
    colorMode,
    isPreview,
  }: {
    id: string;
    screen?: Screen;
    variation?: Variation;
    colorMode?: ColorMode;
    isPreview: boolean;
  }) => {
    const el = document.querySelector("#" + id);
    if (el) {
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

  jQuery(document).on("gatey-block", (_, msg) => {
    call({
      id: msg.id,
      screen: msg.screen,
      variation: msg.variation,
      colorMode: msg.color_mode,
      isPreview: msg.is_preview === "true",
    });
  });
} catch (err) {
  console.error(err);
}
