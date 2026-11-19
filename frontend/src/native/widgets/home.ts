/**
 * What the widgets of the Overview page read, in one place: the thermostats of Versatile Thermostat found in the registries of `hass`,
 * and the entities of the central configuration. Nothing is asked to the server. The names of the entities and of the attributes come
 * from Versatile Thermostat (`binary_sensor.py`, `sensor.py`, `select.py`, `number.py` and the managers of the central boiler, the power
 * and the presence). A value that is missing gives `undefined`, never an error.
 */

import { CORE_TOP_TABS, VTHERM_DOMAIN, getEntryEntities } from "@vtherm/dashboard-sdk";
import type { CentralContext, EntryEntities, Hass, HassState } from "@vtherm/dashboard-sdk";

import { buildPath } from "../../router.ts";
import { THERMOSTAT_OVERVIEW_ID } from "../native-plugin.ts";
import { isUnavailable, numberOf } from "./runtime.ts";

type Attributes = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Attributes => typeof value === "object" && value !== null && !Array.isArray(value);
const textOf = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);
const listOf = (value: unknown): readonly string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** A thermostat of Versatile Thermostat: its configuration entry, its `climate` entity and its energy sensor. */
export interface HomeThermostat {
  /** The configuration entry of the thermostat, which is its identifier in the dashboard. */
  readonly entryId: string;
  /** Its `climate` entity. */
  readonly climateId: string;
  /** Its sensor of the energy, when it has one (translation key `energy`). */
  readonly energyId: string | undefined;
}

/** The last list of thermostats, for the registries that gave it: Home Assistant gives new registries only when they change. */
let cached: { readonly devices: unknown; readonly entities: unknown; readonly list: readonly HomeThermostat[] } | undefined;

/**
 * The thermostats of Versatile Thermostat, in the order of the registry of the entities: each device of Versatile Thermostat that has a
 * `climate` entity. The device of the central configuration has none, so it is not one. The list is computed again only when a
 * registry changes, so that a widget can read it at each state of Home Assistant.
 *
 * @param hass - The state of Home Assistant.
 */
export function thermostatsOf(hass: Pick<Hass, "devices" | "entities"> | undefined): readonly HomeThermostat[] {
  const devices = hass?.devices;
  const registry = hass?.entities;
  if (devices === undefined || registry === undefined) {
    return [];
  }
  if (cached !== undefined && cached.devices === devices && cached.entities === registry) {
    return cached.list;
  }
  const entryOfDevice = new Map<string, string>();
  for (const device of Object.values(devices)) {
    const pair = (device.identifiers ?? []).find((candidate) => candidate[0] === VTHERM_DOMAIN);
    if (pair !== undefined && typeof pair[1] === "string") {
      entryOfDevice.set(device.id, pair[1]);
    }
  }
  const climates = new Map<string, string>();
  const energies = new Map<string, string>();
  for (const entry of Object.values(registry)) {
    const deviceId = typeof entry.device_id === "string" ? entry.device_id : undefined;
    if (deviceId === undefined || !entryOfDevice.has(deviceId) || (entry.platform !== undefined && entry.platform !== VTHERM_DOMAIN)) {
      continue;
    }
    if (entry.entity_id.startsWith("climate.") && !climates.has(deviceId)) {
      climates.set(deviceId, entry.entity_id);
    } else if (entry.translation_key === "energy" && !energies.has(deviceId)) {
      energies.set(deviceId, entry.entity_id);
    }
  }
  const list = [...climates].map(([deviceId, climateId]) => ({ entryId: entryOfDevice.get(deviceId) as string, climateId, energyId: energies.get(deviceId) }));
  cached = { devices, entities: registry, list };
  return list;
}

/** The name of a thermostat or of an entity: its friendly name, else its identifier. */
export function nameOf(hass: Hass | undefined, entityId: string): string {
  return textOf(hass?.states[entityId]?.attributes["friendly_name"]) ?? entityId;
}

/** The address of the overview of a thermostat in the dashboard. */
export function thermostatPath(entryId: string): string {
  return buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: entryId, entry: THERMOSTAT_OVERVIEW_ID, rest: [] });
}

/** The attributes of the `climate` entity of a thermostat, or none when it is unavailable. */
function attributesOf(state: HassState | undefined): Attributes {
  return state === undefined || isUnavailable(state) ? {} : state.attributes;
}

/** The attributes that Versatile Thermostat publishes in `specific_states`. */
function specificOf(state: HassState | undefined): Attributes {
  const specific = attributesOf(state)["specific_states"];
  return isRecord(specific) ? specific : {};
}

/** What a thermostat is doing, for the summary of the thermostats. */
export type ThermostatActivity = "heating" | "cooling" | "idle" | "off" | "unavailable";

/** What a thermostat is doing: an unavailable thermostat is never counted as off. */
export function activityOf(state: HassState | undefined): ThermostatActivity {
  if (state === undefined || isUnavailable(state)) {
    return "unavailable";
  }
  if (state.state === "off") {
    return "off";
  }
  const action = state.attributes["hvac_action"];
  return action === "heating" || action === "preheating" ? "heating" : action === "cooling" ? "cooling" : "idle";
}

/** The messages of Versatile Thermostat that put a thermostat in the list of alerts of the summary. */
export const ALERT_MESSAGES: readonly string[] = ["safety_detected", "overpowering_detected", "underlying_unavailable"];

/** Why a thermostat is in alert: the codes of its messages, a failure of the heating or of the cooling, its unavailable equipment. */
export interface ThermostatAlert {
  readonly messages: readonly string[];
  readonly heatingFailure: boolean;
  readonly coolingFailure: boolean;
  readonly unavailableEquipment: readonly string[];
}

/** Why a thermostat is in alert, or undefined when it is not. */
export function alertOf(state: HassState | undefined): ThermostatAlert | undefined {
  const specific = specificOf(state);
  const failure = attributesOf(state)["heating_failure_detection_manager"];
  const messages = listOf(specific["messages"]).filter((message) => ALERT_MESSAGES.includes(message));
  const heatingFailure = isRecord(failure) && failure["heating_failure_state"] === "on";
  const coolingFailure = isRecord(failure) && failure["cooling_failure_state"] === "on";
  const unavailableEquipment = listOf(specific["unavailable_underlying_entities"]);
  return messages.length > 0 || heatingFailure || coolingFailure || unavailableEquipment.length > 0 ? { messages, heatingFailure, coolingFailure, unavailableEquipment } : undefined;
}

/** The equipment of a thermostat that is active now, as Versatile Thermostat counts it for the central boiler. */
export function activeDevicesOf(state: HassState | undefined): readonly string[] {
  return listOf(specificOf(state)["device_actives"]);
}

/** The entities of the device of the central configuration, or none without a central configuration. */
export function centralEntities(hass: Hass | undefined, central: CentralContext | undefined): EntryEntities {
  return getEntryEntities(hass ?? {}, central?.entryId ?? "");
}

/** The `select` of the central mode: it has no translation key, and it is the only `select` of the central device. */
export function centralModeEntity(entities: EntryEntities): string | undefined {
  return entities.entities.find((entity) => entity.domain === "select" && entity.translationKey === undefined)?.entityId;
}

/** An entity of a value of the central configuration, for example its outdoor sensor, when it is set and exists in Home Assistant. */
export function configuredEntity(hass: Hass | undefined, central: CentralContext | undefined, key: string): string | undefined {
  const entityId = textOf(central?.values[key]);
  return entityId !== undefined && hass?.states[entityId] !== undefined ? entityId : undefined;
}

/** The state of the central boiler, read on its binary sensor `central_boiler_state`. */
export interface BoilerState {
  /** Whether the boiler is ready; undefined when Versatile Thermostat does not say. */
  readonly ready: boolean | undefined;
  /** Whether its activation is scheduled, after `delaySec` seconds. */
  readonly scheduled: boolean;
  readonly delaySec: number | undefined;
  /** The thresholds of the number of active devices and of their power, as the manager publishes them. */
  readonly countThreshold: number | undefined;
  readonly powerThreshold: number | undefined;
}

/** The state of the central boiler: `central_boiler_manager` is published only once the boiler is ready. */
export function boilerStateOf(state: HassState | undefined): BoilerState {
  const attributes = state === undefined ? {} : state.attributes;
  const manager = attributes["central_boiler_manager"];
  const values = isRecord(manager) ? manager : {};
  const ready = attributes["is_central_boiler_ready"];
  return {
    ready: typeof ready === "boolean" ? ready : undefined,
    scheduled: values["activation_scheduled"] === true,
    delaySec: numberOf(values["delayed_activation_sec"]),
    countThreshold: numberOf(values["nb_active_device_for_boiler_threshold"]),
    powerThreshold: numberOf(values["total_power_active_for_boiler_threshold"]),
  };
}

/**
 * A threshold of the central boiler read on its `number` entity, which has no translation key: the one with a unit of power is the
 * threshold of the power, the other one the threshold of the number of devices. The presets of the central configuration are `number`
 * entities too, but they have a translation key.
 *
 * @param hass - The state of Home Assistant.
 * @param entities - The entities of the central device.
 * @param kind - The threshold to read.
 */
export function thresholdNumber(hass: Hass | undefined, entities: EntryEntities, kind: "count" | "power"): number | undefined {
  for (const entity of entities.entities) {
    const state = hass?.states[entity.entityId];
    if (entity.domain !== "number" || entity.translationKey !== undefined || state === undefined || isUnavailable(state)) {
      continue;
    }
    const hasUnit = typeof state.attributes["unit_of_measurement"] === "string" && state.attributes["unit_of_measurement"] !== "";
    if (hasUnit === (kind === "power")) {
      return numberOf(state.state);
    }
  }
  return undefined;
}

/** The power of the home, read on the first thermostat that publishes it in `power_manager`. */
export interface HousePower {
  /** The thermostat that publishes it. */
  readonly climateId: string;
  /** The power of the home now and its maximum, in the unit of the central configuration. */
  readonly current: number;
  readonly max: number | undefined;
  /** The sensor of the power of the home, whose unit is the central unit when the central configuration does not set one. */
  readonly sensorId: string | undefined;
}

/** The power of the home, or undefined when no thermostat publishes it: the power management is off. */
export function housePowerOf(hass: Hass | undefined, thermostats: readonly HomeThermostat[]): HousePower | undefined {
  for (const thermostat of thermostats) {
    const manager = attributesOf(hass?.states[thermostat.climateId])["power_manager"];
    const current = isRecord(manager) ? numberOf(manager["current_power"]) : undefined;
    if (isRecord(manager) && current !== undefined) {
      return { climateId: thermostat.climateId, current, max: numberOf(manager["current_max_power"]), sensorId: textOf(manager["power_sensor_entity_id"]) };
    }
  }
  return undefined;
}

/** The units of power that Versatile Thermostat knows, as Home Assistant writes them. */
const POWER_UNITS: Readonly<Record<string, string>> = { w: "W", kw: "kW", mw: "MW", W: "W", kW: "kW", MW: "MW" };

/**
 * The unit of the power of the home, found as Versatile Thermostat finds it (`feature_central_power_manager.py`): the unit of the
 * central configuration, else the unit of the power sensor, else W.
 */
export function centralPowerUnit(hass: Hass | undefined, central: CentralContext | undefined, sensorId: string | undefined): string {
  const configured = central?.values["power_unit"];
  if (configured === "w" || configured === "kw") {
    return POWER_UNITS[configured] as string;
  }
  const unit = sensorId === undefined ? undefined : hass?.states[sensorId]?.attributes["unit_of_measurement"];
  return typeof unit === "string" && unit in POWER_UNITS ? (POWER_UNITS[unit] as string) : "W";
}

/** The presence at home, read as Versatile Thermostat reads its presence sensor (`feature_presence_manager.py`). */
export type Presence = "present" | "absent" | "unknown";

/** The presence that a state of the presence sensor gives: `on` or `home` present, `off` or `not_home` absent, anything else unknown. */
export function presenceOf(state: HassState | undefined): Presence {
  const value = state?.state;
  return value === "on" || value === "home" ? "present" : value === "off" || value === "not_home" ? "absent" : "unknown";
}
