/**
 * A home of Versatile Thermostat in a fake `hass`, for the tests of the widgets of the Overview page: the central device and its entities
 * as Versatile Thermostat creates them (the `select` of the central mode, the entities of the central boiler), and thermostats with their
 * `climate` entity and their energy sensor.
 */

import type { CentralContext } from "@vtherm/dashboard-sdk";
import { createFakeHass } from "@vtherm/dashboard-sdk/testing";
import type { FakeHass } from "@vtherm/dashboard-sdk/testing";

/** The configuration entry of the central configuration of the tests. */
export const CENTRAL_ENTRY = "entry_central";

/** The entities of the central device of the tests. */
export const CENTRAL = {
  mode: "select.central_mode",
  boiler: "binary_sensor.central_boiler",
  devices: "sensor.nb_device_active_boiler",
  power: "sensor.total_power_active_boiler",
  countThreshold: "number.boiler_activation_threshold",
  powerThreshold: "number.boiler_power_activation_threshold",
  frost: "number.central_frost",
  outdoor: "sensor.outdoor_temperature",
  presence: "binary_sensor.home_presence",
  housePower: "sensor.house_power",
} as const;

/** A thermostat of the tests. */
export interface ThermostatOptions {
  /** Its name, the friendly name of its `climate` entity. */
  readonly name?: string;
  /** The state of its `climate` entity: its HVAC mode, or `unavailable`. */
  readonly state?: string;
  /** Its HVAC action. */
  readonly action?: string;
  /** Attributes of its `climate` entity, added to the others. */
  readonly attributes?: Readonly<Record<string, unknown>>;
  /** What is in its `specific_states`. */
  readonly specific?: Readonly<Record<string, unknown>>;
  /** Its energy counter: its value and its unit. Without it, the thermostat has no energy sensor. */
  readonly energy?: { readonly value: string; readonly unit: string };
}

/** The configuration entry of a thermostat of the tests. */
export const entryOf = (id: string): string => `entry_${id}`;

/** The `climate` entity of a thermostat of the tests. */
export const climateOf = (id: string): string => `climate.${id}`;

/** Add a thermostat: its device, its `climate` entity and, when it has one, its energy sensor. */
export function addThermostat(hass: FakeHass, id: string, options: ThermostatOptions = {}): void {
  hass.setDevice({ id: `device_${id}`, identifiers: [["versatile_thermostat", entryOf(id)]] });
  hass.setEntity({ entity_id: climateOf(id), device_id: `device_${id}`, platform: "versatile_thermostat" });
  hass.setState(climateOf(id), options.state ?? "heat", {
    friendly_name: options.name ?? id,
    hvac_action: options.action ?? "idle",
    specific_states: { messages: [], unavailable_underlying_entities: [], device_actives: [], ...options.specific },
    ...options.attributes,
  });
  if (options.energy !== undefined) {
    hass.setEntity({ entity_id: `sensor.${id}_energy`, device_id: `device_${id}`, platform: "versatile_thermostat", translation_key: "energy" });
    hass.setState(`sensor.${id}_energy`, options.energy.value, { unit_of_measurement: options.energy.unit });
  }
}

/** What the central configuration of the tests has. */
export interface CentralOptions {
  /** The central mode: the state of its `select`. */
  readonly mode?: string;
  /** Whether the central boiler is on in the central configuration: its entities exist. */
  readonly boiler?: boolean;
  /** The values of the central configuration. */
  readonly values?: Readonly<Record<string, unknown>>;
}

/** Add the central device and its entities: the central mode, the presets, and the entities of the central boiler when it is on. */
export function addCentral(hass: FakeHass, options: CentralOptions = {}): CentralContext {
  hass.setDevice({ id: "device_central", identifiers: [["versatile_thermostat", CENTRAL_ENTRY]] });
  const entity = (entityId: string, translationKey?: string) =>
    hass.setEntity({ entity_id: entityId, device_id: "device_central", platform: "versatile_thermostat", ...(translationKey === undefined ? {} : { translation_key: translationKey }) });
  entity(CENTRAL.mode);
  hass.setState(CENTRAL.mode, options.mode ?? "Auto", { options: ["Auto", "Stopped", "Heat only", "Cool only", "Frost protection"] });
  // A preset of the central configuration: a `number` with a translation key, which is not a threshold of the boiler.
  entity(CENTRAL.frost, "frost");
  hass.setState(CENTRAL.frost, "7", { unit_of_measurement: "°C" });
  if (options.boiler === true) {
    entity(CENTRAL.boiler, "central_boiler_state");
    entity(CENTRAL.devices, "nb_device_active_boiler");
    entity(CENTRAL.power, "total_power_active_boiler");
    entity(CENTRAL.countThreshold);
    entity(CENTRAL.powerThreshold);
    setBoiler(hass, {});
    hass.setState(CENTRAL.devices, "0", { active_device_ids: [] });
    hass.setState(CENTRAL.power, "0", { unit_of_measurement: "W" });
    hass.setState(CENTRAL.countThreshold, "2", {});
    hass.setState(CENTRAL.powerThreshold, "1000", { unit_of_measurement: "W" });
  }
  // The central configuration says that the boiler is on: its entities alone do not.
  return { entryId: CENTRAL_ENTRY, values: { ...(options.boiler === true ? { use_central_boiler_feature: true } : {}), ...options.values } };
}

/** Set the state of the binary sensor of the central boiler and the attributes of its manager. */
export function setBoiler(hass: FakeHass, options: { readonly on?: boolean; readonly ready?: boolean; readonly scheduled?: boolean; readonly delaySec?: number }): void {
  const ready = options.ready ?? true;
  hass.setState(CENTRAL.boiler, options.on === true ? "on" : "off", {
    central_boiler_state: options.on === true ? "on" : "off",
    is_central_boiler_configured: true,
    is_central_boiler_ready: ready,
    ...(ready
      ? {
          central_boiler_manager: {
            is_on: options.on === true,
            activation_scheduled: options.scheduled === true,
            delayed_activation_sec: options.delaySec ?? 0,
            nb_active_device_for_boiler_threshold: 2,
            total_power_active_for_boiler_threshold: 1000,
          },
        }
      : {}),
  });
}

/** A fake `hass` with the unit system of Home Assistant, in a language. */
export function homeHass(language = "en"): FakeHass {
  const hass = createFakeHass({ language });
  (hass as unknown as { config: unknown }).config = { unit_system: { temperature: "°C" } };
  return hass;
}

/**
 * A complete home: the central configuration with every feature (central boiler, outdoor sensor, presence sensor), and three thermostats
 * of which one publishes the power of the home.
 */
export function fullHome(language = "en"): { readonly hass: FakeHass; readonly central: CentralContext } {
  const hass = homeHass(language);
  hass.setState(CENTRAL.outdoor, "6.2", { unit_of_measurement: "°C", friendly_name: "Outdoor" });
  hass.setState(CENTRAL.presence, "on", { friendly_name: "Home presence" });
  hass.setState(CENTRAL.housePower, "4.1", { unit_of_measurement: "kW" });
  const central = addCentral(hass, {
    boiler: true,
    values: { external_temperature_sensor_entity_id: CENTRAL.outdoor, presence_sensor_entity_id: CENTRAL.presence, power_sensor_entity_id: CENTRAL.housePower },
  });
  addThermostat(hass, "salon", {
    name: "Salon",
    action: "heating",
    attributes: { power_manager: { current_power: 4.1, current_max_power: 6, power_sensor_entity_id: CENTRAL.housePower } },
    energy: { value: "12.5", unit: "kWh" },
  });
  addThermostat(hass, "kitchen", { name: "Kitchen", energy: { value: "3.5", unit: "kWh" } });
  addThermostat(hass, "office", { name: "Office", state: "off", action: "off" });
  return { hass, central };
}
