// @vitest-environment happy-dom
/**
 * The seven widgets of the details in the overview of a thermostat (history of 24 hours, equipment, Auto TPI, humidity, tracking of the
 * equipment, demand to the boiler, energy): their declarations, their place after the widgets of the features, their sizes, and what each
 * one shows.
 */
import type { AnyTranslations, PlacedEntry, UiPluginDefinition } from "@vtherm/dashboard-sdk";
import type { FakeHass, FakeHost } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DETAIL_WIDGET_IDS, FEATURE_WIDGET_IDS } from "../src/native/widgets/ids.ts";
import { nativeHost } from "./support/native-host.ts";
import { CLIMATE, ENTRY, climateAttributes, deepFindAll, deepText, vthermHass } from "./support/vtherm-runtime.ts";
import type { VthermKind } from "./support/vtherm-runtime.ts";

let host: FakeHost;
let definitions: Map<string, UiPluginDefinition>;

/** The history module that the widgets use: the one that the first load of the plugins imported. */
let history: typeof import("../src/native/history.ts");

beforeAll(async () => {
  ({ host, definitions } = await nativeHost());
  history = await import("../src/native/history.ts");
});

afterEach(async () => {
  document.body.innerHTML = "";
  // Each test answers the history in its own way: none reads what another kept.
  history.sharedHistory(undefined).clear();
  vi.unstubAllGlobals();
  for (const definition of definitions.values()) {
    await (definition.translations as AnyTranslations).setLanguage("en");
  }
});

const D = DETAIL_WIDGET_IDS;
const ORDER = [D.devices, D.autoTpi, D.boiler, D.energy, D.humidity, D.sync, D.history];

/** The sensors of the details of the thermostat of the tests, by translation key. */
const sensor = (key: string): string => `sensor.salon_${key}`;

/** Add a sensor of the thermostat of the tests, with its state. */
function addSensor(hass: FakeHass, key: string, state: string, attributes: Record<string, unknown> = {}): void {
  hass.setEntity({ entity_id: sensor(key), device_id: "device_salon", platform: "versatile_thermostat", translation_key: key });
  hass.setState(sensor(key), state, attributes);
}

/** The attributes of the sensor of the learning of Auto TPI while it learns. */
const LEARNING = {
  coeff_int_cycles: 30,
  coeff_ext_cycles: 12,
  heating_cycles_count: 42,
  thermal_time_constant_hours: 3.2,
  model_confidence: 0.62,
  last_learning_status: "learning",
  learning_start_dt: "2026-11-18T08:00:00+00:00",
  max_capacity_heat: 1.25,
  capacity_heat_status: "learned",
  capacity_heat_count: 8,
  calculated_coef_int: 0.55,
  calculated_coef_ext: 0.012,
};

/** A thermostat with its equipment, its Auto TPI, its energy and its humidity; over a climate, with the tracking of its setpoint. */
function detailHass(kind: VthermKind = "over_switch", attributes: Record<string, unknown> = {}, specific: Record<string, unknown> = {}, language = "en"): FakeHass {
  const base = climateAttributes(kind);
  const over =
    kind === "over_switch"
      ? { vtherm_over_switch: { ...(base["vtherm_over_switch"] as object), underlying_entities: ["switch.radiator_1", "switch.radiator_2"] } }
      : {
          vtherm_over_climate: {
            underlying_entities: ["climate.clim_salon"],
            underlying_temperature_tracking: {
              attempts: 0,
              suspended: false,
              reason: "tracking_armed",
              underlyings: { "climate.clim_salon": { requested_temperature: 21, last_sent_temperature: 20.5, observed_temperature: 20.5, status: "accepted" } },
            },
          },
          fan_mode: "auto",
        };
  const hass = vthermHass(
    kind,
    {
      current_humidity: 48.5,
      configuration: { is_used_by_central_boiler: true },
      ...over,
      ...attributes,
      specific_states: { ...(base["specific_states"] as object), is_device_active: true, should_device_be_active: true, nb_device_actives: 1, ...specific },
    },
    language,
  );
  hass.setState("switch.radiator_1", "on", { friendly_name: "Radiator 1" });
  hass.setState("switch.radiator_2", "off", { friendly_name: "Radiator 2" });
  hass.setState("climate.clim_salon", "heat", { friendly_name: "Clim salon" });
  addSensor(hass, "auto_tpi_learning", "active", LEARNING);
  addSensor(hass, "energy", "12.4", { unit_of_measurement: "kWh" });
  addSensor(hass, "mean_power_cycle", "420", { unit_of_measurement: "W" });
  return hass;
}

/** The values of a thermostat that uses TPI with Auto TPI, the central boiler, and its own outdoor sensor. */
const VALUES = {
  thermostat_type: "thermostat_over_switch",
  proportional_function: "tpi",
  auto_tpi_mode: true,
  used_by_controls_central_boiler: true,
  use_main_central_config: false,
  external_temperature_sensor_entity_id: "sensor.outdoor",
};
const CENTRAL = { use_central_boiler_feature: true };

/** The identifiers of the widgets of the details that a thermostat shows, in order. */
function shown(hass: FakeHass, values: Record<string, unknown> = VALUES, centralValues: Record<string, unknown> = CENTRAL, from: FakeHost = host): string[] {
  const type = String(values["thermostat_type"] ?? "").replace("thermostat_", "") as "over_switch";
  const ids: readonly string[] = ORDER;
  return from
    .visible(from.resolved("thermostat_widget"), { hass, thermostatId: ENTRY, thermostatType: type, values, centralValues })
    .map((entry) => entry.id)
    .filter((id) => ids.includes(id));
}

const entryOf = (id: string): PlacedEntry => host.resolved("thermostat_widget").find((entry) => entry.id === id) as PlacedEntry;

/** Wait until the widget, its children and the reads that it started have drawn. */
async function settle(element: HTMLElement): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (const child of [element, ...deepFindAll<HTMLElement & { updateComplete?: Promise<unknown> }>(element, "*")]) {
      await (child as { updateComplete?: Promise<unknown> }).updateComplete;
    }
  }
}

/** Show a widget for the thermostat of the tests, with the values of its configuration, in a language. */
async function render(id: string, hass: FakeHass, options: { language?: string; visible?: boolean; values?: Record<string, unknown>; centralValues?: Record<string, unknown> } = {}): Promise<HTMLElement & { visible: boolean }> {
  const entry = entryOf(id);
  const language = options.language ?? "en";
  await (definitions.get(entry.pluginId)?.translations as AnyTranslations).setLanguage(language);
  hass.setLanguage(language);
  const props = { thermostatId: ENTRY, hass, values: options.values ?? VALUES, centralValues: options.centralValues ?? CENTRAL };
  const element = (await host.render<"thermostat_widget">(entry, props as never)) as HTMLElement & { visible: boolean };
  if (options.visible === true) {
    element.visible = true;
  }
  await settle(element);
  return element;
}

/** The text of a widget, with the spaces of the numbers made plain. */
const textOf = (element: HTMLElement): string => deepText(element).replace(/[\u00a0\u202f]/g, " ");

/** The state icon of a class in a widget: its icon, its label, its tooltip and its color. */
function stateIcon(element: HTMLElement, selector: string): { icon: string; label: string; tooltip: string; tone: string } | undefined {
  const icon = deepFindAll<HTMLElement & { icon: string; label: string; tooltip: string; tone: string }>(element, `vtherm-state-icon${selector}`)[0];
  return icon === undefined ? undefined : { icon: icon.icon, label: icon.label, tooltip: icon.tooltip, tone: icon.tone };
}

/** The charts of a widget: their label, the labels of their series, the number of points of each, and their summary. */
function chartsOf(element: HTMLElement) {
  return deepFindAll<HTMLElement & { label: string; summary: string; series: readonly { label: string; points: readonly unknown[]; format: (value: number) => string }[] }>(element, "vtherm-time-chart").map((chart) => ({
    label: chart.label,
    series: chart.series.map((series) => series.label),
    points: chart.series.map((series) => series.points.length),
    format: chart.series[0]?.format(19.5).replace(/[\u00a0\u202f]/g, " "),
    summary: chart.summary,
  }));
}

/** A recorder that answers the history of the thermostat and of its outdoor sensor, and keeps the requests. */
function recorder(hass: FakeHass, options: { failing?: boolean; withoutSetpoint?: boolean } = {}): Readonly<Record<string, unknown>>[] {
  const now = Date.now() / 1000;
  const requests: Readonly<Record<string, unknown>>[] = [];
  hass.setWebSocketHandler((message) => {
    requests.push(message);
    if (options.failing === true) {
      throw new Error("recorder down");
    }
    const entityId = (message["entity_ids"] as string[])[0] as string;
    if (entityId === CLIMATE) {
      const attributes = (temperature: number, setpoint: number, power: number) => ({ current_temperature: temperature, ...(options.withoutSetpoint === true ? {} : { temperature: setpoint }), power_percent: power });
      return { [CLIMATE]: [{ s: "heat", a: attributes(18.5, 21, 80), lu: now - 20 * 3600 }, { s: "heat", a: attributes(20.5, 21, 40), lu: now - 3600 }] };
    }
    return { [entityId]: [{ s: "4.5", lu: now - 20 * 3600 }, { s: "6.2", lu: now - 600 }] };
  });
  return requests;
}

describe("the widgets of the details", () => {
  const widgets = (id: string) => (definitions.get(id)?.contributions.thermostat_widget ?? []) as readonly { id: string; placement?: unknown; visible?: unknown; size?: unknown }[];

  it("are declared by their plugins, each with a placement, a visibility condition and its size", () => {
    const declared = new Map([...definitions.values()].flatMap((definition) => widgets(definition.id).map((widget) => [widget.id, { plugin: definition.id, widget }] as const)));
    const expected: Record<string, readonly [string, unknown]> = {
      [D.history]: ["core", { columns: 2, rows: 2 }],
      [D.devices]: ["core", undefined],
      [D.autoTpi]: ["core_tpi", { columns: 1, rows: 2 }],
      [D.humidity]: ["core_humidity", undefined],
      [D.sync]: ["core_sync_temp", undefined],
      [D.boiler]: ["core_central_boiler", undefined],
      [D.energy]: ["core_power", { columns: 1, rows: 2 }],
    };
    for (const [id, [plugin, size]] of Object.entries(expected)) {
      const found = declared.get(id);
      expect(found?.plugin, id).toBe(plugin);
      expect(found?.widget.placement, id).toBeDefined();
      expect(typeof found?.widget.visible, id).toBe("function");
      expect(found?.widget.size, id).toEqual(size);
    }
  });

  it("gives core the history and the equipment too, each with its placement and its visibility condition", () => {
    expect(widgets("core").map((widget) => widget.id)).toEqual(expect.arrayContaining([D.history, D.devices]));
  });

  it("are declared without any problem of placement", () => {
    expect(host.issues()).toEqual([]);
  });

  it("let a third-party plugin replace the history, which stays last", async () => {
    const { host: other } = await nativeHost();
    other.registerPlugin({
      id: "smartchart",
      translations: definitions.get("core")?.translations as AnyTranslations,
      contributions: { thermostat_widget: [{ id: "smartchart.widget", component: "smartchart-widget", placement: { replace: D.history } }] },
    });
    expect(other.resolved("thermostat_widget").map((entry) => entry.id).at(-1)).toBe("smartchart.widget");
  });
});

describe("the place of the widgets of the details", () => {
  it("follows the widgets of the features: equipment, Auto TPI, boiler, energy, humidity, tracking, then the history last", () => {
    const ids = host.resolved("thermostat_widget").map((entry) => entry.id);
    expect(ids.slice(-ORDER.length)).toEqual(ORDER);
    expect(ids.indexOf(FEATURE_WIDGET_IDS.failure)).toBeLessThan(ids.indexOf(D.devices));
  });

  it("shows them in this order when all are visible", () => {
    const hass = detailHass("over_climate");
    expect(shown(hass, { ...VALUES, thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_valve" })).toEqual(ORDER);
  });

  it("keeps the relative order of the others when a third-party plugin removes the equipment", async () => {
    const { host: other } = await nativeHost();
    other.registerPlugin({ id: "quiet", translations: definitions.get("core")?.translations as AnyTranslations, contributions: { thermostat_widget: [{ id: "quiet.remove", placement: { remove: D.devices } }] } });
    const ids = other.resolved("thermostat_widget").map((entry) => entry.id);
    expect(ids.filter((id) => (ORDER as readonly string[]).includes(id))).toEqual(ORDER.slice(1));
  });
});

describe("the widget History of 24 hours", () => {
  it("reads no history while its card is not visible", async () => {
    const hass = detailHass();
    const requests = recorder(hass);
    const element = await render(D.history, hass);
    expect(requests).toEqual([]);
    expect(deepFindAll(element, "vtherm-time-chart")).toHaveLength(0);
  });

  it("shows the temperatures with three series and the heating share on a second chart", async () => {
    const hass = detailHass();
    hass.setState("sensor.outdoor", "6.2", { unit_of_measurement: "°C" });
    const requests = recorder(hass);
    const charts = chartsOf(await render(D.history, hass, { visible: true, language: "fr" }));
    expect(requests.map((request) => (request["entity_ids"] as string[])[0])).toEqual([CLIMATE, "sensor.outdoor"]);
    expect(requests[0]).toMatchObject({ no_attributes: false, minimal_response: false });
    expect(charts).toEqual([
      { label: "Températures sur 24 heures", series: ["Pièce", "Consigne", "Extérieure"], points: [2, 2, 2], format: "19,5 °C", summary: expect.stringContaining("18,5 °C") },
      { label: "Puissance demandée sur 24 heures", series: ["Puissance demandée"], points: [2], format: "20 %", summary: expect.stringContaining("40 %") },
    ]);
  });

  it("shows only the temperatures when the thermostat has no heating share", async () => {
    const attributes = climateAttributes("over_climate");
    const hass = detailHass("over_climate", { power_percent: undefined, on_percent: undefined });
    hass.setState(CLIMATE, "heat", { ...(hass.states[CLIMATE]?.attributes ?? attributes), power_percent: undefined });
    recorder(hass);
    const charts = chartsOf(await render(D.history, hass, { visible: true, values: { ...VALUES, external_temperature_sensor_entity_id: undefined } }));
    expect(charts.map((chart) => chart.label)).toEqual(["Temperatures over 24 hours"]);
  });

  it("has no outdoor series, in the chart or its legend, without an outdoor sensor", async () => {
    const hass = detailHass();
    recorder(hass);
    const charts = chartsOf(await render(D.history, hass, { visible: true, values: { ...VALUES, external_temperature_sensor_entity_id: undefined } }));
    expect(charts[0]?.series).toEqual(["Room", "Setpoint"]);
  });

  it("reads the outdoor sensor of the central configuration when the thermostat uses it", async () => {
    const hass = detailHass();
    const requests = recorder(hass);
    await render(D.history, hass, { visible: true, values: { ...VALUES, use_main_central_config: true }, centralValues: { ...CENTRAL, external_temperature_sensor_entity_id: "sensor.central_outdoor" } });
    expect(requests.map((request) => (request["entity_ids"] as string[])[0])).toContain("sensor.central_outdoor");
  });

  it("leaves out a value that the recorder does not keep, without an error", async () => {
    const hass = detailHass();
    recorder(hass, { withoutSetpoint: true });
    const element = await render(D.history, hass, { visible: true, values: { ...VALUES, external_temperature_sensor_entity_id: undefined } });
    expect(chartsOf(element)[0]?.series).toEqual(["Room"]);
    expect(textOf(element)).not.toContain("History unavailable");
  });

  it("shows History unavailable instead of the charts when the history cannot be read", async () => {
    const hass = detailHass();
    recorder(hass, { failing: true });
    const element = await render(D.history, hass, { visible: true, language: "fr" });
    expect(textOf(element)).toContain("Historique indisponible");
    expect(deepFindAll(element, "vtherm-time-chart")).toHaveLength(0);
  });

  it("draws no selector of period and no command", async () => {
    const hass = detailHass();
    recorder(hass);
    const element = await render(D.history, hass, { visible: true });
    expect(deepFindAll(element, "select, ha-select, button, ha-button, input")).toHaveLength(0);
    expect(hass.serviceCalls).toEqual([]);
  });

  it("is shown for every thermostat that exists", () => {
    expect(shown(vthermHass("over_switch"), { thermostat_type: "thermostat_over_switch" }, {})).toEqual([D.history]);
  });
});

describe("the widget Equipment", () => {
  it("shows each equipment with its name and its state", async () => {
    const element = await render(D.devices, detailHass());
    const items = deepFindAll(element, "ul.equipment li");
    expect(items.map((item) => deepText(item))).toEqual(["Radiator 1 on", "Radiator 2 off"]);
    expect(stateIcon(element, ".activity")?.label).toBe("1 active");
  });

  it("warns when an equipment should be active and is off", async () => {
    const element = await render(D.devices, detailHass("over_switch", {}, { is_device_active: false }), { language: "fr" });
    expect(stateIcon(element, ".expected")).toMatchObject({ label: "Attendu actif, éteint", tone: "warning" });
  });

  it("shows an unavailable equipment as unavailable, and the others", async () => {
    const hass = detailHass();
    hass.setState("switch.radiator_2", "unavailable", { friendly_name: "Radiator 2" });
    const items = deepFindAll(await render(D.devices, hass, { language: "fr" }), "ul.equipment li");
    expect(items.map((item) => deepText(item))).toEqual(["Radiator 1 on", "Radiator 2 indisponible"]);
  });

  it("shows the fan mode of a thermostat over a climate", async () => {
    const element = await render(D.devices, detailHass("over_climate"), { language: "fr", values: { ...VALUES, thermostat_type: "thermostat_over_climate" } });
    expect(stateIcon(element, ".fan")).toMatchObject({ icon: "mdi:fan", label: "Ventilation : Auto" });
  });

  it("is hidden when the thermostat publishes no equipment", () => {
    expect(shown(vthermHass("over_switch"))).not.toContain(D.devices);
  });
});

describe("the widget Auto TPI learning", () => {
  it("shows the state, the cycles, the coefficients and the confidence in percent", async () => {
    const element = await render(D.autoTpi, detailHass(), { language: "fr" });
    expect(stateIcon(element, ".state")).toMatchObject({ icon: "mdi:school", label: "Actif" });
    const text = textOf(element);
    expect(text).toContain("42 cycles");
    expect(text).toContain("coef. int 0,55 · coef. ext 0,012");
    expect(text).toContain("3,2 h");
    expect(text).toContain("learning");
    expect((deepFindAll(element, "vtherm-bar.confidence")[0] as HTMLElement & { value: number }).value).toBe(62);
    expect(stateIcon(element, ".capacity")?.label).toBe("Capacité de chauffe apprise : 1,25 (8 mesures)");
    expect(deepFindAll(element, "button, ha-button, ha-switch")).toHaveLength(0);
  });

  it("shows the status of the last learning as Versatile Thermostat writes it", async () => {
    const hass = detailHass();
    addSensor(hass, "auto_tpi_learning", "off", { ...LEARNING, last_learning_status: "stopped: outdoor temperature too high" });
    expect(textOf(await render(D.autoTpi, hass))).toContain("stopped: outdoor temperature too high");
  });

  it("stays shown with Stopped and the last results when the learning is off", async () => {
    const hass = detailHass();
    addSensor(hass, "auto_tpi_learning", "off", LEARNING);
    expect(shown(hass)).toContain(D.autoTpi);
    const element = await render(D.autoTpi, hass, { language: "fr" });
    expect(stateIcon(element, ".state")?.label).toBe("Arrêté");
    expect(textOf(element)).toContain("42 cycles");
  });

  it("is hidden when the option is off, the sensor is disabled, or the algorithm is not TPI", () => {
    expect(shown(detailHass(), { ...VALUES, auto_tpi_mode: false })).not.toContain(D.autoTpi);
    expect(shown(detailHass(), { ...VALUES, proportional_function: "smartpi" })).not.toContain(D.autoTpi);
    const disabled = detailHass();
    addSensor(disabled, "auto_tpi_learning", "disabled", {});
    expect(shown(disabled)).not.toContain(D.autoTpi);
  });
});

describe("the widget Humidity", () => {
  it("shows the humidity on a gauge, in the format of the language", async () => {
    const meter = async (language: string) =>
      deepFindAll(deepFindAll(await render(D.humidity, detailHass(), { language }), "vtherm-gauge")[0] as HTMLElement, ".value")[0]?.textContent;
    expect(await meter("fr")).toBe("48,5 %");
    expect(await meter("en")).toBe("48.5 %");
    expect(deepFindAll(await render(D.humidity, detailHass()), "vtherm-time-chart")).toHaveLength(0);
  });

  it("shows — and unavailable when the humidity is unknown", async () => {
    const text = textOf(await render(D.humidity, detailHass("over_switch", { current_humidity: "unknown" }), { language: "fr" }));
    expect(text).toContain("—");
    expect(text).toContain("indisponible");
  });

  it("is hidden without the attribute", () => {
    expect(shown(vthermHass("over_switch"))).not.toContain(D.humidity);
  });
});

describe("the widget Tracking of the equipment", () => {
  const climateValues = { ...VALUES, thermostat_type: "thermostat_over_climate" };

  it("shows the temperature sent to each equipment", async () => {
    expect(textOf(await render(D.sync, detailHass("over_climate"), { language: "fr", values: climateValues }))).toContain("climate.clim_salon : 20,5 °C");
  });

  it("shows an alert with the reason and the attempts when the tracking is suspended, and the gaps in its tooltip", async () => {
    const hass = detailHass("over_climate", {
      vtherm_over_climate: {
        underlying_entities: ["climate.clim_salon"],
        underlying_temperature_tracking: {
          attempts: 3,
          suspended: true,
          reason: "attempt_limit_reached",
          underlyings: { "climate.clim_salon": { last_sent_temperature: 20.5, observed_temperature: 19, status: "invalid" } },
        },
      },
    });
    const element = await render(D.sync, hass, { language: "fr", values: climateValues });
    const alert = stateIcon(element, ".suspended");
    expect(alert).toMatchObject({ label: "Suivi suspendu : trop de tentatives, 3 tentatives", tone: "warning" });
    expect(alert?.tooltip.replace(/[\u00a0\u202f]/g, " ")).toBe("climate.clim_salon : envoyé 20,5 °C, constaté 19 °C (invalid)");
  });

  it("shows the value of a synchronised entity with its unit", async () => {
    const hass = detailHass("over_climate", {
      vtherm_over_climate: {
        underlying_entities: ["climate.clim_salon"],
        temp_synchronisation: { sync_entity_ids: ["number.clim_offset"], sync_attributes: { "number.clim_offset": { value: -1.5 } } },
      },
    });
    hass.setState("number.clim_offset", "-1.5", { unit_of_measurement: "°C" });
    expect(textOf(await render(D.sync, hass, { values: climateValues }))).toContain("number.clim_offset (synchronised): -1.5 °C");
  });

  it("is hidden for a thermostat over a switch", () => {
    expect(shown(detailHass())).not.toContain(D.sync);
  });
});

describe("the widget Demand to the boiler", () => {
  it("shows a flame and Calls the boiler while the equipment is active", async () => {
    expect(stateIcon(await render(D.boiler, detailHass(), { language: "fr" }), ".demand")).toMatchObject({ icon: "mdi:fire", label: "Demande la chaudière" });
  });

  it("shows Does not call the boiler while the equipment is off", async () => {
    expect(stateIcon(await render(D.boiler, detailHass("over_switch", {}, { is_device_active: false }), { language: "fr" }), ".demand")).toMatchObject({ icon: "mdi:fire-off", label: "Ne demande pas la chaudière" });
  });

  it("is hidden when the thermostat is not used by the boiler, or the central boiler is off", () => {
    const hass = detailHass("over_switch", { configuration: { is_used_by_central_boiler: false } });
    expect(shown(hass, { ...VALUES, used_by_controls_central_boiler: false })).not.toContain(D.boiler);
    expect(shown(detailHass(), VALUES, { use_central_boiler_feature: false })).not.toContain(D.boiler);
  });
});

describe("the widget Energy", () => {
  it("shows the mean power, the energy and the curve of 24 hours", async () => {
    const hass = detailHass();
    const now = Date.now() / 1000;
    hass.setWebSocketHandler(() => ({ [sensor("mean_power_cycle")]: [{ s: "300", lu: now - 3600 }, { s: "420", lu: now - 60 }] }));
    const element = await render(D.energy, hass, { language: "fr", visible: true });
    const text = textOf(element);
    expect(text).toContain("420 W");
    expect(text).toContain("12,4 kWh");
    expect(chartsOf(element)[0]?.points).toEqual([2]);
  });

  it("shows — for an unavailable counter, and keeps the curve", async () => {
    const hass = detailHass();
    hass.setState(sensor("energy"), "unavailable", {});
    hass.setWebSocketHandler(() => ({}));
    const element = await render(D.energy, hass, { visible: true });
    expect(deepText(deepFindAll(element, "vtherm-value-row.energy")[0] as HTMLElement)).toContain("—");
    expect(deepFindAll(element, "vtherm-history-curve")).toHaveLength(1);
  });

  it("is hidden without a sensor of energy or of mean power", () => {
    expect(shown(vthermHass("over_switch"))).not.toContain(D.energy);
  });
});

describe("the widgets of the details in German, in the dark theme and on a narrow grid", () => {
  it("draw their titles and the labels of their charts in German", async () => {
    const hass = detailHass("over_climate", {}, {}, "de");
    recorder(hass);
    const values = { ...VALUES, thermostat_type: "thermostat_over_climate" };
    const titles: string[] = [];
    for (const id of ORDER) {
      titles.push(deepFindAll(await render(id, hass, { language: "de", values }), "h3")[0]?.textContent ?? "");
    }
    expect(titles).toEqual(["Geräte", "Auto-TPI-Lernen", "Zentraler Heizkessel", "Energie", "Luftfeuchtigkeit", "Geräteverfolgung", "Letzte 24 Stunden"]);
    const charts = chartsOf(await render(D.history, hass, { language: "de", visible: true, values }));
    expect(charts[0]?.label).toBe("Temperaturen über 24 Stunden");
    expect(charts[0]?.series).toEqual(["Raum", "Sollwert", "Außen"].slice(0, charts[0]?.series.length));
  });

  it("color their curves with the tones of the theme, which the chart draws with the variables of Home Assistant", async () => {
    const hass = detailHass();
    hass.setState("sensor.outdoor", "6.2", { unit_of_measurement: "°C" });
    recorder(hass);
    const element = await render(D.history, hass, { visible: true });
    const tones = deepFindAll<HTMLElement & { series: readonly { tone: string }[] }>(element, "vtherm-time-chart").flatMap((chart) => chart.series.map((series) => series.tone));
    expect(tones).toEqual(["primary", "accent", "secondary", "warning"]);
    const { VThermTimeChart } = await import("../src/components/time-chart.ts");
    const css = [(VThermTimeChart as unknown as { styles: unknown }).styles]
      .flat(3)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    for (const variable of ["--primary-color", "--state-climate-heat-color", "--secondary-text-color", "--warning-color"]) {
      expect(css, variable).toContain(`var(${variable})`);
    }
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/);
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

  /** The cards of the grid of the overview of a thermostat at a width, by widget, and the widgets as the grid gives them their values. */
  async function grid(width: number, narrow: boolean): Promise<Map<string, HTMLElement>> {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const hass = detailHass();
    const entries = host.resolved("thermostat_widget").filter((entry) => (ORDER as readonly string[]).includes(entry.id));
    const element = document.createElement("vtherm-widgets") as HTMLElement & Record<string, unknown> & { updateComplete: Promise<unknown> };
    Object.assign(element, { entries, hass, thermostatId: ENTRY, values: VALUES, centralValues: CENTRAL, narrow });
    document.body.append(element);
    await element.updateComplete;
    measure?.(width);
    await element.updateComplete;
    const cards = [...(element.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>(".widget")];
    return new Map(entries.map((entry, index) => [entry.id, cards[index] as HTMLElement]));
  }

  it("give two columns and two rows to the history at 1440 px, and two rows to Auto TPI and the energy", async () => {
    const cards = await grid(1440 - 32, false);
    expect(cards.get(D.history)?.style.gridColumn).toBe("span 2");
    expect(cards.get(D.history)?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
    expect(cards.get(D.autoTpi)?.style.gridColumn).toBe("span 1");
    expect(cards.get(D.autoTpi)?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
    expect(cards.get(D.energy)?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
    expect(cards.get(D.devices)?.style.getPropertyValue("min-height")).toBe("");
  });

  it("put the history on one column at 375 px, keeping its height of two rows", async () => {
    const cards = await grid(375 - 32, true);
    expect(cards.get(D.history)?.style.gridColumn).toBe("span 1");
    expect(cards.get(D.history)?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
  });

  it("give the values of the configuration to the widgets of a thermostat", async () => {
    await grid(1440 - 32, false);
    const widget = deepFindAll<HTMLElement & { values: unknown; centralValues: unknown }>(document.body, "core-widget-history")[0];
    expect(widget?.values).toEqual(VALUES);
    expect(widget?.centralValues).toEqual(CENTRAL);
  });

  it("let the wide history go to the next row in the order of the placements, without filling a hole", async () => {
    const { VThermWidgets } = await import("../src/components/widgets.ts");
    const css = (VThermWidgets.styles as readonly { cssText?: string }[]).map((style) => style.cssText ?? "").join("\n");
    expect(css).toContain("grid-auto-flow: row");
    expect(css).not.toContain("dense");
  });
});
