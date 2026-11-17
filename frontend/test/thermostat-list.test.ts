// @vitest-environment happy-dom
/** The list of the thermostats grouped by area of Home Assistant, and the selector of the menu ordered the same way. */
import type { Hass } from "@vtherm/dashboard-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VThermSideMenu } from "../src/components/side-menu.ts";
import { GROUPING_STORAGE_KEY, VThermThermostatList } from "../src/components/thermostat-list.ts";
import type { ThermostatInfo } from "../src/navigation.ts";

const house = {
  language: "en",
  locale: { language: "en" },
  floors: {
    ground: { floor_id: "ground", name: "Ground floor", level: 0 },
    first: { floor_id: "first", name: "First floor", level: 1 },
  },
  areas: {
    living: { area_id: "living", name: "Living room", icon: "mdi:sofa", floor_id: "ground" },
    bedroom: { area_id: "bedroom", name: "Bedroom", floor_id: "first" },
  },
} as unknown as Hass;

const thermostats: readonly ThermostatInfo[] = [
  { id: "bed", name: "Bed", type: "over_valve", areaId: "bedroom", deviceId: "device-bed" },
  { id: "towel", name: "Towel rail", type: "over_switch", areaId: null, deviceId: "device-towel" },
  { id: "sofa", name: "Sofa", type: "over_climate", areaId: "living", deviceId: "device-sofa" },
  { id: "attic", name: "Attic", type: "over_switch", areaId: null, deviceId: null },
];

const mounted: HTMLElement[] = [];

async function mountList(items: readonly ThermostatInfo[] = thermostats, hass: Hass = house): Promise<VThermThermostatList> {
  const element = document.createElement("vtherm-thermostat-list") as VThermThermostatList;
  element.thermostats = items;
  element.hass = hass;
  document.body.append(element);
  mounted.push(element);
  await element.updateComplete;
  return element;
}

const shadow = (element: HTMLElement) => element.shadowRoot as ShadowRoot;
const headings = (element: HTMLElement) => [...shadow(element).querySelectorAll("h3")].map((heading) => heading.textContent?.replace(/\s+/g, " ").trim());
const names = (element: HTMLElement) => [...shadow(element).querySelectorAll(".name")].map((name) => name.textContent);

afterEach(() => {
  mounted.splice(0).forEach((element) => element.remove());
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("the list of the thermostats by area", () => {
  it("groups the thermostats by area, ordered by floor, with the thermostats without area at the end", async () => {
    const list = await mountList();
    expect(headings(list)).toEqual(["Living room Ground floor", "Bedroom First floor", "No area"]);
    expect(names(list)).toEqual(["Sofa", "Bed", "Attic", "Towel rail"]);
  });

  it("shows no link to give an area to the thermostats without area", async () => {
    const list = await mountList();
    expect(shadow(list).querySelector('a[href^="/config/devices/device/"]')).toBeNull();
    expect(shadow(list).textContent).not.toContain("Assign an area");
  });

  it("shows the new name of an area that Home Assistant renamed, without reading the list again", async () => {
    const list = await mountList();
    list.hass = { ...house, areas: { ...(house as unknown as { areas: object }).areas, bedroom: { area_id: "bedroom", name: "Parents' room", floor_id: "first" } } } as unknown as Hass;
    await list.updateComplete;
    expect(headings(list)).toContain("Parents' room First floor");
  });

  it("shows the list by name, without heading and without choice, when no thermostat has an area", async () => {
    const list = await mountList([
      { id: "b", name: "B", type: "over_switch", areaId: null },
      { id: "a", name: "A", type: "over_switch", areaId: null },
    ]);
    expect(headings(list)).toEqual([]);
    expect(shadow(list).querySelector(".grouping")).toBeNull();
    expect(names(list)).toEqual(["A", "B"]);
  });
});

describe("the choice of the order of the list", () => {
  const choose = async (list: VThermThermostatList, grouping: string) => {
    shadow(list).querySelector<HTMLElement>(`[data-grouping="${grouping}"]`)?.click();
    await list.updateComplete;
  };

  it("orders the thermostats by name when the user asks, and keeps the choice", async () => {
    const list = await mountList();
    const group = shadow(list).querySelector(".grouping");
    expect(group?.getAttribute("role")).toBe("radiogroup");
    expect(shadow(list).querySelector('[data-grouping="area"]')?.getAttribute("aria-checked")).toBe("true");
    await choose(list, "name");
    expect(headings(list)).toEqual([]);
    expect(names(list)).toEqual(["Attic", "Bed", "Sofa", "Towel rail"]);
    expect(shadow(list).querySelector('[data-grouping="name"]')?.getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(GROUPING_STORAGE_KEY)).toBe("name");
    // The user comes back to the tab: the list is still by name.
    const again = await mountList();
    expect(headings(again)).toEqual([]);
    await choose(again, "area");
    expect(headings(again)).toHaveLength(3);
  });

  it("groups by area and lets the user choose for the time of the page when the browser refuses the storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const list = await mountList();
    expect(headings(list)).toHaveLength(3);
    await choose(list, "name");
    expect(headings(list)).toEqual([]);
  });

  it("lets the cards of the thermostats shrink to the width of a phone, and the long names of areas wrap", async () => {
    const css = (VThermThermostatList.styles as unknown as { cssText: string }[]).map((style) => style.cssText).join("");
    expect(css).toContain("minmax(min(240px, 100%), 1fr)");
    const list = await mountList();
    expect([...shadow(list).querySelectorAll("h3 .area")].every((area) => area.classList.contains("breakable"))).toBe(true);
  });
});

describe("the selector of thermostats of the menu", () => {
  it("orders the thermostats by area and names them with their area", async () => {
    const menu = document.createElement("vtherm-side-menu") as VThermSideMenu;
    menu.thermostats = thermostats;
    menu.hass = house;
    menu.selected = "sofa";
    document.body.append(menu);
    mounted.push(menu);
    await menu.updateComplete;
    const options = [...shadow(menu).querySelectorAll("option")].map((option) => option.textContent);
    expect(options).toEqual(["Living room · Sofa", "Bedroom · Bed", "Attic", "Towel rail"]);
  });
});
