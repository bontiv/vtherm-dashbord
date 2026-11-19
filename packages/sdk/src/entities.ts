/**
 * The entities of a configuration entry of Versatile Thermostat, read from the registries that Home Assistant gives to its frontend.
 *
 * The registry of the entities in `hass` has no configuration entry, so the link goes through the device: Versatile Thermostat gives
 * the device of each entry the identifier `["versatile_thermostat", <entry id>]`, and each entity names its device. Nothing is asked to
 * the server: the result is there at once, so a visibility condition can use it.
 */

import type { Hass } from "./types.js";

/** The domain of Versatile Thermostat, which is the first element of the identifiers of its devices. */
export const VTHERM_DOMAIN = "versatile_thermostat";

/** An entity of a configuration entry. */
export interface EntryEntity {
  /** The identifier of the entity, for example `sensor.living_room_power_percent`. */
  readonly entityId: string;
  /** The domain of the entity, the part of its identifier before the dot, for example `sensor`. */
  readonly domain: string;
  /** The key of the name of the entity in the translations of Versatile Thermostat, for example `power_percent`. Undefined when it has none. */
  readonly translationKey: string | undefined;
  /** The integration that created the entity. */
  readonly platform: string | undefined;
}

/** The entities of a configuration entry. Every field is empty when the entry, its device or a registry is unknown. */
export interface EntryEntities {
  /** The device of the entry. */
  readonly deviceId: string | undefined;
  /** The entities of the device of the entry, in the order of the registry. */
  readonly entities: readonly EntryEntity[];
  /** The first `climate` entity of the device: the thermostat itself. Undefined for the central configuration. */
  readonly climate: string | undefined;
  /** The entities that have a translation key, by key: `byKey["power_percent"]` is the sensor of the share of heating. */
  readonly byKey: Readonly<Record<string, string>>;
}

const EMPTY: EntryEntities = Object.freeze({ deviceId: undefined, entities: Object.freeze([]), climate: undefined, byKey: Object.freeze({}) });

/**
 * Find the entities of a configuration entry of Versatile Thermostat: a thermostat (its `thermostatId`) or the central configuration.
 *
 * It is a pure and synchronous function: it reads `hass.devices` and `hass.entities`, and never calls the server. An entity without a
 * translation key, such as the `select` of the central mode, is found in `entities` by its domain.
 *
 * @param hass - The state of Home Assistant.
 * @param entryId - The identifier of the configuration entry. An entity identifier such as `climate.living_room` is not one: it gives
 *   empty values.
 * @returns The device of the entry and its entities, or empty values when a registry is missing or the entry has no device.
 */
export function getEntryEntities(hass: Pick<Hass, "devices" | "entities">, entryId: string): EntryEntities {
  const devices = hass.devices;
  const registry = hass.entities;
  if (devices === undefined || registry === undefined || typeof entryId !== "string" || entryId === "") {
    return EMPTY;
  }
  const device = Object.values(devices).find((candidate) => (candidate.identifiers ?? []).some((pair) => pair[0] === VTHERM_DOMAIN && pair[1] === entryId));
  if (device === undefined) {
    return EMPTY;
  }
  const entities: EntryEntity[] = [];
  const byKey: Record<string, string> = {};
  let climate: string | undefined;
  for (const entry of Object.values(registry)) {
    if (entry.device_id !== device.id) {
      continue;
    }
    const domain = entry.entity_id.slice(0, Math.max(0, entry.entity_id.indexOf(".")));
    const translationKey = typeof entry.translation_key === "string" && entry.translation_key !== "" ? entry.translation_key : undefined;
    entities.push({ entityId: entry.entity_id, domain, translationKey, platform: entry.platform });
    if (translationKey !== undefined && !(translationKey in byKey)) {
      byKey[translationKey] = entry.entity_id;
    }
    if (domain === "climate" && climate === undefined) {
      climate = entry.entity_id;
    }
  }
  return { deviceId: device.id, entities, climate, byKey };
}
