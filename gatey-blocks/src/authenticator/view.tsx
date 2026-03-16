import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "jquery";

import { getStore } from "@smart-cloud/gatey-core";

import { ThemedApp } from "./theme";

const cache = new Map<string, string>();

try {
  const call = async (id: string) => {
    const el = document.querySelector("#" + id);
    if (el) {
      jQuery(el).data("rendered", "true");

      // Simple decode of single data-config attribute
      const configAttr = el.getAttribute("data-config");
      const config = configAttr ? JSON.parse(atob(configAttr)) : {};

      const isPreview = el.getAttribute("data-is-preview") === "true";

      const root = createRoot(el);
      const fulfilledStore = await getStore();
      if (cache.has(id)) {
        el.innerHTML = cache.get(id) || "";
      } else {
        cache.set(id, el.innerHTML || "");
      }
      root.render(
        <StrictMode>
          <ThemedApp
            id={id}
            store={fulfilledStore}
            isPreview={isPreview}
            {...config}
          >
            {el.children?.length && el.children[0].innerHTML}
          </ThemedApp>
        </StrictMode>,
      );
    }
  };

  jQuery(document).on("smartcloud-gatey-authenticator-block", (_, id) =>
    call(id),
  );
  jQuery(window).on("elementor/frontend/init", function () {
    jQuery(document).on("smartcloud-gatey-authenticator-block", (_, id) =>
      call(id),
    );
  });
} catch (err) {
  console.error(err);
}
