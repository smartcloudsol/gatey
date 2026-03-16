import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "jquery";

import { getStore } from "@smart-cloud/gatey-core";

import { Theme } from "./theme";

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

      // Parse link if it's a JSON string
      if (config.link && typeof config.link === "string") {
        try {
          config.link = JSON.parse(config.link);
        } catch {
          /** */
        }
      }

      const root = createRoot(el);
      const fulfilledStore = await getStore();
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
            {...config}
          />
        </StrictMode>,
      );
    }
  };

  jQuery(document).on("smartcloud-gatey-account-attribute-block", (_, id) =>
    call(id),
  );
  jQuery(window).on("elementor/frontend/init", function () {
    jQuery(document).on("smartcloud-gatey-account-attribute-block", (_, id) =>
      call(id),
    );
  });
} catch (err) {
  console.error(err);
}
