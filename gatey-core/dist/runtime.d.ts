import { WpSuitePluginBase } from "@smart-cloud/wpsuite-core";
import { Gatey } from "./index";
export type GateyReadyEvent = "wpsuite:gatey:ready";
export type GateyErrorEvent = "wpsuite:gatey:error";
export type GateyPlugin = WpSuitePluginBase & Gatey;
export declare function getGateyPlugin(): GateyPlugin;
export declare function waitForGateyReady(timeoutMs?: number): Promise<void>;
export declare function getStore(timeoutMs?: number): Promise<import("./store").Store>;
