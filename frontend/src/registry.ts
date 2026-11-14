/**
 * The registry that the dashboard puts in the page, `window.VThermUiPluginRegistry`.
 *
 * The SDK of each plugin gives its definition to this registry. The registry only accepts the plugins that the server put
 * in the list to load: a plugin that was registered in Python, or declared by a development entry of the browser. It gives
 * each definition to the placement engine, in the load order, which resolves the position of the contributions.
 */

import { assertValidDefinition, createPlacementEngine } from "@vtherm/dashboard-sdk";
import type { AnyTranslations, EngineIssue, PlacementEngine, UiPluginDefinition, UiPluginRegistry } from "@vtherm/dashboard-sdk";

import type { PluginList } from "./plugin-list.ts";
import { pluginsToLoad } from "./plugin-list.ts";

/** The registry of the dashboard, with what the dashboard needs to read it. */
export interface DashboardRegistry extends UiPluginRegistry {
  /** The engine that holds the resolved contributions of the plugins that registered. */
  readonly engine: PlacementEngine;
  /** Whether a plugin gave its definition. */
  isRegistered(id: string): boolean;
  /** The definitions that were given, in the order of registration, which is the load order. */
  definitions(): readonly UiPluginDefinition[];
  /** The translations of the plugins that registered. The dashboard gives them the language of the user. */
  translations(): readonly AnyTranslations[];
  /**
   * Translate a key of a plugin, for example the title of one of its contributions.
   *
   * @param pluginId - The plugin whose catalogs hold the key.
   * @param key - The key. An unknown key is shown as it is and recorded as a warning of the plugin.
   */
  translate(pluginId: string, key: string): string;
  /** The problems that the placement of the contributions found, in the load order. */
  issues(): readonly EngineIssue[];
}

/**
 * Create the registry for a list of plugins.
 *
 * @param list - The answer of the server. Only its ready plugins can register.
 */
export function createRegistry(list: PluginList): DashboardRegistry {
  const toLoad = pluginsToLoad(list);
  const known = new Set(toLoad.map((plugin) => plugin.id));
  const relations = new Map(toLoad.map((plugin) => [plugin.id, { requires: plugin.requires, load_after: plugin.load_after }] as const));
  const engine = createPlacementEngine();
  const definitions = new Map<string, UiPluginDefinition>();
  return {
    dashboardVersion: list.dashboard_version,
    engine,
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
      engine.addPlugin(definition, relations.get(definition.id));
    },
    isRegistered: (id) => definitions.has(id),
    definitions: () => [...definitions.values()],
    translations: () => [...definitions.values()].map((definition) => definition.translations),
    translate(pluginId, key) {
      const translations = definitions.get(pluginId)?.translations;
      return translations === undefined ? key : (translations.t as (key: string) => string)(key);
    },
    issues: () => engine.issues(),
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
