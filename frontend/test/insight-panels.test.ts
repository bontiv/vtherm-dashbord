// @vitest-environment happy-dom
/** The panels of estimation: TPI now and its replay, the replay of the window detection, the silences of the sensors. */
import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/native/insight-panels.ts";
import { find, findAll } from "./support/dashboard-harness.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

type Rows = Record<string, readonly Record<string, unknown>[]>;
type Panel = HTMLElement & { updateComplete: Promise<unknown>; values: Record<string, unknown>; period: string };

const NOW = Date.now();
const MINUTE = 60_000;
/** A text that names its key and its parameters, so that the tests read what the panel says. */
const text = (key: string, params?: Readonly<Record<string, string | number>>) => (params === undefined ? key : `${key}${JSON.stringify(params)}`);

/** A fake hass: states, the list of the thermostats, the registry of the entities and a recorder that answers with rows, or fails. */
function fakeHass(states: Record<string, { state: string; attributes?: Record<string, unknown> }>, history: Rows | (() => never) = {}) {
  const callWS = vi.fn(async (message: Record<string, unknown>) => {
    if (message["type"] === "vtherm_dashboard/get_thermostats") {
      return { thermostats: [{ id: "entry", climate_entity_id: "climate.salon", device_id: "device" }], has_central_config: true, central_config_id: "central", supported_config_version: [2, 4] };
    }
    if (typeof history === "function") {
      return history();
    }
    const entity = (message["entity_ids"] as string[])[0] as string;
    return { [entity]: history[entity] ?? [] };
  });
  const hass = {
    states: Object.fromEntries(Object.entries(states).map(([id, value]) => [id, { entity_id: id, state: value.state, attributes: value.attributes ?? {} }])),
    entities: {
      "sensor.salon_power_percent": { entity_id: "sensor.salon_power_percent", device_id: "device", translation_key: "power_percent" },
      "sensor.salon_temperature_slope": { entity_id: "sensor.salon_temperature_slope", device_id: "device", translation_key: "temperature_slope" },
    },
    locale: { language: "en" },
    language: "en",
    config: { unit_system: { temperature: "°C" } },
    callWS,
  };
  return { hass, callWS };
}

/** Show a panel with its properties. */
async function mount(tag: string, props: Record<string, unknown>): Promise<{ panel: Panel; root: ShadowRoot }> {
  const panel = document.createElement(tag) as Panel;
  Object.assign(panel, { thermostatId: "entry", centralValues: {}, text, ...props });
  document.body.append(panel);
  await panel.updateComplete;
  return { panel, root: panel.shadowRoot as ShadowRoot };
}

const historyCalls = (callWS: ReturnType<typeof vi.fn>) => callWS.mock.calls.map(([message]) => message as Record<string, unknown>).filter((message) => message["type"] === "history/history_during_period");
const cell = (root: ShadowRoot, name: string) => find(root, `dd.${name}`)?.textContent?.replace(/\s+/g, " ").trim();

/** Rows of a sensor every `step` minutes over the last day, with a value for each time. */
function rows(value: (minutesAgo: number) => number | undefined, step = 5, minutes = 24 * 60): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (let ago = minutes; ago >= 0; ago -= step) {
    const v = value(ago);
    if (v !== undefined) {
      out.push({ s: String(v), lu: (NOW - ago * MINUTE) / 1000 });
    }
  }
  return out;
}

const TPI = {
  thermostat_type: "thermostat_over_switch",
  temperature_sensor_entity_id: "sensor.room",
  external_temperature_sensor_entity_id: "sensor.outdoor",
  cycle_min: 10,
  tpi_coef_int: 0.6,
  tpi_coef_ext: 0.01,
  minimal_activation_delay: 10,
  minimal_deactivation_delay: 0,
  use_main_central_config: false,
  use_tpi_central_config: false,
};
const STATES = { "sensor.room": { state: "19.5" }, "sensor.outdoor": { state: "5" }, "climate.salon": { state: "heat", attributes: { temperature: 20.5 } } };

describe("the panel of TPI, now", () => {
  it("decomposes the share into the room part and the outdoor part, with the share that VT applies and the time on in the cycle", async () => {
    const { hass } = fakeHass(STATES);
    const { root } = await mount("vtherm-insight-tpi", { hass, values: TPI });
    await vi.waitFor(() => expect(cell(root, "share")).toContain("75.5%"));
    expect(cell(root, "room-part")).toContain("60%");
    expect(cell(root, "outdoor-part")).toContain("15.5%");
    expect(cell(root, "applied")).toContain("76%");
    // VT rounds the share to 76 %, and turns the heater on 456 s of a cycle of 600 s.
    expect(cell(root, "on-time")).toContain('insight.minutes_seconds{\\"minutes\\":7,\\"seconds\\":36}');
    expect(findAll(root, ".estimation").length).toBeGreaterThanOrEqual(4);
  });

  it("gives an outdoor part of 0 without an outdoor sensor, and says so", async () => {
    const { hass } = fakeHass(STATES);
    const { root } = await mount("vtherm-insight-tpi", { hass, values: { ...TPI, external_temperature_sensor_entity_id: null } });
    await vi.waitFor(() => expect(cell(root, "share")).toContain("60%"));
    expect(cell(root, "outdoor-part")).toContain("0%");
    expect(root.textContent).toContain("insight.tpi.no_outdoor");
    expect(find(root, 'li[data-note="no_outdoor"]')).not.toBeNull();
  });

  it("explains a pulse shorter than the minimal activation delay, which gives no heat", async () => {
    const { hass } = fakeHass({ ...STATES, "sensor.room": { state: "19.97" }, "climate.salon": { state: "heat", attributes: { temperature: 20 } } });
    const { root } = await mount("vtherm-insight-tpi", { hass, values: { ...TPI, external_temperature_sensor_entity_id: null, cycle_min: 5, minimal_activation_delay: 30 } });
    await vi.waitFor(() => expect(find(root, 'li[data-note="too_short"]')).not.toBeNull());
    expect(cell(root, "on-time")).toContain('insight.seconds{\\"seconds\\":0}');
  });

  it("tries another setpoint without changing the one of the thermostat, and goes back to it", async () => {
    const { hass } = fakeHass(STATES);
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: TPI });
    await vi.waitFor(() => expect(cell(root, "share")).toContain("75.5%"));
    const trial = find<HTMLInputElement>(root, "#trial") as HTMLInputElement;
    trial.value = "21.5";
    trial.dispatchEvent(new Event("change"));
    await panel.updateComplete;
    expect(cell(root, "room-part")).toContain("120%");
    (find<HTMLButtonElement>(root, "button.reset") as HTMLButtonElement).click();
    await panel.updateComplete;
    expect(cell(root, "room-part")).toContain("60%");
  });

  it("computes again when a coefficient of the draft changes, before any save", async () => {
    const { hass } = fakeHass(STATES);
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: TPI });
    await vi.waitFor(() => expect(cell(root, "room-part")).toContain("60%"));
    panel.values = { ...TPI, tpi_coef_int: 0.8 };
    await panel.updateComplete;
    expect(cell(root, "room-part")).toContain("80%");
  });

  it("uses the coefficients of the central configuration when the thermostat uses them", async () => {
    const { hass } = fakeHass(STATES);
    const { root } = await mount("vtherm-insight-tpi", { hass, values: { ...TPI, use_tpi_central_config: true }, centralValues: { tpi_coef_int: 0.3, tpi_coef_ext: 0.02 } });
    await vi.waitFor(() => expect(cell(root, "room-part")).toContain("30%"));
    expect(cell(root, "outdoor-part")).toContain("31%");
  });

  it("gives the estimation of now during a creation, and says that the replay comes once the thermostat exists", async () => {
    const { hass, callWS } = fakeHass(STATES);
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: TPI, creating: true, thermostatId: "new" });
    expect(cell(root, "share")).toBeDefined();
    const day = findAll<HTMLButtonElement>(root, '.periods [role="tab"]')[1] as HTMLButtonElement;
    expect(day.disabled).toBe(true);
    panel.period = "day";
    await panel.updateComplete;
    expect(root.textContent).toContain("insight.after_creation");
    expect(callWS).not.toHaveBeenCalled();
  });
});

describe("the replay of TPI", () => {
  const replay = (prefix: string) => {
    const target = rows((ago) => (ago % 720 < 360 ? 20 : 17), 60);
    return {
      [`sensor.${prefix}_room`]: rows((ago) => 19 + Math.sin(ago / 90)),
      [`sensor.${prefix}_outdoor`]: rows(() => 6, 30),
      "climate.salon": target.map((row) => ({ s: "heat", a: { temperature: Number(row["s"]) }, lu: row["lu"] })),
      "sensor.salon_power_percent": rows(() => 40, 10),
      "sensor.salon_temperature_slope": rows(() => 0, 10),
    };
  };
  const values = (prefix: string) => ({ ...TPI, temperature_sensor_entity_id: `sensor.${prefix}_room`, external_temperature_sensor_entity_id: `sensor.${prefix}_outdoor` });

  it("draws the room, the setpoint, the estimated share and the recorded one, with their means and the comfort", async () => {
    const { hass, callWS } = fakeHass(STATES, replay("a"));
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: values("a") });
    panel.period = "day";
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    const chart = find(root, "vtherm-time-chart") as HTMLElement & { series: { id: string; dashed?: boolean; label: string }[]; summary: string };
    expect(chart.series.map((series) => series.id)).toEqual(["room", "target", "estimated", "recorded"]);
    expect(chart.series.find((series) => series.id === "estimated")?.dashed).toBe(true);
    expect(chart.series.find((series) => series.id === "estimated")?.label).toBe("insight.series.estimated");
    expect(chart.summary).toContain("insight.tpi.summary");
    expect(cell(root, "mean-recorded")).toContain("40%");
    expect(find(root, "p.differ")).not.toBeNull();
    expect(find(root, "p.drops")?.textContent).toContain("insight.tpi.drops");
    expect(historyCalls(callWS).map((message) => (message["entity_ids"] as string[])[0])).toEqual(["sensor.a_room", "sensor.a_outdoor", "climate.salon", "sensor.salon_power_percent", "sensor.salon_temperature_slope"]);
  });

  it("does not read the history of 24 h again when the user comes back to it within minutes", async () => {
    const { hass, callWS } = fakeHass(STATES, replay("b"));
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: values("b") });
    panel.period = "day";
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    // The entities of the thermostat may already be in the cache from another test: count from here.
    const afterDay = historyCalls(callWS).length;
    panel.period = "week";
    await vi.waitFor(() => expect(historyCalls(callWS).length).toBe(afterDay + 5));
    panel.period = "day";
    await panel.updateComplete;
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    expect(historyCalls(callWS).length).toBe(afterDay + 5);
  });

  it("forgets the entities and the history of a thermostat when it is given another one", async () => {
    const { hass, callWS } = fakeHass(STATES, replay("d"));
    const answer = async (message: Record<string, unknown>): Promise<unknown> => {
      if (message["type"] === "vtherm_dashboard/get_thermostats") {
        return {
          thermostats: [
            { id: "entry", climate_entity_id: "climate.salon", device_id: "device" },
            { id: "other", climate_entity_id: "climate.chambre", device_id: "other-device" },
          ],
        };
      }
      const entity = (message["entity_ids"] as string[])[0] as string;
      return { [entity]: replay("d")[entity] ?? [] };
    };
    callWS.mockImplementation(answer as never);
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: values("d") });
    panel.period = "day";
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    (panel as Panel & { thermostatId: string }).thermostatId = "other";
    await vi.waitFor(() => expect(historyCalls(callWS).some((message) => (message["entity_ids"] as string[])[0] === "climate.chambre")).toBe(true));
  });

  it("says that the history could not be read, and keeps working", async () => {
    const { hass } = fakeHass(STATES, () => {
      throw new Error("recorder unavailable");
    });
    const { panel, root } = await mount("vtherm-insight-tpi", { hass, values: values("c") });
    panel.period = "day";
    await vi.waitFor(() => expect(root.textContent).toContain('insight.error{"message":"recorder unavailable"}'));
  });
});

describe("the replay of the detection of a window", () => {
  const WINDOW = { thermostat_type: "thermostat_over_switch", use_window_feature: true, use_window_central_config: false, cycle_min: 5 };
  /** A room at 20 °C that loses 6 °C an hour for `length` minutes, 7 hours ago. */
  const aired = (length: number) => rows((ago) => (ago <= 420 && ago > 420 - length ? 20 - ((420 - ago) * 6) / 60 : ago <= 420 - length ? 20 - (length * 6) / 60 : 20), 2);

  it("does not replay anything for a window detected with a sensor", async () => {
    const { hass, callWS } = fakeHass({});
    const { root } = await mount("vtherm-insight-window", { hass, values: { ...WINDOW, temperature_sensor_entity_id: "sensor.w1", window_sensor_entity_id: "binary_sensor.window" } });
    expect(root.textContent).toContain("insight.window.sensor_method");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(historyCalls(callWS)).toEqual([]);
  });

  it("draws only the slope and asks for a threshold when none is given", async () => {
    const { hass } = fakeHass({}, { "sensor.w2": aired(15) });
    // The method is the drop of the temperature, whose opening threshold the user cleared.
    const { root } = await mount("vtherm-insight-window", { hass, values: { ...WINDOW, temperature_sensor_entity_id: "sensor.w2", window_auto_close_threshold: 0 } });
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    const chart = find(root, "vtherm-time-chart") as HTMLElement & { summary: string; bands: unknown[] };
    expect(chart.summary).toBe("insight.window.no_threshold");
    expect(chart.bands).toEqual([]);
  });

  it("shows the opening that the thresholds would have detected, as a band, and its end", async () => {
    const { hass } = fakeHass({}, { "sensor.w3": aired(15) });
    const { root } = await mount("vtherm-insight-window", {
      hass,
      values: { ...WINDOW, temperature_sensor_entity_id: "sensor.w3", window_auto_open_threshold: 3, window_auto_close_threshold: 0, window_auto_max_duration: 30 },
    });
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    const chart = find(root, "vtherm-time-chart") as HTMLElement & { summary: string; bands: unknown[]; rules: { value: number }[] };
    expect(chart.bands.length).toBeGreaterThanOrEqual(1);
    expect(chart.summary).toContain("insight.window.count");
    expect(chart.rules.map((rule) => rule.value)).toEqual([-3, 0]);
    expect(find(root, ".detections li")).not.toBeNull();
  });

  it("says that no opening would have been detected with a threshold that the drops do not reach, with the strongest drop", async () => {
    const { hass } = fakeHass({}, { "sensor.w4": aired(15) });
    const { root } = await mount("vtherm-insight-window", {
      hass,
      values: { ...WINDOW, temperature_sensor_entity_id: "sensor.w4", window_auto_open_threshold: 50, window_auto_close_threshold: 0, window_auto_max_duration: 30 },
    });
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    const chart = find(root, "vtherm-time-chart") as HTMLElement & { summary: string };
    expect(chart.summary).toContain("insight.window.none");
    expect(chart.summary).toContain("insight.window.strongest");
  });

  it("stops a long detection at the maximum duration, and says so", async () => {
    const { hass } = fakeHass({}, { "sensor.w5": aired(60) });
    const { root } = await mount("vtherm-insight-window", {
      hass,
      values: { ...WINDOW, temperature_sensor_entity_id: "sensor.w5", window_auto_open_threshold: 3, window_auto_close_threshold: 0, window_auto_max_duration: 10 },
    });
    await vi.waitFor(() => expect(find(root, "p.max-duration")).not.toBeNull());
  });
});

describe("the silences of the sensors", () => {
  const SAFETY = { thermostat_type: "thermostat_over_switch", safety_delay_min: 60, safety_min_on_percent: 0.5, use_advanced_central_config: false };

  it("marks a silence of 70 minutes of the room sensor as starting the safety mode, with the condition of the heating share", async () => {
    const room = rows((ago) => (ago > 300 && ago < 370 ? undefined : 19), 5);
    const { hass } = fakeHass({}, { "sensor.s1": room });
    const { root } = await mount("vtherm-insight-safety", { hass, values: { ...SAFETY, temperature_sensor_entity_id: "sensor.s1" } });
    await vi.waitFor(() => expect(find(root, "vtherm-time-chart")).not.toBeNull());
    const chart = find(root, "vtherm-time-chart") as HTMLElement & { summary: string; bands: { tone: string }[] };
    expect(chart.summary).toBe('insight.safety.count{"count":1,"delay":60}');
    expect(chart.bands.map((band) => band.tone)).toEqual(["error"]);
    expect(find(root, "p.longest")).not.toBeNull();
    expect(find(root, "p.min-on")?.textContent).toContain('insight.safety.min_on{"percent":"50%"}');
  });

  it("says that a thermostat over a climate never enters the safety mode, and replays nothing", async () => {
    const { hass, callWS } = fakeHass({});
    const { root } = await mount("vtherm-insight-safety", { hass, values: { ...SAFETY, thermostat_type: "thermostat_over_climate", temperature_sensor_entity_id: "sensor.s2" } });
    expect(root.textContent).toContain("insight.safety.over_climate");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(historyCalls(callWS)).toEqual([]);
  });
});
