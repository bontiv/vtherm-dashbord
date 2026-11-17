/**
 * The diagrams of the native fields: which diagram of the library illustrates each field, and the groups of fields that share one.
 *
 * Kept apart from the drawing, so that the associations can be tested.
 */

import type { DiagramId } from "@vtherm/dashboard-sdk";

import type { Values } from "./tab-definitions.ts";

/** The diagram of each field of Versatile Thermostat that has one, by key. */
export const FIELD_DIAGRAMS: Readonly<Record<string, DiagramId>> = {
  cycle_min: "tpi_cycle",
  tpi_coef_int: "tpi_formula",
  tpi_coef_ext: "tpi_formula",
  minimal_activation_delay: "min_on_off",
  minimal_deactivation_delay: "min_on_off",
  tpi_threshold_low: "tpi_thresholds",
  tpi_threshold_high: "tpi_thresholds",
  min_opening_degrees: "valve_curve",
  max_opening_degrees: "valve_curve",
  opening_threshold_degree: "valve_curve",
  max_closing_degree: "valve_curve",
  auto_regulation_dtemp: "send_threshold",
  auto_regulation_periode_min: "send_threshold",
  auto_regulation_mode: "correction",
  window_delay: "window_delay",
  window_off_delay: "window_delay",
  window_auto_open_threshold: "window_slope",
  window_auto_close_threshold: "window_slope",
  window_auto_max_duration: "window_slope",
  motion_delay: "motion",
  motion_off_delay: "motion",
  safety_delay_min: "safety",
  safety_min_on_percent: "safety",
  safety_default_on_percent: "safety",
  manual_override_duration_min: "override",
  heating_failure_threshold: "failure",
  cooling_failure_threshold: "failure",
  heating_failure_detection_delay: "failure",
  temperature_change_tolerance: "failure",
  underlying_entity_ids: "stagger",
};

/**
 * The diagram of a field, for the values of its configuration. The spread of the starts (`stagger`) only exists for the switches of a
 * thermostat over switch.
 *
 * @param key - The key of the field.
 * @param values - The values of the configuration, draft included.
 */
export function diagramOfField(key: string, values: Values): DiagramId | undefined {
  if (key === "underlying_entity_ids" && values["thermostat_type"] !== "thermostat_over_switch") {
    return undefined;
  }
  return FIELD_DIAGRAMS[key];
}

/** A group of fields that share a diagram, shown as a tile of the grid of their section, after their last field. */
export interface DiagramGroup {
  /** The diagram of the group. */
  readonly diagram: DiagramId;
  /** The keys of the fields of the group. */
  readonly keys: readonly string[];
}

/** The groups of fields that share a diagram: the openings of a valve, the coefficients of TPI and the detection of a window. */
export const GROUP_DIAGRAMS: readonly DiagramGroup[] = [
  { diagram: "valve_curve", keys: ["min_opening_degrees", "max_opening_degrees", "opening_threshold_degree", "max_closing_degree"] },
  { diagram: "tpi_formula", keys: ["tpi_coef_int", "tpi_coef_ext"] },
  { diagram: "window_slope", keys: ["window_auto_open_threshold", "window_auto_close_threshold", "window_auto_max_duration"] },
];

/** The group of a field, if it is in one. */
export const groupOfField = (key: string): DiagramGroup | undefined => GROUP_DIAGRAMS.find((group) => group.keys.includes(key));
