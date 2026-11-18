// @vitest-environment happy-dom
/**
 * The configuration in the panel, with the native plugins: the draft and its save actions, the confirmation when leaving, the read-only
 * configurations, and the creation as a page of configuration.
 */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { cleanup, find, findAll, linkTitle, mountPanel, settle } from "./support/dashboard-harness.ts";
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
  const link = findAll<HTMLAnchorElement>(menu.shadowRoot as ShadowRoot, "a").find((anchor) => linkTitle(anchor) === text);
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

  it("asks before following the link to the central configuration with changes, and stays when the user refuses", async () => {
    const confirm = stubConfirm(false);
    const central = { thermostat_type: "thermostat_central_config", external_temperature_sensor_entity_id: "sensor.outdoor", temp_min: 7, temp_max: 35, step_temperature: 0.1 };
    const configs: FakeConfigs = {
      "climate.salon": { name: "Salon", type: "over_switch", values: { ...switchValues("Salon"), use_main_central_config: true } },
      central: { name: "Central", type: "central", values: central },
    };
    const { panel } = await mount({ configs, path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    const tab = nativeTab(panel, "vtherm-native-main-thermostat");
    tab.proposeChanges({ name: "Living room" });
    await drawn(panel);
    const link = await vi.waitFor(() => find<HTMLAnchorElement>(tab.shadowRoot as ShadowRoot, "a.central-link") as HTMLAnchorElement);
    expect(link.getAttribute("href")).toBe(`/vtherm/${CONFIGURATION}/core.general.main`);
    link.click();
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

describe("the creation of a thermostat", () => {
  const NEW = `/vtherm/${THERMOSTATS}/new`;
  const REQUIRED = { name: "Bureau", temperature_sensor_entity_id: "sensor.office", external_temperature_sensor_entity_id: "sensor.outdoor" };
  const menuTexts = (panel: HTMLElement) => findAll((find(root(panel), "vtherm-side-menu") as HTMLElement).shadowRoot as ShadowRoot, "a").map(linkTitle);
  const cancelButton = (panel: HTMLElement) => find<HTMLButtonElement>(actions(panel)?.shadowRoot as ShadowRoot, "button.cancel") as HTMLButtonElement;
  const choice = (panel: HTMLElement) => find(root(panel), "vtherm-type-choice") as unknown as HTMLElement & { value: string; select(type: string): void };
  /** Choose the type on the screen of the choice, which goes on to the page of configuration. */
  async function chooseType(panel: HTMLElement, type: string): Promise<void> {
    choice(panel).select(type);
    await drawn(panel);
  }
  /** Fill the required fields of every section of a creation, going through the type then the menu as a user does. */
  async function fill(panel: HTMLElement, type: string, underlying: string): Promise<void> {
    if (find(root(panel), "vtherm-type-choice") === null) {
      findAll<HTMLAnchorElement>(find(root(panel), "vtherm-breadcrumb")?.shadowRoot as ShadowRoot, "a").find((link) => link.textContent?.trim() === "New thermostat")?.click();
      await drawn(panel);
    }
    await chooseType(panel, type);
    await openMenu(panel, "Underlyings");
    nativeTab(panel, "vtherm-native-type-thermostat").proposeChanges({ underlying_entity_ids: [underlying] });
    await openMenu(panel, "Main attributes");
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges(REQUIRED);
    await drawn(panel);
  }

  it("opens from the list of the thermostats on a page of configuration with the sections of the creation", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}` });
    find<HTMLAnchorElement>(find(root(panel), "vtherm-thermostat-list")?.shadowRoot as ShadowRoot, "a.tile.new")?.click();
    await settle(panel);
    expect(window.location.pathname).toBe(NEW);
    // The type is chosen first, without menu.
    expect(choice(panel)).not.toBeNull();
    expect(find(root(panel), "vtherm-side-menu")).toBeNull();
    expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["Thermostats", "New thermostat"]);
    choice(panel).select("thermostat_over_switch");
    await drawn(panel);
    expect(window.location.pathname).toBe(`${NEW}/core.tab.main`);
    expect(menuTexts(panel)).toEqual(["Main attributes", "Underlyings", "TPI parameters", "Advanced parameters"]);
    expect(find(find(root(panel), "vtherm-side-menu")?.shadowRoot as ShadowRoot, "select")).toBeNull();
    expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["Thermostats", "New thermostat", "Main attributes"]);
    expect(find(root(panel), "vtherm-native-main-thermostat")).not.toBeNull();
  });

  it("opens the choice of the type at the address of the new thermostat, with no type selected by default", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: NEW });
    expect(choice(panel).value).toBe("");
    expect(find(root(panel), "vtherm-native-main-thermostat")).toBeNull();
  });

  it("selects the card of the type that was chosen on the way back, and no card for a new creation", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: NEW });
    await chooseType(panel, "thermostat_over_valve");
    findAll<HTMLAnchorElement>(find(root(panel), "vtherm-breadcrumb")?.shadowRoot as ShadowRoot, "a").find((link) => link.textContent?.trim() === "New thermostat")?.click();
    await settle(panel);
    expect(choice(panel).value).toBe("thermostat_over_valve");
    const pressed = () => findAll<HTMLElement>(choice(panel).shadowRoot as ShadowRoot, ".type-card").map((card) => card.getAttribute("aria-pressed"));
    await vi.waitFor(() => expect(pressed()).toEqual(["false", "false", "true"]));
    find<HTMLButtonElement>(choice(panel).shadowRoot as ShadowRoot, "button.cancel")?.click();
    await settle(panel);
    find<HTMLAnchorElement>(find(root(panel), "vtherm-thermostat-list")?.shadowRoot as ShadowRoot, "a.tile.new")?.click();
    await settle(panel);
    expect(choice(panel).value).toBe("");
    await vi.waitFor(() => expect(pressed()).toEqual(["false", "false", "false"]));
  });

  it("goes back to the choice of the type from the breadcrumb, keeping the draft, and changes the type", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `${NEW}/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Bureau" });
    await settle(panel);
    findAll<HTMLAnchorElement>(find(root(panel), "vtherm-breadcrumb")?.shadowRoot as ShadowRoot, "a").find((link) => link.textContent?.trim() === "New thermostat")?.click();
    await settle(panel);
    expect(window.location.pathname).toBe(NEW);
    expect(choice(panel).value).toBe("");
    await chooseType(panel, "thermostat_over_climate");
    expect(menuTexts(panel)).toEqual(["Main attributes", "Underlyings", "Advanced parameters"]);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values).toMatchObject({ thermostat_type: "thermostat_over_climate", name: "Bureau" });
  });

  it("gives the required fields that are empty to the section of the creation, and none once they are filled or when editing", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `${NEW}/core.tab.main` });
    const missing = () => (nativeTab(panel, "vtherm-native-main-thermostat") as unknown as { missing: string[] }).missing;
    expect(missing()).toEqual(["name", "temperature_sensor_entity_id", "external_temperature_sensor_entity_id"]);
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Bureau" });
    await drawn(panel);
    expect(missing()).toEqual(["temperature_sensor_entity_id", "external_temperature_sensor_entity_id"]);
  });

  it("gives no required field to show in red when editing a thermostat", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main` });
    expect((nativeTab(panel, "vtherm-native-main-thermostat") as unknown as { missing: string[] }).missing).toEqual([]);
  });

  it("opens the section of the address, with a new draft", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `${NEW}/core_advanced.tab.main` });
    expect(find(root(panel), "vtherm-native-advanced-thermostat")).not.toBeNull();
    expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["Thermostats", "New thermostat", "Advanced parameters"]);
  });

  it("shows no section of the features, of the presets or of a plugin, and no TPI for a thermostat over a climate", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: NEW });
    await chooseType(panel, "thermostat_over_climate");
    expect(menuTexts(panel)).toEqual(["Main attributes", "Underlyings", "Advanced parameters"]);
  });

  it("keeps the draft from a section to another, without asking", async () => {
    const confirm = stubConfirm(true);
    const { panel } = await mount({ configs: salonAndChambre(), path: `${NEW}/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Bureau" });
    await openMenu(panel, "TPI parameters");
    await openMenu(panel, "Main attributes");
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Bureau");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("keeps the values of the sections when the type changes, and drops the ones that the type does not accept", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: NEW });
    await chooseType(panel, "thermostat_over_switch");
    await openMenu(panel, "Underlyings");
    nativeTab(panel, "vtherm-native-type-thermostat").proposeChanges({ underlying_entity_ids: ["switch.office"] });
    await openMenu(panel, "Main attributes");
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Bureau" });
    findAll<HTMLAnchorElement>(find(root(panel), "vtherm-breadcrumb")?.shadowRoot as ShadowRoot, "a").find((link) => link.textContent?.trim() === "New thermostat")?.click();
    await settle(panel);
    await chooseType(panel, "thermostat_over_valve");
    await openMenu(panel, "Underlyings");
    expect(nativeTab(panel, "vtherm-native-type-thermostat").values).toMatchObject({ thermostat_type: "thermostat_over_valve", name: "Bureau" });
    expect(nativeTab(panel, "vtherm-native-type-thermostat").values["underlying_entity_ids"]).toBeUndefined();
  });

  it("asks before leaving a creation that has a value, and starts again from nothing once the user left", async () => {
    const confirm = stubConfirm(false);
    const { panel } = await mount({ configs: salonAndChambre(), path: `${NEW}/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Bureau" });
    await settle(panel);
    const toList = () => findAll<HTMLAnchorElement>(find(root(panel), "vtherm-breadcrumb")?.shadowRoot as ShadowRoot, "a").find((link) => link.textContent?.trim() === "Thermostats")?.click();
    toList();
    await settle(panel);
    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Leave and lose them?");
    expect(window.location.pathname).toBe(`${NEW}/core.tab.main`);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Bureau");
    stubConfirm(true);
    toList();
    await settle(panel);
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}`);
    find<HTMLAnchorElement>(find(root(panel), "vtherm-thermostat-list")?.shadowRoot as ShadowRoot, "a.tile.new")?.click();
    await settle(panel);
    choice(panel).select("thermostat_over_switch");
    await drawn(panel);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBeUndefined();
  });

  it("does not create while a required field is missing, and lists what is missing by section near Create", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `${NEW}/core.tab.main` });
    await drawn(panel);
    expect(actionButton(panel, "save").disabled).toBe(true);
    expect(actionsText(panel)).toContain("Create");
    expect(actionsText(panel)).not.toContain("Still missing");
    // The missing fields are a warning above the card, in the main part of the page, and name the sections.
    const alert = find(root(panel), "main > .missing") as HTMLElement;
    expect(alert.textContent).toContain("Still missing");
    expect(alert.textContent).toContain("Underlyings");
    expect(alert.textContent).toContain("Main attributes");
    expect(alert.getAttribute("alert-type") ?? "warning").toBe("warning");
    expect(find(root(panel), "main")?.firstElementChild).toBe(alert);
    expect(calls(hass, "vtherm_dashboard/create_config")).toEqual([]);
    await fill(panel, "thermostat_over_switch", "switch.office");
    expect(find(root(panel), ".missing")).toBeNull();
    expect(actionButton(panel, "save").disabled).toBe(false);
  });

  it("creates a thermostat of each type with the flow, then opens its overview", async () => {
    const underlying: Record<string, string> = { thermostat_over_switch: "switch.office", thermostat_over_climate: "climate.office", thermostat_over_valve: "number.office" };
    // The TPI and advanced sections are sent with the values that Versatile Thermostat proposes; TPI only when the type uses it.
    const tabs: Record<string, string[]> = {
      thermostat_over_switch: ["advanced", "main", "tpi", "type"],
      thermostat_over_climate: ["advanced", "main", "type"],
      thermostat_over_valve: ["advanced", "main", "tpi", "type"],
    };
    for (const [type, entity] of Object.entries(underlying)) {
      const { panel, hass } = await mount({ configs: salonAndChambre(), path: NEW });
      await fill(panel, type, entity);
      actionButton(panel, "save").click();
      await vi.waitFor(() => expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/created_1`));
      await settle(panel);
      const [message] = calls(hass, "vtherm_dashboard/create_config");
      expect(message?.["thermostat_type"]).toBe(type);
      expect(message?.["changes"]).toMatchObject({ main: { name: "Bureau", use_main_central_config: false }, type: { underlying_entity_ids: [entity] } });
      expect(Object.keys(message?.["changes"] as object).sort(), type).toEqual(tabs[type]);
      expect(find(root(panel), "core-thermostat-overview-page")).not.toBeNull();
      cleanup();
    }
  });

  it("sends the values that the user gave in the TPI and advanced sections", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: NEW });
    await fill(panel, "thermostat_over_switch", "switch.office");
    await openMenu(panel, "TPI parameters");
    nativeTab(panel, "vtherm-native-tpi-thermostat").proposeChanges({ use_tpi_central_config: false, tpi_coef_int: 0.7 });
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(calls(hass, "vtherm_dashboard/create_config")).toHaveLength(1));
    expect(calls(hass, "vtherm_dashboard/create_config")[0]?.["changes"]).toMatchObject({ tpi: { use_tpi_central_config: false, tpi_coef_int: 0.7 }, advanced: {} });
  });

  it("shows why the flow refused the creation, marks the draft, and stays on the creation", async () => {
    const { panel } = await mount({
      configs: salonAndChambre(),
      path: NEW,
      server: { createErrors: [{ tab: null, field: null, code: "unknown_entity" }, { tab: "main", field: "name", code: "unknown_entity" }] },
    });
    await fill(panel, "thermostat_over_switch", "switch.office");
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(actionsText(panel)).toContain("The configuration was not created."));
    expect(window.location.pathname).toBe(`${NEW}/core.tab.main`);
    expect(nativeTab(panel, "vtherm-native-main-thermostat").values["name"]).toBe("Bureau");
    expect((nativeTab(panel, "vtherm-native-main-thermostat") as unknown as { errors: Record<string, string> }).errors).toEqual({ name: "unknown_entity" });
    expect(actionsText(panel)).toContain("Not created.");
    expect(actionButton(panel, "save").disabled).toBe(false);
  });

  it("abandons the creation with Cancel, without asking, and goes back to the list", async () => {
    const confirm = stubConfirm(false);
    const { panel } = await mount({ configs: salonAndChambre(), path: `${NEW}/core.tab.main` });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Bureau" });
    await drawn(panel);
    cancelButton(panel).click();
    await settle(panel);
    expect(confirm).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}`);
    expect(find(root(panel), "vtherm-thermostat-list")).not.toBeNull();
  });
});

describe("the central configuration", () => {
  it("shows its sections at once when it exists, without waiting for the user to open one", async () => {
    const configs: FakeConfigs = { ...salonAndChambre(), central: { name: "Central", type: "central", values: { thermostat_type: "thermostat_central_config" } } };
    // A page that is not a section: nothing opens the central configuration, so the panel must read it by itself.
    const { panel } = await mount({ configs, path: `/vtherm/${CONFIGURATION}/core.page.plugins` });
    await vi.waitFor(() => {
      const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
      expect(findAll(menu.shadowRoot as ShadowRoot, "a").map(linkTitle)).toContain("TPI parameters");
    });
    expect(findAll((find(root(panel), "vtherm-side-menu") as HTMLElement).shadowRoot as ShadowRoot, "a").map(linkTitle)).not.toContain("Central configuration");
  });

  const menuTexts = (panel: HTMLElement) => findAll((find(root(panel), "vtherm-side-menu") as HTMLElement).shadowRoot as ShadowRoot, "a").map(linkTitle);

  it("offers to create it when it is absent, without any of its sections", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${CONFIGURATION}` });
    expect(find(root(panel), "core-create-central-page")).not.toBeNull();
    expect(menuTexts(panel)).not.toContain("TPI parameters");
    expect(menuTexts(panel)).not.toContain("Main attributes");
  });

  it("starts its creation in the Configuration tab with the main, TPI and advanced sections, and Create instead of Save", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${CONFIGURATION}` });
    find<HTMLButtonElement>((find(root(panel), "core-create-central-page") as HTMLElement).shadowRoot as ShadowRoot, "button")?.click();
    await drawn(panel);
    expect(window.location.pathname).toBe(`/vtherm/${CONFIGURATION}`);
    expect(find(root(panel), "core-create-central-page")).toBeNull();
    expect(menuTexts(panel)).toEqual(["Main attributes", "TPI parameters", "Advanced parameters"]);
    expect(actionsText(panel)).toContain("Create");
    expect(find(root(panel), "main > .missing")?.textContent).toContain("Still missing");
    expect(actionButton(panel, "save").disabled).toBe(true);
  });

  it("creates it with the three sections, then shows every section of the configuration", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: `/vtherm/${CONFIGURATION}` });
    find<HTMLButtonElement>((find(root(panel), "core-create-central-page") as HTMLElement).shadowRoot as ShadowRoot, "button")?.click();
    await settle(panel);
    find<NativeTab>(root(panel), "vtherm-native-main-central")?.proposeChanges({ external_temperature_sensor_entity_id: "sensor.outdoor" });
    await drawn(panel);
    expect(actionButton(panel, "save").disabled).toBe(false);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(calls(hass, "vtherm_dashboard/create_config")).toHaveLength(1));
    const [message] = calls(hass, "vtherm_dashboard/create_config");
    expect(message?.["thermostat_type"]).toBe("thermostat_central_config");
    expect(Object.keys(message?.["changes"] as object).sort()).toEqual(["advanced", "main", "tpi"]);
    expect(window.location.pathname).toBe(`/vtherm/${CONFIGURATION}`);
    await vi.waitFor(() => expect(find(root(panel), "core-create-central-page")).toBeNull());
    await vi.waitFor(() => expect(menuTexts(panel)).toContain("TPI parameters"));
    expect(menuTexts(panel)).toContain("Main attributes");
  });

  it("does not offer the creation of a second central configuration", async () => {
    const configs: FakeConfigs = { ...salonAndChambre(), central: { name: "Central", type: "central", values: { thermostat_type: "thermostat_central_config" } } };
    const { panel } = await mount({ configs, path: `/vtherm/${CONFIGURATION}` });
    await vi.waitFor(() => expect(menuTexts(panel)).toContain("TPI parameters"));
    expect(find(root(panel), "core-create-central-page")).toBeNull();
  });
});

describe("a refused save", () => {
  const MAIN = `/vtherm/${THERMOSTATS}/climate.salon/core.tab.main`;
  const refusingTpi = async (message: Record<string, unknown>) =>
    message["type"] === "vtherm_dashboard/save_config"
      ? { ok: false, config_saved: false, entry_id: "climate.salon", errors: [{ tab: "tpi", field: "tpi_coef_int", code: "invalid_value" }], preset_errors: [] }
      : undefined;
  const menuStatus = (panel: HTMLElement, title: string) => {
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    const link = findAll<HTMLAnchorElement>(menu.shadowRoot as ShadowRoot, "a").find((anchor) => anchor.querySelector(".title")?.textContent?.startsWith(title));
    return link?.querySelector(".status")?.textContent?.trim() ?? null;
  };

  it("marks the refused section in the menu, and offers to go to it from the section that was saved", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: MAIN, handlers: [refusingTpi] });
    nativeTab(panel, "vtherm-native-main-thermostat").proposeChanges({ name: "Living room" });
    await openMenu(panel, "TPI parameters");
    nativeTab(panel, "vtherm-native-tpi-thermostat").proposeChanges({ tpi_coef_int: 9 });
    await openMenu(panel, "Main attributes");
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(actionsText(panel)).toContain("A value of TPI parameters was refused."));
    expect(menuStatus(panel, "TPI parameters")).toBe("Error");
    find<HTMLButtonElement>(actions(panel)?.shadowRoot as ShadowRoot, "button.message-action")?.click();
    await drawn(panel);
    expect(window.location.pathname).toBe(`/vtherm/${THERMOSTATS}/climate.salon/core_tpi.tab.main`);
    expect((nativeTab(panel, "vtherm-native-tpi-thermostat") as unknown as { errors: Record<string, string> }).errors).toMatchObject({ tpi_coef_int: "invalid_value" });
    // The section that is open does not offer to go to itself.
    expect(actionsText(panel)).not.toContain("A value of TPI parameters was refused.");
  });

  it("takes the section out of the refused status once its refused value changes", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core_tpi.tab.main`, handlers: [refusingTpi] });
    nativeTab(panel, "vtherm-native-tpi-thermostat").proposeChanges({ tpi_coef_int: 9 });
    await drawn(panel);
    actionButton(panel, "save").click();
    await vi.waitFor(() => expect(menuStatus(panel, "TPI parameters")).toBe("Error"));
    nativeTab(panel, "vtherm-native-tpi-thermostat").proposeChanges({ tpi_coef_int: 0.7 });
    await drawn(panel);
    expect(menuStatus(panel, "TPI parameters")).not.toBe("Error");
  });
});

describe("the sections of the features that are off", () => {
  const WINDOW = `/vtherm/${THERMOSTATS}/climate.salon/core_window.tab.main`;
  const host = (panel: HTMLElement) => find(root(panel), "vtherm-contribution") as HTMLElement & { updateComplete: Promise<boolean> };
  const featureSwitch = (panel: HTMLElement) => host(panel).shadowRoot?.querySelector<HTMLInputElement>(".switch input[type=checkbox]") as HTMLInputElement;
  const menuText = (panel: HTMLElement) => (find(root(panel), "vtherm-side-menu") as HTMLElement).shadowRoot?.textContent ?? "";

  it("stay in the menu, off, and show the explanation and the switch of the feature instead of its fields", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: WINDOW });
    await drawn(panel);
    expect(menuText(panel)).toContain("Window detection");
    const content = host(panel).shadowRoot?.textContent ?? "";
    expect(content).toContain("Turns the heating off, or lowers it, while a window is open");
    expect(content).toContain("Turn on Window detection");
    expect(featureSwitch(panel).checked).toBe(false);
    expect(find(root(panel), "vtherm-native-window-thermostat")).toBeNull();
  });

  it("turn on in place: the fields appear, the tab Features shows the feature on, and the change is not saved yet", async () => {
    const { panel, hass } = await mount({ configs: salonAndChambre(), path: WINDOW });
    await drawn(panel);
    const toggle = featureSwitch(panel);
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    await drawn(panel);
    await host(panel).updateComplete;
    expect(find(root(panel), "vtherm-native-window-thermostat")).not.toBeNull();
    expect(actionsText(panel)).toContain("Unsaved changes");
    expect(calls(hass, "vtherm_dashboard/save_config")).toEqual([]);
    await openMenu(panel, "Features");
    expect(nativeTab(panel, "vtherm-native-features-thermostat").values["use_window_feature"]).toBe(true);
  });

  it("turn on from the tab Features as well: the section of the feature then shows its fields", async () => {
    const { panel } = await mount({ configs: salonAndChambre(), path: `/vtherm/${THERMOSTATS}/climate.salon/core.tab.features` });
    nativeTab(panel, "vtherm-native-features-thermostat").proposeChanges({ use_window_feature: true });
    await openMenu(panel, "Window detection");
    await host(panel).updateComplete;
    expect(featureSwitch(panel).checked).toBe(true);
    expect(find(root(panel), "vtherm-native-window-thermostat")).not.toBeNull();
  });
});

describe("the synchronization of the temperature, off", () => {
  const SYNC = `/vtherm/${THERMOSTATS}/climate.bureau/core_sync_temp.tab.main`;
  const climate = (): FakeConfigs => ({
    "climate.bureau": {
      name: "Bureau",
      type: "over_climate",
      values: { thermostat_type: "thermostat_over_climate", name: "Bureau", temperature_sensor_entity_id: "sensor.indoor", underlying_entity_ids: ["climate.ac"], use_main_central_config: false },
    },
  });
  const host = (panel: HTMLElement) => find(root(panel), "vtherm-contribution") as HTMLElement & { updateComplete: Promise<boolean> };
  const featureSwitch = (panel: HTMLElement) => host(panel).shadowRoot?.querySelector<HTMLInputElement>(".switch input[type=checkbox]") as HTMLInputElement;

  it("stays in the menu of a climate, off, and turns on in place the option of the tab of the underlyings", async () => {
    const { panel } = await mount({ configs: climate(), path: SYNC });
    await drawn(panel);
    expect(host(panel).shadowRoot?.textContent).toContain("Gives the room temperature to the device");
    const toggle = featureSwitch(panel);
    expect(toggle.checked).toBe(false);
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    await drawn(panel);
    await host(panel).updateComplete;
    expect(find(root(panel), "vtherm-native-sync-device-internal-temp-thermostat")).not.toBeNull();
    await openMenu(panel, "Underlyings");
    expect(nativeTab(panel, "vtherm-native-type-thermostat").values["sync_device_internal_temp"]).toBe(true);
  });
});

const texts = (nodes: readonly HTMLElement[]) => nodes.map((node) => node.textContent?.trim());
