// @vitest-environment happy-dom
/** The help of the native fields: the fallback of the texts, the diagrams of the fields and of their groups, and the focus. */
import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { PlacedEntry } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost, MockHaElement } from "@vtherm/dashboard-sdk/testing";
import type { CSSResultGroup } from "lit";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { VThermFieldHelp } from "../src/components/field-help.ts";
import { FIELD_DIAGRAMS, GROUP_DIAGRAMS, diagramOfField } from "../src/native/field-diagrams.ts";
import { NativeTabElement, defineNativeTab } from "../src/native/native-tab.ts";
import { TAB_DEFINITIONS } from "../src/native/tab-definitions.ts";
import { find, findAll } from "./support/dashboard-harness.ts";
import { nativeHost } from "./support/native-host.ts";

let host: FakeHost;

beforeAll(async () => {
  defineHaControlMocks();
  ({ host } = await nativeHost());
});

afterEach(() => {
  document.body.innerHTML = "";
});

type Tab = HTMLElement & { updateComplete: Promise<unknown>; values: Record<string, unknown> };
interface Rendered {
  element: Tab;
  root: ShadowRoot;
}

const SWITCH = { thermostat_type: "thermostat_over_switch", name: "Salon", proportional_function: "tpi" };
const VALVE = { thermostat_type: "thermostat_over_valve", name: "Bureau", proportional_function: "tpi" };
const CENTRAL = { thermostat_type: "thermostat_central_config", tpi_coef_int: 0.3, tpi_coef_ext: 0.05, minimal_activation_delay: 10, minimal_deactivation_delay: 0 };

/** Render a native tab of the native plugins, with the components of Home Assistant. */
async function render(contributionId: string, values: Record<string, unknown>, options: { central?: Record<string, unknown> } = {}): Promise<Rendered> {
  const entry = host.resolved("thermostat_config").find((candidate: PlacedEntry) => candidate.id === contributionId) as PlacedEntry;
  const hass = { ...host.hass, config: { unit_system: { temperature: "°C" } } };
  const props = { hass, thermostatId: "entry-1", values, centralValues: options.central ?? CENTRAL, errors: {}, proposeChanges: () => undefined };
  const element = (await host.render<"thermostat_config">(entry, props as never)) as Tab;
  await element.updateComplete;
  return { element, root: element.shadowRoot as ShadowRoot };
}

/** A main tab whose catalog has, for its fields, only the texts of each case of the fallback. */
async function renderWithTexts(): Promise<Rendered> {
  const translations = defineTranslations({
    "title.main": "Main",
    "field.name": "Name",
    "help.name": "The help of Versatile Thermostat for the name.",
    "field.cycle_min": "Cycle",
    "hint.cycle_min": "How long a cycle lasts.",
    "info.cycle_min": "A longer cycle switches less often.",
    "help.cycle_min": "The help of Versatile Thermostat for the cycle.",
    "field.temperature_sensor_entity_id": "Sensor",
    "hint.temperature_sensor_entity_id": "The sensor of the room.",
    "help.temperature_sensor_entity_id": "The help of Versatile Thermostat for the sensor.",
    "field.device_power": "Power",
    "hint.device_power": "The power of the heater.",
    "help.device_power": "The power of the heater.",
  });
  defineNativeTab("test-help-main", TAB_DEFINITIONS.find((definition) => definition.tab === "main")!, "thermostat", translations);
  const element = document.createElement("test-help-main") as Tab & Record<string, unknown>;
  Object.assign(element, { hass: { ...host.hass, config: { unit_system: { temperature: "°C" } } }, thermostatId: "entry-1", values: { ...SWITCH, use_main_central_config: false }, centralValues: {}, errors: {} });
  document.body.append(element);
  await element.updateComplete;
  return { element, root: element.shadowRoot as ShadowRoot };
}

const selector = (root: ShadowRoot, key: string) => find<MockHaElement>(root, `.field[data-key="${key}"] ha-selector`) as MockHaElement;
const help = (root: ShadowRoot, key: string) => find<VThermFieldHelp>(root, `.field[data-key="${key}"] vtherm-field-help`);

describe("the texts of the help of a field", () => {
  it("gives the hint to the control, and the explanation and the diagram of the cycle to its button (i)", async () => {
    const { root } = await renderWithTexts();
    expect(selector(root, "cycle_min").helper).toBe("How long a cycle lasts.");
    const cycle = help(root, "cycle_min") as VThermFieldHelp;
    expect([cycle.label, cycle.info, cycle.diagram]).toEqual(["Cycle", "A longer cycle switches less often.", "tpi_cycle"]);
    expect(cycle.hasAttribute("in-field")).toBe(true);
    expect(find(root, '.field[data-key="cycle_min"]')?.classList.contains("has-help")).toBe(true);
  });

  it("shows the help of Versatile Thermostat under the control, without button, for a field that has no help of its own", async () => {
    const { root } = await renderWithTexts();
    expect(selector(root, "name").helper).toBe("The help of Versatile Thermostat for the name.");
    expect(help(root, "name")).toBeNull();
    expect(find(root, '.field[data-key="name"]')?.classList.contains("has-help")).toBe(false);
  });

  it("puts the help of Versatile Thermostat in the panel of a field that has a hint but no explanation, unless it repeats the hint", async () => {
    const { root } = await renderWithTexts();
    expect(selector(root, "temperature_sensor_entity_id").helper).toBe("The sensor of the room.");
    expect(help(root, "temperature_sensor_entity_id")?.info).toBe("The help of Versatile Thermostat for the sensor.");
    expect(help(root, "device_power")).toBeNull();
  });
});

describe("the diagrams of the native fields", () => {
  it("illustrates each setting with the diagram of the specification", () => {
    const expected: Record<string, string[]> = {
      tpi_cycle: ["cycle_min"],
      tpi_formula: ["tpi_coef_int", "tpi_coef_ext"],
      min_on_off: ["minimal_activation_delay", "minimal_deactivation_delay"],
      tpi_thresholds: ["tpi_threshold_low", "tpi_threshold_high"],
      valve_curve: ["min_opening_degrees", "max_opening_degrees", "opening_threshold_degree", "max_closing_degree"],
      send_threshold: ["auto_regulation_dtemp", "auto_regulation_periode_min"],
      correction: ["auto_regulation_mode"],
      window_delay: ["window_delay", "window_off_delay"],
      window_slope: ["window_auto_open_threshold", "window_auto_close_threshold", "window_auto_max_duration"],
      motion: ["motion_delay", "motion_off_delay"],
      safety: ["safety_delay_min", "safety_min_on_percent", "safety_default_on_percent"],
      override: ["manual_override_duration_min"],
      failure: ["heating_failure_threshold", "cooling_failure_threshold", "heating_failure_detection_delay", "temperature_change_tolerance"],
      stagger: ["underlying_entity_ids"],
    };
    for (const [diagram, keys] of Object.entries(expected)) {
      expect(keys.map((key) => FIELD_DIAGRAMS[key]), diagram).toEqual(keys.map(() => diagram));
    }
  });

  it("spreads the starts only for the switches of a thermostat over switch", () => {
    expect(diagramOfField("underlying_entity_ids", SWITCH)).toBe("stagger");
    expect(diagramOfField("underlying_entity_ids", VALVE)).toBeUndefined();
    expect(diagramOfField("name", SWITCH)).toBeUndefined();
  });

  it("draws the diagram of a field with the values of the draft, and again when they change", async () => {
    const { element, root } = await render("core.tab.main", { ...SWITCH, cycle_min: 5, use_main_central_config: false });
    expect(help(root, "cycle_min")?.values).toMatchObject({ cycle_min: 5 });
    element.values = { ...SWITCH, cycle_min: 12, use_main_central_config: false };
    await element.updateComplete;
    expect(help(root, "cycle_min")?.values).toMatchObject({ cycle_min: 12 });
    expect(help(root, "cycle_min")?.highlight).toBe("cycle_min");
  });

  it("highlights the setting of the field that has the focus in the diagrams that show it", async () => {
    const { element, root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    const low = find(root, '.field[data-key="tpi_threshold_low"] ha-selector') as HTMLElement;
    low.dispatchEvent(new FocusEvent("focusin", { bubbles: true, composed: true }));
    await element.updateComplete;
    expect(help(root, "tpi_threshold_high")?.highlight).toBe("tpi_threshold_low");
    expect(help(root, "minimal_activation_delay")?.highlight).toBe("minimal_activation_delay");
  });
});

describe("the diagram of a group of fields", () => {
  it("is a tile of the grid after the openings of a valve, which do not repeat it in their own help", async () => {
    const { root } = await render("core.tab.type", { ...VALVE, underlying_entity_ids: ["number.valve"] });
    const grid = find(root, ".fields") as HTMLElement;
    const order = [...grid.children].map((child) => (child as HTMLElement).dataset["key"] ?? (child as HTMLElement).dataset["diagram"]);
    const keys = GROUP_DIAGRAMS.find((group) => group.diagram === "valve_curve")!.keys;
    const last = Math.max(...keys.map((key) => order.indexOf(key)));
    expect(order[last + 1]).toBe("valve_curve");
    expect(find(grid, '.diagram-tile[data-diagram="valve_curve"] [role="img"]')).not.toBeNull();
    expect(help(root, "min_opening_degrees")?.diagram).toBeUndefined();
  });

  it("takes two columns of the grid once it has three, and one column under the fields otherwise", () => {
    const flatten = (styles: CSSResultGroup | undefined): string[] => (Array.isArray(styles) ? styles.flatMap((style) => flatten(style as CSSResultGroup)) : [(styles as { cssText?: string } | undefined)?.cssText ?? ""]);
    const css = flatten(NativeTabElement.styles).join("\n");
    expect(css).toMatch(/\.section-body\s*\{[^}]*container-type: inline-size/);
    expect(css).toMatch(/@container \(min-width: 932px\)\s*\{\s*\.diagram-tile\s*\{[^}]*grid-column: span 2/);
  });

  it("follows the central values of a section of TPI that inherits, drawn with them", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: true });
    const tile = find(root, '.inherited ~ .fields .diagram-tile[data-diagram="tpi_formula"]');
    expect(tile).not.toBeNull();
    expect(tile?.querySelector('[role="img"]')?.getAttribute("aria-label")).toMatch(/0[.,]3/);
  });

  it("is shown in the help of a field of the group of TPI that is in the advanced settings", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    expect(help(root, "tpi_threshold_high")?.diagram).toBe("tpi_thresholds");
    expect(help(root, "tpi_coef_int")?.diagram).toBeUndefined();
    expect(find(root, '.diagram-tile[data-diagram="tpi_formula"]')).not.toBeNull();
  });

  it("follows the thresholds of the detection of a window by a drop of temperature", async () => {
    const { root } = await render("core_window.tab.main", { ...SWITCH, use_window_feature: true, use_window_central_config: false, window_auto_open_threshold: 3 });
    expect(find(root, '.diagram-tile[data-diagram="window_slope"]')).not.toBeNull();
  });

  it("opens the help of a field in its tile, without moving the other fields", async () => {
    const { element, root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    const before = findAll<HTMLElement>(root, ".fields > *").map((child) => [child.dataset["key"] ?? child.dataset["diagram"], child.className]);
    const coefficient = help(root, "tpi_coef_int") as VThermFieldHelp;
    (coefficient.shadowRoot?.querySelector("button.toggle") as HTMLButtonElement).click();
    await coefficient.updateComplete;
    await element.updateComplete;
    expect(findAll<HTMLElement>(root, ".fields > *").map((child) => [child.dataset["key"] ?? child.dataset["diagram"], child.className])).toEqual(before);
    expect(coefficient.open).toBe(true);
  });
});
