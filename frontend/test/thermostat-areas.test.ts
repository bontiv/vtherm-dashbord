import { describe, expect, it } from "vitest";

import type { ThermostatEntry } from "../src/config/api.ts";
import type { ThermostatInfo } from "../src/navigation.ts";
import { groupByArea, hasNoArea, selectorOptions, toThermostatInfo } from "../src/thermostat-areas.ts";
import type { HassAreas } from "../src/thermostat-areas.ts";

const thermostat = (name: string, areaId: string | null = null, extra: Partial<ThermostatInfo> = {}): ThermostatInfo => ({ id: name.toLowerCase(), name, type: "over_switch", areaId, ...extra });

/** A house with a ground floor (living room, kitchen), a first floor (bedroom) and an office without floor. */
const house: HassAreas = {
  floors: {
    ground: { floor_id: "ground", name: "Ground floor", level: 0 },
    first: { floor_id: "first", name: "First floor", level: 1 },
  },
  areas: {
    living: { area_id: "living", name: "Living room", icon: "mdi:sofa", floor_id: "ground" },
    kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
    bedroom: { area_id: "bedroom", name: "Bedroom", floor_id: "first" },
    office: { area_id: "office", name: "Office", floor_id: null },
  },
};

const summary = (groups: ReturnType<typeof groupByArea>) => groups.map((group) => [group.areaId, group.thermostats.map((item) => item.name)]);

describe("the thermostats grouped by area", () => {
  it("puts the thermostats of one area under that area, ordered by name", () => {
    const groups = groupByArea([thermostat("Window", "living"), thermostat("Fireplace", "living")], house, "en");
    expect(summary(groups)).toEqual([["living", ["Fireplace", "Window"]]]);
    expect(groups[0]).toMatchObject({ name: "Living room", icon: "mdi:sofa", floorName: "Ground floor" });
  });

  it("orders the areas by floor level, then by name, and puts the areas without floor after the floors", () => {
    const groups = groupByArea([thermostat("Desk", "office"), thermostat("Bed", "bedroom"), thermostat("Sofa", "living"), thermostat("Oven", "kitchen")], house, "en");
    expect(summary(groups)).toEqual([
      ["kitchen", ["Oven"]],
      ["living", ["Sofa"]],
      ["bedroom", ["Bed"]],
      ["office", ["Desk"]],
    ]);
    expect(groups.map((group) => group.floorName)).toEqual(["Ground floor", "Ground floor", "First floor", undefined]);
  });

  it("puts the thermostats without area in a last group", () => {
    const groups = groupByArea([thermostat("Towel rail"), thermostat("Sofa", "living"), thermostat("Attic")], house, "en");
    expect(summary(groups)).toEqual([
      ["living", ["Sofa"]],
      [null, ["Attic", "Towel rail"]],
    ]);
    expect(hasNoArea(groups)).toBe(false);
  });

  it("gives one group without area when no thermostat has an area", () => {
    const groups = groupByArea([thermostat("B"), thermostat("A")], house, "en");
    expect(summary(groups)).toEqual([[null, ["A", "B"]]]);
    expect(hasNoArea(groups)).toBe(true);
  });

  it("shows the name that Home Assistant has now, not the one of the list", () => {
    const renamed: HassAreas = { ...house, areas: { ...house.areas, office: { area_id: "office", name: "Parents' office" } } };
    expect(groupByArea([thermostat("Desk", "office", { areaName: "Office" })], renamed, "en")[0]?.name).toBe("Parents' office");
  });

  it("treats a thermostat whose area was deleted as a thermostat without area", () => {
    expect(summary(groupByArea([thermostat("Desk", "removed", { areaName: "Removed" })], house, "en"))).toEqual([[null, ["Desk"]]]);
  });

  it("uses the names of the server when hass does not have the registries of the areas", () => {
    const groups = groupByArea(
      [thermostat("Bed", "bedroom", { areaName: "Bedroom", floorName: "First floor", floorLevel: 1 }), thermostat("Sofa", "living", { areaName: "Living room", floorName: "Ground floor", floorLevel: 0 })],
      {},
      "en",
    );
    expect(groups.map((group) => [group.name, group.floorName])).toEqual([
      ["Living room", "Ground floor"],
      ["Bedroom", "First floor"],
    ]);
  });

  it("orders the names in the language of the user", () => {
    const groups = groupByArea([thermostat("Zoe", "living"), thermostat("Émile", "living"), thermostat("eric", "living")], house, "fr");
    expect(groups[0]?.thermostats.map((item) => item.name)).toEqual(["Émile", "eric", "Zoe"]);
  });
});

describe("the selector of thermostats", () => {
  it("orders the thermostats by area and labels them with their area", () => {
    const options = selectorOptions([thermostat("Bed", "bedroom"), thermostat("Attic"), thermostat("Sofa", "living")], house, "en");
    expect(options.map((option) => option.label)).toEqual(["Living room · Sofa", "Bedroom · Bed", "Attic"]);
  });
});

describe("the thermostat of the list of the server", () => {
  it("keeps the device and the area", () => {
    const entry: ThermostatEntry = {
      id: "a",
      name: "Sofa",
      type: "over_climate",
      read_only: false,
      device_id: "device-a",
      climate_entity_id: "climate.sofa",
      area_id: "living",
      area_name: "Living room",
      floor_name: "Ground floor",
      floor_level: 0,
    };
    expect(toThermostatInfo(entry)).toEqual({ id: "a", name: "Sofa", type: "over_climate", deviceId: "device-a", areaId: "living", areaName: "Living room", floorName: "Ground floor", floorLevel: 0 });
  });
});
