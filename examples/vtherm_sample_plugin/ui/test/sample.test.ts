// @vitest-environment happy-dom
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { assertCompleteTranslations, createFakeHost, findTranslationProblems } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { beforeAll, describe, expect, it } from "vitest";

let host: FakeHost;
let extras: UiPluginDefinition;
let sample: UiPluginDefinition;

/** The plugins of the dashboard that the sample refers to. A test only needs their identifiers. */
const nativeTab = (id: string): UiPluginDefinition => ({
  id,
  translations: { english: {}, catalogs: {}, t: (key: string) => key, language: "en", setLanguage: async () => undefined, resolve: (_language: string, key: string) => key, warnings: [] } as never,
  contributions: { thermostat_config: [{ id: `${id}.tab.main`, title: "title", component: "native-tab" }] },
});

/** Import a module and give back the definition that it registers. The relations are the ones that the Python side declares. */
async function load(module: () => Promise<unknown>): Promise<UiPluginDefinition> {
  let captured: UiPluginDefinition | undefined;
  (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry = { dashboardVersion: "0.1.0", register: (definition: UiPluginDefinition) => (captured = definition) };
  try {
    await module();
  } finally {
    delete (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry;
  }
  return captured as UiPluginDefinition;
}

beforeAll(async () => {
  host = createFakeHost({ dashboardVersion: "0.1.0" });
  host.registerPlugin({ id: "core", translations: { english: {} } as never, contributions: {} });
  for (const id of ["core_tpi", "core_lock", "core_sync_temp"]) {
    host.registerPlugin(nativeTab(id), { requires: ["core"] });
  }
  // The server gives the plugins in the order of their load dependencies: the extras first.
  extras = await load(() => import("../src/extras"));
  sample = await load(() => import("../src/main"));
  host.registerPlugin(extras, { requires: ["core"] });
  host.registerPlugin(sample, { requires: ["core", "core_tpi"], load_after: ["core_tpi", "core_sync_temp", "vtherm_sample_extras"] });
});

describe("the sample plugin", () => {
  it("registers without problem", () => {
    expect(host.issues()).toEqual([]);
  });

  it("adds a section right after the TPI section", () => {
    const ids = host.resolved("thermostat_config").map((entry) => entry.id);
    expect(ids.indexOf("vtherm_sample.tab.main")).toBe(ids.indexOf("core_tpi.tab.main") + 1);
  });

  it("replaces the section of the synchronization", () => {
    const ids = host.resolved("thermostat_config").map((entry) => entry.id);
    expect(ids).toContain("vtherm_sample.tab.sync");
    expect(ids).not.toContain("core_sync_temp.tab.main");
  });

  it("removes the widget of the other plugin and keeps its own, first", () => {
    expect(host.resolved("thermostat_widget").map((entry) => entry.id)).toEqual(["vtherm_sample.widget.status"]);
  });

  it("shows the section with the properties that the dashboard gives it", async () => {
    const section = host.resolved("thermostat_config").find((entry) => entry.id === "vtherm_sample.tab.main");
    const element = await host.render<"thermostat_config">(section as never, { thermostatId: "entry_salon", values: { name: "Salon", cycle_min: 5 }, centralValues: {}, errors: {}, proposeChanges: () => undefined });
    await (element as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(element.shadowRoot?.textContent).toContain("Cycle of Salon: 5 minutes");
  });

  it("shows the state of the thermostat in the widget", async () => {
    // thermostatId is the configuration entry: its climate entity is on the device of the entry, in the registries of hass.
    host.hass.setDevice({ id: "device_salon", identifiers: [["versatile_thermostat", "entry_salon"]] });
    host.hass.setEntity({ entity_id: "climate.salon", device_id: "device_salon", platform: "versatile_thermostat" });
    host.hass.setState("climate.salon", "heat");
    const widget = host.resolved("thermostat_widget")[0];
    const element = await host.render<"thermostat_widget">(widget as never, { thermostatId: "entry_salon" });
    await (element as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(element.shadowRoot?.textContent).toContain("climate.salon is heat");
  });

  it("says that the state is unknown for an entry that the registries do not have", async () => {
    const widget = host.resolved("thermostat_widget")[0];
    const element = await host.render<"thermostat_widget">(widget as never, { thermostatId: "entry_unknown" });
    await (element as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(element.shadowRoot?.textContent).toContain("entry_unknown is unknown");
  });

  it("has complete French and German catalogs", async () => {
    await assertCompleteTranslations(sample.translations, ["fr", "de"]);
    expect(await findTranslationProblems(sample.translations, ["fr", "de"])).toEqual([]);
    expect(extras.translations).toBe(sample.translations);
  });
});
