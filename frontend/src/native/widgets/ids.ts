/**
 * The identifiers of the native widgets of the overview of a thermostat, in their order. Each plugin places its widget after the one
 * before it that is already loaded: the valve, loaded after the presets, goes after the heating and so before the preset.
 */
export const WIDGET_IDS = {
  temperature: "core.widget.temperature",
  mode: "core.widget.mode",
  alerts: "core.widget.alerts",
  heating: "core_tpi.widget.heating",
  valve: "core_valve_regulation.widget.valve",
  preset: "core_presets.widget.preset",
  safety: "core_advanced.widget.safety",
} as const;

/**
 * The identifiers of the native widgets of the Overview page, in their order. The plugins load in the order core, …, core_central_boiler,
 * …, core_power, core_presence: core places the outdoor temperature after the summary, and the boiler, its power and the power of the
 * home, loaded later, come in between; the presence comes right after the central mode.
 */
export const GLOBAL_WIDGET_IDS = {
  centralMode: "core.widget.central_mode",
  presence: "core_presence.widget.presence",
  summary: "core.widget.summary",
  boiler: "core_central_boiler.widget.boiler",
  boilerPower: "core_central_boiler.widget.boiler_power",
  housePower: "core_power.widget.house_power",
  outdoor: "core.widget.outdoor",
} as const;

/**
 * The identifiers of the widgets of the features in the overview of a thermostat, in their order after the base widgets. Each plugin places
 * its widget after the one before it, which is loaded before it.
 */
export const FEATURE_WIDGET_IDS = {
  window: "core_window.widget.window",
  motion: "core_motion.widget.motion",
  overpowering: "core_power.widget.overpowering",
  autoStartStop: "core_auto_start_stop.widget.auto_start_stop",
  lock: "core_lock.widget.lock",
  failure: "core_heating_failure.widget.failure",
} as const;

/**
 * The identifiers of the widgets of the details in the overview of a thermostat, in their order after the widgets of the features. `core`
 * loads first: it places the equipment and the history last, and the other plugins place their widgets after the one before them.
 */
export const DETAIL_WIDGET_IDS = {
  devices: "core.widget.devices",
  autoTpi: "core_tpi.widget.auto_tpi",
  boiler: "core_central_boiler.widget.thermostat",
  energy: "core_power.widget.energy",
  humidity: "core_humidity.widget.humidity",
  sync: "core_sync_temp.widget.sync",
  history: "core.widget.history",
} as const;
