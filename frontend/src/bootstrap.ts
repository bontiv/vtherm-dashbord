/** Start the plugins of the dashboard: ask the server, put the registry in the page, import the modules. */

import type { Hass, UiPluginDefinition } from "@vtherm/dashboard-sdk";

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

type ImportModule = (url: string) => Promise<unknown>;

const importWithBrowser: ImportModule = (url) => import(/* @vite-ignore */ url);

/**
 * The definitions that each module registered when it was evaluated, by way of importing and by URL.
 *
 * A module is evaluated once in the page: the browser gives the same module to a second `import()` without running it again. Home
 * Assistant destroys the panel when the user leaves it and creates a new one when the user comes back, and the new panel has a new
 * registry. Without this memory, the plugins would not register in it, and the dashboard would be empty.
 */
const evaluated = new WeakMap<ImportModule, Map<string, readonly UiPluginDefinition[]>>();

/**
 * Import a module, or give its definitions again to the registry when the module was already evaluated in this page.
 *
 * @returns The function that the loader uses to import a module.
 */
function importOnce(importModule: ImportModule, registry: DashboardRegistry): ImportModule {
  let modules = evaluated.get(importModule);
  if (modules === undefined) {
    modules = new Map();
    evaluated.set(importModule, modules);
  }
  const known = modules;
  return async (url) => {
    const definitions = known.get(url);
    if (definitions !== undefined) {
      definitions.forEach((definition) => registry.register(definition));
      return;
    }
    const before = new Set(registry.definitions());
    await importModule(url);
    known.set(
      url,
      registry.definitions().filter((definition) => !before.has(definition)),
    );
  };
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
    importModule: importOnce(options.importModule ?? importWithBrowser, registry),
    ...(options.onStatus === undefined ? {} : { onStatus: options.onStatus }),
  });
  return { list, registry, statuses };
}
