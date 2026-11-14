// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { UiPluginValidationError, defineTranslations, registerUiPlugin } from "../src/index.ts";
import type { UiPluginDefinition } from "../src/index.ts";
import { assertCompleteTranslations, createFakeHass, createFakeHost, findTranslationProblems } from "../src/testing.ts";

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

describe("the fake hass", () => {
  it("holds states, the language and the services called", async () => {
    const hass = createFakeHass({ language: "fr", states: { "sensor.temp": "19.5" } });
    hass.setState("climate.salon", "heat", { temperature: 20 });
    expect(hass.states["sensor.temp"]?.state).toBe("19.5");
    expect(hass.states["climate.salon"]).toEqual({ state: "heat", attributes: { temperature: 20 } });
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
