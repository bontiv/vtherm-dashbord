// @vitest-environment happy-dom
import type { PlacedEntry } from "@vtherm/dashboard-sdk";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { nativeHost } from "./support/native-host.ts";
import { find, findAll } from "./support/dashboard-harness.ts";

let host: FakeHost;

beforeAll(async () => {
  ({ host } = await nativeHost());
  host.hass.setState("sensor.indoor", "19");
  host.hass.setState("sensor.outdoor", "8");
  host.hass.setState("switch.heater", "off");
  host.hass.setState("climate.ac", "off");
});

afterEach(() => {
  document.body.innerHTML = "";
});

const CENTRAL = { thermostat_type: "thermostat_central_config", external_temperature_sensor_entity_id: "sensor.outdoor", temp_min: 7, temp_max: 35, step_temperature: 0.1, tpi_coef_int: 0.6, tpi_coef_ext: 0.01, minimal_activation_delay: 10, minimal_deactivation_delay: 0, lock_code: "1234", lock_users: true, lock_automations: true, auto_relock_sec: 30 };

interface Rendered {
  element: HTMLElement;
  proposals: Record<string, unknown>[];
  root: ShadowRoot;
}

/** Render a native tab with values, as the dashboard does. */
async function render(contributionId: string, values: Record<string, unknown>, options: { central?: Record<string, unknown>; errors?: Record<string, string>; unit?: string } = {}): Promise<Rendered> {
  const hook = contributionId.includes(".general.") ? "general_config" : "thermostat_config";
  const entry = host.resolved(hook).find((candidate: PlacedEntry) => candidate.id === contributionId) as PlacedEntry;
  expect(entry, contributionId).toBeDefined();
  const proposals: Record<string, unknown>[] = [];
  const hass = { ...host.hass, config: { unit_system: { temperature: options.unit ?? "°C" } } };
  const props = {
    hass,
    thermostatId: "entry-1",
    values,
    centralValues: options.central ?? CENTRAL,
    errors: options.errors ?? {},
    proposeChanges: (changes: Record<string, unknown>) => proposals.push(changes),
  };
  const element = await host.render<"thermostat_config">(entry, props as never);
  await (element as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return { element, proposals, root: element.shadowRoot as ShadowRoot };
}

const labels = (root: ShadowRoot) => findAll(root, "label").map((label) => label.getAttribute("for")?.replace("field-", ""));
const input = (root: ShadowRoot, key: string) => find<HTMLInputElement>(root, `#field-${key}`);
const change = (control: HTMLInputElement | HTMLSelectElement | null, value: string | boolean) => {
  if (control === null) {
    throw new Error("no control");
  }
  if (typeof value === "boolean") {
    (control as HTMLInputElement).checked = value;
  } else {
    control.value = value;
  }
  control.dispatchEvent(new Event("change"));
};
const SWITCH = { thermostat_type: "thermostat_over_switch", name: "Salon", proportional_function: "tpi" };

describe("the tab main", () => {
  it("shows the fields of a thermostat with their defaults", async () => {
    const { root } = await render("core.tab.main", { thermostat_type: "thermostat_over_switch" });
    expect(labels(root)).toEqual(["name", "temperature_sensor_entity_id", "last_seen_temperature_sensor_entity_id", "cycle_min", "device_power", "power_unit", "use_main_central_config", "use_central_mode", "used_by_controls_central_boiler"]);
    expect(input(root, "cycle_min")?.value).toBe("5");
    expect(input(root, "device_power")?.value).toBe("1");
    expect(input(root, "use_main_central_config")?.checked).toBe(true);
    expect(input(root, "use_central_mode")?.checked).toBe(true);
    expect(input(root, "used_by_controls_central_boiler")?.checked).toBe(false);
  });

  it("shows the values of the central configuration read-only while the thermostat uses them", async () => {
    const { root } = await render("core.tab.main", { ...SWITCH, use_main_central_config: true });
    expect(input(root, "external_temperature_sensor_entity_id")).toBeNull();
    expect(root.textContent).toContain("sensor.outdoor");
    expect(findAll(root, "dd").map((cell) => cell.textContent?.trim())).toEqual(["sensor.outdoor", "7", "35", "0.1"]);
  });

  it("shows its own outdoor sensor and temperatures when the thermostat does not use the central configuration", async () => {
    const { root } = await render("core.tab.main", { ...SWITCH, use_main_central_config: false });
    expect(labels(root)).toEqual(expect.arrayContaining(["external_temperature_sensor_entity_id", "temp_min", "temp_max", "step_temperature"]));
    expect([input(root, "temp_min")?.value, input(root, "temp_max")?.value, input(root, "step_temperature")?.value]).toEqual(["7", "35", "0.1"]);
  });

  it("uses the temperatures of Fahrenheit when Home Assistant is in °F", async () => {
    const { root } = await render("core.general.main", { thermostat_type: "thermostat_central_config" }, { unit: "°F" });
    expect([input(root, "temp_min")?.value, input(root, "temp_max")?.value, input(root, "step_temperature")?.value]).toEqual(["45", "95", "1"]);
  });

  it("shows the outdoor sensor and the temperatures in the general configuration", async () => {
    const { root } = await render("core.general.main", { thermostat_type: "thermostat_central_config" });
    expect(labels(root)).toEqual(["external_temperature_sensor_entity_id", "temp_min", "temp_max", "step_temperature"]);
  });

  it("disables the inheritance and forces it off when there is no central configuration, with an explanation", async () => {
    const { root } = await render("core.tab.main", { ...SWITCH, use_main_central_config: true }, { central: {} });
    expect(input(root, "use_main_central_config")?.disabled).toBe(true);
    expect(input(root, "use_main_central_config")?.checked).toBe(false);
    expect(root.textContent).toContain("There is no central configuration");
    expect(labels(root)).toContain("external_temperature_sensor_entity_id");
  });

  it("proposes a change to the draft, never to Home Assistant", async () => {
    const { root, proposals } = await render("core.tab.main", SWITCH);
    change(input(root, "cycle_min"), "8");
    change(input(root, "name"), "Bureau");
    change(input(root, "use_central_mode"), false);
    expect(proposals).toEqual([{ cycle_min: 8 }, { name: "Bureau" }, { use_central_mode: false }]);
    expect(host.hass.serviceCalls).toEqual([]);
  });

  it("shows an error of the server on its field, translated", async () => {
    const { root } = await render("core.tab.main", SWITCH, { errors: { temperature_sensor_entity_id: "unknown_entity" } });
    expect(input(root, "temperature_sensor_entity_id")?.getAttribute("aria-invalid")).toBe("true");
    expect(find(root, "#error-temperature_sensor_entity_id")?.textContent).toBe("Unknown entity id");
  });

  it("offers the entities of the right domains for a sensor", async () => {
    const { root } = await render("core.tab.main", SWITCH);
    const choices = findAll(root, "#field-temperature_sensor_entity_id-choices option").map((option) => option.getAttribute("value"));
    expect(choices).toEqual(["sensor.indoor", "sensor.outdoor"]);
  });
});

describe("the tab type", () => {
  it("shows the fields of a thermostat over a switch, TPI by default, and the custom commands as lists", async () => {
    const { root } = await render("core.tab.type", { thermostat_type: "thermostat_over_switch" });
    expect(labels(root)).toEqual(["underlying_entity_ids", "heater_keep_alive", "proportional_function", "ac_mode", "inverse_switch_command", "vswitch_on_command", "vswitch_off_command"]);
    expect(find<HTMLSelectElement>(root, "#field-proportional_function")?.value).toBe("tpi");
    expect(find(root, "#field-vswitch_on_command")?.tagName).toBe("TEXTAREA");
  });

  it("keeps an algorithm that a thermostat plugin added", async () => {
    const { root } = await render("core.tab.type", { thermostat_type: "thermostat_over_switch", proportional_function: "smartpi" });
    expect(findAll(root, "#field-proportional_function option").map((option) => option.getAttribute("value"))).toEqual(["tpi", "smartpi"]);
  });

  it("shows the fields of a thermostat over a climate with the defaults of Versatile Thermostat", async () => {
    const { root } = await render("core.tab.type", { thermostat_type: "thermostat_over_climate" });
    expect(find<HTMLSelectElement>(root, "#field-auto_regulation_mode")?.value).toBe("auto_regulation_none");
    expect([input(root, "auto_regulation_dtemp")?.value, input(root, "auto_regulation_periode_min")?.value]).toEqual(["0.5", "5"]);
    expect(find<HTMLSelectElement>(root, "#field-auto_fan_mode")?.value).toBe("auto_fan_high");
    expect(findAll(root, "#field-auto_regulation_mode option").map((option) => option.textContent?.trim())).toContain("Direct control of valve");
  });

  it("shows the fields of a thermostat over a valve, with the limits of the opening threshold", async () => {
    const { root } = await render("core.tab.type", { thermostat_type: "thermostat_over_valve" });
    expect(labels(root)).toEqual(expect.arrayContaining(["opening_threshold_degree", "min_opening_degrees", "max_opening_degrees", "max_closing_degree"]));
    expect([input(root, "opening_threshold_degree")?.min, input(root, "opening_threshold_degree")?.max]).toEqual(["0", "100"]);
  });

  it("shows the error of the custom commands of the form", async () => {
    const { root } = await render("core.tab.type", { thermostat_type: "thermostat_over_switch" }, { errors: { base: "vswitch_configuration_incorrect" } });
    expect(find(root, ".base-error")?.textContent).toContain("The command customization configuration is incorrect");
  });
});

describe("the tab features", () => {
  it("offers the features of a thermostat over a switch, without auto start and stop", async () => {
    const { root } = await render("core.tab.features", { thermostat_type: "thermostat_over_switch" });
    expect(labels(root)).toEqual(["use_window_feature", "use_motion_feature", "use_power_feature", "use_presence_feature", "use_heating_failure_detection_feature"]);
  });

  it("offers auto start and stop, and no heating failure detection, to a climate without valve regulation", async () => {
    const { root } = await render("core.tab.features", { thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_none" });
    expect(labels(root)).toContain("use_auto_start_stop_feature");
    expect(labels(root)).not.toContain("use_heating_failure_detection_feature");
  });

  it("offers the central boiler in the general configuration", async () => {
    const { root } = await render("core.general.features", { thermostat_type: "thermostat_central_config" });
    expect(labels(root)).toContain("use_central_boiler_feature");
  });
});

describe("the tab TPI and Auto TPI", () => {
  it("shows the inheritance and the central coefficients read-only", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: true });
    expect(labels(root)).toEqual(["use_tpi_central_config"]);
    expect(findAll(root, "dd").map((cell) => cell.textContent?.trim()).slice(0, 2)).toEqual(["0.6", "0.01"]);
  });

  it("shows the coefficients with their defaults and limits without inheritance", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    expect([input(root, "tpi_coef_int")?.value, input(root, "tpi_coef_int")?.min, input(root, "tpi_coef_int")?.max]).toEqual(["0.6", "0", "10"]);
    expect([input(root, "tpi_coef_ext")?.value, input(root, "minimal_activation_delay")?.value, input(root, "minimal_deactivation_delay")?.value]).toEqual(["0.01", "10", "0"]);
    expect([input(root, "tpi_threshold_low")?.value, input(root, "tpi_threshold_high")?.value]).toEqual(["0", "0"]);
  });

  it("shows the configuration of Auto TPI when it is on", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false, auto_tpi_mode: true });
    expect(labels(root)).toEqual(expect.arrayContaining(["auto_tpi_learning_type", "auto_tpi_aggressiveness", "heater_heating_time", "heater_cooling_time", "auto_tpi_heating_rate", "auto_tpi_continuous_kext", "auto_tpi_enable_advanced_settings"]));
    expect([input(root, "heater_heating_time")?.value, input(root, "heater_cooling_time")?.value]).toEqual(["5", "5"]);
  });

  it("gives the weighted average with a weight of 1 when the learning becomes discovery", async () => {
    const { root, proposals } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false, auto_tpi_mode: true, auto_tpi_learning_type: "fine_tuning" });
    change(find<HTMLSelectElement>(root, "#field-auto_tpi_learning_type"), "discovery");
    expect(proposals).toEqual([{ auto_tpi_learning_type: "discovery", auto_tpi_calculation_method: "average", auto_tpi_avg_initial_weight: 1 }]);
  });

  it("gives EMA with alpha 0.08 and decay 0.12 when the learning becomes fine tuning", async () => {
    const { root, proposals } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false, auto_tpi_mode: true, auto_tpi_learning_type: "discovery" });
    change(find<HTMLSelectElement>(root, "#field-auto_tpi_learning_type"), "fine_tuning");
    expect(proposals[0]).toEqual({ auto_tpi_learning_type: "fine_tuning", auto_tpi_calculation_method: "ema", auto_tpi_ema_alpha: 0.08, auto_tpi_ema_decay_rate: 0.12 });
  });

  it("shows the advanced settings of EMA with their defaults", async () => {
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false, auto_tpi_mode: true, auto_tpi_enable_advanced_settings: true, auto_tpi_calculation_method: "ema" });
    expect([input(root, "auto_tpi_ema_alpha")?.value, input(root, "auto_tpi_ema_decay_rate")?.value, input(root, "auto_tpi_continuous_kext_alpha")?.value]).toEqual(["0.15", "0.08", "0.04"]);
    expect([input(root, "auto_tpi_continuous_kext_alpha")?.min, input(root, "auto_tpi_continuous_kext_alpha")?.max]).toEqual(["0.005", "0.2"]);
    expect(root.textContent).toContain("Calculation method: EMA");
  });
});

describe("the tab presets", () => {
  function withPresets(own: { preset: string; value: number }[]) {
    host.hass.setWebSocketHandler((message) => {
      if (message["type"] === "vtherm_dashboard/get_thermostats") {
        return { thermostats: [], has_central_config: true, central_config_id: "central", supported_config_version: [2, 4] };
      }
      const list = message["entry_id"] === "central" ? [{ preset: "eco_temp", value: 18 }] : own;
      return { presets: list.map((preset) => ({ ...preset, entity_id: `number.${preset.preset}`, min: 7, max: 35, step: 0.1, unit: "°C" })) };
    });
  }

  it("shows the temperatures of the thermostat and proposes a change of one of them", async () => {
    withPresets([{ preset: "eco_temp", value: 17 }, { preset: "comfort_temp", value: 19 }]);
    const { element, proposals } = await render("core_presets.tab.main", { ...SWITCH, use_presets_central_config: false });
    await vi.waitFor(() => expect(findAll(element.shadowRoot as ShadowRoot, "#preset-eco_temp")).toHaveLength(1));
    const root = element.shadowRoot as ShadowRoot;
    expect(find<HTMLInputElement>(root, "#preset-eco_temp")?.value).toBe("17");
    expect(root.textContent).toContain("Eco");
    change(find<HTMLInputElement>(root, "#preset-eco_temp"), "17.5");
    expect(proposals).toEqual([{ "preset:eco_temp": 17.5 }]);
  });

  it("shows the central temperatures read-only when the thermostat uses the central presets", async () => {
    withPresets([]);
    const { element } = await render("core_presets.tab.main", { ...SWITCH, use_presets_central_config: true });
    await vi.waitFor(() => expect(findAll(element.shadowRoot as ShadowRoot, "dd")).toHaveLength(1));
    expect(find(element.shadowRoot as ShadowRoot, "dd")?.textContent).toContain("18");
  });

  it("asks to save first when the thermostat has just stopped using the central presets", async () => {
    withPresets([]);
    const { element } = await render("core_presets.tab.main", { ...SWITCH, use_presets_central_config: false });
    await vi.waitFor(() => expect(element.shadowRoot?.textContent).toContain("Save first"));
  });

  it("changes the central temperatures in the general configuration", async () => {
    withPresets([]);
    const { element } = await render("core_presets.general.main", { thermostat_type: "thermostat_central_config" });
    await vi.waitFor(() => expect(findAll(element.shadowRoot as ShadowRoot, "#preset-eco_temp")).toHaveLength(1));
  });
});

describe("the tabs of the features", () => {
  it("shows the automatic detection of a window without sensor, and hides it with a sensor", async () => {
    const without = await render("core_window.tab.main", { ...SWITCH, use_window_feature: true, use_window_central_config: false });
    expect(labels(without.root)).toEqual(expect.arrayContaining(["window_auto_open_threshold", "window_auto_close_threshold", "window_auto_max_duration"]));
    expect([input(without.root, "window_delay")?.value, input(without.root, "window_off_delay")?.value, input(without.root, "window_auto_open_threshold")?.value, input(without.root, "window_auto_close_threshold")?.value, input(without.root, "window_auto_max_duration")?.value]).toEqual(["30", "30", "3", "0", "30"]);
    const withSensor = await render("core_window.tab.main", { ...SWITCH, use_window_feature: true, use_window_central_config: false, window_sensor_entity_id: "binary_sensor.window" });
    expect(labels(withSensor.root)).not.toContain("window_auto_open_threshold");
    expect(labels(withSensor.root)).toContain("window_action");
  });

  it("shows the motion sensor and the presets of the motion", async () => {
    const { root } = await render("core_motion.tab.main", { ...SWITCH, use_motion_feature: true, use_motion_central_config: false });
    expect(labels(root)).toEqual(["motion_sensor_entity_id", "use_motion_central_config", "motion_delay", "motion_off_delay", "motion_preset", "no_motion_preset"]);
    expect([find<HTMLSelectElement>(root, "#field-motion_preset")?.value, find<HTMLSelectElement>(root, "#field-no_motion_preset")?.value]).toEqual(["comfort", "eco"]);
  });

  it("shows only the shedding temperature of a thermostat that does not use the central power configuration", async () => {
    const { root } = await render("core_power.tab.main", { ...SWITCH, use_power_feature: true, use_power_central_config: false });
    expect(labels(root)).toEqual(["use_power_central_config", "power_temp"]);
    expect(input(root, "power_temp")?.value).toBe("13");
  });

  it("shows the power sensors and the unit in the general configuration", async () => {
    const { root } = await render("core_power.general.main", { thermostat_type: "thermostat_central_config", use_power_feature: true });
    expect(labels(root)).toEqual(["power_sensor_entity_id", "max_power_sensor_entity_id", "power_unit", "power_temp"]);
  });

  it("shows the presence sensor", async () => {
    const { root } = await render("core_presence.tab.main", { ...SWITCH, use_presence_feature: true, use_presence_central_config: false });
    expect(labels(root)).toEqual(["use_presence_central_config", "presence_sensor_entity_id"]);
  });

  it("shows the central boiler with the limits of its delays, and the error of a service", async () => {
    const { root } = await render("core_central_boiler.general.main", { thermostat_type: "thermostat_central_config", use_central_boiler_feature: true }, { errors: { central_boiler_activation_service: "service_configuration_format" } });
    expect([input(root, "central_boiler_activation_delay_sec")?.min, input(root, "central_boiler_activation_delay_sec")?.max, input(root, "keep_alive_boiler_delay_sec")?.max]).toEqual(["0", "600", "3600"]);
    expect(find(root, "#error-central_boiler_activation_service")?.textContent).toBe("The format of the service configuration is wrong");
  });
});

describe("the other native tabs", () => {
  it("shows the level of auto start and stop, none by default", async () => {
    const { root } = await render("core_auto_start_stop.tab.main", { thermostat_type: "thermostat_over_climate", use_auto_start_stop_feature: true });
    expect(find<HTMLSelectElement>(root, "#field-auto_start_stop_level")?.value).toBe("auto_start_stop_none");
    expect(root.textContent).toContain("Auto start and stop level");
  });

  it("shows the valve regulation and the error on the number of entities", async () => {
    const { root } = await render("core_valve_regulation.tab.main", { thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_valve" }, { errors: { base: "valve_regulation_nb_entities_incorrect" } });
    expect(labels(root)).toEqual(expect.arrayContaining(["opening_degree_entity_ids", "closing_degree_entity_ids", "proportional_function", "opening_threshold_degree", "min_opening_degrees", "max_opening_degrees", "max_closing_degree"]));
    expect(find(root, ".base-error")?.textContent).toContain("The number of valve entities");
  });

  it("shows the synchronization of the temperature, with calibration by default", async () => {
    const { root } = await render("core_sync_temp.tab.main", { thermostat_type: "thermostat_over_climate", sync_device_internal_temp: true });
    expect(input(root, "sync_with_calibration")?.checked).toBe(true);
    expect(find(root, "#field-sync_entity_ids")?.tagName).toBe("TEXTAREA");
  });

  it("shows the humidity sensor once the feature is on, and offers the sensor that Versatile Thermostat detects", async () => {
    host.hass.setWebSocketHandler(() => ({ entity_id: "sensor.salon_humidity" }));
    const off = await render("core_humidity.tab.main", { ...SWITCH, temperature_sensor_entity_id: "sensor.indoor", use_humidity_feature: false });
    expect(labels(off.root)).toEqual(["use_humidity_feature"]);
    const on = await render("core_humidity.tab.main", { ...SWITCH, temperature_sensor_entity_id: "sensor.indoor", use_humidity_feature: true });
    await vi.waitFor(() => expect(on.root.textContent).toContain("sensor.salon_humidity"));
    find<HTMLButtonElement>(on.root, "button")?.click();
    expect(on.proposals).toEqual([{ humidity_sensor_entity_id: "sensor.salon_humidity" }]);
  });

  it("shows the advanced parameters with the defaults of Versatile Thermostat without inheritance", async () => {
    const { root } = await render("core_advanced.tab.main", { ...SWITCH, use_advanced_central_config: false });
    expect([input(root, "safety_delay_min")?.value, input(root, "repair_incorrect_state")?.checked, input(root, "manual_override_duration_min")?.value]).toEqual(["60", false, "0"]);
  });

  it("shows the lock with its defaults and the error of a code that is not four digits", async () => {
    const { root } = await render("core_lock.tab.main", { ...SWITCH, use_lock_central_config: false }, { errors: { base: "lock_code_incorrect" } });
    expect([input(root, "lock_users")?.checked, input(root, "lock_automations")?.checked, input(root, "auto_relock_sec")?.value]).toEqual([true, true, "30"]);
    expect(find(root, ".base-error")?.textContent).toBe("The lock code must be made of four digits.");
  });

  it("shows the central values of the heating failure detection read-only when they are inherited", async () => {
    const { root } = await render("core_heating_failure.tab.main", { ...SWITCH, use_heating_failure_detection_feature: true, use_heating_failure_detection_central_config: true }, { central: { ...CENTRAL, heating_failure_threshold: 0.9 } });
    expect(labels(root)).toEqual(["use_heating_failure_detection_central_config"]);
    expect(findAll(root, "dd")[0]?.textContent?.trim()).toBe("0.9");
  });

  it("shows the texts in French", async () => {
    const tpi = (await import("../src/native/plugins/core_tpi.ts")).translations;
    await tpi.setLanguage("fr");
    const { root } = await render("core_tpi.tab.main", { ...SWITCH, use_tpi_central_config: false });
    expect(root.textContent).toContain("Coefficient");
    await tpi.setLanguage("en");
  });
});
