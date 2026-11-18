// @vitest-environment happy-dom
/** The layout of the native sections: the grid of the fields, the advanced settings, the inheritance and the method of detection of a window. */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { PlacedEntry } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost, MockHaElement } from "@vtherm/dashboard-sdk/testing";
import type { CSSResultGroup } from "lit";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { isWideField } from "../src/native/fields.ts";
import { NativeTabElement } from "../src/native/native-tab.ts";
import { allForms } from "../src/native/schemas.ts";
import type { FieldSpec } from "../src/native/schemas.ts";
import { ADVANCED_FIELDS, isAdvanced, windowMethod, windowValues } from "../src/native/tab-definitions.ts";
import { find, findAll } from "./support/dashboard-harness.ts";
import { nativeHost } from "./support/native-host.ts";

let host: FakeHost;

beforeAll(async () => {
  defineHaControlMocks();
  ({ host } = await nativeHost());
  host.hass.setState("sensor.outdoor", "8", { friendly_name: "Outdoor", device_class: "temperature" });
  host.hass.setState("binary_sensor.window", "off", { friendly_name: "Window" });
});

afterEach(() => {
  document.body.innerHTML = "";
});

const SWITCH = { thermostat_type: "thermostat_over_switch", name: "Salon", proportional_function: "tpi" };
const CENTRAL = { thermostat_type: "thermostat_central_config", external_temperature_sensor_entity_id: "sensor.outdoor", temp_min: 7, temp_max: 35, step_temperature: 0.1 };
const WINDOW = { ...SWITCH, use_window_feature: true };

interface Rendered {
  element: HTMLElement & { updateComplete: Promise<unknown> };
  proposals: Record<string, unknown>[];
  root: ShadowRoot;
}

/** Render a native tab with values, as the dashboard does, with the components of Home Assistant. */
async function render(contributionId: string, values: Record<string, unknown>, options: { central?: Record<string, unknown>; errors?: Record<string, string>; missing?: string[] } = {}): Promise<Rendered> {
  const hook = contributionId.includes(".general.") ? "general_config" : "thermostat_config";
  const entry = host.resolved(hook).find((candidate: PlacedEntry) => candidate.id === contributionId) as PlacedEntry;
  const proposals: Record<string, unknown>[] = [];
  const hass = { ...host.hass, config: { unit_system: { temperature: "°C" } } };
  const props = { hass, thermostatId: "entry-1", values, centralValues: options.central ?? CENTRAL, errors: options.errors ?? {}, ...(options.missing === undefined ? {} : { missing: options.missing }), proposeChanges: (changes: Record<string, unknown>) => proposals.push(changes) };
  const element = (await host.render<"thermostat_config">(entry, props as never)) as Rendered["element"];
  await element.updateComplete;
  return { element, proposals, root: element.shadowRoot as ShadowRoot };
}

/** The keys of the fields of an element, in their order. */
const keys = (parent: ParentNode, selector = ".field") => findAll<HTMLElement>(parent, selector).map((field) => field.dataset["key"]);
/** The keys of the fields of the section that are out of the panel "Advanced settings". */
const currentKeys = (root: ShadowRoot) => findAll<HTMLElement>(root, ".field").filter((field) => field.closest(".advanced") === null).map((field) => field.dataset["key"]);
const advanced = (root: ShadowRoot) => find<MockHaElement>(root, "ha-expansion-panel.advanced") as MockHaElement;
const customize = (root: ShadowRoot, key: string) => find<MockHaElement>(root, `ha-switch#customize-${key}`) as MockHaElement;
const css = (): string => {
  const flatten = (styles: CSSResultGroup | undefined): string[] => (Array.isArray(styles) ? styles.flatMap((style) => flatten(style as CSSResultGroup)) : [(styles as { cssText?: string } | undefined)?.cssText ?? ""]);
  return flatten(NativeTabElement.styles).join("\n");
};
const field = (key: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, required: false, default: null, kind: "string", ...extra });

describe("the grid of the fields", () => {
  it("adds columns with the width, keeps a readable width for each field, and gives the whole width to the wide fields", () => {
    expect(css()).toMatch(/\.fields\s*\{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(min\(240px, 100%\), 1fr\)\)/);
    expect(css()).toMatch(/\.wide\s*\{[^}]*grid-column: 1 \/ -1/);
    expect(css()).not.toContain("max-width: 760px");
  });

  it("puts the name, the temperature sensor and the cycle side by side at the start of the main section", async () => {
    const { root } = await render("core.tab.main", { ...SWITCH, use_main_central_config: false });
    const first = find(root, ".fields") as HTMLElement;
    expect(keys(first).slice(0, 3)).toEqual(["name", "temperature_sensor_entity_id", "cycle_min"]);
    expect(findAll(first, ".field.wide")).toEqual([]);
  });

  it("gives the whole width to the list of the underlyings and to the commands", async () => {
    const { root } = await render("core.tab.type", { ...SWITCH, underlying_entity_ids: ["switch.heater"] });
    expect(find(root, '.field[data-key="underlying_entity_ids"]')?.classList.contains("wide")).toBe(true);
    expect(find(root, '.field[data-key="vswitch_on_command"]')?.classList.contains("wide")).toBe(true);
    expect(find(root, '.field[data-key="proportional_function"]')?.classList.contains("wide")).toBe(false);
  });

  it("knows the wide fields: lists, templates, texts of several lines and commands", () => {
    expect(isWideField(field("underlying_entity_ids", { kind: "entity", multiple: true }))).toBe(true);
    expect(isWideField(field("failure_detection_enable_template", { kind: "template" }))).toBe(true);
    expect(isWideField(field("note", { kind: "text", multiline: true }))).toBe(true);
    expect(isWideField(field("central_boiler_activation_service"))).toBe(true);
    expect(isWideField(field("name"))).toBe(false);
  });
});

describe("the advanced settings", () => {
  it("shows the coefficients of TPI, and puts its minimal delays and thresholds in the panel Advanced settings (4), closed", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    expect(currentKeys(root)).toEqual(["tpi_coef_int", "tpi_coef_ext", "auto_tpi_mode"]);
    expect(advanced(root).header).toBe("Advanced settings (4)");
    expect(advanced(root).expanded).toBe(false);
    expect(keys(advanced(root))).toEqual(["minimal_activation_delay", "minimal_deactivation_delay", "tpi_threshold_low", "tpi_threshold_high"]);
  });

  it("opens the panel when one of its fields is refused, with the error of the field", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false }, { errors: { tpi_threshold_high: "out_of_range" } });
    expect(advanced(root).expanded).toBe(true);
    expect(find(advanced(root), '.field[data-key="tpi_threshold_high"] ha-alert[alert-type="error"]')).not.toBeNull();
  });

  it("opens the panel when one of its fields is required without a value", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false }, { missing: ["minimal_activation_delay"] });
    expect(advanced(root).expanded).toBe(true);
  });

  it("puts the settings of Auto TPI in the panel", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false, auto_tpi_mode: true });
    expect(keys(advanced(root))).toEqual(expect.arrayContaining(["auto_tpi_learning_type", "auto_tpi_aggressiveness", "heater_heating_time", "auto_tpi_enable_advanced_settings"]));
    expect(currentKeys(root)).not.toContain("auto_tpi_learning_type");
  });

  it("keeps the delay of safety, its default percentage and the duration of the manual override out of the panel", async () => {
    const { root } = await render("core_advanced.tab.main", { ...SWITCH, use_advanced_central_config: false });
    expect(currentKeys(root)).toEqual(["safety_delay_min", "safety_default_on_percent", "manual_override_duration_min"]);
    expect(keys(advanced(root))).toEqual(["safety_min_on_percent", "repair_incorrect_state"]);
  });

  it("classes the rare settings of every section as advanced", () => {
    const expected = {
      "main and type": ["last_seen_temperature_sensor_entity_id", "step_temperature", "heater_keep_alive", "vswitch_on_command", "vswitch_off_command", "auto_fan_mode", "auto_regulation_use_device_temp"],
      "TPI and synchronization": ["minimal_activation_delay", "minimal_deactivation_delay", "tpi_threshold_low", "tpi_threshold_high", "auto_tpi_ema_alpha", "auto_tpi_avg_initial_weight", "sync_with_calibration"],
      others: ["keep_alive_boiler_delay_sec", "safety_min_on_percent", "repair_incorrect_state", "temperature_change_tolerance", "failure_detection_enable_template", "lock_code", "auto_relock_sec"],
    };
    for (const [group, list] of Object.entries(expected)) {
      expect(list.filter((key) => !ADVANCED_FIELDS.has(key)), group).toEqual([]);
    }
  });

  it("names only fields that Versatile Thermostat has, and keeps a field that it does not know out of the panel", () => {
    const known = new Set(Object.values(allForms()).flatMap((form) => form.map((candidate) => candidate.key)));
    expect([...ADVANCED_FIELDS].filter((key) => !known.has(key))).toEqual([]);
    expect(isAdvanced(field("a_new_field_of_versatile_thermostat"))).toBe(false);
  });
});

describe("the inheritance", () => {
  const centralWindow = { ...CENTRAL, window_delay: 60, window_off_delay: 30, window_action: "window_eco_temp" };

  it("shows the switch Customize off and the central values in chips, with a link to the central section", async () => {
    const { root } = await render("core_window.tab.main", { ...WINDOW, use_window_central_config: true }, { central: centralWindow });
    expect(customize(root, "use_window_central_config").checked).toBe(false);
    expect(find(root, ".customize")?.textContent).toContain("Customize for this thermostat");
    expect(findAll<HTMLElement>(root, ".chip").map((chip) => chip.dataset["key"])).toEqual(["window_delay", "window_off_delay", "window_action"]);
    expect(find(root, '.chip[data-key="window_delay"] .chip-value')?.textContent?.trim()).toBe("60");
    const link = find<HTMLAnchorElement>(root, "a.central-link") as HTMLAnchorElement;
    expect(link.textContent).toBe("Edit the central configuration");
    expect(link.getAttribute("href")).toBe(`/vtherm/${CORE_TOP_TABS.configuration}/core_window.general.main`);
    expect(find(root, '.field[data-key="window_delay"]')).toBeNull();
  });

  it("names the entities of the central values, and opens their card", async () => {
    const { root } = await render("core.tab.main", { ...SWITCH, use_main_central_config: true });
    expect(find(root, '.chip[data-key="external_temperature_sensor_entity_id"] .chip-value')?.textContent?.trim()).toBe("Outdoor");
    expect(find(root, '.chip[data-key="external_temperature_sensor_entity_id"] .chip-label')?.textContent).toContain(": ");
  });

  it("writes the opposite of the option of Versatile Thermostat when the switch Customize is turned on", async () => {
    const { root, proposals } = await render("core_window.tab.main", { ...WINDOW, use_window_central_config: true }, { central: centralWindow });
    customize(root, "use_window_central_config").change(true);
    expect(proposals).toEqual([{ use_window_central_config: false }]);
    const own = await render("core_window.tab.main", { ...WINDOW, use_window_central_config: false }, { central: centralWindow });
    expect(customize(own.root, "use_window_central_config").checked).toBe(true);
    expect(find(own.root, '.field[data-key="window_delay"]')).not.toBeNull();
    expect(find(own.root, ".chip")).toBeNull();
  });

  it("says that the defaults of Versatile Thermostat apply when the central configuration has no value for the section", async () => {
    const { root } = await render("core_window.tab.main", { ...WINDOW, use_window_central_config: true });
    expect(find(root, ".chip")).toBeNull();
    expect(find(root, ".central-defaults")?.textContent).toContain("the defaults of Versatile Thermostat apply");
    expect(find(root, "a.central-link")).not.toBeNull();
  });
});

describe("the method of detection of a window", () => {
  const method = (root: ShadowRoot) => find<MockHaElement>(root, ".method ha-selector") as MockHaElement;
  const own = { ...WINDOW, use_window_central_config: false };

  it("is the sensor with a sensor, the drop of temperature with a threshold without sensor, otherwise the sensor", () => {
    expect(windowMethod({ window_sensor_entity_id: "binary_sensor.window", window_auto_open_threshold: 3 })).toBe("sensor");
    expect(windowMethod({ window_auto_open_threshold: 3 })).toBe("drop");
    expect(windowMethod({ window_auto_close_threshold: 0 })).toBe("drop");
    expect(windowMethod({})).toBe("sensor");
    expect(windowMethod({}, "drop")).toBe("drop");
  });

  it("reads the central thresholds when the thermostat uses the central configuration of the window", () => {
    const central = { window_auto_open_threshold: 3 };
    expect(windowMethod(windowValues({ use_window_central_config: true }, central))).toBe("drop");
    expect(windowMethod(windowValues({ use_window_central_config: false }, central))).toBe("sensor");
  });

  it("is a group of buttons named by its question, on the sensor of a thermostat that has one, without the thresholds", async () => {
    const { root } = await render("core_window.tab.main", { ...own, window_sensor_entity_id: "binary_sensor.window" });
    const group = find(root, ".method") as HTMLElement;
    expect([group.getAttribute("role"), group.getAttribute("aria-label")]).toEqual(["radiogroup", "How to detect an open window?"]);
    expect(method(root).selector).toEqual({ select: { mode: "box", options: [{ value: "sensor", label: "Opening sensor" }, { value: "drop", label: "Temperature drop" }] } });
    expect(method(root).value).toBe("sensor");
    expect(find(root, '.field[data-key="window_sensor_entity_id"]')).not.toBeNull();
    expect(find(root, '.field[data-key="window_auto_open_threshold"]')).toBeNull();
  });

  it("removes the sensor and gives the thresholds when the drop of temperature is chosen, then shows them", async () => {
    const { element, root, proposals } = await render("core_window.tab.main", { ...own, window_sensor_entity_id: "binary_sensor.window" });
    method(root).change("drop");
    expect(proposals).toEqual([{ window_sensor_entity_id: null, window_auto_open_threshold: 3, window_auto_close_threshold: 0, window_auto_max_duration: 30 }]);
    (element as unknown as { values: Record<string, unknown> }).values = { ...own, window_sensor_entity_id: null, window_auto_open_threshold: 3, window_auto_close_threshold: 0, window_auto_max_duration: 30 };
    await element.updateComplete;
    expect(keys(root).filter((key) => key?.startsWith("window_auto"))).toEqual(["window_auto_open_threshold", "window_auto_close_threshold", "window_auto_max_duration"]);
    expect(find(root, '.field[data-key="window_sensor_entity_id"]')).toBeNull();
  });

  it("removes the own thresholds and asks for the sensor when the sensor is chosen again", async () => {
    const { element, root, proposals } = await render("core_window.tab.main", { ...own, window_auto_open_threshold: 2, window_auto_close_threshold: 0.5 });
    expect(method(root).value).toBe("drop");
    method(root).change("sensor");
    await element.updateComplete;
    expect(proposals).toEqual([{ window_auto_open_threshold: null, window_auto_close_threshold: null }]);
    expect(find(root, '.field[data-key="window_sensor_entity_id"]')).not.toBeNull();
    expect(find(root, '.field[data-key="window_auto_open_threshold"]')).toBeNull();
  });

  it("does not touch the thresholds that come from the central configuration", async () => {
    const { root, proposals } = await render("core_window.tab.main", { ...WINDOW, use_window_central_config: true }, { central: { ...CENTRAL, window_auto_open_threshold: 3 } });
    expect(method(root).value).toBe("drop");
    method(root).change("sensor");
    expect(proposals).toEqual([]);
  });

  it("is not offered in the general configuration, which has no sensor", async () => {
    const { root } = await render("core_window.general.main", { thermostat_type: "thermostat_central_config", use_window_feature: true });
    expect(find(root, ".method")).toBeNull();
  });
});

describe("the panel of estimation", () => {
  it("creates its content when it starts to open, before Home Assistant measures it, and leaves its state to Home Assistant", async () => {
    const { element, root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    const panel = find<MockHaElement>(root, "ha-expansion-panel.insights") as MockHaElement;
    expect(panel.expanded).toBe(false);
    expect(find(panel, "vtherm-insight-tpi")).toBeNull();
    panel.dispatchEvent(new CustomEvent("expanded-will-change", { detail: { expanded: true } }));
    await element.updateComplete;
    expect(find(panel, "vtherm-insight-tpi")).not.toBeNull();
    // The dashboard does not set `expanded`: a binding would make the height of the panel stay fixed while its content grows.
    expect(panel.expanded).toBe(false);
    panel.dispatchEvent(new CustomEvent("expanded-changed", { detail: { expanded: false } }));
    await element.updateComplete;
    expect(find(panel, "vtherm-insight-tpi")).toBeNull();
  });
});
