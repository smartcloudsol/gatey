import type { Settings } from "@smart-cloud/gatey-core";

/** Pool regions are derived by WordPress, never copied from stale form state. */
export function serializeGateySettings(settings: Settings): string {
  const payload = JSON.parse(JSON.stringify(settings)) as Settings;
  for (const pool of [
    payload.userPoolConfigurations?.default,
    payload.userPoolConfigurations?.secondary,
  ]) {
    const graphQL = pool?.API?.GraphQL as { region?: string } | undefined;
    if (graphQL) delete graphQL.region;
  }
  return JSON.stringify(payload);
}
