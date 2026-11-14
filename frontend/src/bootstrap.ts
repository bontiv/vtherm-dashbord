/** Start the plugins of the dashboard: ask the server, put the registry in the page, import the modules. */

import type { Hass } from "@vtherm/dashboard-sdk";

import { loadPlugins } from "./loader.ts";
import type { PluginStatus } from "./loader.ts";
import { fetchPluginList } from "./plugin-list.ts";
import type { DevelopmentEntry, PluginList } from "./plugin-list.ts";
import { createRegistry, installRegistry } from "./registry.ts";
import type { DashboardRegistry } from "./registry.ts";

/** The outcome of the start. */
export interface BootstrapResult {
  /** The answer of the server. */
  readonly list: PluginList;
  /** The registry, with the definitions of the plugins that loaded. */
  readonly registry: DashboardRegistry;
  /** The status of every plugin. */
  readonly statuses: readonly PluginStatus[];
}

/** What the start can be given. */
export interface BootstrapOptions {
  /** The active development entries of the browser. */
  readonly developmentEntries?: readonly DevelopmentEntry[];
  /** Import a module. The default is the dynamic `import()` of the browser. */
  readonly importModule?: (url: string) => Promise<unknown>;
  /** Called each time the status of a plugin changes. */
  readonly onStatus?: (statuses: readonly PluginStatus[]) => void;
}

/**
 * Load the plugins of the dashboard.
 *
 * @param hass - The state of Home Assistant.
 * @param options - The development entries, and the way to import a module.
 */
export async function bootstrap(hass: Pick<Hass, "callWS">, options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const list = await fetchPluginList(hass, options.developmentEntries ?? []);
  const registry = createRegistry(list);
  // The registry is in the page before the first module is imported: a module registers itself when it is evaluated.
  installRegistry(registry);
  const statuses = await loadPlugins(list, {
    isRegistered: registry.isRegistered,
    ...(options.importModule === undefined ? {} : { importModule: options.importModule }),
    ...(options.onStatus === undefined ? {} : { onStatus: options.onStatus }),
  });
  return { list, registry, statuses };
}
