import type { WpSuitePluginBase } from "@smart-cloud/wpsuite-core";
import type { Gatey, GateySiteRuntime } from "./index";
export type GateyReadyEvent = "wpsuite:gatey:ready";
export type GateyErrorEvent = "wpsuite:gatey:error";
export type GateyPlugin = WpSuitePluginBase & Gatey & GateySiteRuntime;
export declare function getGateyPlugin(): GateyPlugin;
/**
 * Resolve a page selected in Gatey's WordPress settings to its site's URL.
 *
 * Settings deliberately store a portable page path such as `/sign-in`, but
 * browser navigation interprets that path from the domain root. On a
 * subdirectory Multisite that would escape `/saas-launch/`. PHP's `site_url()`
 * already uses the current blog; this helper gives the browser runtime the
 * same current-site behavior while preserving explicit absolute URLs (for
 * example the WordPress `redirect_to` return URL).
 */
export declare function resolveGateyTarget(target: string | null | undefined): string | undefined;
export declare function waitForGateyReady(timeoutMs?: number): Promise<void>;
export declare function getStore(timeoutMs?: number): Promise<import("./store").Store>;
