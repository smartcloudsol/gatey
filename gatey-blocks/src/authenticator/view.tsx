import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { type ColorMode } from "@aws-amplify/ui-react";

import "jquery";

import { store } from "@smart-cloud/gatey-core";

import {
  type Screen,
  type Variation,
  type Language,
  type Direction,
} from "./index";
import { Theme } from "./theme";

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
      const direction = el.getAttribute("data-direction") as Direction;
      const showOpenButton =
        el.getAttribute("data-show-open-button") === "true";
      const openButtonTitle = el.getAttribute("data-open-button-title") || "";
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
          <Theme
            id={id}
            store={fulfilledStore}
            screen={screen}
            variation={variation}
            colorMode={colorMode}
            language={language}
            direction={direction}
            showOpenButton={showOpenButton}
            openButtonTitle={openButtonTitle}
            signingInMessage={signingInMessage}
            signingOutMessage={signingOutMessage}
            redirectingMessage={redirectingMessage}
            isPreview={isPreview}
            nonce={Gatey?.nonce}
          >
            {el.children?.length && el.children[0].innerHTML}
          </Theme>
        </StrictMode>
      );
    }
  };

  jQuery(document).on("gatey-block", (_, id) => call(id));
} catch (err) {
  console.error(err);
}
