// @vitest-environment happy-dom
/** The seven widgets of the native plugins on the Overview page: their declarations, their order, their sizes, and what each one shows. */
import type { AnyTranslations, CentralContext, Hass, PlacedEntry, UiPluginDefinition } from "@vtherm/dashboard-sdk";
import type { FakeHass, FakeHost } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { NAVIGATE_EVENT } from "../src/components/events.ts";
import { GLOBAL_WIDGET_IDS } from "../src/native/widgets/ids.ts";
import { thermostatPath } from "../src/native/widgets/home.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";
import { deepFindAll, deepText } from "./support/vtherm-runtime.ts";
import { CENTRAL, addCentral, addThermostat, climateOf, entryOf, fullHome, homeHass, setBoiler } from "./support/vtherm-home.ts";

let host: FakeHost;
let definitions: Map<string, UiPluginDefinition>;

beforeAll(async () => {
  ({ host, definitions } = await nativeHost());
});

afterEach(async () => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  delete (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry;
  for (const definition of definitions.values()) {
    await (definition.translations as AnyTranslations).setLanguage("en");
  }
});

const IDS = GLOBAL_WIDGET_IDS;
const ORDER = [IDS.centralMode, IDS.presence, IDS.summary, IDS.boiler, IDS.boilerPower, IDS.housePower, IDS.outdoor];

const entryOfWidget = (id: string): PlacedEntry => host.resolved("global_widget").find((entry) => entry.id === id) as PlacedEntry;

/** The identifiers of the widgets that the Overview page shows, in order. */
function shown(hass: Hass, central?: CentralContext): string[] {
  return host.visible(host.resolved("global_widget"), { hass, ...(central === undefined ? {} : { central }) }).map((entry) => entry.id);
}

/** Wait until the widget, its children and the reads that it started have drawn. */
async function settle(element: HTMLElement): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (const child of [element, ...deepFindAll<HTMLElement & { updateComplete?: Promise<unknown> }>(element, "*")]) {
      await (child as { updateComplete?: Promise<unknown> }).updateComplete;
    }
  }
}

/** Show a widget of the Overview page, in a language. */
async function render(id: string, hass: FakeHass, central: CentralContext | undefined, language = "en", visible = false): Promise<HTMLElement & { visible: boolean }> {
  const entry = entryOfWidget(id);
  await (definitions.get(entry.pluginId)?.translations as AnyTranslations).setLanguage(language);
  hass.setLanguage(language);
  const element = (await host.render<"global_widget">(entry, { hass, ...(central === undefined ? {} : { central }) } as never)) as HTMLElement & { visible: boolean };
  if (visible) {
    element.visible = true;
  }
  await settle(element);
  return element;
}

/** The text of a widget, with the spaces of the numbers made plain. */
const textOf = (element: HTMLElement): string => deepText(element).replace(/[\u00a0\u202f]/g, " ");

const meterName = (element: HTMLElement, selector = "vtherm-gauge"): string =>
  (deepFindAll(deepFindAll(element, selector)[0] as HTMLElement, "[role=meter]")[0]?.getAttribute("aria-label") ?? "").replace(/[\u00a0\u202f]/g, " ");

/** The state icon of a class in a widget: its icon and its label. */
function stateIcon(element: HTMLElement, selector: string): { icon: string; label: string; tooltip: string } | undefined {
  const icon = deepFindAll<HTMLElement & { icon: string; label: string; tooltip: string }>(element, `vtherm-state-icon${selector}`)[0];
  return icon === undefined ? undefined : { icon: icon.icon, label: icon.label.replace(/[\u00a0\u202f]/g, " "), tooltip: icon.tooltip };
}

/** A copy of `hass` with one more state, as Home Assistant gives a new object when a state changes. */
function withState(hass: Hass, entityId: string, state: string, attributes: Record<string, unknown> = {}): Hass {
  return { ...hass, states: { ...hass.states, [entityId]: { entity_id: entityId, state, attributes } } } as Hass;
}

describe("the global widgets of the native plugins", () => {
  const widgets = (id: string) => (definitions.get(id)?.contributions.global_widget ?? []) as readonly { id: string; placement?: unknown; visible?: unknown; size?: unknown }[];

  it("are declared by their plugins, each with a placement, a visibility condition and its size", () => {
    expect(widgets("core").map((widget) => widget.id)).toEqual([IDS.centralMode, IDS.summary, IDS.outdoor]);
    expect(widgets("core_central_boiler").map((widget) => widget.id)).toEqual([IDS.boiler, IDS.boilerPower]);
    expect(widgets("core_power").map((widget) => widget.id)).toEqual([IDS.housePower]);
    expect(widgets("core_presence").map((widget) => widget.id)).toEqual([IDS.presence]);
    const others = NATIVE_LOAD_ORDER.filter((id) => !["core", "core_central_boiler", "core_power", "core_presence"].includes(id));
    expect(others.filter((id) => definitions.get(id)?.contributions.global_widget !== undefined)).toEqual([]);
    const sizes: Record<string, unknown> = {};
    for (const widget of [...definitions.values()].flatMap((definition) => widgets(definition.id))) {
      expect(widget.placement, widget.id).toBeDefined();
      expect(typeof widget.visible, widget.id).toBe("function");
      sizes[widget.id] = widget.size;
    }
    expect(sizes).toEqual({
      [IDS.centralMode]: undefined,
      [IDS.summary]: undefined,
      [IDS.outdoor]: { columns: 2, rows: 2 },
      [IDS.boiler]: { columns: 1, rows: 2 },
      [IDS.boilerPower]: { columns: 2, rows: 2 },
      [IDS.housePower]: undefined,
      [IDS.presence]: undefined,
    });
  });

  it("are declared without any problem of placement", () => {
    expect(host.issues()).toEqual([]);
  });

  it("gives two global widgets to core_central_boiler, each with its placement and its visibility condition", () => {
    const boiler = host.resolved("global_widget").filter((entry) => entry.pluginId === "core_central_boiler");
    expect(boiler.map((entry) => entry.id)).toEqual([IDS.boiler, IDS.boilerPower]);
    for (const entry of boiler) {
      expect((entry.contribution as { placement?: unknown }).placement, entry.id).toBeDefined();
      expect(typeof (entry.contribution as { visible?: unknown }).visible, entry.id).toBe("function");
    }
  });

  it("lets a third-party plugin replace the card of the boiler, the power of the boiler keeping its order", async () => {
    const { host: other } = await nativeHost();
    other.registerPlugin({
      id: "smartboiler",
      translations: definitions.get("core")?.translations as AnyTranslations,
      contributions: { global_widget: [{ id: "smartboiler.widget", component: "smartboiler-widget", placement: { replace: IDS.boiler } }] },
    });
    expect(other.resolved("global_widget").map((entry) => entry.id)).toEqual([IDS.centralMode, IDS.presence, IDS.summary, "smartboiler.widget", IDS.boilerPower, IDS.housePower, IDS.outdoor]);
  });
});

describe("the layout of the Overview page", () => {
  it("orders the cards: central mode, summary, boiler, power of the boiler, power of the home, outdoor temperature, presence", () => {
    expect(host.resolved("global_widget").map((entry) => entry.id)).toEqual(ORDER);
    const { hass, central } = fullHome();
    expect(shown(hass, central)).toEqual(ORDER);
  });

  it("keeps the relative order of the other cards when the central boiler is off", () => {
    const hass = homeHass();
    hass.setState(CENTRAL.outdoor, "6.2", { unit_of_measurement: "°C" });
    hass.setState(CENTRAL.presence, "off", {});
    const central = addCentral(hass, { values: { external_temperature_sensor_entity_id: CENTRAL.outdoor, presence_sensor_entity_id: CENTRAL.presence } });
    addThermostat(hass, "salon", { attributes: { power_manager: { current_power: 1, current_max_power: 6 } } });
    expect(shown(hass, central)).toEqual([IDS.centralMode, IDS.presence, IDS.summary, IDS.housePower, IDS.outdoor]);
  });

  it("shows only the summary and the power of the home without a central configuration", () => {
    const hass = homeHass();
    addThermostat(hass, "salon", { attributes: { power_manager: { current_power: 1, current_max_power: 6 } } });
    expect(shown(hass)).toEqual([IDS.summary, IDS.housePower]);
  });

  /** Show the Overview page with the native plugins in the page. */
  async function overviewPage(hass: Hass, central?: CentralContext): Promise<HTMLElement> {
    (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry = {
      engine: { widgets: (hook: "global_widget") => host.resolved(hook), visible: (entries: readonly PlacedEntry[], context: () => object) => host.visible(entries, context() as never) },
    };
    const page = document.createElement("core-overview-page") as HTMLElement & { hass: Hass; central: CentralContext | undefined; updateComplete: Promise<unknown> };
    Object.assign(page, { hass, central });
    document.body.append(page);
    await settle(page);
    return page;
  }

  it("shows a message instead of a blank page when there is no thermostat and no central configuration", async () => {
    const page = await overviewPage(homeHass());
    const message = deepFindAll(page, ".empty")[0];
    expect(message?.textContent).toContain("No information to show yet");
    expect(deepFindAll(page, "vtherm-widgets")).toHaveLength(0);
  });

  it("shows no message when a widget is visible", async () => {
    const hass = homeHass();
    addThermostat(hass, "salon");
    const page = await overviewPage(hass);
    expect(deepFindAll(page, ".empty")).toHaveLength(0);
    expect(deepFindAll(page, "vtherm-widgets")).toHaveLength(1);
  });

  /** A ResizeObserver whose measure the test gives. */
  let measure: ((width: number) => void) | undefined;
  class FakeResizeObserver {
    constructor(callback: (records: { contentRect: { width: number } }[]) => void) {
      measure = (width) => callback([{ contentRect: { width } }]);
    }
    observe(): void {}
    disconnect(): void {}
  }

  /** The cards of the grid of the Overview page at a width, by widget. */
  async function grid(width: number, narrow: boolean): Promise<Map<string, HTMLElement>> {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { hass, central } = fullHome();
    const entries = host.visible(host.resolved("global_widget"), { hass, central });
    const element = document.createElement("vtherm-widgets") as HTMLElement & Record<string, unknown> & { updateComplete: Promise<unknown> };
    Object.assign(element, { entries, hass, central, narrow });
    document.body.append(element);
    await element.updateComplete;
    measure?.(width);
    await element.updateComplete;
    const cards = [...(element.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>(".widget")];
    return new Map(entries.map((entry, index) => [entry.id, cards[index] as HTMLElement]));
  }

  it("gives one column to the summary at 1440 px, after the central mode and the presence, and two columns and two rows to the outdoor temperature", async () => {
    const cards = await grid(1440 - 32, false);
    expect(cards.get(IDS.summary)?.style.gridColumn).toBe("span 1");
    expect(cards.get(IDS.presence)?.style.gridColumn).toBe("span 1");
    expect(cards.get(IDS.outdoor)?.style.gridColumn).toBe("span 2");
    expect(cards.get(IDS.outdoor)?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
    expect(cards.get(IDS.boilerPower)?.style.gridColumn).toBe("span 2");
    expect(cards.get(IDS.boiler)?.style.gridColumn).toBe("span 1");
    expect(cards.get(IDS.centralMode)?.style.gridColumn).toBe("span 1");
  });

  it("puts every card on one column at 375 px, the boiler keeping its minimal height", async () => {
    const cards = await grid(375 - 32, true);
    for (const id of [IDS.outdoor, IDS.boilerPower, IDS.boiler, IDS.housePower]) {
      expect(cards.get(id)?.style.gridColumn, id).toBe("span 1");
    }
    expect(cards.get(IDS.boiler)?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
  });
});

describe("the widget Central mode", () => {
  it("shows the frost protection with its icon and its French name", async () => {
    const hass = homeHass();
    const central = addCentral(hass, { mode: "Frost protection" });
    const element = await render(IDS.centralMode, hass, central, "fr");
    expect(stateIcon(element, ".central-mode")).toMatchObject({ icon: "mdi:snowflake-thermometer", label: "Hors-gel" });
    expect(textOf(element)).toContain("Mode central");
  });

  it("shows an option that the dashboard does not know as it is, with a generic icon", async () => {
    const hass = homeHass();
    const central = addCentral(hass, { mode: "Eco boost" });
    expect(stateIcon(await render(IDS.centralMode, hass, central), ".central-mode")).toMatchObject({ icon: "mdi:help-circle-outline", label: "Eco boost" });
  });

  it("is hidden without a central configuration", () => {
    const hass = homeHass();
    addThermostat(hass, "salon");
    expect(shown(hass)).not.toContain(IDS.centralMode);
  });

  it("shows — and unavailable when its entity is unavailable", async () => {
    const hass = homeHass();
    const central = addCentral(hass);
    hass.setState(CENTRAL.mode, "unavailable", {});
    const text = textOf(await render(IDS.centralMode, hass, central, "fr"));
    expect(text).toContain("—");
    expect(text).toContain("indisponible");
  });

  it("draws no selector and calls no service", async () => {
    const hass = homeHass();
    const central = addCentral(hass);
    const element = await render(IDS.centralMode, hass, central);
    expect(deepFindAll(element, "select, ha-select, button, ha-button, input")).toHaveLength(0);
    expect(hass.serviceCalls).toEqual([]);
  });
});

describe("the widget Summary of the thermostats", () => {
  /** A home of thermostats that heat, are idle, are off. */
  function home(heating: number, idle: number, off: number): FakeHass {
    const hass = homeHass();
    for (let index = 0; index < heating; index += 1) addThermostat(hass, `heat${index}`, { action: "heating" });
    for (let index = 0; index < idle; index += 1) addThermostat(hass, `idle${index}`, { action: "idle" });
    for (let index = 0; index < off; index += 1) addThermostat(hass, `off${index}`, { state: "off", action: "off" });
    return hass;
  }

  const segmentsOf = (element: HTMLElement) =>
    (deepFindAll<HTMLElement & { segments: readonly { label: string; value: number }[] }>(element, "vtherm-bar.activities")[0]?.segments ?? []).map((segment) => [segment.label, segment.value]);

  it("shows how many thermostats heat, are idle and are off, with their labels and their values in text", async () => {
    const element = await render(IDS.summary, home(3, 5, 2), undefined);
    expect(segmentsOf(element)).toEqual([
      ["Heating", 3],
      ["Idle", 5],
      ["Off", 2],
      ["Unavailable", 0],
    ]);
    const text = textOf(element);
    expect(text).toContain("Heating 3");
    expect(text).toContain("Idle 5");
    expect(text).toContain("Off 2");
    expect(deepFindAll(element, "vtherm-time-chart, svg.chart")).toHaveLength(0);
  });

  it("lists a thermostat in alert with an alert icon and a link to its overview", async () => {
    const hass = homeHass();
    addThermostat(hass, "salon", { name: "Salon", specific: { messages: ["safety_detected"] } });
    addThermostat(hass, "kitchen", { name: "Kitchen" });
    const element = await render(IDS.summary, hass, undefined, "fr");
    const items = deepFindAll(element, "li.alert");
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Salon");
    expect(items[0]?.textContent).toContain("Mode sécurité actif");
    expect(deepFindAll(items[0] as HTMLElement, "[role=img]")[0]?.getAttribute("aria-label")).toBe("En alerte");
    const link = deepFindAll<HTMLAnchorElement>(items[0] as HTMLElement, "a")[0] as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(thermostatPath(entryOf("salon")));
    expect(link.getAttribute("href")).toBe("/vtherm/core.top.thermostats/entry_salon/core.page.thermostat_overview");
    const paths: string[] = [];
    document.addEventListener(NAVIGATE_EVENT, (event) => paths.push((event as CustomEvent<{ path: string }>).detail.path));
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, button: 0 }));
    expect(paths).toEqual([thermostatPath(entryOf("salon"))]);
  });

  it("lists the failures of the heating and the unavailable equipment", async () => {
    const hass = homeHass();
    addThermostat(hass, "salon", { name: "Salon", attributes: { heating_failure_detection_manager: { heating_failure_state: "on", cooling_failure_state: "off" } } });
    addThermostat(hass, "bath", { name: "Bath", specific: { unavailable_underlying_entities: ["switch.bath"] } });
    addThermostat(hass, "hall", { name: "Hall", specific: { messages: ["target_temp_window_eco"] } });
    const text = textOf(await render(IDS.summary, hass, undefined));
    expect(text).toContain("Salon");
    expect(text).toContain("Heating failure");
    expect(text).toContain("Bath");
    expect(text).toContain("Equipment unavailable");
    // A message that informs is not an alert.
    expect(text).not.toContain("Hall");
  });

  it("says No alert with a check mark when no thermostat is in alert", async () => {
    const element = await render(IDS.summary, home(1, 1, 0), undefined, "fr");
    expect(stateIcon(element, ".none")).toMatchObject({ icon: "mdi:check-circle-outline", label: "Aucune alerte" });
    expect(deepFindAll(element, "li.alert")).toHaveLength(0);
  });

  it("counts an unavailable thermostat as unavailable, not as off", async () => {
    const hass = home(0, 1, 0);
    addThermostat(hass, "gone", { state: "unavailable" });
    expect(segmentsOf(await render(IDS.summary, hass, undefined))).toEqual([
      ["Heating", 0],
      ["Idle", 1],
      ["Off", 0],
      ["Unavailable", 1],
    ]);
  });

  it("shows the thermostats that cool only when there is one", async () => {
    const hass = home(1, 0, 0);
    addThermostat(hass, "ac", { state: "cool", action: "cooling" });
    expect(segmentsOf(await render(IDS.summary, hass, undefined))).toContainEqual(["Cooling", 1]);
  });

  it("is hidden when there is no thermostat", () => {
    const hass = homeHass();
    addCentral(hass);
    expect(shown(hass, { entryId: "entry_central", values: {} })).not.toContain(IDS.summary);
  });

  it("does not draw again with thirty thermostats when an entity of none of them changes", async () => {
    const hass = home(10, 15, 5);
    hass.setState("sensor.unrelated", "1", {});
    const element = (await render(IDS.summary, hass, undefined)) as unknown as HTMLElement & { hass: Hass; updateComplete: Promise<unknown> };
    expect(segmentsOf(element)).toEqual([
      ["Heating", 10],
      ["Idle", 15],
      ["Off", 5],
      ["Unavailable", 0],
    ]);
    const render$ = vi.spyOn(element as unknown as { render: () => unknown }, "render");
    element.hass = withState(element.hass, "sensor.unrelated", "2");
    await element.updateComplete;
    expect(render$).not.toHaveBeenCalled();
    element.hass = withState(element.hass, climateOf("idle0"), "heat", { ...element.hass.states[climateOf("idle0")]?.attributes, hvac_action: "heating" });
    await element.updateComplete;
    expect(render$).toHaveBeenCalledTimes(1);
    expect(segmentsOf(element)[0]).toEqual(["Heating", 11]);
  });

  it("wraps the list of the thermostats in alert on a phone", () => {
    const css = (customElements.get("core-widget-summary") as unknown as { styles: readonly { cssText?: string }[] }).styles
      .flat(3)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(/ul\s*\{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/li\s*\{[^}]*overflow-wrap: anywhere/);
  });
});

describe("the widget Outdoor temperature", () => {
  /** A home whose central configuration has an outdoor sensor, and the answer of the recorder for it. */
  function outdoorHome(sensor: string, answer: (message: Readonly<Record<string, unknown>>) => unknown): { hass: FakeHass; central: CentralContext } {
    const hass = homeHass();
    hass.setState(sensor, "6.2", { unit_of_measurement: "°C" });
    const central = addCentral(hass, { values: { external_temperature_sensor_entity_id: sensor } });
    hass.setWebSocketHandler(answer);
    return { hass, central };
  }

  it("shows the value and the curve of the last 24 hours, with a summary in text", async () => {
    const now = Date.now() / 1000;
    const messages: Readonly<Record<string, unknown>>[] = [];
    const { hass, central } = outdoorHome(CENTRAL.outdoor, (message) => {
      messages.push(message);
      return { [CENTRAL.outdoor]: [{ s: "4.5", lu: now - 20 * 3600 }, { s: "8", lu: now - 10 * 3600 }, { s: "6.2", lu: now - 600 }] };
    });
    const element = await render(IDS.outdoor, hass, central, "fr", true);
    expect(textOf(element)).toContain("6,2 °C");
    expect(messages[0]).toMatchObject({ type: "history/history_during_period", entity_ids: [CENTRAL.outdoor] });
    const chart = deepFindAll<HTMLElement & { summary: string; series: readonly { points: readonly unknown[] }[] }>(element, "vtherm-time-chart")[0];
    expect(chart?.series[0]?.points).toHaveLength(3);
    expect(chart?.summary.replace(/[\u00a0\u202f]/g, " ")).toBe("Sur les dernières 24 heures : de 4,5 °C à 8 °C, dernière valeur 6,2 °C.");
  });

  it("reads no history while its card is not visible", async () => {
    const messages: unknown[] = [];
    const { hass, central } = outdoorHome("sensor.outdoor_hidden", (message) => messages.push(message));
    const element = await render(IDS.outdoor, hass, central);
    expect(messages).toEqual([]);
    expect(deepFindAll(element, "vtherm-time-chart")).toHaveLength(0);
  });

  it("shows the value and History unavailable instead of the curve when the history cannot be read", async () => {
    const { hass, central } = outdoorHome("sensor.outdoor_broken", () => {
      throw new Error("recorder down");
    });
    hass.setState("sensor.outdoor_broken", "6.2", { unit_of_measurement: "°C" });
    const element = await render(IDS.outdoor, hass, central, "fr", true);
    const text = textOf(element);
    expect(text).toContain("6,2 °C");
    expect(text).toContain("Historique indisponible");
    expect(deepFindAll(element, "vtherm-time-chart")).toHaveLength(0);
  });

  it("is hidden when the central configuration has no outdoor sensor, or its entity does not exist", () => {
    const hass = homeHass();
    expect(shown(hass, addCentral(hass))).not.toContain(IDS.outdoor);
    expect(shown(hass, { entryId: "entry_central", values: { external_temperature_sensor_entity_id: "sensor.missing" } })).not.toContain(IDS.outdoor);
  });
});

describe("the widget Central boiler", () => {
  /** A home whose boiler is called by three thermostats, for a threshold of two devices. */
  function calledHome(): { hass: FakeHass; central: CentralContext } {
    const hass = homeHass();
    const central = addCentral(hass, { boiler: true });
    setBoiler(hass, { on: true });
    for (const id of ["salon", "kitchen", "office"]) {
      addThermostat(hass, id, { name: id[0]?.toUpperCase() + id.slice(1), action: "heating", specific: { device_actives: [`switch.${id}`] } });
    }
    hass.setState(CENTRAL.devices, "3", { active_device_ids: ["switch.salon", "switch.kitchen", "switch.office"] });
    return { hass, central };
  }

  it("shows the boiler on, three requesters on a gauge with the threshold 2, and their names with a link", async () => {
    const { hass, central } = calledHome();
    const element = await render(IDS.boiler, hass, central);
    expect(stateIcon(element, ".boiler")).toMatchObject({ icon: "mdi:water-boiler", label: "Boiler on" });
    expect(meterName(element)).toBe("3 on a range of 0 to 4, threshold 2");
    const links = deepFindAll<HTMLAnchorElement>(element, ".requesters a");
    expect(links.map((link) => link.textContent)).toEqual(["Salon", "Kitchen", "Office"]);
    expect(links[0]?.getAttribute("href")).toBe(thermostatPath(entryOf("salon")));
  });

  it("shows an equipment that no thermostat claims by its name, without a link", async () => {
    const { hass, central } = calledHome();
    hass.setState("switch.garage", "on", { friendly_name: "Garage heater" });
    hass.setState(CENTRAL.devices, "4", { active_device_ids: ["switch.salon", "switch.garage"] });
    const element = await render(IDS.boiler, hass, central);
    const items = deepFindAll(element, ".requesters li");
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Salon", "Garage heater"]);
    expect(deepFindAll(items[1] as HTMLElement, "a")).toHaveLength(0);
  });

  it("names the thermostat used by the boiler when another one, not used by it, shares the same equipment", async () => {
    const hass = homeHass();
    const central = addCentral(hass, { boiler: true });
    // Both thermostats drive the same switch; only the second one is used by the boiler.
    addThermostat(hass, "bedroom", { name: "Bedroom", state: "off", specific: { device_actives: ["switch.shared"] }, attributes: { configuration: { is_used_by_central_boiler: false } } });
    addThermostat(hass, "study", { name: "Study", action: "heating", specific: { device_actives: ["switch.shared"] }, attributes: { configuration: { is_used_by_central_boiler: true } } });
    hass.setState(CENTRAL.devices, "1", { active_device_ids: ["switch.shared"] });
    const links = deepFindAll<HTMLAnchorElement>(await render(IDS.boiler, hass, central), ".requesters a");
    expect(links.map((link) => link.textContent)).toEqual(["Study"]);
    expect(links[0]?.getAttribute("href")).toBe(thermostatPath(entryOf("study")));
  });

  it("shows an hourglass and the delay while the activation is scheduled", async () => {
    const { hass, central } = calledHome();
    setBoiler(hass, { on: false, scheduled: true, delaySec: 30 });
    expect(stateIcon(await render(IDS.boiler, hass, central, "fr"), ".scheduled")).toMatchObject({ icon: "mdi:timer-sand", label: "Activation dans 30 s" });
  });

  it("shows an alert when the boiler is not ready", async () => {
    const { hass, central } = calledHome();
    setBoiler(hass, { ready: false });
    const element = await render(IDS.boiler, hass, central, "fr");
    expect(stateIcon(element, ".not-ready")).toMatchObject({ label: "Chaudière non prête" });
    // Without the manager, the threshold comes from its `number` entity.
    expect(meterName(element)).toBe("3 sur une plage de 0 à 4, seuil 2");
  });

  it("shows no alert while the boiler is ready", async () => {
    const { hass, central } = calledHome();
    expect(stateIcon(await render(IDS.boiler, hass, central), ".not-ready")).toBeUndefined();
  });

  it("is hidden when the central boiler is off in the central configuration", () => {
    const hass = homeHass();
    expect(shown(hass, addCentral(hass))).not.toContain(IDS.boiler);
  });

  it("is hidden, with the power asked of the boiler, when the boiler was turned off and its entities stay unavailable", () => {
    const hass = homeHass();
    const central = addCentral(hass, { boiler: true });
    hass.setState(CENTRAL.boiler, "unavailable", {});
    hass.setState(CENTRAL.power, "unavailable", {});
    const off = { ...central, values: { ...central.values, use_central_boiler_feature: false } };
    expect(shown(hass, off)).not.toContain(IDS.boiler);
    expect(shown(hass, off)).not.toContain(IDS.boilerPower);
    expect(shown(hass, central)).toEqual(expect.arrayContaining([IDS.boiler, IDS.boilerPower]));
  });
});

describe("the widget Power asked of the boiler", () => {
  it("shows the power on a gauge with the threshold of power as its marker", async () => {
    const hass = homeHass();
    const central = addCentral(hass, { boiler: true });
    hass.setState(CENTRAL.power, "1800", { unit_of_measurement: "W" });
    hass.setWebSocketHandler(() => ({}));
    const element = await render(IDS.boilerPower, hass, central, "fr");
    const gauge = textOf(deepFindAll(element, "vtherm-gauge")[0] as HTMLElement);
    expect(gauge).toContain("1 800 W");
    expect(gauge).toContain("seuil 1 000 W");
  });

  it("shows the value, the marker and the curve in kW when the sensor is in kW", async () => {
    const now = Date.now() / 1000;
    const hass = homeHass();
    const central = addCentral(hass, { boiler: true });
    hass.setState(CENTRAL.power, "1.8", { unit_of_measurement: "kW" });
    hass.setState(CENTRAL.powerThreshold, "1.5", { unit_of_measurement: "kW" });
    hass.setWebSocketHandler(() => ({ [CENTRAL.power]: [{ s: "0.5", lu: now - 3600 }, { s: "1.8", lu: now - 60 }] }));
    const element = await render(IDS.boilerPower, hass, central, "en", true);
    const gauge = textOf(deepFindAll(element, "vtherm-gauge")[0] as HTMLElement);
    expect(gauge).toContain("1.8 kW");
    expect(gauge).toContain("threshold 1.5 kW");
    const chart = deepFindAll<HTMLElement & { series: readonly { format: (value: number) => string }[]; rules: readonly { value: number; label: string }[] }>(element, "vtherm-time-chart")[0];
    expect(chart?.series[0]?.format(1.8)).toBe("1.8 kW");
    expect(chart?.rules).toMatchObject([{ value: 1.5, label: "threshold 1.5 kW" }]);
  });

  it("is hidden when its sensor does not exist", () => {
    const hass = homeHass();
    expect(shown(hass, addCentral(hass))).not.toContain(IDS.boilerPower);
  });
});

describe("the widget Power of the home", () => {
  it("shows the power against the maximum and the margin that the dashboard computes", async () => {
    const { hass, central } = fullHome("fr");
    const element = await render(IDS.housePower, hass, central, "fr");
    expect(textOf(deepFindAll(element, "vtherm-gauge")[0] as HTMLElement)).toContain("4,1 / 6 kW");
    expect(stateIcon(element, ".margin")).toMatchObject({ label: "Marge : 1,9 kW", tooltip: "Calculé par le tableau de bord" });
    expect(stateIcon(element, ".energy")?.label).toBe("Énergie des thermostats : 16 kWh");
  });

  it("omits the total energy when the counters have different units, and shows the rest", async () => {
    const { hass, central } = fullHome();
    hass.setState("sensor.kitchen_energy", "3500", { unit_of_measurement: "Wh" });
    const element = await render(IDS.housePower, hass, central);
    expect(stateIcon(element, ".energy")).toBeUndefined();
    expect(stateIcon(element, ".margin")?.label).toBe("Margin: 1.9 kW");
  });

  it("shows the gauge in the color of a warning and the overrun when the power goes above the maximum", async () => {
    const { hass, central } = fullHome("fr");
    const attributes = hass.states[climateOf("salon")]?.attributes ?? {};
    hass.setState(climateOf("salon"), "heat", { ...attributes, power_manager: { current_power: 6.4, current_max_power: 6, power_sensor_entity_id: CENTRAL.housePower } });
    const element = await render(IDS.housePower, hass, central, "fr");
    expect((deepFindAll(element, "vtherm-gauge")[0] as HTMLElement & { tone: string }).tone).toBe("warning");
    expect(deepFindAll(element, ".gauge.warning")).toHaveLength(1);
    expect(stateIcon(element, ".margin")?.label).toBe("Dépassement de 0,4 kW");
  });

  it("takes the unit of the central configuration before the unit of the power sensor", async () => {
    const { hass } = fullHome();
    const attributes = hass.states[climateOf("salon")]?.attributes ?? {};
    hass.setState(climateOf("salon"), "heat", { ...attributes, power_manager: { current_power: 4100, current_max_power: 6000, power_sensor_entity_id: CENTRAL.housePower } });
    const element = await render(IDS.housePower, hass, { entryId: "entry_central", values: { power_unit: "w" } });
    expect(textOf(deepFindAll(element, "vtherm-gauge")[0] as HTMLElement)).toContain("4,100 / 6,000 W");
  });

  it("is hidden when no thermostat publishes the power of the home", () => {
    const hass = homeHass();
    addThermostat(hass, "salon");
    expect(shown(hass)).not.toContain(IDS.housePower);
  });
});

describe("the widget Presence", () => {
  /** A home whose presence sensor has a state. */
  function presenceHome(state: string): { hass: FakeHass; central: CentralContext } {
    const hass = homeHass();
    hass.setState(CENTRAL.presence, state, { friendly_name: "Home presence" });
    return { hass, central: addCentral(hass, { values: { presence_sensor_entity_id: CENTRAL.presence } }) };
  }

  it("shows Present with the icon of the presence when the sensor is on", async () => {
    const { hass, central } = presenceHome("on");
    const element = await render(IDS.presence, hass, central, "fr");
    expect(stateIcon(element, ".presence")).toMatchObject({ icon: "mdi:home-account", label: "Présent", tooltip: "Home presence" });
    expect(deepFindAll(element, "button, ha-button, ha-switch")).toHaveLength(0);
  });

  it("reads home and not_home as Versatile Thermostat does", async () => {
    expect(stateIcon(await render(IDS.presence, presenceHome("home").hass, presenceHome("home").central), ".presence")?.label).toBe("Present");
    const absent = presenceHome("not_home");
    expect(stateIcon(await render(IDS.presence, absent.hass, absent.central, "fr"), ".presence")).toMatchObject({ icon: "mdi:nature-people", label: "Absent" });
  });

  it("shows Unknown, not Absent, when the sensor is unknown", async () => {
    const { hass, central } = presenceHome("unknown");
    expect(stateIcon(await render(IDS.presence, hass, central, "fr"), ".presence")?.label).toBe("Inconnu");
  });

  it("is hidden when the central configuration has no presence sensor", () => {
    const hass = homeHass();
    expect(shown(hass, addCentral(hass))).not.toContain(IDS.presence);
  });
});

describe("the global widgets in German and in the dark theme", () => {
  it("draw their titles, the central modes and their texts in German", async () => {
    const titles: string[] = [];
    for (const id of ORDER) {
      const { hass, central } = fullHome("de");
      hass.setWebSocketHandler(() => ({}));
      const element = await render(id, hass, central, "de");
      titles.push(deepFindAll(element, "h3")[0]?.textContent ?? "");
    }
    expect(titles).toEqual(["Zentraler Modus", "Anwesenheit", "Thermostate", "Zentraler Heizkessel", "Vom Heizkessel angeforderte Leistung", "Leistung des Hauses", "Außentemperatur"]);
    const hass = homeHass();
    const central = addCentral(hass, { mode: "Frost protection" });
    expect(stateIcon(await render(IDS.centralMode, hass, central, "de"), ".central-mode")?.label).toBe("Frostschutz");
    const { hass: home, central: homeCentral } = fullHome("de");
    const summary = textOf(await render(IDS.summary, home, homeCentral, "de"));
    expect(summary).toContain("Heizen 1");
    expect(summary).toContain("Keine Warnung");
    expect(stateIcon(await render(IDS.presence, home, homeCentral, "de"), ".presence")?.label).toBe("Anwesend");
  });

  it("color the bar of the summary, the gauges and the curves with the variables of the theme", async () => {
    const { VThermBar, VThermGauge } = await import("../src/components/overview/index.ts");
    const { VThermTimeChart } = await import("../src/components/time-chart.ts");
    for (const element of [VThermBar, VThermGauge, VThermTimeChart]) {
      const css = [(element as unknown as { styles: unknown }).styles]
        .flat(3)
        .map((style) => (style as { cssText?: string }).cssText ?? "")
        .join("\n");
      expect(css, element.name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/);
      expect(css, element.name).toMatch(/var\(--(primary|divider|warning)-color\)/);
    }
  });
});
