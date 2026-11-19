// @vitest-environment happy-dom
/** The seven widgets of the native plugins in the overview of a thermostat: their declarations, their order, and what each one shows. */
import type { AnyTranslations, PlacedEntry, UiPluginDefinition } from "@vtherm/dashboard-sdk";
import type { FakeHass, FakeHost } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { DETAIL_WIDGET_IDS, FEATURE_WIDGET_IDS, WIDGET_IDS } from "../src/native/widgets/ids.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";
import { CLIMATE, ENTRY, climateAttributes, deepFindAll, deepText, sensorId, vthermHass } from "./support/vtherm-runtime.ts";

let host: FakeHost;

/** The widgets of the features, after the base widgets: hidden for the thermostats of these tests, which have none of the features. */
const FEATURES = Object.values(FEATURE_WIDGET_IDS);

/** The widgets of the details, tested in `detail-widgets.test.ts`: left out here. */
const DETAILS: readonly string[] = Object.values(DETAIL_WIDGET_IDS);
const notDetail = (id: string): boolean => !DETAILS.includes(id);
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

/** The identifiers of the resolved widgets of a host, without the widgets of the details. */
const resolvedIds = (from: FakeHost): string[] => from.resolved("thermostat_widget").map((entry) => entry.id).filter(notDetail);

const entryOf = (id: string): PlacedEntry => host.resolved("thermostat_widget").find((entry) => entry.id === id) as PlacedEntry;

/** The context of the visibility conditions for the thermostat of the tests. */
function contextOf(hass: FakeHass, values: Record<string, unknown> = { proportional_function: "tpi" }, centralValues: Record<string, unknown> = {}) {
  return { hass, thermostatId: ENTRY, thermostatType: "over_switch" as const, values, centralValues };
}

/** The identifiers of the widgets that a thermostat shows, in order. */
function shown(hass: FakeHass, values?: Record<string, unknown>, centralValues?: Record<string, unknown>): string[] {
  return host.visible(host.resolved("thermostat_widget"), contextOf(hass, values, centralValues)).map((entry) => entry.id).filter(notDetail);
}

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

const meterName = (element: HTMLElement, selector = "vtherm-gauge"): string | null => deepFindAll(deepFindAll(element, selector)[0] as HTMLElement, "[role=meter]")[0]?.getAttribute("aria-label") ?? null;

describe("the widgets of the native plugins", () => {
  it("are declared by their plugins, each with a placement and a visibility condition", () => {
    const widgets = (id: string) => (definitions.get(id)?.contributions.thermostat_widget ?? []) as readonly { id: string; placement?: unknown; visible?: unknown; size?: unknown }[];
    expect(widgets("core").map((widget) => widget.id).filter(notDetail)).toEqual([WIDGET_IDS.temperature, WIDGET_IDS.mode, WIDGET_IDS.alerts]);
    expect(widgets("core_tpi").map((widget) => widget.id).filter(notDetail)).toEqual([WIDGET_IDS.heating]);
    expect(widgets("core_valve_regulation").map((widget) => widget.id)).toEqual([WIDGET_IDS.valve]);
    expect(widgets("core_presets").map((widget) => widget.id)).toEqual([WIDGET_IDS.preset]);
    expect(widgets("core_advanced").map((widget) => widget.id)).toEqual([WIDGET_IDS.safety]);
    for (const widget of [...definitions.values()].flatMap((definition) => widgets(definition.id)).filter((widget) => notDetail(widget.id))) {
      expect(widget.placement, widget.id).toBeDefined();
      expect(typeof widget.visible, widget.id).toBe("function");
      // The base widgets take one column, the height of their content: they declare no size.
      expect(widget.size, widget.id).toBeUndefined();
    }
  });

  it("are declared without any problem of placement", () => {
    expect(host.issues()).toEqual([]);
  });

  it("are not declared by the plugins that have no widget", () => {
    expect(definitions.get("core_complements")?.contributions.thermostat_widget).toBeUndefined();
    const withWidgets = ["core", "core_tpi", "core_valve_regulation", "core_presets", "core_advanced", "core_window", "core_motion", "core_power", "core_auto_start_stop", "core_lock", "core_heating_failure", "core_humidity", "core_sync_temp", "core_central_boiler"];
    const others = NATIVE_LOAD_ORDER.filter((id) => !withWidgets.includes(id));
    expect(others.filter((id) => definitions.get(id)?.contributions.thermostat_widget !== undefined)).toEqual([]);
  });

  it("can be removed by a third-party plugin, the others keeping their place", async () => {
    const { host: other } = await nativeHost();
    other.registerPlugin({ id: "quiet", translations: definitions.get("core")?.translations as AnyTranslations, contributions: { thermostat_widget: [{ id: "quiet.remove", placement: { remove: WIDGET_IDS.alerts } }] } });
    expect(resolvedIds(other)).toEqual([WIDGET_IDS.temperature, WIDGET_IDS.mode, WIDGET_IDS.heating, WIDGET_IDS.valve, WIDGET_IDS.preset, WIDGET_IDS.safety, ...FEATURES]);
  });
});

describe("the layout of the overview of a thermostat", () => {
  it("orders the cards of a thermostat over a switch: temperature, mode, alerts, heating, preset, safety", () => {
    expect(shown(vthermHass("over_switch"))).toEqual([WIDGET_IDS.temperature, WIDGET_IDS.mode, WIDGET_IDS.alerts, WIDGET_IDS.heating, WIDGET_IDS.preset, WIDGET_IDS.safety]);
  });

  it("keeps the order of the cards around the hidden valve, and shows it in its place for a thermostat over a valve", () => {
    expect(resolvedIds(host)).toEqual([...Object.values(WIDGET_IDS), ...FEATURES]);
    expect(shown(vthermHass("over_valve"))).toEqual(Object.values(WIDGET_IDS));
  });

  it("puts a widget of a third-party plugin placed after the mode right after it", async () => {
    const { host: other } = await nativeHost();
    other.registerPlugin({ id: "smart", translations: definitions.get("core")?.translations as AnyTranslations, contributions: { thermostat_widget: [{ id: "smart.widget", component: "smart-widget", placement: { after: WIDGET_IDS.mode } }] } });
    const ids = other.resolved("thermostat_widget").map((entry) => entry.id);
    expect(ids.slice(0, 4)).toEqual([WIDGET_IDS.temperature, WIDGET_IDS.mode, "smart.widget", WIDGET_IDS.alerts]);
  });

  it("shows the safety when only the central configuration configures it and the thermostat uses it", () => {
    const attributes = climateAttributes("over_switch");
    delete attributes["is_safety_configured"];
    delete attributes["safety_manager"];
    const hass = vthermHass("over_switch");
    hass.setState(CLIMATE, "heat", attributes);
    expect(shown(hass, { proportional_function: "tpi" })).not.toContain(WIDGET_IDS.safety);
    expect(shown(hass, { proportional_function: "tpi", use_advanced_central_config: true }, { safety_delay_min: 60 })).toContain(WIDGET_IDS.safety);
    expect(shown(hass, { proportional_function: "tpi", use_advanced_central_config: false }, { safety_delay_min: 60 })).not.toContain(WIDGET_IDS.safety);
  });

  it("gives the values of the thermostat and of the central configuration to the visibility conditions of its widgets", async () => {
    const page = document.createElement("core-thermostat-overview-page") as HTMLElement & Record<string, unknown> & { updateComplete: Promise<unknown> };
    Object.assign(page, { hass: vthermHass(), thermostatId: ENTRY, values: { thermostat_type: "thermostat_over_switch", use_advanced_central_config: true }, centralValues: { safety_delay_min: 60 } });
    document.body.append(page);
    await page.updateComplete;
    const widgets = page.shadowRoot?.querySelector("vtherm-widgets-page") as HTMLElement & { values: unknown; centralValues: unknown; thermostatType: string };
    expect(widgets.values).toEqual({ thermostat_type: "thermostat_over_switch", use_advanced_central_config: true });
    expect(widgets.centralValues).toEqual({ safety_delay_min: 60 });
    expect(widgets.thermostatType).toBe("over_switch");
  });

  it("shows no card for a thermostat being created", () => {
    expect(host.visible(host.resolved("thermostat_widget"), { ...contextOf(vthermHass()), thermostatId: "new" })).toEqual([]);
  });
});

describe("the widget Temperature", () => {
  it("shows the temperature on a gauge with the setpoint, and the outdoor temperature", async () => {
    const element = await render(WIDGET_IDS.temperature, vthermHass(), "fr");
    expect(meterName(element)).toBe("19,5 sur une plage de 7 à 35, consigne 21");
    expect(deepText(element)).toContain("Extérieure 6,2 °C");
    expect(deepText(element)).toContain("Température");
  });

  it("shows the setpoint asked for and the one applied when a feature changed it", async () => {
    const hass = vthermHass("over_switch", { current_state: { hvac_mode: "heat", target_temperature: 17, preset: "comfort" } });
    expect(deepText(await render(WIDGET_IDS.temperature, hass, "fr"))).toContain("21 → 17 °C");
    expect(deepFindAll(await render(WIDGET_IDS.temperature, vthermHass(), "fr"), ".requested")).toHaveLength(0);
  });

  it("shows a dash for a missing outdoor temperature, and keeps the gauge", async () => {
    const attributes = climateAttributes();
    (attributes["specific_states"] as Record<string, unknown>)["ext_current_temperature"] = null;
    const element = await render(WIDGET_IDS.temperature, vthermHass("over_switch", attributes));
    expect(deepText(element)).toContain("Outdoor —");
    expect(deepFindAll(element, "vtherm-gauge")).toHaveLength(1);
  });

  it("shows a dash said unavailable on the gauge when the climate entity is unavailable", async () => {
    const hass = vthermHass();
    hass.setState(CLIMATE, "unavailable", {});
    const element = await render(WIDGET_IDS.temperature, hass, "fr");
    expect(meterName(element)).toBe("Température de la pièce : indisponible");
    expect(deepText(element)).toContain("— indisponible");
  });

  it("shows the regulated setpoint only when its sensor exists", async () => {
    const hass = vthermHass("over_climate");
    hass.setState(sensorId("regulated_temperature"), "22.5");
    expect(deepText(await render(WIDGET_IDS.temperature, hass))).toContain("Regulated setpoint 22.5 °C");
    expect(deepFindAll(await render(WIDGET_IDS.temperature, vthermHass("over_switch")), ".regulated")).toHaveLength(0);
  });
});

describe("the widget Mode and action", () => {
  it("shows the mode and the action of a thermostat that heats", async () => {
    const text = deepText(await render(WIDGET_IDS.mode, vthermHass(), "fr"));
    expect(text).toContain("Chauffage");
    expect(text).toContain("En chauffe");
  });

  it("shows the reason of a thermostat stopped by a window", async () => {
    const attributes = climateAttributes();
    Object.assign(attributes["specific_states"] as object, { hvac_off_reason: "hvac_off_window_detection" });
    const hass = vthermHass("over_switch");
    hass.setState(CLIMATE, "off", { ...attributes, hvac_action: "off" });
    const text = deepText(await render(WIDGET_IDS.mode, hass, "fr"));
    expect(text).toContain("Arrêt");
    expect(text).toContain("Fenêtre ouverte");
  });

  it("shows an unknown reason as it is, with a generic icon", async () => {
    const attributes = climateAttributes();
    Object.assign(attributes["specific_states"] as object, { hvac_mode_reason: "hvac_new_reason" });
    const element = await render(WIDGET_IDS.mode, vthermHass("over_switch", attributes));
    const reason = deepFindAll<HTMLElement & { icon: string; label: string }>(element, "vtherm-state-icon.reason")[0];
    expect(reason?.label).toBe("hvac_new_reason");
    expect(reason?.icon).toBe("mdi:information-outline");
  });

  it("shows the sleep mode and the central mode only when they apply, and draws no command", async () => {
    const attributes = climateAttributes();
    Object.assign(attributes["specific_states"] as object, { is_sleeping: true, last_central_mode: "Heat only" });
    const element = await render(WIDGET_IDS.mode, vthermHass("over_switch", attributes));
    expect(deepText(element)).toContain("Sleep mode");
    expect(deepText(element)).toContain("Central mode: Heat only");
    expect(deepFindAll(await render(WIDGET_IDS.mode, vthermHass()), ".sleeping, .central")).toHaveLength(0);
    expect(deepFindAll(element, "button, select, ha-select, ha-button, input")).toHaveLength(0);
  });
});

describe("the widget Alerts", () => {
  const withSpecific = (specific: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
    const attributes = climateAttributes();
    Object.assign(attributes["specific_states"] as object, specific);
    return vthermHass("over_switch", { ...attributes, ...extra });
  };

  it("shows an active message with an icon, its text and the color of a warning", async () => {
    const element = await render(WIDGET_IDS.alerts, withSpecific({ messages: ["overpowering_detected"] }), "fr");
    const alert = deepFindAll<HTMLElement & { label: string; tone: string; icon: string }>(element, "vtherm-state-icon.alert")[0];
    expect(alert?.label).toBe("Délestage actif");
    expect(alert?.tone).toBe("warning");
    expect(alert?.icon).toBe("mdi:flash-alert");
  });

  it("colors the age of a measure older than the safety delay of the thermostat, with the full date in its tooltip", async () => {
    const old = new Date(Date.now() - 12 * 60_000).toISOString();
    const element = await render(WIDGET_IDS.alerts, withSpecific({ last_temperature_datetime: old }, { safety_manager: { safety_delay_min: 5 } }), "fr");
    const room = deepFindAll(element, ".measure.room")[0] as HTMLElement;
    expect(room.classList.contains("old")).toBe(true);
    expect(deepText(room)).toContain("il y a 12 minutes");
    expect(deepFindAll(room, "time")[0]?.getAttribute("title")).toContain(String(new Date().getFullYear()));
    expect(deepFindAll(element, ".measure.outdoor")[0]?.classList.contains("old")).toBe(false);
  });

  it("uses the delay that Versatile Thermostat applies, whether it is the own one or the central one", async () => {
    const old = new Date(Date.now() - 12 * 60_000).toISOString();
    // The delay of the thermostat, or the central one that it inherits: Versatile Thermostat publishes the one that applies.
    for (const delay of [5, 10]) {
      const element = await render(WIDGET_IDS.alerts, withSpecific({ last_temperature_datetime: old }, { safety_manager: { safety_delay_min: delay } }));
      expect(deepFindAll(element, ".measure.room")[0]?.classList.contains("old"), String(delay)).toBe(true);
    }
    const longer = await render(WIDGET_IDS.alerts, withSpecific({ last_temperature_datetime: old }, { safety_manager: { safety_delay_min: 15 } }));
    expect(deepFindAll(longer, ".measure.room")[0]?.classList.contains("old")).toBe(false);
  });

  it("shows the age without a warning when no safety delay is known", async () => {
    const old = new Date(Date.now() - 120 * 60_000).toISOString();
    const hass = withSpecific({ last_temperature_datetime: old });
    const attributes = { ...(hass.states[CLIMATE]?.attributes ?? {}) };
    delete attributes["safety_manager"];
    hass.setState(CLIMATE, "heat", attributes);
    const element = await render(WIDGET_IDS.alerts, hass);
    expect(deepFindAll(element, ".measure.room")[0]?.classList.contains("old")).toBe(false);
  });

  it("lists the unavailable equipment in the tooltip of its alert", async () => {
    const element = await render(WIDGET_IDS.alerts, withSpecific({ messages: ["underlying_unavailable"], unavailable_underlying_entities: ["switch.radiateur_salon"] }));
    const alert = deepFindAll<HTMLElement & { tooltip: string }>(element, "vtherm-state-icon.alert")[0];
    expect(alert?.tooltip).toBe("switch.radiateur_salon");
  });

  it("says that the thermostat is not ready, and shows the inhibition", async () => {
    const element = await render(WIDGET_IDS.alerts, withSpecific({ not_initialized_entities: ["switch.a"], inhibition: { inhibited: true, command_gate: "closed" } }, { is_ready: false }));
    const codes = deepFindAll<HTMLElement>(element, "vtherm-state-icon.alert").map((alert) => alert.dataset["code"]);
    expect(codes).toEqual(["not_ready", "inhibition"]);
  });

  it("says that there is no alert, with a check mark and the two ages", async () => {
    const element = await render(WIDGET_IDS.alerts, vthermHass(), "fr");
    const none = deepFindAll<HTMLElement & { label: string; icon: string }>(element, "vtherm-state-icon.none")[0];
    expect(none?.label).toBe("Aucune alerte");
    expect(none?.icon).toBe("mdi:check-circle-outline");
    expect(deepFindAll(element, "vtherm-age")).toHaveLength(2);
  });
});

describe("the widget Heating", () => {
  it("shows the heating share and the times on and off of the cycle", async () => {
    const element = await render(WIDGET_IDS.heating, vthermHass());
    expect(meterName(element, "vtherm-bar.power")).toBe("Heating share 62 %");
    expect(deepText(deepFindAll(element, "vtherm-bar.cycle")[0] as HTMLElement)).toContain("ON 186 s OFF 114 s");
  });

  it("is hidden for a thermostat over a climate without valve, and for another algorithm", () => {
    expect(shown(vthermHass("over_climate"))).not.toContain(WIDGET_IDS.heating);
    expect(shown(vthermHass("over_switch"), { proportional_function: "smartpi" })).not.toContain(WIDGET_IDS.heating);
    expect(shown(vthermHass("over_climate_valve"))).toContain(WIDGET_IDS.heating);
  });

  it("shows only the share when the times of the cycle are missing", async () => {
    const element = await render(WIDGET_IDS.heating, vthermHass("over_climate_valve"));
    expect(deepFindAll(element, "vtherm-bar.power")).toHaveLength(1);
    expect(deepFindAll(element, "vtherm-bar.cycle")).toHaveLength(0);
  });

  it("shows a dash said unavailable when the source of the share is unavailable", async () => {
    const attributes = climateAttributes("over_switch");
    delete attributes["power_percent"];
    const hass = vthermHass("over_switch", {});
    hass.setState(CLIMATE, "heat", attributes);
    hass.setState(sensorId("power_percent"), "unavailable");
    const element = await render(WIDGET_IDS.heating, hass, "fr");
    expect(meterName(element, "vtherm-bar.power")).toBe("Puissance demandée : indisponible");
  });
});

describe("the widget Valve", () => {
  it("shows the opening of a single valve on a gauge, without a bar for each valve", async () => {
    const element = await render(WIDGET_IDS.valve, vthermHass("over_valve"));
    expect(deepText(deepFindAll(element, "vtherm-gauge")[0] as HTMLElement)).toContain("40 %");
    expect(deepFindAll(element, "vtherm-bar.valve")).toHaveLength(0);
  });

  it("shows a bar named after each valve when there are several", async () => {
    const hass = vthermHass("over_valve", {
      vtherm_over_valve: {
        underlying_valves: [
          { entity_id: "number.valve_a", command_percent: 30 },
          { entity_id: "number.valve_b", command_percent: 50 },
        ],
      },
    });
    hass.setState("number.valve_a", "30", { friendly_name: "Valve A" });
    const bars = deepFindAll(await render(WIDGET_IDS.valve, hass), "vtherm-bar.valve");
    expect(bars.map((bar) => deepFindAll(bar, "[role=meter]")[0]?.getAttribute("aria-label"))).toEqual(["Valve A 30 %", "number.valve_b 50 %"]);
  });

  it("is hidden for a thermostat over a switch", () => {
    expect(shown(vthermHass("over_switch"))).not.toContain(WIDGET_IDS.valve);
    expect(shown(vthermHass("over_climate_valve"))).toContain(WIDGET_IDS.valve);
  });
});

describe("the widget Preset", () => {
  const withTimed = (timed: Record<string, unknown>, preset = "comfort") => vthermHass("over_switch", { preset_mode: preset, timed_preset_manager: { ...climateAttributes()["timed_preset_manager"] as object, ...timed } });

  it("shows the preset with its icon", async () => {
    const element = await render(WIDGET_IDS.preset, vthermHass("over_switch", { preset_mode: "eco" }), "fr");
    const preset = deepFindAll<HTMLElement & { label: string; icon: string }>(element, "vtherm-state-icon.preset")[0];
    expect([preset?.label, preset?.icon]).toEqual(["Éco", "mdi:leaf"]);
  });

  it("shows a timed preset with its remaining time and its end, without a bar", async () => {
    const end = new Date(Date.now() + 25 * 60_000).toISOString();
    const element = await render(WIDGET_IDS.preset, withTimed({ is_active: true, preset: "boost", remaining_time_min: 25, end_time: end }, "boost"), "fr");
    const text = deepText(element);
    expect(text).toContain("Boost");
    expect(text).toContain("25 min restantes");
    expect(text).toContain("fin à");
    expect(deepFindAll(element, "vtherm-bar, [role=progressbar], [role=meter]")).toHaveLength(0);
  });

  it("shows a manual override with the preset that resumes", async () => {
    const text = deepText(await render(WIDGET_IDS.preset, withTimed({ is_manual_override: true, resume_preset: "comfort" }), "fr"));
    expect(text).toContain("Dérogation manuelle");
    expect(text).toContain("reprise : Confort");
  });

  it("says that there is no preset", async () => {
    expect(deepText(await render(WIDGET_IDS.preset, vthermHass("over_switch", { preset_mode: "none" }), "fr"))).toContain("Aucun preset");
  });
});

describe("the widget Safety", () => {
  it("says that the safety is normal, with a check mark", async () => {
    const element = await render(WIDGET_IDS.safety, vthermHass(), "fr");
    const state = deepFindAll<HTMLElement & { label: string; icon: string; tone: string }>(element, "vtherm-state-icon.state")[0];
    expect([state?.label, state?.icon, state?.tone]).toEqual(["Normal", "mdi:shield-check", "success"]);
    expect(deepFindAll(element, "vtherm-bar")).toHaveLength(0);
  });

  it("shows the alert and the imposed share on a bar of the color of a warning", async () => {
    const hass = vthermHass("over_switch", { power_percent: 25 });
    hass.setState(sensorId("safety_state"), "on");
    const element = await render(WIDGET_IDS.safety, hass, "fr");
    const state = deepFindAll<HTMLElement & { label: string; tone: string }>(element, "vtherm-state-icon.state")[0];
    expect([state?.label, state?.tone]).toEqual(["Mode sécurité actif", "warning"]);
    const bar = deepFindAll<HTMLElement & { tone: string }>(element, "vtherm-bar.share")[0] as HTMLElement & { tone: string };
    expect(bar.tone).toBe("warning");
    expect(deepFindAll(bar, "[role=meter]")[0]?.getAttribute("aria-label")).toBe("Part de chauffe imposée 25 %");
  });

  it("is hidden when the safety is not configured", () => {
    expect(shown(vthermHass("over_switch", { is_safety_configured: false }))).not.toContain(WIDGET_IDS.safety);
  });

  it("says that the state is unavailable, without an alert", async () => {
    const hass = vthermHass();
    hass.setState(sensorId("safety_state"), "unavailable");
    const element = await render(WIDGET_IDS.safety, hass, "fr");
    expect(deepText(element)).toContain("indisponible");
    expect(deepFindAll(element, "vtherm-state-icon")).toHaveLength(0);
  });
});

describe("the languages of the widgets", () => {
  it("shows the titles of the seven widgets in German", async () => {
    const hass = vthermHass("over_valve");
    const titles: string[] = [];
    for (const id of Object.values(WIDGET_IDS)) {
      titles.push(deepFindAll(await render(id, hass, "de"), "h3")[0]?.textContent ?? "");
    }
    expect(titles).toEqual(["Temperatur", "Modus und Aktion", "Warnungen", "Heizung", "Ventil", "Voreinstellung", "Sicherheit"]);
  });

  it("shows the texts in English for a language that is not supported", async () => {
    const element = await render(WIDGET_IDS.mode, vthermHass(), "ja");
    expect(deepFindAll(element, "h3")[0]?.textContent).toBe("Mode and action");
    expect(deepText(element)).toContain("Heating now");
  });
});

describe("the widgets only show", () => {
  it("never call a service of Home Assistant, whatever the user clicks", async () => {
    const hass = vthermHass("over_valve");
    for (const id of Object.values(WIDGET_IDS)) {
      const element = await render(id, hass);
      for (const node of deepFindAll<Element>(element, "*")) {
        node.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
      }
    }
    expect(hass.serviceCalls).toEqual([]);
  });
});
