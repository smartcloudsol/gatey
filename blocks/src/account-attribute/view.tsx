import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import "jquery";

import { getStore } from "@smart-cloud/gatey-core";

import { beginMount, endMount, resetMount } from "../shared/mountGuard";
import {
  clearShadowMount,
  ensureShadowMount,
  getGateySharedShadowStylesheets,
} from "../shared/shadowMount";
import { Theme } from "./theme";

const roots = new Map<string, Root>();
const SHADOW_ROOT_CLASS = "smartcloud-gatey-account-attribute-shadow-root";

try {
  const call = async (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      if (!beginMount(id, el)) {
        return;
      }

      try {
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

        const mountTarget = await ensureShadowMount(el, {
          rootClassName: SHADOW_ROOT_CLASS,
          stylesheets: getGateySharedShadowStylesheets(),
        });

        const root = createRoot(mountTarget);
        roots.set(id, root);
        const fulfilledStore = await getStore();
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
      } catch (error) {
        const existingRoot = roots.get(id);
        if (existingRoot) {
          existingRoot.unmount();
          roots.delete(id);
        }
        clearShadowMount(el);
        resetMount(el);
        throw error;
      } finally {
        endMount(id);
      }
    }
  };

  jQuery(document).on("smartcloud-gatey-account-attribute-block", (_, id) =>
    call(id),
  );
} catch (err) {
  console.error(err);
}
