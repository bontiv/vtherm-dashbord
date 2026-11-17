// @vitest-environment happy-dom
/**
 * The configuration in the panel, with the native plugins: the draft and its save bar, the confirmation when leaving, the read-only
 * configurations, and the assistant of creation.
 */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { cleanup, find, findAll, mountPanel, settle } from "./support/dashboard-harness.ts";
import type { FakeConfigs, MountOptions } from "./support/dashboard-harness.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

let natives: { definition: UiPluginDefinition }[];

beforeAll(async () => {
  const { definitions } = await nativeHost();
  natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Answer the confirmation of the browser, which happy-dom does not have. */
const stubConfirm = (answer: boolean) => {
  const confirm = vi.fn(() => answer);
  vi.stubGlobal("confirm", confirm);
  return confirm;
};

const THERMOSTATS = CORE_TOP_TABS.thermostats;
const CONFIGURATION = CORE_TOP_TABS.configuration;

const switchValues = (name: string) => ({
  thermostat_type: "thermostat_over_switch",
  name,
  temperature_sensor_entity_id: "sensor.indoor",
  cycle_min: 5,
  underlying_entity_ids: ["switch.heater"],
  proportional_function: "tpi",
  use_main_central_config: false,
});

const salonAndChambre = (): FakeConfigs => ({
  "climate.salon": { name: "Salon", type: "over_switch", values: switchValues("Salon") },
  "climate.chambre": { name: "Chambre", type: "over_switch", values: switchValues("Chambre") },
});

const mount = (options: MountOptions) => mountPanel({ plugins: natives, realThermostats: true, ...options });
const root = (panel: HTMLElement) => panel.shadowRoot as ShadowRoot;
/** The element of a native tab, with the properties that the panel gives it. */
type NativeTab = HTMLElement & { values: Record<string, unknown>; proposeChanges: (changes: Record<string, unknown>) => void };
const nativeTab = (panel: HTMLElement, tag: string) => find<NativeTab>(root(panel), tag) as NativeTab;
const saveBar = (panel: HTMLElement) => find(root(panel), ".savebar");
const calls = (hass: { callWS: ReturnType<typeof vi.fn> }, type: string) => hass.callWS.mock.calls.map(([message]) => message as Record<string, unknown>).filter((message) => message["type"] === type);
/** Open a link of the menu, by its text. */
async function openMenu(panel: HTMLElement, text: string): Promise<void> {
  const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
  const link = findAll<HTMLAnchorElement>(menu.shadowRoot as ShadowRoot, "a").find((anchor) => anchor.textContent?.trim() === text);
  if (link === undefined) {
    throw new Error(`No link ${text} in the menu`);
  }
  link.click();
  await settle(panel as never);
}

describe("the draft of a thermostat", () => {
  it("shows the save bar after a change, and saves the change in the step of the flow", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    expect(saveBar(panel)).toBeNull();
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    expect(saveBar(panel)?.textContent).toContain("Unsaved changes");
    find<HTMLButtonElement>(root(panel), ".savebar .save")?.click();
    await vi.waitFor(() => expect(saveBar(panel)?.textContent).toContain("Saved."));
    expect(calls(hass, "vtherm_dashboard/save_config")).toEqual([{ type: "vtherm_dashboard/save_config", entry_id: "climate.salon", changes: { main: { name: "Living room" } }, presets: {} }]);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Living room");
  });

  it("goes back to the saved values when the user discards the draft", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    find<HTMLButtonElement>(root(panel), ".savebar .discard")?.click();
    await settle(panel);
    expect(saveBar(panel)).toBeNull();
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Salon");
    expect(calls(hass, "vtherm_dashboard/save_config")).toEqual([]);
  });

  it("keeps the draft from a section to another of the same thermostat, without asking", async () => {
    const confirm = stubConfirm(true);
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    await openMenu(panel, "TPI parameters");
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/climate.salon/core_tpi.tab.main`);
    expect(saveBar(panel)?.textContent).toContain("Unsaved changes");
    await openMenu(panel, "Main attributes");
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Living room");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks before leaving a thermostat with changes, and stays when the user refuses", async () => {
    const confirm = stubConfirm(false);
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    const select = find<HTMLSelectElement>(find(root(panel), "vtherm-side-menu")?.shadowRoot as ShadowRoot, "select") as HTMLSelectElement;
    select.value = "climate.chambre";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle(panel);
    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Leave and lose them?");
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/climate.salon/core.tab.main`);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Living room");
  });

  it("drops the draft when the user leaves after confirming, and keeps the section open on the other thermostat", async () => {
    stubConfirm(true);
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    const select = find<HTMLSelectElement>(find(root(panel), "vtherm-side-menu")?.shadowRoot as ShadowRoot, "select") as HTMLSelectElement;
    select.value = "climate.chambre";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle(panel);
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/climate.chambre/core.tab.main`);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Chambre");
    select.value = "climate.salon";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle(panel);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Salon");
  });

  it("asks the browser before closing the page while a draft has changes", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe("a configuration made by a newer Versatile Thermostat", () => {
  it("is shown read-only, without save bar", async () => {
    const configs = salonAndChambre();
    (configs["climate.salon"] as { read_only?: boolean }).read_only = true;
    const { panel } = await mount({ configs, path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    expect(find(root(panel), ".readonly")?.textContent).toContain("read-only");
    expect(find(root(panel), "vtherm-contribution")?.hasAttribute("inert")).toBe(true);
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    expect(saveBar(panel)).toBeNull();
  });
});

describe("the assistant of creation", () => {
  /** The elements of the tabs of the assistant. */
  const wizardTabs = (panel: HTMLElement) => {
    const wizard = find(root(panel), "vtherm-create-wizard") as HTMLElement & { updateComplete: Promise<boolean> };
    return { wizard, shadow: wizard.shadowRoot as ShadowRoot };
  };
  const createButton = (panel: HTMLElement) => find<HTMLButtonElement>(wizardTabs(panel).shadow, "button.primary") as HTMLButtonElement;

  it("opens from the list of the thermostats", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}` });
    const list = find(root(panel), "vtherm-thermostat-list") as HTMLElement;
    find<HTMLAnchorElement>(list.shadowRoot as ShadowRoot, "a.create")?.click();
    await settle(panel);
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/new`);
    expect(find(wizardTabs(panel).shadow, "h1")?.textContent).toBe("New thermostat");
    expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["Thermostats", "New thermostat"]);
  });

  it("offers the three types, and refuses to create while required fields are missing", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/new` });
    const { shadow } = wizardTabs(panel);
    expect(findAll<HTMLInputElement>(shadow, 'input[type="radio"]').map((input) => input.value)).toEqual(["thermostat_over_switch", "thermostat_over_climate", "thermostat_over_valve"]);
    expect(find(shadow, ".missing")?.textContent).toContain("Still missing");
    expect(createButton(panel).disabled).toBe(true);
  });

  it("creates a thermostat of each type with the flow, then opens it", async () => {
    const fields: Record<string, Record<string, unknown>> = {
      thermostat_over_switch: { name: "Bureau", temperature_sensor_entity_id: "sensor.office", external_temperature_sensor_entity_id: "sensor.outdoor", underlying_entity_ids: ["switch.office"] },
      thermostat_over_climate: { name: "Bureau", temperature_sensor_entity_id: "sensor.office", external_temperature_sensor_entity_id: "sensor.outdoor", underlying_entity_ids: ["climate.office"] },
      thermostat_over_valve: { name: "Bureau", temperature_sensor_entity_id: "sensor.office", external_temperature_sensor_entity_id: "sensor.outdoor", underlying_entity_ids: ["number.office"] },
    };
    // The TPI and advanced tabs are sent with the values that Versatile Thermostat proposes; TPI only when the type uses it.
    const tabs: Record<string, string[]> = {
      thermostat_over_switch: ["advanced", "main", "tpi", "type"],
      thermostat_over_climate: ["advanced", "main", "type"],
      thermostat_over_valve: ["advanced", "main", "tpi", "type"],
    };
    for (const [type, values] of Object.entries(fields)) {
      const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/new` });
      const { wizard, shadow } = wizardTabs(panel);
      find<HTMLInputElement>(shadow, `input[value="${type}"]`)?.dispatchEvent(new Event("change"));
      await wizard.updateComplete;
      for (const tab of ["vtherm-native-main-thermostat", "vtherm-native-type-thermostat"]) {
        find<NativeTab>(shadow, tab)?.proposeChanges(values);
      }
      await wizard.updateComplete;
      expect(find(shadow, ".missing"), `${type}: ${find(shadow, ".missing")?.textContent}`).toBeNull();
      createButton(panel).click();
      await vi.waitFor(() => expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/created_1`));
      await settle(panel);
      const [message] = calls(hass, "vtherm_dashboard/create_config");
      expect(message?.["thermostat_type"]).toBe(type);
      expect(message?.["changes"]).toMatchObject({ main: { name: "Bureau", use_main_central_config: false } });
      expect(Object.keys(message?.["changes"] as object).sort(), type).toEqual(tabs[type]);
      expect(find(root(panel), "core-thermostat-overview-page")).not.toBeNull();
      cleanup();
    }
  });

  it("shows why the flow refused the creation, and stays on the assistant", async () => {
    const { panel } = await mount({
      configs: salonAndChambre(),
      path: `/vtherm/${THERMOSTATS}/new`,
      server: { createErrors: [{ tab: null, field: null, code: "unknown_entity" }] },
    });
    const { wizard, shadow } = wizardTabs(panel);
    for (const tab of ["vtherm-native-main-thermostat", "vtherm-native-type-thermostat"]) {
      find<NativeTab>(shadow, tab)?.proposeChanges({ name: "Bureau", temperature_sensor_entity_id: "sensor.office", external_temperature_sensor_entity_id: "sensor.outdoor", underlying_entity_ids: ["switch.office"] });
    }
    await wizard.updateComplete;
    createButton(panel).click();
    await vi.waitFor(() => expect(find(shadow, ".error")).not.toBeNull());
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/new`);
  });
});

describe("the central configuration", () => {
  it("shows its sections at once when it exists, without waiting for the user to open one", async () => {
    const configs: FakeConfigs = { ...salonAndChambre(), central: { name: "Central", type: "central", values: { thermostat_type: "thermostat_central_config" } } };
    // A page that is not a section: nothing opens the central configuration, so the panel must read it by itself.
    const { panel } = await mount({ configs, path: `/vtherm/${CONFIGURATION}/core.page.plugins` });
    await vi.waitFor(() => {
      const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
      expect(texts(findAll(menu.shadowRoot as ShadowRoot, "a"))).toContain("TPI parameters");
    });
    expect(texts(findAll((find(root(panel), "vtherm-side-menu") as HTMLElement).shadowRoot as ShadowRoot, "a"))).not.toContain("Central configuration");
  });

  it("offers to create it when it is absent, then shows its sections once created", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${CONFIGURATION}` });
    const page = find(root(panel), "core-create-central-page") as HTMLElement;
    expect(page).not.toBeNull();
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(texts(findAll(menu.shadowRoot as ShadowRoot, "a")).filter((text) => text === "TPI parameters")).toEqual([]);
    find<HTMLButtonElement>(page.shadowRoot as ShadowRoot, "button")?.click();
    await settle(panel);
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/new/central`);
    const wizard = find(root(panel), "vtherm-create-wizard") as HTMLElement & { updateComplete: Promise<boolean> };
    find<NativeTab>(wizard.shadowRoot as ShadowRoot, "vtherm-native-main-central")?.proposeChanges({ external_temperature_sensor_entity_id: "sensor.outdoor" });
    await wizard.updateComplete;
    expect(find(wizard.shadowRoot as ShadowRoot, ".missing")?.textContent ?? null).toBeNull();
    find<HTMLButtonElement>(wizard.shadowRoot as ShadowRoot, "button.primary")?.click();
    await vi.waitFor(() => expect(window.location.pathname).toBe(`/vtherm/${CONFIGURATION}`));
    await settle(panel);
    const [message] = calls(hass, "vtherm_dashboard/create_config");
    expect(message?.["thermostat_type"]).toBe("thermostat_central_config");
    expect(Object.keys(message?.["changes"] as object)).toEqual(expect.arrayContaining(["main", "tpi", "advanced"]));
    await vi.waitFor(() => expect(find(root(panel), "core-create-central-page")).toBeNull());
    const after = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(texts(findAll(after.shadowRoot as ShadowRoot, "a"))).toContain("TPI parameters");
  });
});

const texts = (nodes: readonly HTMLElement[]) => nodes.map((node) => node.textContent?.trim());
