import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { type ColorMode, type Direction } from "@aws-amplify/ui-react";

import "jquery";

import { store } from "@smart-cloud/gatey-core";

import { type Language } from "../index";
import { type Screen, type Variation } from "./index";
import { ThemedApp } from "./theme";

const cache = new Map<string, string>();
try {
  const call = async (id: string) => {
    const el = document.querySelector("#" + id);
    if (el) {
      jQuery(el).data("rendered", "true");
      const className = el.getAttribute("data-class") as Screen;
      const isPreview = el.getAttribute("data-is-preview") === "true";
      const screen = el.getAttribute("data-screen") as Screen;
      const variation = el.getAttribute("data-variation") as Variation;
      const colorMode = el.getAttribute("data-color-mode") as ColorMode;
      const language = el.getAttribute("data-language") as Language;
      const direction = el.getAttribute("data-direction") as Direction | "auto";
      const showOpenButton =
        el.getAttribute("data-show-open-button") === "true";
      const openButtonTitle = el.getAttribute("data-open-button-title") || "";
      const signingInMessage = el.getAttribute("data-signing-in-message") || "";
      const signingOutMessage =
        el.getAttribute("data-signing-out-message") || "";
      const redirectingMessage =
        el.getAttribute("data-redirecting-message") || "";
      const totpIssuer = el.getAttribute("data-totp-issuer") || "";
      const root = createRoot(el);
      const fulfilledStore = await store;
      if (cache.has(id)) {
        el.innerHTML = cache.get(id) || "";
      } else {
        cache.set(id, el.innerHTML || "");
      }
      root.render(
        <StrictMode>
          <ThemedApp
            id={id}
            className={className}
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
            totpIssuer={totpIssuer}
            isPreview={isPreview}
            nonce={Gatey?.nonce}
          >
            {el.children?.length && el.children[0].innerHTML}
          </ThemedApp>
        </StrictMode>
      );
    }
  };

  jQuery(document).on("gatey-authenticator-block", (_, id) => call(id));
  jQuery(window).on("elementor/frontend/init", function () {
    jQuery(document).on("gatey-authenticator-block", (_, id) => call(id));
  });
} catch (err) {
  console.error(err);
}
