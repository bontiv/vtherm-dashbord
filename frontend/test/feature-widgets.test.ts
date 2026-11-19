// @vitest-environment happy-dom
/**
 * The six widgets of the features in the overview of a thermostat (window, motion, load shedding, auto start and stop, lock, heating
 * failure): their declarations, their place after the base widgets, and what each one shows.
 */
import type { AnyTranslations, PlacedEntry, UiPluginDefinition } from "@vtherm/dashboard-sdk";
import type { FakeHass, FakeHost } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { minHeightOf, spanOf } from "../src/components/widgets.ts";
import { DETAIL_WIDGET_IDS, FEATURE_WIDGET_IDS, GLOBAL_WIDGET_IDS, WIDGET_IDS } from "../src/native/widgets/ids.ts";
import { nativeHost } from "./support/native-host.ts";
import { CLIMATE, ENTRY, climateAttributes, deepFindAll, deepText, vthermHass } from "./support/vtherm-runtime.ts";
import type { VthermKind } from "./support/vtherm-runtime.ts";

let host: FakeHost;
let definitions: Map<string, UiPluginDefinition>;

beforeAll(async () => {
  ({ host, definitions } = await nativeHost());
});

afterEach(async () => {
  document.body.innerHTML = "";
  for (const definition of definitions.values()) {
    await (definition.translations as AnyTranslations).setLanguage("en");
  }
});

const F = FEATURE_WIDGET_IDS;
const FEATURES = Object.values(F);

/** The widgets of the details, tested in `detail-widgets.test.ts`: left out here. */
const DETAILS: readonly string[] = Object.values(DETAIL_WIDGET_IDS);
const notDetail = (id: string): boolean => !DETAILS.includes(id);

/** The binary sensors of the features, by translation key. */
const FEATURE_SENSORS = ["window_state", "window_bypass_state", "motion_state", "overpowering_state", "heating_failure_state"] as const;

/** The entity of a binary sensor of a feature of the thermostat of the tests. */
const binary = (key: string): string => `binary_sensor.salon_${key}`;

/** The values of a thermostat with every feature on. */
const ALL_ON = {
  thermostat_type: "thermostat_over_switch",
  proportional_function: "tpi",
  use_window_feature: true,
  use_motion_feature: true,
  use_power_feature: true,
  use_heating_failure_detection_feature: true,
};

/** The values of a thermostat over a climate with the features that it can have. */
const CLIMATE_ON = { thermostat_type: "thermostat_over_climate", use_window_feature: true, use_motion_feature: true, use_power_feature: true, use_auto_start_stop_feature: true };

/** The attributes of the managers of the features of a thermostat for which they all work normally. */
function managers(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    is_window_auto_configured: true,
    window_manager: { window_state: "off", window_auto_state: "off", is_window_bypass: false, window_sensor_entity_id: "binary_sensor.salon_window" },
    motion_manager: { motion_state: "off" },
    power_manager: { overpowering_state: "off" },
    is_lock_configured: true,
    lock_manager: { is_locked: false },
    heating_failure_detection_manager: {
      heating_failure_state: "off",
      cooling_failure_state: "off",
      heating_tracking: { is_tracking: false },
      cooling_tracking: { is_tracking: false },
      root_cause: null,
      root_cause_entity_id: null,
      failure_detection_enable_template: null,
      is_detection_enabled_by_template: true,
    },
    auto_start_stop_manager: {
      auto_start_stop_enable: true,
      is_auto_stop_detected: false,
      auto_start_stop_accumulated_error: 0,
      auto_start_stop_accumulated_error_threshold: 10,
      auto_start_stop_last_switch_date: null,
    },
    ...overrides,
  };
}

/** A thermostat with the managers and the binary sensors of its features, and `specific_states` changed as asked. */
function featureHass(kind: VthermKind = "over_switch", overrides: Record<string, unknown> = {}, specific: Record<string, unknown> = {}, language = "en"): FakeHass {
  const base = climateAttributes(kind);
  const hass = vthermHass(kind, { ...managers(overrides), specific_states: { ...(base["specific_states"] as object), ...specific } }, language);
  for (const key of FEATURE_SENSORS) {
    hass.setEntity({ entity_id: binary(key), device_id: "device_salon", platform: "versatile_thermostat", translation_key: key });
    hass.setState(binary(key), "off");
  }
  return hass;
}

/** The identifiers of the widgets that a thermostat shows, in order. */
function shown(hass: FakeHass, values: Record<string, unknown>, from: FakeHost = host): string[] {
  const type = String(values["thermostat_type"] ?? "").replace("thermostat_", "") as "over_switch";
  return from.visible(from.resolved("thermostat_widget"), { hass, thermostatId: ENTRY, thermostatType: type, values, centralValues: {} }).map((entry) => entry.id).filter(notDetail);
}

const entryOf = (id: string): PlacedEntry => host.resolved("thermostat_widget").find((entry) => entry.id === id) as PlacedEntry;

/** Show a widget for the thermostat of the tests, in a language. */
async function render(id: string, hass: FakeHass, language = "en"): Promise<HTMLElement> {
  const entry = entryOf(id);
  await (definitions.get(entry.pluginId)?.translations as AnyTranslations).setLanguage(language);
  hass.setLanguage(language);
  const element = await host.render<"thermostat_widget">(entry, { thermostatId: ENTRY, hass });
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (const child of deepFindAll<HTMLElement & { updateComplete?: Promise<unknown> }>(element, "*")) {
    await child.updateComplete;
  }
  return element;
}

/** The state icon of a class in a widget: its icon, its label and its color. */
function stateIcon(element: HTMLElement, selector: string): { icon: string; label: string; tone: string } | undefined {
  const icon = deepFindAll<HTMLElement & { icon: string; label: string; tone: string }>(element, `vtherm-state-icon${selector}`)[0];
  return icon === undefined ? undefined : { icon: icon.icon, label: icon.label, tone: icon.tone };
}

/** The text of the effect of the window. */
const effectOf = (element: HTMLElement): string => deepText(deepFindAll(element, "vtherm-value-row.effect")[0] as HTMLElement);

describe("the widgets of the features", () => {
  const widgets = (id: string) => (definitions.get(id)?.contributions.thermostat_widget ?? []) as readonly { id: string; placement?: unknown; visible?: unknown; size?: unknown }[];

  it("are declared by their plugins, each with a placement, a visibility condition and no size", () => {
    expect(widgets("core_window").map((widget) => widget.id)).toEqual(["core_window.widget.window"]);
    expect(widgets("core_motion").map((widget) => widget.id)).toEqual(["core_motion.widget.motion"]);
    expect(widgets("core_power").map((widget) => widget.id).filter(notDetail)).toEqual(["core_power.widget.overpowering"]);
    expect(widgets("core_auto_start_stop").map((widget) => widget.id)).toEqual(["core_auto_start_stop.widget.auto_start_stop"]);
    expect(widgets("core_lock").map((widget) => widget.id)).toEqual(["core_lock.widget.lock"]);
    expect(widgets("core_heating_failure").map((widget) => widget.id)).toEqual(["core_heating_failure.widget.failure"]);
    for (const plugin of ["core_window", "core_motion", "core_power", "core_auto_start_stop", "core_lock", "core_heating_failure"]) {
      for (const widget of widgets(plugin).filter((candidate) => notDetail(candidate.id))) {
        expect(widget.placement, widget.id).toBeDefined();
        expect(typeof widget.visible, widget.id).toBe("function");
        expect(widget.size, widget.id).toBeUndefined();
      }
    }
  });

  it("registers the load shedding of core_power without removing its widget of the Overview page", () => {
    expect(host.resolved("thermostat_widget").filter((entry) => entry.pluginId === "core_power").map((entry) => entry.id).filter(notDetail)).toEqual([F.overpowering]);
    expect(host.resolved("global_widget").filter((entry) => entry.pluginId === "core_power").map((entry) => entry.id)).toEqual([GLOBAL_WIDGET_IDS.housePower]);
  });

  it("are declared without any problem of placement", () => {
    expect(host.issues()).toEqual([]);
  });

  it("lose the motion when core_motion is not loaded, the others keeping their place", async () => {
    const { host: without } = await nativeHost(["core_motion"]);
    const ids = without.resolved("thermostat_widget").map((entry) => entry.id).filter(notDetail);
    expect(ids).not.toContain(F.motion);
    expect(ids.slice(-5)).toEqual([F.window, F.overpowering, F.autoStartStop, F.lock, F.failure]);
    expect(shown(featureHass(), ALL_ON, without).slice(-4)).toEqual([F.window, F.overpowering, F.lock, F.failure]);
  });

  it("go last, in their order, when the preset that they follow is not there", async () => {
    const { host: without } = await nativeHost(["core_presets"]);
    expect(without.resolved("thermostat_widget").map((entry) => entry.id).filter(notDetail)).toEqual([
      WIDGET_IDS.temperature,
      WIDGET_IDS.mode,
      WIDGET_IDS.alerts,
      WIDGET_IDS.heating,
      WIDGET_IDS.valve,
      F.window,
      F.motion,
      F.overpowering,
      F.autoStartStop,
      F.lock,
      F.failure,
      WIDGET_IDS.safety,
    ]);
    expect(without.issues().filter((issue) => issue.contributionId === F.window).map((issue) => issue.code)).toEqual(["target_missing"]);
  });
});

describe("the place of the widgets of the features", () => {
  it("follows the base widgets in the order window, motion, load shedding, auto start and stop, lock, heating failure", () => {
    expect(host.resolved("thermostat_widget").map((entry) => entry.id).filter(notDetail)).toEqual([...Object.values(WIDGET_IDS), ...FEATURES]);
    expect(shown(featureHass(), ALL_ON)).toEqual([WIDGET_IDS.temperature, WIDGET_IDS.mode, WIDGET_IDS.alerts, WIDGET_IDS.heating, WIDGET_IDS.preset, WIDGET_IDS.safety, F.window, F.motion, F.overpowering, F.lock, F.failure]);
    expect(shown(featureHass("over_climate"), CLIMATE_ON).slice(-5)).toEqual([F.window, F.motion, F.overpowering, F.autoStartStop, F.lock]);
  });

  it("keeps the motion right after the base widgets when the window detection is off", () => {
    const ids = shown(featureHass(), { ...ALL_ON, use_window_feature: false });
    expect(ids).not.toContain(F.window);
    expect(ids.slice(ids.indexOf(WIDGET_IDS.preset))).toEqual([WIDGET_IDS.preset, WIDGET_IDS.safety, F.motion, F.overpowering, F.lock, F.failure]);
  });

  it("shows no card of a feature that is off", () => {
    const ids = shown(featureHass("over_switch", { is_lock_configured: false }), { thermostat_type: "thermostat_over_switch", proportional_function: "tpi" });
    expect(ids.filter((id) => FEATURES.includes(id as never))).toEqual([]);
  });

  it("gives each card one column and no minimal height, at 1440 px and on a phone", () => {
    for (const id of FEATURES) {
      const size = (entryOf(id).contribution as { size?: undefined }).size;
      expect(spanOf(size, 4), id).toBe("span 1");
      expect(spanOf(size, 1), id).toBe("span 1");
      expect(minHeightOf(undefined), id).toBeUndefined();
    }
  });
});

describe("the widget Window", () => {
  it("shows the window open, and the effect Off when the window turned the thermostat off", async () => {
    const hass = featureHass("over_switch", { window_manager: { window_state: "on", window_auto_state: "off", is_window_bypass: false, window_sensor_entity_id: "binary_sensor.window" } }, { hvac_off_reason: "hvac_off_window_detection", hvac_mode_reason: "hvac_off_window_detection" });
    hass.setState(CLIMATE, "off", hass.states[CLIMATE]?.attributes ?? {});
    const element = await render(F.window, hass, "fr");
    expect(stateIcon(element, ".sensor")).toMatchObject({ icon: "mdi:window-open-variant", label: "Ouverte" });
    expect(effectOf(element)).toBe("Effet Arrêt");
  });

  it("shows the frost protection when the window applies the frost setpoint", async () => {
    const hass = featureHass("over_switch", {}, { messages: ["target_temp_window_frost"], hvac_mode_reason: "hvac_off_window_detection" });
    expect(effectOf(await render(F.window, hass, "fr"))).toBe("Effet Hors-gel");
  });

  it("shows the eco setpoint, and the fan of a thermostat over a climate", async () => {
    expect(effectOf(await render(F.window, featureHass("over_switch", {}, { messages: ["target_temp_window_eco"] })))).toBe("Effect Eco");
    const fan = featureHass("over_climate", {}, { hvac_mode_reason: "hvac_off_window_detection" });
    fan.setState(CLIMATE, "fan_only", fan.states[CLIMATE]?.attributes ?? {});
    expect(effectOf(await render(F.window, fan))).toBe("Effect Fan only");
  });

  it("shows the bypass and no effect when the bypass is on while the window is open", async () => {
    const hass = featureHass("over_switch", { window_manager: { window_state: "on", window_auto_state: "off", is_window_bypass: true, window_sensor_entity_id: "binary_sensor.window" } });
    const element = await render(F.window, hass, "fr");
    expect(stateIcon(element, ".bypass")?.label).toBe("Contournement actif");
    expect(effectOf(element)).toBe("Effet Aucun");
  });

  it("shows the automatic detection only when it is configured", async () => {
    expect(stateIcon(await render(F.window, featureHass()), ".auto")?.label).toBe("No drop of temperature");
    expect(stateIcon(await render(F.window, featureHass("over_switch", { is_window_auto_configured: false })), ".auto")).toBeUndefined();
  });

  it("shows Unknown and no effect when the sensor is unknown", async () => {
    const hass = featureHass("over_switch", { window_manager: { window_state: "unknown", window_auto_state: "off", is_window_bypass: false, window_sensor_entity_id: "binary_sensor.window" } });
    const element = await render(F.window, hass, "fr");
    expect(stateIcon(element, ".sensor")?.label).toBe("Inconnu");
    expect(effectOf(element)).toBe("Effet Aucun");
  });

  it("draws no button and no delay", async () => {
    const element = await render(F.window, featureHass());
    expect(deepFindAll(element, "button, ha-button, ha-switch, vtherm-age")).toHaveLength(0);
  });

  it("is hidden when the window detection is off, or its binary sensor does not exist", () => {
    expect(shown(featureHass(), { ...ALL_ON, use_window_feature: false })).not.toContain(F.window);
    expect(shown(vthermHass("over_switch", managers()), ALL_ON)).not.toContain(F.window);
  });
});

describe("the widget Motion", () => {
  it("shows the motion and the label of the preset of activity", async () => {
    const hass = featureHass("over_switch", { motion_manager: { motion_state: "on" } }, { messages: ["target_temp_activity_detected"] });
    const element = await render(F.motion, hass, "fr");
    expect(stateIcon(element, ".motion")).toMatchObject({ icon: "mdi:motion-sensor", label: "Mouvement" });
    expect(stateIcon(element, ".activity")?.label).toBe("Preset d'activité en vigueur");
  });

  it("shows No motion without the label", async () => {
    const element = await render(F.motion, featureHass(), "fr");
    expect(stateIcon(element, ".motion")).toMatchObject({ icon: "mdi:motion-sensor-off", label: "Aucun mouvement" });
    expect(stateIcon(element, ".activity")).toBeUndefined();
  });

  it("is hidden when the motion detection is off", () => {
    expect(shown(featureHass(), { ...ALL_ON, use_motion_feature: false })).not.toContain(F.motion);
  });
});

describe("the widget Load shedding", () => {
  it("shows an alert in the color of a warning while the load shedding is active", async () => {
    const element = await render(F.overpowering, featureHass("over_switch", { power_manager: { overpowering_state: "on" } }), "fr");
    expect(stateIcon(element, ".overpowering")).toEqual({ icon: "mdi:flash-alert", label: "Délestage actif", tone: "warning" });
    expect(deepFindAll(element, "[role=alert]")).toHaveLength(1);
  });

  it("shows a check mark and No load shedding otherwise", async () => {
    expect(stateIcon(await render(F.overpowering, featureHass(), "fr"), ".overpowering")).toEqual({ icon: "mdi:check-circle-outline", label: "Pas de délestage", tone: "success" });
  });

  it("is hidden when the power management is off", () => {
    expect(shown(featureHass(), { ...ALL_ON, use_power_feature: false })).not.toContain(F.overpowering);
  });
});

describe("the widget Auto start and stop", () => {
  const meterName = (element: HTMLElement): string => deepFindAll(deepFindAll(element, "vtherm-gauge")[0] as HTMLElement, "[role=meter]")[0]?.getAttribute("aria-label") ?? "";
  const auto = (values: Record<string, unknown>) => ({
    auto_start_stop_manager: {
      auto_start_stop_enable: true,
      is_auto_stop_detected: false,
      auto_start_stop_accumulated_error: 0,
      auto_start_stop_accumulated_error_threshold: 10,
      auto_start_stop_last_switch_date: null,
      ...values,
    },
  });

  it("shows the automatic stop and the accumulated error on a gauge with its threshold", async () => {
    const element = await render(F.autoStartStop, featureHass("over_climate", auto({ is_auto_stop_detected: true, auto_start_stop_accumulated_error: 4.2 })), "fr");
    expect(stateIcon(element, ".stop")).toMatchObject({ icon: "mdi:stop-circle-outline", label: "Arrêt automatique" });
    expect(meterName(element)).toBe("4,2 sur une plage de -10 à 10, seuil 10");
  });

  it("shows Disabled and stays shown when the feature is disabled", async () => {
    const hass = featureHass("over_climate", auto({ auto_start_stop_enable: false }));
    expect(stateIcon(await render(F.autoStartStop, hass, "fr"), ".enable")?.label).toBe("Désactivée");
    expect(shown(hass, CLIMATE_ON)).toContain(F.autoStartStop);
  });

  it("shows the age of the last switch with the full date in its tooltip", async () => {
    const hass = featureHass("over_climate", auto({ auto_start_stop_last_switch_date: new Date(Date.now() - 2 * 3_600_000).toISOString() }));
    const age = deepFindAll(await render(F.autoStartStop, hass, "fr"), ".last-switch vtherm-age")[0] as HTMLElement;
    const time = deepFindAll(age, "time")[0];
    expect(time?.textContent).toBe("il y a 2 heures");
    expect(time?.getAttribute("title")).not.toBe("");
  });

  it("draws no switch and no next action", async () => {
    const element = await render(F.autoStartStop, featureHass("over_climate"));
    expect(deepFindAll(element, "button, ha-button, ha-switch, input")).toHaveLength(0);
  });

  it("is hidden for a thermostat over a switch, and over a climate with valves", () => {
    expect(shown(featureHass("over_switch"), { ...ALL_ON, use_auto_start_stop_feature: true })).not.toContain(F.autoStartStop);
    expect(shown(featureHass("over_climate"), { ...CLIMATE_ON, auto_regulation_mode: "auto_regulation_valve" })).not.toContain(F.autoStartStop);
  });
});

describe("the widget Lock", () => {
  it("shows a closed padlock and Locked", async () => {
    const element = await render(F.lock, featureHass("over_switch", { lock_manager: { is_locked: true } }, { is_locked: true }), "fr");
    expect(stateIcon(element, ".lock")).toMatchObject({ icon: "mdi:lock", label: "Verrouillé" });
    expect(deepFindAll(element, "button, ha-button, vtherm-age")).toHaveLength(0);
  });

  it("shows an open padlock and Unlocked", async () => {
    expect(stateIcon(await render(F.lock, featureHass("over_switch", {}, { is_locked: false }), "fr"), ".lock")).toMatchObject({ icon: "mdi:lock-open-variant", label: "Libre" });
  });

  it("is hidden when the lock is not configured", () => {
    expect(shown(featureHass("over_switch", { is_lock_configured: false }), ALL_ON)).not.toContain(F.lock);
  });
});

describe("the widget Heating failure", () => {
  const failure = (values: Record<string, unknown>) => ({
    heating_failure_detection_manager: {
      heating_failure_state: "off",
      cooling_failure_state: "off",
      heating_tracking: { is_tracking: false },
      cooling_tracking: { is_tracking: false },
      root_cause: null,
      root_cause_entity_id: null,
      failure_detection_enable_template: null,
      is_detection_enabled_by_template: true,
      ...values,
    },
  });

  it("shows the heating failure, its probable cause and a link that opens the information of the entity", async () => {
    const hass = featureHass("over_switch", failure({ heating_failure_state: "on", root_cause: "valve_stuck_closed", root_cause_entity_id: "switch.radiateur" }));
    hass.setState("switch.radiateur", "off", {});
    const element = await render(F.failure, hass, "fr");
    expect(stateIcon(element, ".heating")).toMatchObject({ label: "Panne de chauffage", tone: "warning" });
    expect(deepText(deepFindAll(element, ".cause")[0] as HTMLElement)).toContain("Cause probable : vanne bloquée fermée");
    const opened: string[] = [];
    element.addEventListener("hass-more-info", (event) => opened.push((event as CustomEvent<{ entityId: string }>).detail.entityId));
    (deepFindAll<HTMLButtonElement>(element, "button.more-info")[0] as HTMLButtonElement).click();
    expect(opened).toEqual(["switch.radiateur"]);
  });

  it("shows a check in progress on a bar of 60 % with the minutes", async () => {
    const hass = featureHass("over_switch", failure({ heating_tracking: { is_tracking: true, initial_temperature: 19, current_temperature: 19.1, elapsed_time_min: 6, remaining_time_min: 4 } }));
    const element = await render(F.failure, hass, "fr");
    const bar = deepFindAll<HTMLElement & { value: number }>(element, ".tracking.heating vtherm-bar")[0];
    expect(bar?.value).toBe(60);
    expect(deepText(deepFindAll(element, ".tracking.heating")[0] as HTMLElement)).toContain("6 min écoulées, 4 min restantes");
    expect(stateIcon(element, ".none")).toBeUndefined();
  });

  it("says No failure with a check mark when nothing is in progress", async () => {
    expect(stateIcon(await render(F.failure, featureHass(), "fr"), ".none")).toMatchObject({ icon: "mdi:check-circle-outline", label: "Aucune panne" });
  });

  it("shows the detection paused by its template", async () => {
    const hass = featureHass("over_switch", failure({ failure_detection_enable_template: "{{ is_state('input_boolean.away', 'off') }}", is_detection_enabled_by_template: false }));
    expect(stateIcon(await render(F.failure, hass, "fr"), ".paused")?.label).toBe("Détection suspendue par le modèle");
    expect(stateIcon(await render(F.failure, featureHass(), "fr"), ".paused")).toBeUndefined();
  });

  it("is hidden for a thermostat over a climate without valves, and when the detection is off", () => {
    expect(shown(featureHass("over_climate"), { ...CLIMATE_ON, use_heating_failure_detection_feature: true })).not.toContain(F.failure);
    expect(shown(featureHass("over_climate"), { ...CLIMATE_ON, use_heating_failure_detection_feature: true, auto_regulation_mode: "auto_regulation_valve" })).toContain(F.failure);
    expect(shown(featureHass(), { ...ALL_ON, use_heating_failure_detection_feature: false })).not.toContain(F.failure);
  });
});

describe("the widgets of the features in German and in the dark theme", () => {
  it("draw their titles and their texts in German", async () => {
    const hass = featureHass("over_climate", {}, {}, "de");
    const titles: string[] = [];
    for (const id of FEATURES) {
      titles.push(deepFindAll(await render(id, hass, "de"), "h3")[0]?.textContent ?? "");
    }
    expect(titles).toEqual(["Fenster", "Bewegung", "Lastabwurf", "Automatischer Start und Stopp", "Sperre", "Heizungsausfall"]);
    expect(effectOf(await render(F.window, hass, "de"))).toBe("Wirkung Keine");
    expect(stateIcon(await render(F.overpowering, hass, "de"), ".overpowering")?.label).toBe("Kein Lastabwurf");
    expect(stateIcon(await render(F.failure, hass, "de"), ".none")?.label).toBe("Kein Ausfall");
  });

  it("color the alerts, the gauges and the bars with the variables of the theme", async () => {
    const { VThermBar, VThermGauge, VThermStateIcon } = await import("../src/components/overview/index.ts");
    for (const element of [VThermBar, VThermGauge, VThermStateIcon]) {
      const css = [(element as unknown as { styles: unknown }).styles]
        .flat(3)
        .map((style) => (style as { cssText?: string }).cssText ?? "")
        .join("\n");
      expect(css, element.name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/);
    }
    const icon = [(VThermStateIcon as unknown as { styles: unknown }).styles].flat(3).map((style) => (style as { cssText?: string }).cssText ?? "").join("\n");
    expect(icon).toContain("var(--warning-color)");
    vi.restoreAllMocks();
  });
});
