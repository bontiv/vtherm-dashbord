/**
 * The registry that the dashboard puts in the page, `window.VThermUiPluginRegistry`.
 *
 * The SDK of each plugin gives its definition to this registry. The registry only accepts the plugins that the server put
 * in the list to load: a plugin that was registered in Python, or declared by a development entry of the browser. It keeps
 * the definitions; the resolution of the positions is done on them by the navigation.
 */

import { assertValidDefinition } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition, UiPluginRegistry } from "@vtherm/dashboard-sdk";

import type { PluginList } from "./plugin-list.ts";
import { pluginsToLoad } from "./plugin-list.ts";

/** The registry of the dashboard, with what the dashboard needs to read it. */
export interface DashboardRegistry extends UiPluginRegistry {
  /** Whether a plugin gave its definition. */
  isRegistered(id: string): boolean;
  /** The definitions that were given, in the order of registration, which is the load order. */
  definitions(): readonly UiPluginDefinition[];
}

/**
 * Create the registry for a list of plugins.
 *
 * @param list - The answer of the server. Only its ready plugins can register.
 */
export function createRegistry(list: PluginList): DashboardRegistry {
  const known = new Set(pluginsToLoad(list).map((plugin) => plugin.id));
  const definitions = new Map<string, UiPluginDefinition>();
  return {
    dashboardVersion: list.dashboard_version,
    register(definition: UiPluginDefinition): void {
      // The SDK already checked the definition, but a plugin can call the registry directly.
      assertValidDefinition(definition);
      if (!known.has(definition.id)) {
        throw new Error(`The plugin '${definition.id}' is not known: it is neither registered in Python nor declared by a development entry, so it cannot register.`);
      }
      if (definitions.has(definition.id)) {
        throw new Error(`The plugin '${definition.id}' already registered its contributions.`);
      }
      definitions.set(definition.id, definition);
    },
    isRegistered: (id) => definitions.has(id),
    definitions: () => [...definitions.values()],
  };
}

/** Put the registry in the page, where the SDK of every plugin looks for it. Do it before importing any plugin. */
export function installRegistry(registry: DashboardRegistry): void {
  (globalThis as { VThermUiPluginRegistry?: UiPluginRegistry }).VThermUiPluginRegistry = registry;
}

/** Remove the registry from the page. */
export function uninstallRegistry(): void {
  delete (globalThis as { VThermUiPluginRegistry?: UiPluginRegistry }).VThermUiPluginRegistry;
}
