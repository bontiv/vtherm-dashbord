/**
 * Registration of a plugin in the dashboard.
 *
 * The SDK holds no registry. The dashboard puts one in the page, `window.VThermUiPluginRegistry`, before it imports
 * the modules of the plugins. Every copy of the SDK, in every plugin bundle, talks to that same registry.
 */

import type { UiPluginDefinition } from "./types.js";
import { assertValidDefinition } from "./validation.js";

/** The registry that the dashboard puts in the page. */
export interface UiPluginRegistry {
  /** The version of the dashboard, a semantic version such as `1.4.0`. */
  readonly dashboardVersion: string;
  /**
   * Apply the contributions of a plugin.
   *
   * It throws when the plugin is not known: its identifier is neither registered in Python nor declared by a
   * development entry. No contribution is applied then.
   */
  register(definition: UiPluginDefinition): void;
}

/** The error of a plugin module that runs in a page where the dashboard is not loaded. */
export class DashboardNotFoundError extends Error {
  constructor() {
    super("The Versatile Thermostat dashboard was not found in this page: window.VThermUiPluginRegistry is missing. A plugin module must be loaded by the dashboard.");
    this.name = "DashboardNotFoundError";
  }
}

/** The name of the global that holds the registry. */
const REGISTRY_GLOBAL = "VThermUiPluginRegistry";

function getRegistry(): UiPluginRegistry {
  const registry = (globalThis as { VThermUiPluginRegistry?: UiPluginRegistry })[REGISTRY_GLOBAL];
  if (registry === undefined) {
    throw new DashboardNotFoundError();
  }
  return registry;
}

/**
 * Declare a plugin and its contributions to the dashboard.
 *
 * Call it once, when the module of the plugin is loaded. The definition is checked first, with the same rules as the dashboard.
 *
 * @param definition - The identifier of the plugin and its contributions by hook.
 * @throws {@link UiPluginValidationError} when the definition is not valid. The message names each faulty element.
 * @throws {@link DashboardNotFoundError} when the dashboard is not loaded in the page.
 * @throws An error of the dashboard when the identifier of the plugin is not known, because it was not registered in Python.
 */
export function registerUiPlugin(definition: UiPluginDefinition): void {
  assertValidDefinition(definition);
  getRegistry().register(definition);
}

/**
 * Read the version of the dashboard that runs in the page, for a plugin that adapts its behavior to it.
 *
 * @returns A semantic version, for example `1.4.0`.
 * @throws {@link DashboardNotFoundError} when the dashboard is not loaded in the page.
 */
export function getDashboardVersion(): string {
  return getRegistry().dashboardVersion;
}
