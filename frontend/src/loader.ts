/**
 * Import the modules of the plugins, in the order that the server computed.
 *
 * The frontend does not sort and does not check versions: the server did. It imports the plugins that are `ready`, one
 * after the other, and keeps the state of each plugin. An import that fails is isolated: the other plugins are still
 * loaded and the dashboard is still shown. The only dependency logic here concerns what the server cannot know: a plugin
 * whose required plugin failed to import is not imported.
 */

import type { PluginInfo, PluginList, PluginSource, ServerState } from "./plugin-list.ts";
import { pluginsToLoad } from "./plugin-list.ts";

/** The state of a plugin: what the server decided, then what happened when its module was imported. */
export type PluginStateName = ServerState | "loaded" | "failed";

/** What is known about a plugin, for the plugin status page. */
export interface PluginStatus {
  /** The identifier of the plugin. */
  readonly id: string;
  /** Where the plugin comes from. */
  readonly source: PluginSource;
  /** The URL of the module, shown to diagnose a development plugin. */
  readonly js_url: string;
  /** The state of the plugin. `ready` means that it is waiting to be imported. */
  readonly state: PluginStateName;
  /** A code that refines the state. */
  readonly reason: string | null;
  /** Data that explains the state: the faulty part, the missing plugins, the error message. */
  readonly details: Readonly<Record<string, unknown>>;
}

/** What the loader needs from its environment. */
export interface LoaderOptions {
  /** Import a module. The default is the dynamic `import()` of the browser. */
  readonly importModule?: (url: string) => Promise<unknown>;
  /** Tell whether a plugin declared its contributions to the registry. A module that does not is a failure. */
  readonly isRegistered: (id: string) => boolean;
  /** Called each time the status of a plugin changes. */
  readonly onStatus?: (statuses: readonly PluginStatus[]) => void;
}

const importWithBrowser = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function initialStatus(plugin: PluginInfo): PluginStatus {
  return { id: plugin.id, source: plugin.source, js_url: plugin.js_url, state: plugin.state, reason: plugin.reason, details: plugin.details };
}

/**
 * Import the plugins that the server marked as ready, in the order received.
 *
 * @param list - The answer of the server.
 * @param options - The way to import a module and to know that a plugin registered itself.
 * @returns The status of every plugin of the list, in the order of the list.
 */
export async function loadPlugins(list: PluginList, options: LoaderOptions): Promise<PluginStatus[]> {
  const importModule = options.importModule ?? importWithBrowser;
  const statuses = new Map(list.plugins.map((plugin) => [plugin.id, initialStatus(plugin)] as const));
  const publish = (): void => options.onStatus?.(list.plugins.map((plugin) => statuses.get(plugin.id) as PluginStatus));
  const update = (id: string, change: Partial<PluginStatus>): void => {
    statuses.set(id, { ...(statuses.get(id) as PluginStatus), ...change });
    publish();
  };

  publish();
  for (const plugin of pluginsToLoad(list)) {
    // The server checked that the plugins that are required are ready, not that their module imports.
    const missing = plugin.requires.filter((required) => statuses.get(required)?.state !== "loaded");
    if (missing.length > 0) {
      update(plugin.id, { state: "missing_dependency", reason: null, details: { missing } });
      continue;
    }
    try {
      await importModule(plugin.js_url);
    } catch (error) {
      update(plugin.id, { state: "failed", reason: "import_failed", details: { message: describeError(error), url: plugin.js_url } });
      continue;
    }
    if (options.isRegistered(plugin.id)) {
      update(plugin.id, { state: "loaded" });
    } else {
      update(plugin.id, { state: "failed", reason: "not_registered", details: { message: `The module did not call registerUiPlugin for '${plugin.id}'`, url: plugin.js_url } });
    }
  }
  return list.plugins.map((plugin) => statuses.get(plugin.id) as PluginStatus);
}
