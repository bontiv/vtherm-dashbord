/**
 * The values of the configuration of a thermostat that Versatile Thermostat applies: its own, with the central ones of each section that
 * uses the central configuration. The panels of estimation and the widgets of the overview read them.
 */

import type { ConfigValues } from "@vtherm/dashboard-sdk";

/**
 * The values that a panel or a widget reads: the values of the draft, with the central ones of each section that uses the central configuration.
 *
 * @param values - The values of the draft of the thermostat.
 * @param central - The values of the central configuration.
 */
export function effectiveValues(values: ConfigValues, central: ConfigValues): ConfigValues {
  if (Object.keys(central).length === 0) {
    return values;
  }
  const inherits = (option: string): boolean => values[option] !== false;
  const sections: readonly (readonly [string, readonly string[]])[] = [
    ["use_main_central_config", ["external_temperature_sensor_entity_id", "temp_min", "temp_max", "step_temperature"]],
    ["use_tpi_central_config", ["tpi_coef_int", "tpi_coef_ext", "minimal_activation_delay", "minimal_deactivation_delay", "tpi_threshold_low", "tpi_threshold_high"]],
    ["use_window_central_config", ["window_delay", "window_off_delay", "window_auto_open_threshold", "window_auto_close_threshold", "window_auto_max_duration", "window_action"]],
    ["use_advanced_central_config", ["safety_delay_min", "safety_min_on_percent", "safety_default_on_percent"]],
  ];
  const inherited = sections.filter(([option]) => inherits(option)).flatMap(([, keys]) => keys.map((key) => [key, central[key]] as const));
  return { ...values, ...Object.fromEntries(inherited) };
}
