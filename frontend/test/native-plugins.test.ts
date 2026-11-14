// @vitest-environment happy-dom
import { CORE_TOP_TABS, defineTranslations } from "@vtherm/dashboard-sdk";
import type { PlacedEntry, UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { assertCompleteTranslations, createFakeHost, findTranslationProblems } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { FLOW_TABS, TAB_DEFINITIONS, centralContributionId, definitionOfContribution, fieldsOfPlugin, thermostatContributionId } from "../src/native/tab-definitions.ts";
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
    expect(ids(host.resolved("top_tab"))).toEqual([CORE_TOP_TABS.dashboard, CORE_TOP_TABS.thermostats, CORE_TOP_TABS.configuration]);
  });

  it("name the tab of a plugin with a single tab main, and the tabs of core after their tab", () => {
    const order = ids(host.resolved("thermostat_config"));
    expect(order).toContain("core_tpi.tab.main");
    expect(order).toContain("core_lock.tab.main");
    expect(order).toContain("core_sync_temp.tab.main");
    expect(order.filter((id) => id.startsWith("core.tab."))).toEqual(["core.tab.main", "core.tab.features", "core.tab.type"]);
  });

  it("put the tabs of a thermostat in the order of the menu of the flow, after the overview", () => {
    const order = ids(host.resolved("thermostat_config"));
    expect(order[0]).toBe("core.page.thermostat_overview");
    const expected = TAB_DEFINITIONS.filter((definition) => definition.thermostat !== undefined).map(thermostatContributionId);
    expect(order.slice(1)).toEqual(expected);
    expect(expected.map((id) => definitionOfContribution(id)?.definition.tab)).toEqual(FLOW_TABS.filter((tab) => tab !== "central_boiler"));
  });

  it("put the sections of the general configuration under the group Versatile Thermostat, before the pages of the dashboard", () => {
    const menu = host.menu(CORE_TOP_TABS.configuration);
    const sections = menu.filter((entry) => entry.hook === "general_config");
    expect(ids(sections)[0]).toBe("core.general.create");
    expect(ids(menu).slice(-2)).toEqual(["core.page.plugins", "core.page.dev_plugins"]);
    expect(sections.every((entry) => (entry.contribution as { group?: string }).group === "group.vtherm")).toBe(true);
    expect(ids(sections).slice(1)).toEqual(TAB_DEFINITIONS.filter((definition) => definition.central !== undefined).map(centralContributionId));
    expect(ids(sections).slice(1).map((id) => definitionOfContribution(id)?.definition.tab)).toEqual(FLOW_TABS.filter((tab) => !["type", "auto_start_stop", "valve_regulation", "sync_device_internal_temp", "humidity"].includes(tab)));
  });

  it("let a third-party tab placed after TPI come just after it", () => {
    const third = createThirdParty();
    third.registerPlugin({ id: "smartpi", translations: defineTranslations({ t: "Smart" }), contributions: { thermostat_config: [{ id: "smartpi.tab", title: "t", component: "x-el", placement: { after: "core_tpi.tab.main" } }] } });
    const order = ids(third.resolved("thermostat_config"));
    expect(order[order.indexOf("core_tpi.tab.main") + 1]).toBe("smartpi.tab");
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
    expect(visibleTabs(everything)).toEqual(["main", "features", "type", "tpi", "presets", "window", "motion", "power", "presence", "valve_regulation", "sync_device_internal_temp", "advanced", "lock", "humidity", "heating_failure_detection"]);
  });

  it("show only the tabs that always apply for a thermostat over a switch without features", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", proportional_function: "tpi" })).toEqual(["main", "features", "type", "tpi", "presets", "advanced", "lock", "humidity"]);
  });

  it("show the tab of a feature once it is turned on", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", use_motion_feature: true })).toContain("motion");
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", use_motion_feature: false })).not.toContain("motion");
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

  it("never show the auto start and stop for a thermostat over a switch", () => {
    expect(visibleTabs({ thermostat_type: "thermostat_over_switch", use_auto_start_stop_feature: true })).not.toContain("auto_start_stop");
  });

  it("hide the heating failure detection unless the feature is on", () => {
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

  it("show the sections of the central configuration once it exists, the central boiler with its feature", () => {
    const central = { thermostat_type: "thermostat_central_config" };
    expect(sections(central)).not.toContain("core.general.create");
    expect(sections(central)).toContain("core.general.main");
    expect(sections(central)).not.toContain("core_central_boiler.general.main");
    expect(sections({ ...central, use_central_boiler_feature: true })).toContain("core_central_boiler.general.main");
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
});
