// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { UiPluginValidationError, defineTranslations, getEntryEntities, registerUiPlugin, selectorOf } from "../src/index.ts";
import type { Hass, UiPluginDefinition } from "../src/index.ts";
import { assertCompleteTranslations, createFakeHass, createFakeHost, defineFieldHelpMock, defineHaControlMocks, findTranslationProblems } from "../src/testing.ts";
import type { MockFieldHelpElement } from "../src/testing.ts";
import { FIELD_HELP_ELEMENT } from "../src/index.ts";
import type { FieldHelpProps } from "../src/index.ts";
import type { MockHaElement } from "../src/testing.ts";

const translations = defineTranslations({ title: "Title" });

function plugin(id: string, contributions: Record<string, unknown>): UiPluginDefinition {
  return { id, translations, contributions } as unknown as UiPluginDefinition;
}

const page = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: "title", component: "test-page", ...extra });
const core = plugin("core", {
  top_tab: [
    { id: "core.top.dashboard", title: "title" },
    { id: "core.top.thermostats", title: "title" },
    { id: "core.top.configuration", title: "title", zone: "end" },
  ],
  thermostat_config: [page("core_tpi.tab.main".replace("core_tpi", "core"), { id: "core.tab.main" })],
});
const tpi = plugin("core_tpi", { thermostat_config: [page("core_tpi.tab.main")] });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the positions in the fake host", () => {
  it("returns the resolved list of a hook, with the contribution right after its target", () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    host.registerPlugin(tpi);
    host.registerPlugin(plugin("smartpi", { thermostat_config: [page("smartpi.tab.main", { placement: { after: "core_tpi.tab.main" } })] }));
    expect(host.resolved("thermostat_config").map((entry) => entry.id)).toEqual(["core.tab.main", "core_tpi.tab.main", "smartpi.tab.main"]);
  });

  it("lists every hook", () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    host.registerPlugin(
      plugin("smartpi", {
        top_tab: [{ id: "smartpi.top", title: "title" }],
        tab_page: [page("smartpi.page", { tab: "smartpi.top" })],
        global_page: [page("smartpi.gp")],
        global_widget: [{ id: "smartpi.gw", component: "x-el" }],
        general_config: [page("smartpi.gc")],
        thermostat_widget: [{ id: "smartpi.tw", component: "x-el" }],
      }),
    );
    const idsOf = (hook: Parameters<typeof host.resolved>[0]) => host.resolved(hook).map((entry) => entry.id);
    expect(idsOf("top_tab")).toEqual(["core.top.dashboard", "core.top.thermostats", "smartpi.top", "core.top.configuration"]);
    expect(idsOf("tab_page")).toEqual(["smartpi.page"]);
    expect(idsOf("global_page")).toEqual(["smartpi.gp"]);
    expect(idsOf("global_widget")).toEqual(["smartpi.gw"]);
    expect(idsOf("general_config")).toEqual(["smartpi.gc"]);
    expect(idsOf("thermostat_widget")).toEqual(["smartpi.tw"]);
    expect(host.menu("smartpi.top").map((entry) => entry.id)).toEqual(["smartpi.page"]);
  });

  it("applies the visibility conditions to a context", () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    host.registerPlugin(plugin("smartpi", { thermostat_config: [page("smartpi.tab", { visible: (context: { thermostatType: string }) => context.thermostatType === "over_switch" })] }));
    const entries = host.resolved("thermostat_config");
    const context = (thermostatType: string) => ({ hass: host.hass, thermostatId: "t", thermostatType, values: {}, centralValues: {} }) as never;
    expect(host.visible(entries, context("over_switch")).map((entry) => entry.id)).toEqual(["core.tab.main", "smartpi.tab"]);
    expect(host.visible(entries, context("over_climate")).map((entry) => entry.id)).toEqual(["core.tab.main"]);
  });
});

describe("the same rules as the dashboard", () => {
  const invalid = plugin("smartpi", { thermostat_config: [page("autre.tab.main")] });

  it("refuses an invalid definition with the same error as registerUiPlugin", () => {
    const host = createFakeHost();
    host.install();
    try {
      let fromHost: unknown;
      let fromSdk: unknown;
      try {
        host.registerPlugin(invalid);
      } catch (error) {
        fromHost = error;
      }
      try {
        registerUiPlugin(invalid);
      } catch (error) {
        fromSdk = error;
      }
      expect(fromHost).toBeInstanceOf(UiPluginValidationError);
      expect((fromHost as Error).message).toBe((fromSdk as Error).message);
      expect((fromHost as Error).message).toContain("contributions.thermostat_config[0].id");
    } finally {
      host.uninstall();
    }
  });

  it("refuses save_actions on a hook that is not a configuration, as the dashboard does", () => {
    const host = createFakeHost();
    const page = { id: "smartpi", translations: defineTranslations({ t: "T" }), contributions: { global_page: [{ id: "smartpi.page", title: "t", component: "smartpi-page", save_actions: "component" }] } };
    expect(() => host.registerPlugin(page as never)).toThrow(/contributions\.global_page\[0\]\.save_actions/);
  });

  it("receives the registration of registerUiPlugin once installed", () => {
    const host = createFakeHost({ dashboardVersion: "2.3.0" });
    host.install();
    try {
      registerUiPlugin(plugin("smartpi", { global_widget: [{ id: "smartpi.w", component: "x-el" }] }));
      expect(host.resolved("global_widget").map((entry) => entry.id)).toEqual(["smartpi.w"]);
      expect(host.dashboardVersion).toBe("2.3.0");
    } finally {
      host.uninstall();
    }
    expect((globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry).toBeUndefined();
  });

  it("refuses a plugin that is not known in Python when it is told which ones are", () => {
    const host = createFakeHost({ knownPlugins: ["smartpi"] });
    expect(() => host.registerPlugin(plugin("stranger", {}))).toThrow(/not registered in Python/);
    expect(() => host.registerPlugin(plugin("smartpi", {}))).not.toThrow();
    expect(() => host.registerPlugin(plugin("smartpi", {}))).toThrow(/already registered/);
  });

  it("reports the problems of the placement", () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    const issues = host.registerPlugin(plugin("smartpi", { thermostat_config: [page("smartpi.tab", { placement: { after: "absent.tab" } })] }));
    expect(issues.map((issue) => issue.code)).toEqual(["target_missing"]);
    expect(host.issues()).toHaveLength(1);
  });
});

describe("rendering a component", () => {
  class TestPage extends HTMLElement {
    hass: unknown;
    thermostatId = "";
    renderedWith = "";
    connectedCallback(): void {
      this.renderedWith = `${this.thermostatId}`;
      this.textContent = `thermostat ${this.thermostatId}`;
    }
  }
  if (customElements.get("test-page") === undefined) {
    customElements.define("test-page", TestPage);
  }

  it("shows the component with the fake hass and the properties of the hook, set before the first render", async () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    const [entry] = host.resolved("thermostat_config");
    const element = (await host.render<"thermostat_config">(entry as never, { thermostatId: "climate.salon", values: {}, centralValues: {}, errors: {}, proposeChanges: () => undefined })) as TestPage;
    expect(element.hass).toBe(host.hass);
    expect(element.thermostatId).toBe("climate.salon");
    expect(element.renderedWith).toBe("climate.salon");
    expect(document.body.textContent).toBe("thermostat climate.salon");
  });

  it("tells the component that the screen is wide, unless the test says that it is narrow", async () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    const [entry] = host.resolved("thermostat_config");
    const props = { thermostatId: "climate.salon", values: {}, centralValues: {}, errors: {}, proposeChanges: () => undefined };
    const wide = (await host.render<"thermostat_config">(entry as never, props)) as TestPage & { narrow: boolean };
    expect(wide.narrow).toBe(false);
    const narrow = (await host.render<"thermostat_config">(entry as never, { ...props, narrow: true })) as TestPage & { narrow: boolean };
    expect(narrow.narrow).toBe(true);
  });

  it("explains an element that is not defined", async () => {
    const host = createFakeHost();
    host.registerPlugin(plugin("smartpi", { global_widget: [{ id: "smartpi.w", component: "never-defined-el" }] }));
    await expect(host.render(host.resolved("global_widget")[0] as never, {} as never)).rejects.toThrow(/never-defined-el.*not defined/);
  });

  it("explains a contribution that has no component", async () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    await expect(host.render(host.resolved("top_tab")[0] as never, {} as never)).rejects.toThrow(/no component/);
  });
});

describe("the size of the widgets in the fake host", () => {
  it("gives the widgets their size with its default values", () => {
    const host = createFakeHost();
    host.registerPlugin(
      plugin("smartpi", {
        thermostat_widget: [
          { id: "smartpi.none", component: "x-el" },
          { id: "smartpi.full", component: "x-el", size: { columns: "full" } },
          { id: "smartpi.tall", component: "x-el", size: { rows: 3 } },
          { id: "smartpi.both", component: "x-el", size: { columns: 2, rows: 2 } },
        ],
        global_widget: [{ id: "smartpi.global", component: "x-el" }],
      }),
    );
    expect(host.resolved("thermostat_widget").map((entry) => [entry.id, entry.size])).toEqual([
      ["smartpi.none", { columns: 1, rows: 1 }],
      ["smartpi.full", { columns: "full", rows: 1 }],
      ["smartpi.tall", { columns: 1, rows: 3 }],
      ["smartpi.both", { columns: 2, rows: 2 }],
    ]);
    expect(host.resolved("global_widget")[0]?.size).toEqual({ columns: 1, rows: 1 });
  });

  it("gives no size to the contributions that are not widgets", () => {
    const host = createFakeHost();
    host.registerPlugin(core);
    expect(host.resolved("thermostat_config")[0]?.size).toBeUndefined();
  });

  it("refuses an invalid size with the same error as registerUiPlugin", () => {
    const definition = plugin("smartpi", { thermostat_widget: [{ id: "smartpi.w", component: "x-el", size: { rows: 5 } }] });
    const host = createFakeHost();
    let fromHost: unknown;
    try {
      host.registerPlugin(definition);
    } catch (error) {
      fromHost = error;
    }
    host.install();
    try {
      expect(() => registerUiPlugin(definition)).toThrow(UiPluginValidationError);
      expect(() => registerUiPlugin(definition)).toThrow((fromHost as Error).message);
    } finally {
      host.uninstall();
    }
    expect((fromHost as UiPluginValidationError).issues.map((issue) => issue.path)).toEqual(["contributions.thermostat_widget[0].size.rows"]);
  });
});

describe("a widget that reads the entities of its thermostat", () => {
  class ShareWidget extends HTMLElement {
    hass: Hass | undefined;
    thermostatId = "";
    connectedCallback(): void {
      const sensor = this.hass === undefined ? undefined : getEntryEntities(this.hass, this.thermostatId).byKey["power_percent"];
      this.textContent = sensor === undefined ? "—" : `${this.hass?.states[sensor]?.state ?? "—"} %`;
    }
  }
  if (customElements.get("share-widget-el") === undefined) {
    customElements.define("share-widget-el", ShareWidget);
  }

  it("reads the sensor that the test declares in the registries of the fake hass", async () => {
    const host = createFakeHost();
    host.registerPlugin(plugin("smartpi", { thermostat_widget: [{ id: "smartpi.share", component: "share-widget-el" }] }));
    host.hass.setDevice({ id: "device_salon", identifiers: [["versatile_thermostat", "entry_salon"]] });
    host.hass.setEntity({ entity_id: "sensor.salon_power", device_id: "device_salon", platform: "versatile_thermostat", translation_key: "power_percent" });
    host.hass.setState("sensor.salon_power", "42");
    const element = await host.render<"thermostat_widget">(host.resolved("thermostat_widget")[0] as never, { thermostatId: "entry_salon" });
    expect(element.textContent).toBe("42 %");
  });

  it("finds nothing for an entry that the registries of the fake hass do not declare, as in the dashboard", async () => {
    const host = createFakeHost();
    host.registerPlugin(plugin("smartpi", { thermostat_widget: [{ id: "smartpi.share", component: "share-widget-el" }] }));
    expect(host.hass.devices).toBeUndefined();
    expect(getEntryEntities(host.hass, "entry_salon").entities).toEqual([]);
    host.hass.setDevice({ id: "device_salon", identifiers: [["versatile_thermostat", "entry_salon"]] });
    const element = await host.render<"thermostat_widget">(host.resolved("thermostat_widget")[0] as never, { thermostatId: "entry_other" });
    expect(getEntryEntities(host.hass, "entry_other")).toEqual({ deviceId: undefined, entities: [], climate: undefined, byKey: {} });
    expect(element.textContent).toBe("—");
  });

  it("takes the registries given when the fake hass is created", () => {
    const hass = createFakeHass({
      devices: { device_salon: { id: "device_salon", identifiers: [["versatile_thermostat", "entry_salon"]] } },
      entities: { "climate.salon": { entity_id: "climate.salon", device_id: "device_salon" } },
    });
    expect(getEntryEntities(hass, "entry_salon").climate).toBe("climate.salon");
  });
});

describe("the fake hass", () => {
  it("holds states, the language and the services called", async () => {
    const hass = createFakeHass({ language: "fr", states: { "sensor.temp": "19.5" } });
    hass.setState("climate.salon", "heat", { temperature: 20 });
    expect(hass.states["sensor.temp"]?.state).toBe("19.5");
    expect(hass.states["climate.salon"]).toMatchObject({ entity_id: "climate.salon", state: "heat", attributes: { temperature: 20 } });
    expect(Number.isNaN(Date.parse(hass.states["climate.salon"]?.last_changed ?? ""))).toBe(false);
    hass.setLanguage("de");
    expect([hass.language, hass.locale?.language]).toEqual(["de", "de"]);
    await hass.callService("number", "set_value", { value: 20 });
    expect(hass.serviceCalls).toEqual([{ domain: "number", service: "set_value", data: { value: 20 } }]);
  });

  it("refuses a WebSocket message that the test did not plan for, and answers the ones it did", async () => {
    const hass = createFakeHass({ isAdmin: false });
    expect(hass.user?.is_admin).toBe(false);
    await expect(hass.callWS({ type: "x" })).rejects.toThrow(/setWebSocketHandler/);
    hass.setWebSocketHandler((message) => ({ echo: message["type"] }));
    await expect(hass.callWS({ type: "x" })).resolves.toEqual({ echo: "x" });
  });
});

describe("the check of the translations", () => {
  const en = { a: "A", b: "B" } as const;

  it("accepts complete catalogs, including one loaded on demand", async () => {
    const complete = defineTranslations(en, { fr: { a: "A", b: "B" }, de: async () => ({ default: { a: "A", b: "B" } }) });
    await expect(assertCompleteTranslations(complete, ["fr", "de"])).resolves.toBeUndefined();
  });

  it("fails and names the missing key and the unknown key", async () => {
    const broken = defineTranslations(en, { de: { a: "A", extra: "X" } as never });
    expect(await findTranslationProblems(broken, ["de"])).toEqual([{ language: "de", missing: ["b"], unknown: ["extra"] }]);
    await expect(assertCompleteTranslations(broken, ["de"])).rejects.toThrow(/de: missing 'b'; unknown 'extra'/);
  });

  it("fails for a language that the plugin does not declare", async () => {
    await expect(assertCompleteTranslations(defineTranslations(en), ["fr"])).rejects.toThrow(/fr: missing 'a', 'b'/);
  });

  it("compares the language tags without regard to case", async () => {
    const regional = defineTranslations(en, { "pt-BR": { a: "A", b: "B" } });
    await expect(assertCompleteTranslations(regional, ["pt_br"])).resolves.toBeUndefined();
  });
});

describe("the simulated components of Home Assistant", () => {
  class ThresholdField extends HTMLElement {
    proposeChanges: (changes: Record<string, unknown>) => void = () => undefined;
    connectedCallback(): void {
      const selector = document.createElement("ha-selector") as MockHaElement;
      selector.selector = selectorOf({ type: "entity_list", key: "underlying_entity_ids", domains: ["climate"] });
      selector.value = ["climate.salon"];
      selector.label = "Underlyings";
      selector.helper = "The heaters";
      selector.error = "Unknown entity";
      selector.addEventListener("value-changed", (event) => this.proposeChanges({ underlying_entity_ids: (event as CustomEvent<{ value: unknown }>).detail.value }));
      this.append(selector);
    }
  }
  if (customElements.get("threshold-field") === undefined) {
    customElements.define("threshold-field", ThresholdField);
  }

  it("keeps the selector, the value, the label, the help and the error that a component gives", () => {
    defineHaControlMocks();
    const field = document.createElement("threshold-field") as ThresholdField;
    document.body.append(field);
    const selector = field.querySelector("ha-selector") as MockHaElement;
    expect(selector.selector).toEqual({ entity: { multiple: true, reorder: true, filter: [{ domain: ["climate"] }] } });
    expect([selector.value, selector.label, selector.helper, selector.error]).toEqual([["climate.salon"], "Underlyings", "The heaters", "Unknown entity"]);
  });

  it("sends value-changed when the test changes the value, so that the component proposes the change", () => {
    defineHaControlMocks();
    const proposed: Record<string, unknown>[] = [];
    const field = document.createElement("threshold-field") as ThresholdField;
    field.proposeChanges = (changes) => proposed.push(changes);
    document.body.append(field);
    (field.querySelector("ha-selector") as MockHaElement).change(["climate.salon", "climate.chambre"]);
    expect(proposed).toEqual([{ underlying_entity_ids: ["climate.salon", "climate.chambre"] }]);
  });

  it("turns a simulated switch on and tells it with change", () => {
    defineHaControlMocks();
    const toggle = document.createElement("ha-switch") as MockHaElement;
    let changes = 0;
    toggle.addEventListener("change", () => (changes += 1));
    toggle.change(true);
    expect([toggle.checked, changes]).toEqual([true, 1]);
  });
});

describe("the help of a field", () => {
  /** A tab of a plugin that gives the help of its field to the element of the dashboard. */
  class HelpedTab extends HTMLElement {
    values: Record<string, unknown> = {};
    connectedCallback(): void {
      const help = document.createElement(FIELD_HELP_ELEMENT) as HTMLElement & FieldHelpProps;
      Object.assign(help, { label: "Cycle", hint: "How long a cycle lasts.", info: "A longer cycle switches less often.", diagram: "tpi_cycle", values: this.values, highlight: "cycle_min" });
      this.append(help);
    }
  }
  if (customElements.get("helped-tab") === undefined) {
    customElements.define("helped-tab", HelpedTab);
  }

  it("lets a test read the hint, the explanation and the diagram that a tab mounted in the fake host gives to the help of a field", async () => {
    defineFieldHelpMock();
    const host = createFakeHost();
    host.registerPlugin(core);
    host.registerPlugin(plugin("helped", { thermostat_config: [{ id: "helped.tab.main", title: "title", component: "helped-tab" }] }));
    const entry = host.resolved("thermostat_config").find((candidate) => candidate.id === "helped.tab.main");
    const tab = (await host.render<"thermostat_config">(entry as never, { thermostatId: "climate.salon", values: { cycle_min: 7 }, centralValues: {}, errors: {}, proposeChanges: () => undefined })) as HelpedTab;
    const help = tab.querySelector(FIELD_HELP_ELEMENT) as MockFieldHelpElement;
    expect([help.label, help.hint, help.info, help.diagram, help.highlight]).toEqual(["Cycle", "How long a cycle lasts.", "A longer cycle switches less often.", "tpi_cycle", "cycle_min"]);
    expect(help.values).toEqual({ cycle_min: 7 });
    expect(help.textContent).toBe("How long a cycle lasts.");
  });
});
