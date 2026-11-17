// @vitest-environment happy-dom
/**
 * The configuration in the panel, with the native plugins: the draft and its save actions, the confirmation when leaving, the read-only
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
/** The save actions at the foot of the card of the section that is shown, or null when there are none. */
const actions = (panel: HTMLElement) => find<HTMLElement & { updateComplete: Promise<boolean> }>(root(panel), "vtherm-card-actions");
/** The text of the save actions: their messages and the labels of their buttons. */
const actionsText = (panel: HTMLElement) => actions(panel)?.shadowRoot?.textContent ?? "";
const actionButton = (panel: HTMLElement, name: "save" | "discard") => find<HTMLButtonElement>(actions(panel)?.shadowRoot as ShadowRoot, `button.${name}`) as HTMLButtonElement;
/** Wait until the save actions drew the last state of the draft. */
const drawn = async (panel: HTMLElement) => {
  await settle(panel as never);
  await actions(panel)?.updateComplete;
};
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
  it("shows the actions at the foot of the card of the section, off until a change, and saves the change in the step of the flow", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    await drawn(panel);
    expect(find(root(panel), ".savebar")).toBeNull();
    expect(actions(panel)?.getRootNode()).toBe(nativeTab(panel, "vtherm-native-main-thermostat").shadowRoot);
    expect([actionButton(panel, "discard").disabled, actionButton(panel, "save").disabled]).toEqual([true, true]);
    expect(actionsText(panel)).not.toContain("Unsaved changes");
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await drawn(panel);
    expect(actionsText(panel)).toContain("Unsaved changes");
    expect([actionButton(panel, "discard").disabled, actionButton(panel, "save").disabled]).toEqual([false, false]);
    actionButton(panel, "save").click();
    // Without the progress button of Home Assistant, the result is a text above the actions.
    await vi.waitFor(() => expect(actionsText(panel)).toContain("Saved."));
    expect(actionsText(panel)).not.toContain("Unsaved changes");
    expect(calls(hass, "vtherm_dashboard/save_config")).toEqual([{ type: "vtherm_dashboard/save_config", entry_id: "climate.salon", changes: { main: { name: "Living room" } }, presets: {} }]);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Living room");
  });

  it("goes back to the saved values when the user discards the draft", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await drawn(panel);
    actionButton(panel, "discard").click();
    await drawn(panel);
    expect(actionsText(panel)).not.toContain("Unsaved changes");
    expect(actionButton(panel, "save").disabled).toBe(true);
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
    await drawn(panel);
    expect(actionsText(panel)).toContain("Unsaved changes");
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

describe("the save actions", () => {
  const MAIN = `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main`;
  /** A server that answers the saves with `answer`, or fails when it throws. */
  const saving = (answer: () => unknown) => async (message: Record<string, unknown>) => (message["type"] === "vtherm_dashboard/save_config" ? answer() : undefined);

  it("saves the changes of every section of the configuration, from any of them", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: MAIN });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await openMenu(panel, "TPI parameters");
    nativeTab(panel, "vtherm-native-tpi-thermostat").proposeChanges({ tpi_coef_int: 0.7 });
    await openMenu(panel, "Main attributes");
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(calls(hass, "vtherm_dashboard/save_config")).toHaveLength(1));
    expect(calls(hass, "vtherm_dashboard/save_config")[0]?.["changes"]).toEqual({ main: { name: "Living room" }, tpi: { tpi_coef_int: 0.7 } });
  });

  it("discards the changes of every section, without asking", async () => {
    const confirm = stubConfirm(true);
    const { panel } = await mount({ configs: salonAndChambre(), path: MAIN });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await openMenu(panel, "TPI parameters");
    nativeTab(panel, "vtherm-native-tpi-thermostat").proposeChanges({ tpi_coef_int: 0.7 });
    await drawn(panel);
    actionButton(panel, "discard").click();
    await drawn(panel);
    expect(nativeTab(panel, "vtherm-native-tpi-thermostat").values["tpi_coef_int"]).toBeUndefined();
    expect([actionButton(panel, "discard").disabled, actionButton(panel, "save").disabled]).toEqual([true, true]);
    await openMenu(panel, "Main attributes");
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Salon");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("keeps the draft and shows an error above the actions when Home Assistant does not answer", async () => {
    const { panel } = await mount({
      configs: salonAndChambre(),
      path: MAIN,
      handlers: [
        saving(() => {
          throw new Error("Connection lost");
        }),
      ],
    });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(actionsText(panel)).toContain("The configuration could not be saved: Connection lost"));
    expect(actionsText(panel)).toContain("Not saved.");
    expect(actionsText(panel)).toContain("Unsaved changes");
    expect(actionButton(panel, "save").disabled).toBe(false);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Living room");
  });

  it("shows a general error of a refused save above the actions, translated", async () => {
    const refused = { ok: false, config_saved: false, entry_id: "climate.salon", errors: [{ tab: null, field: "base", code: "configuration_not_complete" }], preset_errors: [] };
    const { panel } = await mount({ configs: salonAndChambre(), path: MAIN, handlers: [saving(() => refused)] });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(actionsText(panel)).toContain("The configuration is not complete"));
    expect(actionsText(panel)).toContain("Unsaved changes");
  });

  it("tells that the configuration is saved but not every temperature, as a failure", async () => {
    const partial = { ok: false, config_saved: true, entry_id: "climate.salon", errors: [], preset_errors: [{ tab: "presets", field: "eco", code: "invalid_value" }] };
    const { panel } = await mount({ configs: salonAndChambre(), path: MAIN, handlers: [saving(() => partial)] });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(actionsText(panel)).toContain("The configuration is saved, but some temperatures could not be applied."));
    expect(actionsText(panel)).toContain("Not saved.");
  });

  it("draws a card of actions under a configuration component of a plugin that does not draw them", async () => {
    const definition: UiPluginDefinition = {
      id: "smartpi",
      translations: natives[0]!.definition.translations,
      contributions: { thermostat_config: [{ id: "smartpi.tab.main", title: "title.main", component: "smartpi-config-tab" }] },
    };
    const { panel } = await mountPanel({ plugins: [...natives, { definition }], realThermostats: true, configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/smartpi.tab.main` });
    await drawn(panel);
    const card = find(root(panel), ".actions-card");
    expect(card).not.toBeNull();
    expect(card?.parentNode).toBe(root(panel).querySelector("main"));
    expect(actionButton(panel, "save")).not.toBeNull();
  });

  it("draws no card of actions under a native section, nor under the overview of a thermostat", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: MAIN });
    await drawn(panel);
    expect(find(root(panel), ".actions-card")).toBeNull();
    await openMenu(panel, "Overview");
    expect(find(root(panel), ".actions-card")).toBeNull();
    expect(actions(panel)).toBeNull();
  });
});

describe("a configuration made by a newer Versatile Thermostat", () => {
  it("is shown read-only, without save actions", async () => {
    const configs = salonAndChambre();
    (configs["climate.salon"] as { read_only?: boolean }).read_only = true;
    const { panel } = await mount({ configs, path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    expect(find(root(panel), ".readonly")?.textContent).toContain("read-only");
    expect(find(root(panel), "vtherm-contribution")?.hasAttribute("inert")).toBe(true);
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await settle(panel);
    expect(actions(panel)).toBeNull();
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
