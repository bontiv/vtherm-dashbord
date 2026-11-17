/**
 * The areas of the thermostats: how the list and the selector of thermostats group and order them by room of Home Assistant.
 *
 * The server says which area each thermostat is in (`area_id`); the names, icons and floors are read from the registries of `hass`, which
 * Home Assistant keeps up to date, so a renamed area shows its new name at once. When `hass` does not have these registries, the names
 * that the server read are used instead. This module does no drawing: it gives the groups that the components show.
 */

import type { ThermostatEntry } from "./config/api.ts";
import type { ThermostatInfo } from "./navigation.ts";

/** An area of the registry of Home Assistant, as `hass.areas` gives it. */
export interface HaArea {
  readonly area_id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly floor_id?: string | null;
}

/** A floor of the registry of Home Assistant, as `hass.floors` gives it. */
export interface HaFloor {
  readonly floor_id: string;
  readonly name: string;
  readonly level?: number | null;
}

/** The registries of the areas and of the floors that the `hass` of Home Assistant carries. The SDK type does not describe them. */
export interface HassAreas {
  readonly areas?: Readonly<Record<string, HaArea>>;
  readonly floors?: Readonly<Record<string, HaFloor>>;
}

/** What `hass.devices` and `hass.entities` say about the area of a device or of an entity. */
interface HaAreaHolder {
  readonly area_id?: string | null;
}

/** The registries of the devices and of the entities of `hass`, which change when the user moves a device or an entity. */
export interface HassRegistries {
  readonly devices?: Readonly<Record<string, HaAreaHolder>>;
  readonly entities?: Readonly<Record<string, HaAreaHolder>>;
}

/**
 * A text that changes when the device or the climate entity of a thermostat changes area in `hass`, or undefined when `hass` does not
 * have the registries of the devices and of the entities.
 *
 * @param thermostats - The thermostats of the list of the server.
 * @param hass - The state of Home Assistant.
 */
export function areaSignature(thermostats: readonly ThermostatEntry[], hass: HassRegistries): string | undefined {
  if (hass.devices === undefined && hass.entities === undefined) {
    return undefined;
  }
  return thermostats
    .map((thermostat) => {
      const device = thermostat.device_id === null ? undefined : hass.devices?.[thermostat.device_id];
      const entity = thermostat.climate_entity_id === null ? undefined : hass.entities?.[thermostat.climate_entity_id];
      return `${thermostat.id}=${entity?.area_id ?? ""}/${device?.area_id ?? ""}`;
    })
    .sort()
    .join(",");
}

/** A group of thermostats: an area, or the thermostats without area when `areaId` is null. */
export interface AreaGroup {
  readonly areaId: string | null;
  /** The name of the area. Empty for the thermostats without area: the component gives the translated title. */
  readonly name: string;
  readonly icon: string | undefined;
  /** The name of the floor of the area, undefined when it has none. */
  readonly floorName: string | undefined;
  readonly thermostats: readonly ThermostatInfo[];
}

/** A thermostat of the selector, with its label. */
export interface SelectorOption {
  readonly thermostat: ThermostatInfo;
  /** "area · name", or the name alone when the thermostat has no area. */
  readonly label: string;
}

/** The separator between the area and the name in the selector. */
export const AREA_SEPARATOR = " · ";

/**
 * The thermostat that the dashboard shows, from a thermostat of the list of the server.
 *
 * @param entry - The thermostat, as `get_thermostats` gives it.
 */
export function toThermostatInfo(entry: ThermostatEntry): ThermostatInfo {
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    deviceId: entry.device_id ?? null,
    climateEntityId: entry.climate_entity_id ?? null,
    areaId: entry.area_id ?? null,
    areaName: entry.area_name ?? null,
    floorName: entry.floor_name ?? null,
    floorLevel: entry.floor_level ?? null,
  };
}

/** Where a thermostat is, with the live names when `hass` has them. */
interface Place {
  readonly areaId: string;
  readonly name: string;
  readonly icon: string | undefined;
  readonly floorId: string | undefined;
  readonly floorName: string | undefined;
  readonly floorLevel: number | undefined;
}

function placeOf(thermostat: ThermostatInfo, hass: HassAreas | undefined): Place | undefined {
  const areaId = thermostat.areaId ?? null;
  if (areaId === null) {
    return undefined;
  }
  const areas = hass?.areas;
  if (areas === undefined) {
    // fallback: the names that the server read, when hass does not have the registry of the areas.
    const name = thermostat.areaName ?? "";
    if (name === "") {
      return undefined;
    }
    const floorName = thermostat.floorName ?? undefined;
    return { areaId, name, icon: undefined, floorId: floorName, floorName, floorLevel: thermostat.floorLevel ?? undefined };
  }
  const area = areas[areaId];
  if (area === undefined) {
    // The area was deleted after the list was read.
    return undefined;
  }
  const floorId = area.floor_id ?? undefined;
  const floor = floorId === undefined ? undefined : hass?.floors?.[floorId];
  return { areaId, name: area.name, icon: area.icon ?? undefined, floorId: floor === undefined ? undefined : floorId, floorName: floor?.name, floorLevel: floor?.level ?? undefined };
}

/** The order of the floors: the floors with a level by level, then the floors without level, then the areas without floor. */
function floorRank(place: Place): [number, number] {
  if (place.floorId === undefined) {
    return [2, 0];
  }
  return place.floorLevel === undefined ? [1, 0] : [0, place.floorLevel];
}

/**
 * Group the thermostats by area: the groups are ordered by floor, then by name of area, and the thermostats of a group by name. The
 * thermostats without area form the last group. When no thermostat has an area, there is one group, without area.
 *
 * @param thermostats - The thermostats.
 * @param hass - The state of Home Assistant, with the registries of the areas and of the floors when it has them.
 * @param language - The language of the user, for the alphabetical order.
 */
export function groupByArea(thermostats: readonly ThermostatInfo[], hass: HassAreas | undefined, language: string): AreaGroup[] {
  const collator = new Intl.Collator(language === "" ? undefined : language, { sensitivity: "base", numeric: true });
  const byName = (left: ThermostatInfo, right: ThermostatInfo): number => collator.compare(left.name, right.name);
  const groups = new Map<string, { place: Place; thermostats: ThermostatInfo[] }>();
  const homeless: ThermostatInfo[] = [];
  for (const thermostat of thermostats) {
    const place = placeOf(thermostat, hass);
    if (place === undefined) {
      homeless.push(thermostat);
      continue;
    }
    const group = groups.get(place.areaId);
    if (group === undefined) {
      groups.set(place.areaId, { place, thermostats: [thermostat] });
    } else {
      group.thermostats.push(thermostat);
    }
  }
  const ordered = [...groups.values()].sort((left, right) => {
    const [leftRank, leftLevel] = floorRank(left.place);
    const [rightRank, rightLevel] = floorRank(right.place);
    return (
      leftRank - rightRank ||
      leftLevel - rightLevel ||
      collator.compare(left.place.floorName ?? "", right.place.floorName ?? "") ||
      collator.compare(left.place.name, right.place.name)
    );
  });
  const result: AreaGroup[] = ordered.map(({ place, thermostats: items }) => ({
    areaId: place.areaId,
    name: place.name,
    icon: place.icon,
    floorName: place.floorName,
    thermostats: items.sort(byName),
  }));
  if (homeless.length > 0) {
    result.push({ areaId: null, name: "", icon: undefined, floorName: undefined, thermostats: homeless.sort(byName) });
  }
  return result;
}

/**
 * Whether the groups only have the thermostats without area, so the list is shown without heading.
 *
 * @param groups - The groups of `groupByArea`.
 */
export function hasNoArea(groups: readonly AreaGroup[]): boolean {
  return groups.every((group) => group.areaId === null);
}

/**
 * The thermostats of the selector, in the order of the groups, with "area · name" as label.
 *
 * @param thermostats - The thermostats.
 * @param hass - The state of Home Assistant.
 * @param language - The language of the user.
 */
export function selectorOptions(thermostats: readonly ThermostatInfo[], hass: HassAreas | undefined, language: string): SelectorOption[] {
  return groupByArea(thermostats, hass, language).flatMap((group) =>
    group.thermostats.map((thermostat) => ({ thermostat, label: group.areaId === null ? thermostat.name : `${group.name}${AREA_SEPARATOR}${thermostat.name}` })),
  );
}
