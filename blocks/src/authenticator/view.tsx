import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import "jquery";

import { getStore } from "@smart-cloud/gatey-core";

import { beginMount, endMount, resetMount } from "../shared/mountGuard";
import {
  clearShadowMount,
  ensureShadowMount,
  getAuthenticatorShadowStylesheets,
} from "../shared/shadowMount";
import { ThemedApp } from "./theme";

import "./index.css";

const roots = new Map<string, Root>();
const SHADOW_ROOT_CLASS = "smartcloud-gatey-authenticator-shadow-root";

try {
  const call = async (id: string, forceRemount = false) => {
    const el = document.getElementById(id);
    if (el) {
      if (forceRemount) {
        const existingRoot = roots.get(id);
        if (existingRoot) {
          existingRoot.unmount();
          roots.delete(id);
        }
        clearShadowMount(el);
        resetMount(el);
      }

      if (!beginMount(id, el)) {
        return;
      }

      try {
        // Simple decode of single data-config attribute
        const configAttr = el.getAttribute("data-config");
        const config = configAttr ? JSON.parse(atob(configAttr)) : {};

        const isPreview = el.getAttribute("data-is-preview") === "true";
        const mountTarget = await ensureShadowMount(el, {
          rootClassName: SHADOW_ROOT_CLASS,
          stylesheets: getAuthenticatorShadowStylesheets(),
          minHeight: "48px",
        });

        const root = createRoot(mountTarget);
        roots.set(id, root);
        const fulfilledStore = await getStore();
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

  jQuery(document).on(
    "smartcloud-gatey-authenticator-block",
    (_, id, forceRemount) => call(id, forceRemount === true),
  );
} catch (err) {
  console.error(err);
}
