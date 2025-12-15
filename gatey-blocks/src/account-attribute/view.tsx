import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { type ColorMode, type Direction } from "@aws-amplify/ui-react";

import "jquery";

import { store } from "@smart-cloud/gatey-core";

import { type Language } from "../index";
import { type Attribute, type Component } from "./index";
import { Theme } from "./theme";

const cache = new Map<string, string>();
try {
  const call = async (id: string) => {
    const el = document.querySelector("#" + id);
    if (el) {
      jQuery(el).data("rendered", "true");
      const isPreview = el.getAttribute("data-is-preview") === "true";
      const component = el.getAttribute("data-component") as Component | "div";
      const attribute = el.getAttribute("data-attribute") as Attribute | "sub";
      const custom = el.getAttribute("data-custom") as string;
      const colorMode = el.getAttribute("data-color-mode") as ColorMode;
      const language = el.getAttribute("data-language") as Language;
      const direction = el.getAttribute("data-direction") as Direction | "auto";
      const link = el.getAttribute("data-link")
        ? JSON.parse(el.getAttribute("data-link") || "{}")
        : {};
      const prefix = el.getAttribute("data-prefix") || "";
      const postfix = el.getAttribute("data-postfix") || "";
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
            isPreview={isPreview}
            store={fulfilledStore}
            component={component}
            attribute={attribute}
            custom={custom}
            colorMode={colorMode}
            language={language}
            direction={direction}
            link={link}
            prefix={prefix}
            postfix={postfix}
          />
        </StrictMode>
      );
    }
  };

  jQuery(document).on("gatey-account-attribute-block", (_, id) => call(id));
  jQuery(window).on("elementor/frontend/init", function () {
    jQuery(document).on("gatey-account-attribute-block", (_, id) => call(id));
  });
} catch (err) {
  console.error(err);
}
