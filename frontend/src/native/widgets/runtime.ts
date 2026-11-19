/**
 * What the native widgets read of a thermostat at run time, in one place: the attributes of its `climate` entity and the entities of its
 * device. The names come from Versatile Thermostat (`base_thermostat.py` `update_custom_attributes()` and its managers). A value that
 * is missing gives `undefined`, never an error, so that a widget shows "—" for it.
 */

import { getEntryEntities } from "@vtherm/dashboard-sdk";
import type { EntryEntities, Hass, HassState } from "@vtherm/dashboard-sdk";

/** The thermostat that a widget shows: its `climate` entity, its state, and the entities of its device. */
export interface Runtime {
  /** The entities of the device of the thermostat. */
  readonly entities: EntryEntities;
  /** The `climate` entity of the thermostat. */
  readonly climateId: string | undefined;
  /** The state of the `climate` entity. */
  readonly climate: HassState | undefined;
}

/**
 * Find the thermostat of a widget in `hass`.
 *
 * @param hass - The state of Home Assistant.
 * @param thermostatId - The configuration entry of the thermostat.
 */
export function runtimeOf(hass: Hass | undefined, thermostatId: string): Runtime {
  const entities = hass === undefined ? getEntryEntities({}, thermostatId) : getEntryEntities(hass, thermostatId);
  const climateId = entities.climate;
  return { entities, climateId, climate: climateId === undefined ? undefined : hass?.states[climateId] };
}

/** The state of an entity of the device, found by its translation key. */
export function sensorOf(hass: Hass | undefined, runtime: Runtime, key: string): { readonly entityId: string | undefined; readonly state: HassState | undefined } {
  const entityId = runtime.entities.byKey[key];
  return { entityId, state: entityId === undefined ? undefined : hass?.states[entityId] };
}

type Attributes = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Attributes => typeof value === "object" && value !== null && !Array.isArray(value);

/** A number, or undefined. Text that holds a number is read too: Home Assistant gives the states as text. */
export function numberOf(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

const textOf = (value: unknown): string | undefined => (typeof value === "string" && value !== "" && value !== "None" ? value : undefined);
const boolOf = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);
const listOf = (value: unknown): readonly string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** Whether a state is unavailable: the entity exists, but has no value. */
export const isUnavailable = (state: HassState | undefined): boolean => state === undefined || state.state === "unavailable" || state.state === "unknown";

/** The attributes of the climate entity, or none when it is unavailable. */
function attributesOf(climate: HassState | undefined): Attributes {
  return climate === undefined || isUnavailable(climate) ? {} : climate.attributes;
}

/** The attributes that Versatile Thermostat publishes in `specific_states`. */
function specificOf(climate: HassState | undefined): Attributes {
  const specific = attributesOf(climate)["specific_states"];
  return isRecord(specific) ? specific : {};
}

/** The state of the inhibition of the thermostat, published only once an inhibition plugin used it. */
export interface Inhibition {
  readonly inhibited: boolean;
  readonly commandGate: string | undefined;
  readonly lastErrorCode: string | undefined;
}

/** A preset with a timer, or a manual override, from `timed_preset_manager`. */
export interface TimedPreset {
  readonly active: boolean;
  readonly preset: string | undefined;
  readonly remainingMin: number | undefined;
  readonly endTime: string | undefined;
  readonly manualOverride: boolean;
  readonly resumePreset: string | undefined;
  readonly resumeEndTime: string | undefined;
}

/** One valve of a thermostat that has several, with its opening in %. */
export interface ValveOpening {
  readonly entityId: string;
  readonly percent: number | undefined;
}

/** The readers of the attributes of the `climate` entity of Versatile Thermostat. */
export const climateAttributes = {
  /** The temperature of the room. */
  currentTemperature: (climate: HassState | undefined) => numberOf(attributesOf(climate)["current_temperature"]),
  /** The setpoint. */
  targetTemperature: (climate: HassState | undefined) => numberOf(attributesOf(climate)["temperature"]),
  /** The bounds of the setpoint, which are the bounds of the gauge. */
  minTemperature: (climate: HassState | undefined) => numberOf(attributesOf(climate)["min_temp"]),
  maxTemperature: (climate: HassState | undefined) => numberOf(attributesOf(climate)["max_temp"]),
  /** The outdoor temperature of the thermostat. */
  extTemperature: (climate: HassState | undefined) => numberOf(specificOf(climate)["ext_current_temperature"]),
  /** The setpoint that the user asked for, and the one that Versatile Thermostat applies. */
  requestedTarget: (climate: HassState | undefined) => {
    const requested = attributesOf(climate)["requested_state"];
    return isRecord(requested) ? numberOf(requested["target_temperature"]) : undefined;
  },
  appliedTarget: (climate: HassState | undefined) => {
    const current = attributesOf(climate)["current_state"];
    return isRecord(current) ? numberOf(current["target_temperature"]) : undefined;
  },
  /** The HVAC mode, which is the state of the entity, and the HVAC action. */
  hvacMode: (climate: HassState | undefined) => (climate === undefined || isUnavailable(climate) ? undefined : climate.state),
  hvacAction: (climate: HassState | undefined) => textOf(attributesOf(climate)["hvac_action"]),
  /** Why the thermostat is off, or why its mode is not the one asked for. */
  offReason: (climate: HassState | undefined) => textOf(specificOf(climate)["hvac_off_reason"]),
  modeReason: (climate: HassState | undefined) => textOf(specificOf(climate)["hvac_mode_reason"]),
  isSleeping: (climate: HassState | undefined) => boolOf(specificOf(climate)["is_sleeping"]),
  lastCentralMode: (climate: HassState | undefined) => textOf(specificOf(climate)["last_central_mode"]),
  /** The codes of the messages that Versatile Thermostat shows. */
  messages: (climate: HassState | undefined) => listOf(specificOf(climate)["messages"]),
  isReady: (climate: HassState | undefined) => boolOf(attributesOf(climate)["is_ready"]),
  notInitialized: (climate: HassState | undefined) => listOf(specificOf(climate)["not_initialized_entities"]),
  unavailableUnderlyings: (climate: HassState | undefined) => listOf(specificOf(climate)["unavailable_underlying_entities"]),
  /** When the room and the outdoor temperatures were last measured. */
  lastTemperatureDate: (climate: HassState | undefined) => textOf(specificOf(climate)["last_temperature_datetime"]),
  lastExtTemperatureDate: (climate: HassState | undefined) => textOf(specificOf(climate)["last_ext_temperature_datetime"]),
  inhibition: (climate: HassState | undefined): Inhibition | undefined => {
    const inhibition = specificOf(climate)["inhibition"];
    return isRecord(inhibition) ? { inhibited: inhibition["inhibited"] === true, commandGate: textOf(inhibition["command_gate"]), lastErrorCode: textOf(inhibition["last_error_code"]) } : undefined;
  },
  /** The heating share that the algorithm asks for, from 0 to 100. */
  powerPercent: (climate: HassState | undefined) => numberOf(attributesOf(climate)["power_percent"]),
  /** The times on and off of the cycle, in seconds: published for a thermostat over a switch. */
  onTimeSec: (climate: HassState | undefined) => {
    const over = attributesOf(climate)["vtherm_over_switch"];
    return isRecord(over) ? numberOf(over["on_time_sec"]) : undefined;
  },
  offTimeSec: (climate: HassState | undefined) => {
    const over = attributesOf(climate)["vtherm_over_switch"];
    return isRecord(over) ? numberOf(over["off_time_sec"]) : undefined;
  },
  /** The opening of the valve, from 0 to 100. */
  valveOpenPercent: (climate: HassState | undefined) => numberOf(attributesOf(climate)["valve_open_percent"]),
  /** The opening of each valve: a thermostat over valves with the control of the opening, or over a climate with valves. */
  valves: (climate: HassState | undefined): readonly ValveOpening[] => {
    const attributes = attributesOf(climate);
    const overValve = attributes["vtherm_over_valve"];
    if (isRecord(overValve) && Array.isArray(overValve["underlying_valves"])) {
      return overValve["underlying_valves"].filter(isRecord).flatMap((valve) => (typeof valve["entity_id"] === "string" ? [{ entityId: valve["entity_id"], percent: numberOf(valve["command_percent"]) }] : []));
    }
    const overClimate = attributes["vtherm_over_climate_valve"];
    const valves = isRecord(overClimate) ? overClimate["underlying_valves"] : undefined;
    return isRecord(valves) ? Object.entries(valves).map(([entityId, valve]) => ({ entityId, percent: isRecord(valve) ? numberOf(valve["percent_open"]) : undefined })) : [];
  },
  /** The preset, `none` without one. */
  presetMode: (climate: HassState | undefined) => textOf(attributesOf(climate)["preset_mode"]),
  timedPreset: (climate: HassState | undefined): TimedPreset | undefined => {
    const timed = attributesOf(climate)["timed_preset_manager"];
    if (!isRecord(timed)) {
      return undefined;
    }
    return {
      active: timed["is_active"] === true,
      preset: textOf(timed["preset"]),
      remainingMin: numberOf(timed["remaining_time_min"]),
      endTime: textOf(timed["end_time"]),
      manualOverride: timed["is_manual_override"] === true,
      resumePreset: textOf(timed["resume_preset"]),
      resumeEndTime: textOf(timed["resume_end_time"]),
    };
  },
  /** Whether the safety mode is configured, and its delay in minutes when it is. */
  isSafetyConfigured: (climate: HassState | undefined) => boolOf(attributesOf(climate)["is_safety_configured"]),
  safetyDelayMin: (climate: HassState | undefined) => {
    const safety = attributesOf(climate)["safety_manager"];
    return isRecord(safety) ? numberOf(safety["safety_delay_min"]) : undefined;
  },
} as const;

/** A state of a feature as Versatile Thermostat publishes it: `on`, `off`, or anything else, which is unknown. */
export type FeatureState = "on" | "off" | "unknown";

/** The state of a feature: `on` and `off` as they are, anything else unknown. */
export const featureStateOf = (value: unknown): FeatureState => (value === "on" || value === true ? "on" : value === "off" || value === false ? "off" : "unknown");

/** The attributes of a manager of a feature, published at the root of the `climate` entity, or undefined when it is not published. */
function managerOf(climate: HassState | undefined, name: string): Attributes | undefined {
  const manager = attributesOf(climate)[name];
  return isRecord(manager) ? manager : undefined;
}

/** The window of a thermostat, from `window_manager`. */
export interface WindowAttributes {
  /** The state of the window sensor, when the thermostat has one. */
  readonly sensor: FeatureState | undefined;
  /** The state of the automatic detection, when it is configured. */
  readonly auto: FeatureState | undefined;
  /** Whether the bypass of the window is on. */
  readonly bypass: boolean;
}

/** The progress of a check of the heating failure detection: the minutes elapsed and left. */
export interface FailureTracking {
  readonly elapsedMin: number;
  readonly remainingMin: number;
}

/** The heating failure detection of a thermostat, from `heating_failure_detection_manager`. */
export interface FailureAttributes {
  readonly heating: FeatureState;
  readonly cooling: FeatureState;
  /** The checks in progress, the heating and the cooling. */
  readonly heatingTracking: FailureTracking | undefined;
  readonly coolingTracking: FailureTracking | undefined;
  /** The probable cause of a failure and its entity. */
  readonly rootCause: string | undefined;
  readonly rootCauseEntityId: string | undefined;
  /** Whether a template enables the detection, and whether it enables it now. */
  readonly hasTemplate: boolean;
  readonly enabledByTemplate: boolean;
}

/** A check in progress of the heating failure detection, or undefined. */
function trackingOf(value: unknown): FailureTracking | undefined {
  if (!isRecord(value) || value["is_tracking"] !== true) {
    return undefined;
  }
  const elapsedMin = numberOf(value["elapsed_time_min"]);
  const remainingMin = numberOf(value["remaining_time_min"]);
  return elapsedMin === undefined || remainingMin === undefined ? undefined : { elapsedMin, remainingMin };
}

/**
 * The readers of the managers of the features of Versatile Thermostat (`feature_*_manager.py`, `add_custom_attributes()`). A manager is
 * published only when its feature is configured: its reader then gives undefined.
 */
export const featureAttributes = {
  window: (climate: HassState | undefined): WindowAttributes | undefined => {
    const manager = managerOf(climate, "window_manager");
    if (manager === undefined) {
      return undefined;
    }
    const hasSensor = textOf(manager["window_sensor_entity_id"]) !== undefined;
    const autoConfigured = attributesOf(climate)["is_window_auto_configured"] === true;
    return {
      sensor: hasSensor ? featureStateOf(manager["window_state"]) : undefined,
      auto: autoConfigured ? featureStateOf(manager["window_auto_state"]) : undefined,
      bypass: manager["is_window_bypass"] === true,
    };
  },
  motion: (climate: HassState | undefined): FeatureState | undefined => {
    const manager = managerOf(climate, "motion_manager");
    return manager === undefined ? undefined : featureStateOf(manager["motion_state"]);
  },
  overpowering: (climate: HassState | undefined): FeatureState | undefined => {
    const manager = managerOf(climate, "power_manager");
    return manager === undefined ? undefined : featureStateOf(manager["overpowering_state"]);
  },
  autoStartStop: (climate: HassState | undefined) => {
    const manager = managerOf(climate, "auto_start_stop_manager");
    if (manager === undefined) {
      return undefined;
    }
    return {
      enabled: manager["auto_start_stop_enable"] === true,
      stopDetected: manager["is_auto_stop_detected"] === true,
      error: numberOf(manager["auto_start_stop_accumulated_error"]),
      threshold: numberOf(manager["auto_start_stop_accumulated_error_threshold"]),
      lastSwitch: textOf(manager["auto_start_stop_last_switch_date"]),
    };
  },
  isLockConfigured: (climate: HassState | undefined) => attributesOf(climate)["is_lock_configured"] === true,
  isLocked: (climate: HassState | undefined): boolean | undefined => {
    const locked = specificOf(climate)["is_locked"] ?? managerOf(climate, "lock_manager")?.["is_locked"];
    return boolOf(locked);
  },
  failure: (climate: HassState | undefined): FailureAttributes | undefined => {
    const manager = managerOf(climate, "heating_failure_detection_manager");
    if (manager === undefined) {
      return undefined;
    }
    return {
      heating: featureStateOf(manager["heating_failure_state"]),
      cooling: featureStateOf(manager["cooling_failure_state"]),
      heatingTracking: trackingOf(manager["heating_tracking"]),
      coolingTracking: trackingOf(manager["cooling_tracking"]),
      rootCause: textOf(manager["root_cause"]),
      rootCauseEntityId: textOf(manager["root_cause_entity_id"]),
      hasTemplate: textOf(manager["failure_detection_enable_template"]) !== undefined,
      enabledByTemplate: manager["is_detection_enabled_by_template"] !== false,
    };
  },
} as const;

/** What an open window does to the thermostat now. */
export type WindowEffect = "off" | "eco" | "frost" | "fan_only" | "none";

/**
 * The effect of an open window, read from the codes that Versatile Thermostat publishes (`state_manager.py`): the messages of the eco
 * and frost setpoints, the reason of an off, and the reason of the mode for the fan. A bypass cancels every effect.
 */
export function windowEffectOf(climate: HassState | undefined, bypass: boolean): WindowEffect {
  if (bypass) {
    return "none";
  }
  const messages = climateAttributes.messages(climate);
  if (messages.includes("target_temp_window_frost")) {
    return "frost";
  }
  if (messages.includes("target_temp_window_eco")) {
    return "eco";
  }
  if (climateAttributes.offReason(climate) === "hvac_off_window_detection") {
    return "off";
  }
  if (climateAttributes.modeReason(climate) === "hvac_off_window_detection") {
    const mode = climateAttributes.hvacMode(climate);
    return mode === "fan_only" ? "fan_only" : mode === "off" ? "off" : "none";
  }
  return "none";
}

/** What a thermostat says about its equipment: whether one is active, whether one should be, and how many are. */
export interface DeviceActivity {
  readonly active: boolean | undefined;
  readonly shouldBeActive: boolean | undefined;
  readonly count: number | undefined;
}

/** The temperature sent to an equipment over a climate, as the tracking of its setpoint follows it. */
export interface TrackedUnderlying {
  readonly entityId: string;
  readonly lastSent: number | undefined;
  readonly observed: number | undefined;
  readonly status: string | undefined;
}

/** The tracking of the setpoint of the equipment of a thermostat over a climate (`underlying_temperature_tracking`). */
export interface TemperatureTracking {
  readonly suspended: boolean;
  readonly reason: string | undefined;
  readonly attempts: number | undefined;
  readonly underlyings: readonly TrackedUnderlying[];
}

/** The value of a synchronised entity of a thermostat over a climate (`temp_synchronisation.sync_attributes`). */
export interface SyncedEntity {
  readonly entityId: string;
  readonly value: number | undefined;
}

/** The attributes of `vtherm_over_climate`, or none. */
function overClimateOf(climate: HassState | undefined): Attributes | undefined {
  const over = attributesOf(climate)["vtherm_over_climate"];
  return isRecord(over) ? over : undefined;
}

/** The readers of the details of a thermostat: its equipment, its fan, its humidity, its tracking and its synchronisation. */
export const detailAttributes = {
  /** The equipment of the thermostat: `underlying_entities` of its type. A climate with valves lists its climates. */
  underlyings: (climate: HassState | undefined): readonly string[] => {
    const attributes = attributesOf(climate);
    for (const key of ["vtherm_over_switch", "vtherm_over_valve", "vtherm_over_climate"]) {
      const over = attributes[key];
      if (isRecord(over) && Array.isArray(over["underlying_entities"])) {
        return listOf(over["underlying_entities"]);
      }
    }
    return [];
  },
  activity: (climate: HassState | undefined): DeviceActivity => {
    const specific = specificOf(climate);
    return { active: boolOf(specific["is_device_active"]), shouldBeActive: boolOf(specific["should_device_be_active"]), count: numberOf(specific["nb_device_actives"]) };
  },
  /** The fan mode of a thermostat over a climate, when it has one. */
  fanMode: (climate: HassState | undefined) => textOf(attributesOf(climate)["fan_mode"]),
  /** Whether the climate entity publishes the humidity, and its value. */
  hasHumidity: (climate: HassState | undefined) => climate !== undefined && "current_humidity" in climate.attributes,
  humidity: (climate: HassState | undefined) => numberOf(attributesOf(climate)["current_humidity"]),
  /** Whether the thermostat is used by the central boiler (`configuration.is_used_by_central_boiler`). */
  usedByCentralBoiler: (climate: HassState | undefined): boolean | undefined => {
    const configuration = attributesOf(climate)["configuration"];
    return isRecord(configuration) ? boolOf(configuration["is_used_by_central_boiler"]) : undefined;
  },
  tracking: (climate: HassState | undefined): TemperatureTracking | undefined => {
    const tracking = overClimateOf(climate)?.["underlying_temperature_tracking"];
    if (!isRecord(tracking)) {
      return undefined;
    }
    const underlyings = isRecord(tracking["underlyings"]) ? tracking["underlyings"] : {};
    return {
      suspended: tracking["suspended"] === true,
      reason: textOf(tracking["reason"]),
      attempts: numberOf(tracking["attempts"]),
      underlyings: Object.entries(underlyings).map(([entityId, value]) => {
        const under = isRecord(value) ? value : {};
        return { entityId, lastSent: numberOf(under["last_sent_temperature"]), observed: numberOf(under["observed_temperature"]), status: textOf(under["status"]) };
      }),
    };
  },
  synchronised: (climate: HassState | undefined): readonly SyncedEntity[] | undefined => {
    const sync = overClimateOf(climate)?.["temp_synchronisation"];
    if (!isRecord(sync) || !isRecord(sync["sync_attributes"])) {
      return undefined;
    }
    return Object.entries(sync["sync_attributes"]).map(([entityId, value]) => ({ entityId, value: isRecord(value) ? numberOf(value["value"]) : undefined }));
  },
} as const;
