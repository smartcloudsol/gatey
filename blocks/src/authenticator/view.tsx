import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import "jquery";

import { getStore } from "@smart-cloud/gatey-core";
import {
  dismissReactFallbackWhenMounted,
  showReactFallback,
  type ReactFallbackHandoff,
} from "@smart-cloud/wpsuite-blocks";

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
      const shadowHost = el.querySelector<HTMLElement>(
        ".smartcloud-gatey-authenticator__mount",
      );

      if (forceRemount) {
        const existingRoot = roots.get(id);
        if (existingRoot) {
          existingRoot.unmount();
          roots.delete(id);
        }
        if (shadowHost) {
          clearShadowMount(shadowHost);
        }
        resetMount(el);
      }

      if (!beginMount(id, el)) {
        return;
      }

      let fallbackHandoff: ReactFallbackHandoff | undefined;
      try {
        showReactFallback(el);
        // Simple decode of single data-config attribute
        const configAttr = el.getAttribute("data-config");
        const config = configAttr ? JSON.parse(atob(configAttr)) : {};

        const isPreview = el.getAttribute("data-is-preview") === "true";
        if (!shadowHost) {
          throw new Error("Gatey authenticator mount target is missing.");
        }
        const mountTarget = await ensureShadowMount(shadowHost, {
          rootClassName: SHADOW_ROOT_CLASS,
          stylesheets: getAuthenticatorShadowStylesheets(),
          minHeight: "48px",
        });

        const root = createRoot(mountTarget);
        roots.set(id, root);
        const fulfilledStore = await getStore();
        fallbackHandoff = dismissReactFallbackWhenMounted(el, mountTarget);
        const configContainer = el.querySelector<HTMLElement>(
          ".smartcloud-gatey-authenticator__config",
        );
        root.render(
          <StrictMode>
            <ThemedApp
              id={id}
              store={fulfilledStore}
              isPreview={isPreview}
              {...config}
            >
              {configContainer?.innerHTML || undefined}
            </ThemedApp>
          </StrictMode>,
        );
      } catch (error) {
        fallbackHandoff?.cancel();
        showReactFallback(el);
        const existingRoot = roots.get(id);
        if (existingRoot) {
          existingRoot.unmount();
          roots.delete(id);
        }
        if (shadowHost) {
          clearShadowMount(shadowHost);
        }
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
