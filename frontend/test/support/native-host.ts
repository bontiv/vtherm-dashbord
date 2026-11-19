/** A fake dashboard with the native plugins registered, in the load order that the server gives them. */

import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { createFakeHost } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { vi } from "vitest";

import { DASHBOARD_VERSION } from "../../src/version.ts";

/** The native plugins, in their load order: `core` first, then the order of the menu of the flow. */
export const NATIVE_LOAD_ORDER = [
  "core",
  "core_tpi",
  "core_presets",
  "core_central_boiler",
  "core_window",
  "core_motion",
  "core_power",
  "core_presence",
  "core_auto_start_stop",
  "core_valve_regulation",
  "core_sync_temp",
  "core_advanced",
  "core_lock",
  "core_humidity",
  "core_heating_failure",
  "core_complements",
] as const;

/**
 * Import the module of each native plugin with a fake dashboard in the page, and return the host and the definitions.
 *
 * @param without - Native plugins that are not loaded, as when the dashboard does not get them.
 */
export async function nativeHost(without: readonly string[] = []): Promise<{ host: FakeHost; definitions: Map<string, UiPluginDefinition> }> {
  vi.resetModules();
  const host = createFakeHost({ dashboardVersion: DASHBOARD_VERSION });
  host.install();
  const definitions = new Map<string, UiPluginDefinition>();
  try {
    for (const id of NATIVE_LOAD_ORDER.filter((candidate) => !without.includes(candidate))) {
      const module = (await import(`../../src/native/plugins/${id}.ts`)) as { definition: UiPluginDefinition };
      definitions.set(id, module.definition);
    }
  } finally {
    host.uninstall();
  }
  return { host, definitions };
}
