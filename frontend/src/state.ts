/**
 * What the pages of the dashboard can read about the plugins: their status and the problems found with their contributions.
 *
 * The panel publishes it once the plugins are loaded. A page that shows it, such as the plugin status page, listens to the event
 * to draw again when it changes.
 */

import type { EngineIssue, TranslationWarning } from "@vtherm/dashboard-sdk";

import type { PluginStatus } from "./loader.ts";

/** The state of the plugins. */
export interface DashboardState {
  /** The status of every plugin, in the order of the server. */
  readonly statuses: readonly PluginStatus[];
  /** The problems that the placement of the contributions found. */
  readonly issues: readonly EngineIssue[];
  /** The version of the dashboard. */
  readonly dashboardVersion: string;
  /** The warnings of the translations of a plugin, read when they are shown because they grow as the pages draw. */
  readonly translationWarnings?: (pluginId: string) => readonly TranslationWarning[];
}

/** The event sent on the window when the state changes. */
export const STATE_CHANGED_EVENT = "vtherm-state-changed";

let current: DashboardState = { statuses: [], issues: [], dashboardVersion: "" };

/** Read the state. */
export function currentState(): DashboardState {
  return current;
}

/** Replace the state, and tell the pages that listen. */
export function publishState(next: DashboardState): void {
  current = next;
  window.dispatchEvent(new CustomEvent(STATE_CHANGED_EVENT));
}
