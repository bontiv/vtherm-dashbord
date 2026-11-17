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

describe("the tiles of the thermostats", () => {
  const live = (states: Record<string, { state: string; attributes: Record<string, unknown> }>) =>
    ({ ...house, config: { unit_system: { temperature: "°C" } }, states }) as unknown as Hass;
  const salon: ThermostatInfo = { id: "salon", name: "Salon", type: "over_switch", areaId: "living", climateEntityId: "climate.salon" };
  const heating = { state: "heat", attributes: { current_temperature: 19.5, temperature: 21, hvac_action: "heating", preset_mode: "comfort" } };
  const tile = (list: HTMLElement, name: string) => [...shadow(list).querySelectorAll<HTMLElement>("a.tile")].find((link) => link.querySelector(".name")?.textContent === name) as HTMLElement;

  it("show the temperature of the room and the setpoint, the action with its dot, the preset and the icon of the type", async () => {
    const list = await mountList([salon], live({ "climate.salon": heating }));
    const salonTile = tile(list, "Salon");
    expect(salonTile.querySelector(".temperatures")?.textContent?.replace(/\s+/g, " ").trim()).toBe("19.5 °C → 21 °C");
    expect(salonTile.querySelector(".action")?.textContent?.trim()).toBe("Heating");
    expect(salonTile.querySelector(".dot.heating")).not.toBeNull();
    expect(salonTile.querySelector(".preset")?.textContent).toBe("Comfort");
    expect((salonTile.querySelector("ha-icon") as HTMLElement & { icon: string }).icon).toBe("mdi:toggle-switch-variant");
    expect(salonTile.getAttribute("href")).toBe("/vtherm/core.top.thermostats/salon");
  });

  it("follow the state of the climate entity live", async () => {
    const list = await mountList([salon], live({ "climate.salon": heating }));
    list.hass = live({ "climate.salon": { ...heating, attributes: { ...heating.attributes, current_temperature: 20.2, hvac_action: "idle" } } });
    await list.updateComplete;
    expect(tile(list, "Salon").querySelector(".temperatures")?.textContent).toContain("20.2 °C");
    expect(tile(list, "Salon").querySelector(".action")?.textContent?.trim()).toBe("Idle");
  });

  it("say unavailable when the entity is unavailable or unknown, and stay links", async () => {
    const lost: ThermostatInfo = { id: "lost", name: "Lost", type: "over_valve", areaId: "living", climateEntityId: "climate.lost" };
    const list = await mountList([salon, lost], live({ "climate.salon": { state: "unavailable", attributes: {} } }));
    for (const name of ["Salon", "Lost"]) {
      expect(tile(list, name).querySelector(".unavailable")?.textContent).toBe("Unavailable");
      expect(tile(list, name).querySelector(".type")).not.toBeNull();
      expect(tile(list, name).getAttribute("href")).not.toBeNull();
    }
  });

  it("are grouped by area, and end with the tile New thermostat, by area as by name", async () => {
    const list = await mountList(thermostats, live({}));
    const last = [...shadow(list).querySelectorAll("a.tile")].at(-1);
    expect(last?.classList.contains("new")).toBe(true);
    expect(last?.getAttribute("href")).toBe("/vtherm/core.top.thermostats/new");
    expect(shadow(list).querySelectorAll("section ul.tiles a.tile:not(.new)").length).toBe(4);
    (shadow(list).querySelector('[data-grouping="name"]') as HTMLElement).click();
    await list.updateComplete;
    expect([...shadow(list).querySelectorAll("a.tile")].at(-1)?.classList.contains("new")).toBe(true);
    expect(shadow(list).querySelectorAll("h3").length).toBe(0);
  });

  it("offer the tile New thermostat when there is no thermostat yet", async () => {
    const list = await mountList([], live({}));
    expect(shadow(list).querySelector("a.tile.new")?.getAttribute("href")).toBe("/vtherm/core.top.thermostats/new");
  });

  it("wrap on a phone: one column of tiles that take the width", () => {
    const css = (VThermThermostatList.styles as unknown as { cssText?: string }[]).map((style) => style.cssText ?? "").join("\n");
    expect(css).toMatch(/grid-template-columns: repeat\(auto-fill, minmax\(min\(240px, 100%\), 1fr\)\)/);
    expect(css).toMatch(/\.name\s*\{[^}]*overflow-wrap: anywhere/);
  });
});
