import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import "jquery";

import { getStore } from "@smart-cloud/gatey-core";

import { beginMount, endMount, resetMount } from "../shared/mountGuard";
import { ThemedApp } from "./theme";

const cache = new Map<string, string>();
const roots = new Map<string, Root>();

try {
  const call = async (id: string, forceRemount = false) => {
    const el = document.querySelector("#" + id);
    if (el) {
      if (forceRemount) {
        const existingRoot = roots.get(id);
        if (existingRoot) {
          existingRoot.unmount();
          roots.delete(id);
        }
        resetMount(el);
        if (cache.has(id)) {
          el.innerHTML = cache.get(id) || "";
        }
      }

      if (!beginMount(id, el)) {
        return;
      }

      try {
        // Simple decode of single data-config attribute
        const configAttr = el.getAttribute("data-config");
        const config = configAttr ? JSON.parse(atob(configAttr)) : {};

        const isPreview = el.getAttribute("data-is-preview") === "true";

        const root = createRoot(el);
        roots.set(id, root);
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
      } catch (error) {
        resetMount(el);
        throw error;
      } finally {
        endMount(id);
      }
    }
  };

  jQuery(document).on(
    "smartcloud-gatey-authenticator-block",
    (_, id, forceRemount) => call(id, forceRemount === true),
  );
} catch (err) {
  console.error(err);
}
