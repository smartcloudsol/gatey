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
 * same current-site behavior while preserving explicitly configured absolute
 * URLs. Query-string `redirect_to` return URLs use
 * `resolveGateyRedirectTarget()` instead.
 */
export declare function resolveGateyTarget(target: string | null | undefined): string | undefined;
/**
 * Resolve an explicit return URL supplied by a `redirect_to` query parameter.
 *
 * This has deliberately different semantics from a saved Gatey page setting:
 * `/sign-in` in settings is portable and site-relative, whereas a return URL
 * such as `/saas-launch/profile` already names an origin-relative request.
 * Do not rebase the latter on the current Multisite blog path.
 *
 * Absolute return URLs are accepted only when they remain on the current
 * browser origin. This prevents an untrusted query parameter becoming an open
 * redirect after a successful sign-in. Bare legacy values keep the normal
 * site-relative resolution behaviour.
 */
export declare function resolveGateyRedirectTarget(target: string | null | undefined): string | undefined;
export declare function waitForGateyReady(timeoutMs?: number): Promise<void>;
export declare function getStore(timeoutMs?: number): Promise<import("./store").Store>;
