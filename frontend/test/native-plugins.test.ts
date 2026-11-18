// @vitest-environment happy-dom
import { CORE_MENU_GROUPS, CORE_TOP_TABS, defineTranslations, groupMenu } from "@vtherm/dashboard-sdk";
import type { PlacedEntry, UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { assertCompleteTranslations, createFakeHost, findTranslationProblems } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LABEL_MAX_LENGTH, fieldLabelKey, isWideField } from "../src/native/fields.ts";
import { CREATION_TABS, MENU_ORDER, NATIVE_TAB_PLUGINS, definitionOfContribution, featureStepOf, fieldsOfPlugin, menuGroupOf } from "../src/native/tab-definitions.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

let host: FakeHost;
let definitions: Map<string, UiPluginDefinition>;

beforeAll(async () => {
  ({ host, definitions } = await nativeHost());
});

const ids = (entries: readonly PlacedEntry[]) => entries.map((entry) => entry.id);
const thermostat = (values: Record<string, unknown>, type = "over_switch") =>
  ({ hass: host.hass, thermostatId: "t", thermostatType: type, values, centralValues: {} }) as never;
const visibleTabs = (values: Record<string, unknown>) =>
  host
    .visible(host.resolved("thermostat_config"), thermostat(values))
    .map((entry) => entry.id)
    .map((id) => definitionOfContribution(id)?.definition.tab)
    .filter((tab) => tab !== undefined);

/** The runs of a menu by group, each entry named by its tab, or by the end of its identifier for a page. */
const groupsOf = (entries: readonly PlacedEntry[]) =>
  groupMenu(entries).map((section) => [section.group, section.entries.map((entry) => definitionOfContribution(entry.id)?.definition.tab ?? entry.id.split(".").pop())]);

const everything = {
  thermostat_type: "thermostat_over_climate",
  auto_regulation_mode: "auto_regulation_valve",
  proportional_function: "tpi",
  sync_device_internal_temp: true,
  use_window_feature: true,
  use_motion_feature: true,
  use_power_feature: true,
  use_presence_feature: true,
  use_heating_failure_detection_feature: true,
};

describe("the native plugins", () => {
  it("register without problem", () => {
    expect(host.issues()).toEqual([]);
    expect([...definitions.keys()]).toEqual([...NATIVE_LOAD_ORDER]);
  });

  it("give the top tabs of the dashboard, the gear alone at the end", () => {
    expect(ids(host.resolved("top_tab"))).toEqual([CORE_TOP_TABS.dashboard, CORE_TOP_TABS.thermostats, "core_complements.top.complements", CORE_TOP_TABS.configuration]);
  });

  it("name the tab of a plugin with a single tab main, and the tabs of core after their tab", () => {
    const order = ids(host.resolved("thermostat_config"));
    expect(order).toContain("core_tpi.tab.main");
    expect(order).toContain("core_lock.tab.main");
    expect(order).toContain("core_sync_temp.tab.main");
    expect(order.filter((id) => id.startsWith("core.tab."))).toEqual(["core.tab.main", "core.tab.type", "core.tab.features"]);
  });

  it("put the tabs of a thermostat in the order of the menu, after the overview, under the groups of the core", () => {
    const order = ids(host.resolved("thermostat_config"));
    expect(order[0]).toBe("core.page.thermostat_overview");
    expect(order.slice(1).map((id) => definitionOfContribution(id)?.definition.tab)).toEqual(MENU_ORDER.map((item) => item.tab).filter((tab) => tab !== "central_boiler"));
    expect(groupsOf(host.resolved("thermostat_config"))).toEqual([
      [undefined, ["thermostat_overview"]],
      [CORE_MENU_GROUPS.settings, ["main", "type", "features", "presets", "tpi", "valve_regulation", "advanced"]],
      [CORE_MENU_GROUPS.features, ["window", "motion", "power", "presence", "auto_start_stop", "sync_device_internal_temp", "lock", "humidity", "heating_failure_detection"]],
    ]);
  });

  it("keep the order and the groups for each type of thermostat", () => {
    const menuOf = (values: Record<string, unknown>) => groupsOf(host.visible(host.resolved("thermostat_config"), thermostat(values)));
    expect(menuOf({ thermostat_type: "thermostat_over_switch", proportional_function: "tpi" })).toEqual([
      [undefined, ["thermostat_overview"]],
      [CORE_MENU_GROUPS.settings, ["main", "type", "features", "presets", "tpi", "advanced"]],
      [CORE_MENU_GROUPS.features, ["window", "motion", "power", "presence", "lock", "humidity", "heating_failure_detection"]],
    ]);
    expect(menuOf({ thermostat_type: "thermostat_over_valve", proportional_function: "tpi" })[1]).toEqual([CORE_MENU_GROUPS.settings, ["main", "type", "features", "presets", "tpi", "advanced"]]);
    expect(menuOf({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_none" })).toEqual([
      [undefined, ["thermostat_overview"]],
      [CORE_MENU_GROUPS.settings, ["main", "type", "features", "presets", "advanced"]],
      [CORE_MENU_GROUPS.features, ["window", "motion", "power", "presence", "auto_start_stop", "sync_device_internal_temp", "lock", "humidity"]],
    ]);
    expect(menuOf(everything)[1]).toEqual([CORE_MENU_GROUPS.settings, ["main", "type", "features", "presets", "tpi", "valve_regulation", "advanced"]]);
  });

  it("put the sections of the general configuration under the groups of the core, before the pages of the dashboard", () => {
    const menu = host.menu(CORE_TOP_TABS.configuration);
    const sections = menu.filter((entry) => entry.hook === "general_config");
    expect(ids(menu).slice(-2)).toEqual(["core.page.plugins", "core.page.dev_plugins"]);
    expect(groupMenu(menu).map((section) => section.group)).toEqual([CORE_MENU_GROUPS.settings, CORE_MENU_GROUPS.features, "group.dashboard"]);
    expect(groupsOf(sections)).toEqual([
      [CORE_MENU_GROUPS.settings, ["create", "main", "features", "presets", "tpi", "advanced"]],
      [CORE_MENU_GROUPS.features, ["central_boiler", "window", "motion", "power", "presence", "lock", "heating_failure_detection"]],
    ]);
  });

  it("put the sections of a creation under the general settings", () => {
    for (const kind of ["thermostat", "central"] as const) {
      expect(CREATION_TABS[kind].map(menuGroupOf).every((group) => group === "settings"), kind).toBe(true);
    }
  });

  it("let a third-party tab placed after TPI come just after it", () => {
    const third = createThirdParty();
    third.registerPlugin({ id: "smartpi", translations: defineTranslations({ t: "Smart" }), contributions: { thermostat_config: [{ id: "smartpi.tab", title: "t", component: "x-el", placement: { after: "core_tpi.tab.main" } }] } });
    const order = ids(third.resolved("thermostat_config"));
    expect(order[order.indexOf("core_tpi.tab.main") + 1]).toBe("smartpi.tab");
    // Without a group, the tab cuts the general settings in two runs; with the shared group, it joins them.
    expect(groupMenu(third.resolved("thermostat_config")).filter((section) => section.group === CORE_MENU_GROUPS.settings)).toHaveLength(2);
    const joined = createThirdParty();
    joined.registerPlugin({
      id: "smartpi",
      translations: defineTranslations({ t: "Smart" }),
      contributions: { thermostat_config: [{ id: "smartpi.tab", title: "t", component: "x-el", group: CORE_MENU_GROUPS.settings, placement: { after: "core_tpi.tab.main" } }] },
    });
    const sections = groupMenu(joined.resolved("thermostat_config"));
    expect(sections.filter((section) => section.group === CORE_MENU_GROUPS.settings)).toHaveLength(1);
    expect(ids(sections[1]?.entries ?? [])).toContain("smartpi.tab");
  });

  it("let a third-party plugin replace and remove native tabs", () => {
    const third = createThirdParty();
    third.registerPlugin(
      {
        id: "smartpi",
        translations: defineTranslations({ t: "Smart" }),
        contributions: { thermostat_config: [{ id: "smartpi.tpi", title: "t", component: "x-el", placement: { replace: "core_tpi.tab.main" } }, { id: "smartpi.rm", placement: { remove: "core_lock.tab.main" } }] },
      },
      { requires: ["core"], load_after: ["core_tpi", "core_lock"] },
    );
    const order = ids(third.resolved("thermostat_config"));
    expect(order).toContain("smartpi.tpi");
    expect(order).not.toContain("core_tpi.tab.main");
    expect(order).not.toContain("core_lock.tab.main");
  });
});

/** A new host with the native plugins, for a test that adds a plugin after them. */
function createThirdParty(): FakeHost {
  const created = createFakeHost();
  for (const definition of definitions.values()) {
    created.registerPlugin(definition);
  }
  return created;
}

describe("the tabs that apply to a thermostat", () => {
  it("show every tab of a thermostat that uses everything", () => {
    expect(visibleTabs(everything)).toEqual(["main", "type", "features", "presets", "tpi", "valve_regulation", "advanced", "window", "motion", "power", "presence", "sync_device_internal_temp", "lock", "humidity", "heating_failure_detection"]);
  });

  it("keep the tabs of the features of a thermostat over a switch in the menu while the features are off", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", proportional_function: "tpi" })).toEqual([
      "main",
      "type",
      "features",
      "presets",
      "tpi",
      "advanced",
      "window",
      "motion",
      "power",
      "presence",
      "lock",
      "humidity",
      "heating_failure_detection",
    ]);
  });

  it("declare the value that turns the feature of each tab of a feature on", () => {
    const features = host
      .resolved("thermostat_config")
      .filter((entry) => (entry.contribution as { feature?: string }).feature !== undefined)
      .map((entry) => [definitionOfContribution(entry.id)?.definition.tab, (entry.contribution as { feature?: string }).feature]);
    expect(features).toEqual([
      ["window", "use_window_feature"],
      ["motion", "use_motion_feature"],
      ["power", "use_power_feature"],
      ["presence", "use_presence_feature"],
      ["auto_start_stop", "use_auto_start_stop_feature"],
      ["sync_device_internal_temp", "sync_device_internal_temp"],
      ["heating_failure_detection", "use_heating_failure_detection_feature"],
    ]);
  });

  it("hide TPI when the proportional function is not TPI and there is no valve regulation", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", proportional_function: "smartpi" })).not.toContain("tpi");
    expect(visibleTabs({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_valve" })).toContain("tpi");
  });

  it("show the valve regulation and hide the auto start and stop when a climate regulates with a valve", () => {
    const valve = visibleTabs({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_valve", use_auto_start_stop_feature: true });
    expect(valve).toContain("valve_regulation");
    expect(valve).not.toContain("auto_start_stop");
    const plain = visibleTabs({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_none", use_auto_start_stop_feature: true });
    expect(plain).toContain("auto_start_stop");
    expect(plain).not.toContain("valve_regulation");
  });

  it("never show the auto start and stop for a thermostat over a switch, even off", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", use_auto_start_stop_feature: true })).not.toContain("auto_start_stop");
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch" })).not.toContain("auto_start_stop");
  });

  it("keep the auto start and stop of a climate without valve regulation in the menu while it is off", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_none" })).toContain("auto_start_stop");
  });

  it("keep the synchronization of the temperature of a climate in the menu while it is off, and never show it for another type", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_none" })).toContain("sync_device_internal_temp");
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", sync_device_internal_temp: true })).not.toContain("sync_device_internal_temp");
    expect(visibleTabs({ thermostat_type: "thermostat_over_valve" })).not.toContain("sync_device_internal_temp");
  });

  it("keep the switch of each feature in the tab of the flow that offers it", () => {
    const climate = { thermostat_type: "thermostat_over_climate" };
    expect(featureStepOf("sync_device_internal_temp", climate, "thermostat")).toBe("type");
    expect(featureStepOf("use_window_feature", climate, "thermostat")).toBe("features");
    expect(featureStepOf("use_central_boiler_feature", { thermostat_type: "thermostat_central_config" }, "central")).toBe("features");
  });

  it("never show the heating failure detection for a climate without valve regulation, whose features do not offer it", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_none" })).not.toContain("heating_failure_detection");
  });
});

describe("the sections of the general configuration", () => {
  const sections = (values: Record<string, unknown>) =>
    host
      .visible(host.resolved("general_config"), { hass: host.hass, values } as never)
      .map((entry) => entry.id);

  it("only offer to create the central configuration while there is none", () => {
    expect(sections({})).toEqual(["core.general.create"]);
  });

  it("show the sections of the central configuration once it exists, the central boiler even while it is off", () => {
    const central = { thermostat_type: "thermostat_central_config" };
    expect(sections(central)).not.toContain("core.general.create");
    expect(sections(central)).toContain("core.general.main");
    expect(sections(central)).toContain("core_central_boiler.general.main");
  });
});

describe("the status of the native tabs", () => {
  const entry = (id: string) => host.resolved("thermostat_config").find((candidate) => candidate.id === id) as PlacedEntry;
  const switchValues = { thermostat_type: "thermostat_over_switch", name: "Salon", temperature_sensor_entity_id: "sensor.indoor", use_main_central_config: false, external_temperature_sensor_entity_id: "sensor.outdoor" };
  const status = (id: string, values: Record<string, unknown>, centralValues: Record<string, unknown> = {}) =>
    host.status(entry(id), { hass: host.hass, thermostatId: "t", thermostatType: "over_switch", values, centralValues } as never);

  it("is complete when every required field that the tab shows has a value", () => {
    expect(status("core.tab.main", switchValues)).toEqual({ kind: "complete" });
  });

  it("counts the required fields without value, before any save", () => {
    expect(status("core.tab.main", { ...switchValues, temperature_sensor_entity_id: null })).toEqual({ kind: "incomplete", missing: 1 });
  });

  it("is inherited when the tab uses the central configuration and nothing is missing", () => {
    expect(status("core_advanced.tab.main", { thermostat_type: "thermostat_over_switch" }, { thermostat_type: "thermostat_central_config" })).toEqual({ kind: "inherited" });
    expect(status("core_advanced.tab.main", { thermostat_type: "thermostat_over_switch", use_advanced_central_config: false }, { thermostat_type: "thermostat_central_config" })).toEqual({
      kind: "complete",
    });
  });

  it("does not inherit without a central configuration, as the page of the tab", () => {
    expect(status("core_advanced.tab.main", { thermostat_type: "thermostat_over_switch" })).not.toEqual({ kind: "inherited" });
  });

  it("counts the sensor of a window detected with a sensor, and not the sensor of a window detected by a drop of temperature", () => {
    const window = { thermostat_type: "thermostat_over_switch", use_window_feature: true, use_window_central_config: false };
    expect(status("core_window.tab.main", window)).toEqual({ kind: "incomplete", missing: 1 });
    expect(status("core_window.tab.main", { ...window, window_sensor_entity_id: "binary_sensor.window" })).toEqual({ kind: "complete" });
    expect(status("core_window.tab.main", { ...window, window_auto_open_threshold: 3 })).toEqual({ kind: "complete" });
    const central = { thermostat_type: "thermostat_central_config", window_auto_open_threshold: 3 };
    expect(status("core_window.tab.main", { ...window, use_window_central_config: true }, central)).toEqual({ kind: "inherited" });
  });
});

describe("the tabs that their values turn off", () => {
  const thermostatEntry = (id: string) => host.resolved("thermostat_config").find((candidate) => candidate.id === id) as PlacedEntry;
  const centralEntry = (id: string) => host.resolved("general_config").find((candidate) => candidate.id === id) as PlacedEntry;
  const switchType = { thermostat_type: "thermostat_over_switch" };
  const central = { thermostat_type: "thermostat_central_config" };
  const status = (entry: PlacedEntry, values: Record<string, unknown>, centralValues: Record<string, unknown> = {}) =>
    host.status(entry, { hass: host.hass, thermostatId: "t", thermostatType: "over_switch", values, centralValues } as never);

  it("is off for the humidity while the humidity sensor is not used, and complete once it is", () => {
    expect(status(thermostatEntry("core_humidity.tab.main"), switchType)).toEqual({ kind: "off" });
    expect(status(thermostatEntry("core_humidity.tab.main"), { ...switchType, use_humidity_feature: false })).toEqual({ kind: "off" });
    expect(status(thermostatEntry("core_humidity.tab.main"), { ...switchType, use_humidity_feature: true })).toEqual({ kind: "complete" });
  });

  it("is off for a lock that blocks neither the users nor the automations, with the defaults of Versatile Thermostat", () => {
    const own = { ...switchType, use_lock_central_config: false };
    expect(status(thermostatEntry("core_lock.tab.main"), { ...own, lock_users: false, lock_automations: false })).toEqual({ kind: "off" });
    expect(status(thermostatEntry("core_lock.tab.main"), { ...own, lock_users: true, lock_automations: false })).toEqual({ kind: "complete" });
    expect(status(thermostatEntry("core_lock.tab.main"), { ...own, lock_users: false })).toEqual({ kind: "complete" });
    expect(status(centralEntry("core_lock.general.main"), { ...central, lock_users: false, lock_automations: false })).toEqual({ kind: "off" });
    expect(status(centralEntry("core_lock.general.main"), central)).toEqual({ kind: "complete" });
  });

  it("is central and off for a thermostat that uses a central lock that blocks nothing, whatever its own values", () => {
    const blocksNothing = { ...central, lock_users: false, lock_automations: false };
    expect(status(thermostatEntry("core_lock.tab.main"), switchType, blocksNothing)).toEqual({ kind: "inherited", off: true });
    expect(status(thermostatEntry("core_lock.tab.main"), { ...switchType, lock_users: true }, blocksNothing)).toEqual({ kind: "inherited", off: true });
    expect(status(thermostatEntry("core_lock.tab.main"), switchType, central)).toEqual({ kind: "inherited" });
  });

  it("is off, not central, for a window whose feature the thermostat turned off, and central for a central without window", () => {
    const navigationStatus = (values: Record<string, unknown>, centralValues: Record<string, unknown>) => {
      const entry = thermostatEntry("core_window.tab.main");
      const feature = (entry.contribution as { feature?: string }).feature as string;
      return values[feature] === true ? status(entry, values, centralValues) : { kind: "off" };
    };
    const centralWithoutWindow = { ...central, use_window_feature: false, window_auto_open_threshold: 3 };
    expect(navigationStatus({ ...switchType, use_window_central_config: true }, centralWithoutWindow)).toEqual({ kind: "off" });
    expect(navigationStatus({ ...switchType, use_window_feature: true, use_window_central_config: true }, centralWithoutWindow)).toEqual({ kind: "inherited" });
  });
});

describe("the names of the fields", () => {
  it("prefer the short name of the dashboard to the name of Versatile Thermostat", () => {
    expect(fieldLabelKey("safety_delay_min", { "label.safety_delay_min": "Safety delay (min)", "field.safety_delay_min": "Safety delay (in minutes)" })).toBe("label.safety_delay_min");
    expect(fieldLabelKey("name", { "field.name": "Name" })).toBe("field.name");
  });

  it("fit on one line of a tile, required asterisk included, in English, French and German", async () => {
    const tooLong: string[] = [];
    for (const plugin of NATIVE_TAB_PLUGINS) {
      const catalogs = (await import(`../src/native/catalogs/${plugin}.ts`)) as Record<"en" | "fr" | "de", Record<string, string>>;
      for (const field of fieldsOfPlugin(plugin).filter((candidate) => !isWideField(candidate) && candidate.kind !== "boolean")) {
        const key = fieldLabelKey(field.key, catalogs.en);
        for (const language of ["en", "fr", "de"] as const) {
          const name = `${catalogs[language][key] ?? ""}${field.required ? "*" : ""}`;
          if (name.length > LABEL_MAX_LENGTH) {
            tooLong.push(`${plugin} ${field.key} (${language}, ${name.length}): ${name}`);
          }
        }
      }
    }
    expect(tooLong).toEqual([]);
  });
});

describe("the translations of the native plugins", () => {
  it("have complete English, French and German catalogs", async () => {
    for (const [id, definition] of definitions) {
      await assertCompleteTranslations(definition.translations, ["fr", "de"]);
      expect(await findTranslationProblems(definition.translations, ["fr", "de"]), id).toEqual([]);
    }
  });

  it("have a label for every field that the plugin shows, and no label for a field that it does not show", () => {
    for (const [id, definition] of definitions) {
      const english = definition.translations.english;
      const shown = new Set(fieldsOfPlugin(id).map((field) => field.key));
      const labelled = new Set(Object.keys(english).filter((key) => key.startsWith("field.")).map((key) => key.slice("field.".length)));
      expect([...shown].filter((key) => !labelled.has(key)), `${id} lacks labels`).toEqual([]);
      expect([...labelled].filter((key) => !shown.has(key)), `${id} has unused labels`).toEqual([]);
    }
  });

  it("have a title for every tab and every navigation contribution", () => {
    for (const definition of definitions.values()) {
      for (const list of Object.values(definition.contributions)) {
        for (const contribution of list ?? []) {
          const title = (contribution as { title?: string }).title;
          if (title !== undefined) {
            expect(title in definition.translations.english, `${contribution.id}: ${title}`).toBe(true);
          }
        }
      }
    }
  });

  it("are shown in English for a language that they do not provide, such as Japanese", async () => {
    const tpi = definitions.get("core_tpi")?.translations as unknown as { setLanguage(language: string): Promise<void>; t: (key: string) => string; english: Record<string, string> };
    await tpi.setLanguage("ja");
    expect(tpi.t("field.tpi_coef_int")).toBe(tpi.english["field.tpi_coef_int"]);
    await tpi.setLanguage("fr");
    expect(tpi.t("field.tpi_coef_int")).not.toBe(tpi.english["field.tpi_coef_int"]);
    await tpi.setLanguage("en");
  });

  it("name the advanced tab after its content in each language, and keep the old name in its description", async () => {
    const advanced = definitions.get("core_advanced")?.translations as unknown as { setLanguage(language: string): Promise<void>; t: (key: string) => string };
    const expected = {
      en: ["Safety and manual override", "Advanced parameters"],
      fr: ["Sécurité et dérogation", "Paramètres avancés"],
      de: ["Sicherheit und Übersteuerung", "Erweiterte Einstellungen"],
    };
    for (const [language, [title, oldName]] of Object.entries(expected)) {
      await advanced.setLanguage(language);
      expect(advanced.t("title.advanced")).toBe(title);
      expect(advanced.t("description.advanced")).toContain(oldName);
    }
    await advanced.setLanguage("en");
    const contributions = definitions.get("core_advanced")?.contributions.thermostat_config?.map((contribution) => contribution.id);
    expect(contributions).toEqual(["core_advanced.tab.main"]);
  });
});
