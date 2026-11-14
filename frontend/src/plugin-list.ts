/**
 * The list of UI plugins that the server builds for the frontend.
 *
 * The server validates the plugins, checks their compatibility with the dashboard version, resolves their dependencies
 * and sorts them. The frontend only reads the answer and imports the modules in the order received. The fields have the
 * names of the WebSocket reference (docs/reference/websocket-api.md).
 */

import type { Hass } from "@vtherm/dashboard-sdk";

/** The type of the WebSocket command that returns the list. */
export const GET_UI_PLUGINS = "vtherm_dashboard/get_ui_plugins";

/** The outcome of the checks of the server. Only `ready` plugins are imported. */
export const SERVER_STATES = ["ready", "invalid", "dashboard_incompatible", "missing_dependency", "cycle"] as const;

/** The outcome of the checks of the server for a plugin. */
export type ServerState = (typeof SERVER_STATES)[number];

/** Where a plugin comes from. */
export const SOURCES = ["installed", "native", "development"] as const;

/** Where a plugin comes from: an installed integration, the dashboard itself, or a development entry of the browser. */
export type PluginSource = (typeof SOURCES)[number];

/** A plugin of the list, as the server describes it. */
export interface PluginInfo {
  /** The identifier of the plugin. */
  readonly id: string;
  /** The URL of the module to import. */
  readonly js_url: string;
  /** The constraint on the dashboard version declared by the plugin. Empty when a development entry gave none. */
  readonly dashboard_version: string;
  /** The plugins that must be ready. */
  readonly requires: readonly string[];
  /** The plugins to load before this one when they are present. */
  readonly load_after: readonly string[];
  /** The plugins to load after this one when they are present. */
  readonly load_before: readonly string[];
  /** Where the plugin comes from. */
  readonly source: PluginSource;
  /** The outcome of the checks of the server. */
  readonly state: ServerState;
  /** A code that refines the state, such as `too_old`, `invalid_url` or `reserved_id`. */
  readonly reason: string | null;
  /** Data that explains the state: the faulty part, the missing plugins, the plugins of the cycle. */
  readonly details: Readonly<Record<string, unknown>>;
  /** The rank in the load order, null when the plugin is not loaded. */
  readonly order: number | null;
}

/** The answer of the server. */
export interface PluginList {
  /** The version of the dashboard. */
  readonly dashboard_version: string;
  /** The plugins, those to load first and in load order. */
  readonly plugins: readonly PluginInfo[];
}

/** The error of an answer that does not have the expected shape. */
export class PluginListError extends Error {
  /**
   * @param path - The path of the faulty element in the answer.
   * @param problem - What is wrong.
   */
  constructor(path: string, problem: string) {
    super(`The list of plugins sent by the server is not valid: ${path}: ${problem}`);
    this.name = "PluginListError";
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(record: UnknownRecord, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new PluginListError(`${path}.${key}`, "a string is expected");
  }
  return value;
}

function oneOf<Value extends string>(record: UnknownRecord, key: string, path: string, allowed: readonly Value[]): Value {
  const value = text(record, key, path);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new PluginListError(`${path}.${key}`, `one of ${allowed.join(", ")} is expected, got ${JSON.stringify(value)}`);
  }
  return value as Value;
}

function textList(record: UnknownRecord, key: string, path: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new PluginListError(`${path}.${key}`, "a list of strings is expected");
  }
  return value as string[];
}

function parsePlugin(raw: unknown, path: string): PluginInfo {
  if (!isRecord(raw)) {
    throw new PluginListError(path, "an object is expected");
  }
  const reason = raw["reason"];
  const order = raw["order"];
  const details = raw["details"];
  if (reason !== null && typeof reason !== "string") {
    throw new PluginListError(`${path}.reason`, "a string or null is expected");
  }
  if (order !== null && (typeof order !== "number" || !Number.isInteger(order) || order < 0)) {
    throw new PluginListError(`${path}.order`, "a rank or null is expected");
  }
  if (!isRecord(details)) {
    throw new PluginListError(`${path}.details`, "an object is expected");
  }
  const state = oneOf(raw, "state", path, SERVER_STATES);
  if ((state === "ready") !== (order !== null)) {
    throw new PluginListError(`${path}.order`, "only a ready plugin has a rank");
  }
  return {
    id: text(raw, "id", path),
    js_url: text(raw, "js_url", path),
    dashboard_version: text(raw, "dashboard_version", path),
    requires: textList(raw, "requires", path),
    load_after: textList(raw, "load_after", path),
    load_before: textList(raw, "load_before", path),
    source: oneOf(raw, "source", path, SOURCES),
    state,
    reason,
    details,
    order,
  };
}

/**
 * Check the answer of the server and give it a type.
 *
 * @param raw - The result of the WebSocket command.
 * @throws {@link PluginListError} when the answer does not have the documented shape.
 */
export function parsePluginList(raw: unknown): PluginList {
  if (!isRecord(raw)) {
    throw new PluginListError("result", "an object is expected");
  }
  const plugins = raw["plugins"];
  if (!Array.isArray(plugins)) {
    throw new PluginListError("result.plugins", "a list is expected");
  }
  return { dashboard_version: text(raw, "dashboard_version", "result"), plugins: plugins.map((plugin, index) => parsePlugin(plugin, `result.plugins[${index}]`)) };
}

/** A development entry of the browser, sent with the request. The server ignores it for a user who is not an administrator. */
export interface DevelopmentEntry {
  readonly id: string;
  readonly js_url: string;
  readonly dashboard_version?: string;
  readonly requires?: readonly string[];
  readonly load_after?: readonly string[];
  readonly load_before?: readonly string[];
}

/**
 * Ask the server for the list of plugins to load.
 *
 * @param hass - The state of Home Assistant.
 * @param developmentEntries - The active development entries of the browser. They are sent only when there are some.
 * @throws {@link PluginListError} when the answer does not have the documented shape.
 */
export async function fetchPluginList(hass: Pick<Hass, "callWS">, developmentEntries: readonly DevelopmentEntry[] = []): Promise<PluginList> {
  const request: Record<string, unknown> = { type: GET_UI_PLUGINS };
  if (developmentEntries.length > 0) {
    request["dev_plugins"] = developmentEntries;
  }
  return parsePluginList(await hass.callWS<unknown>(request));
}

/** Return the plugins to import, in the order to follow. */
export function pluginsToLoad(list: PluginList): PluginInfo[] {
  return list.plugins.filter((plugin) => plugin.state === "ready").sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
}
