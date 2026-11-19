import { afterEach, describe, expect, it, vi } from "vitest";

import { defineTranslations, getDashboardVersion, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { bootstrap } from "../src/bootstrap.ts";
import { createRegistry, installRegistry, uninstallRegistry } from "../src/registry.ts";
import { parsePluginList } from "../src/plugin-list.ts";

afterEach(() => {
  uninstallRegistry();
});

function plugin(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, js_url: `/${id}/ui.js`, dashboard_version: ">=0.1,<1.0", requires: [], load_after: [], load_before: [], source: "installed", state: "ready", reason: null, details: {}, order: 0, ...overrides };
}

const list = (...plugins: Record<string, unknown>[]) =>
  parsePluginList({ dashboard_version: "0.1.0", plugins: plugins.map((item, index) => ({ ...item, order: item["state"] === undefined || item["state"] === "ready" ? index : null })) });

const definition = (id: string): UiPluginDefinition => ({
  id,
  translations: defineTranslations({ "tab.title": "Tab" }),
  contributions: { thermostat_config: [{ id: `${id}.tab.main`, title: "tab.title", component: `${id}-tab` }] },
});

/** The module of a plugin written with the SDK: it registers itself when it is imported. */
const moduleOf = (id: string) => () => registerUiPlugin(definition(id));

describe("the registry", () => {
  it("accepts a plugin that is in the list and keeps its definition", () => {
    const registry = createRegistry(list(plugin("core"), plugin("smartpi")));
    registry.register(definition("smartpi"));
    expect(registry.isRegistered("smartpi")).toBe(true);
    expect(registry.isRegistered("core")).toBe(false);
    expect(registry.definitions().map((item) => item.id)).toEqual(["smartpi"]);
  });

  it("gives the widgets their size with its default values, and refuses an invalid size", () => {
    const registry = createRegistry(list(plugin("smartpi"), plugin("broken")));
    registry.register({
      id: "smartpi",
      translations: defineTranslations({}),
      contributions: {
        thermostat_widget: [
          { id: "smartpi.none", component: "smartpi-none" },
          { id: "smartpi.full", component: "smartpi-full", size: { columns: "full" } },
        ],
        global_widget: [{ id: "smartpi.global", component: "smartpi-global", size: { columns: 2, rows: 3 } }],
      },
    });
    expect(registry.engine.widgets("thermostat_widget").map((entry) => entry.size)).toEqual([
      { columns: 1, rows: 1 },
      { columns: "full", rows: 1 },
    ]);
    expect(registry.engine.widgets("global_widget")[0]?.size).toEqual({ columns: 2, rows: 3 });
    const broken = { id: "broken", translations: defineTranslations({}), contributions: { thermostat_widget: [{ id: "broken.w", component: "broken-w", size: { columns: 4 } }] } };
    expect(() => registry.register(broken as never)).toThrow(/size\.columns/);
  });

  it("refuses a plugin that the server did not put in the list, without applying any contribution", () => {
    const registry = createRegistry(list(plugin("core")));
    expect(() => registry.register(definition("stranger"))).toThrow(/neither registered in Python nor declared by a development entry/);
    expect(registry.definitions()).toEqual([]);
  });

  it("refuses a plugin that the server excluded", () => {
    const registry = createRegistry(list(plugin("late", { state: "dashboard_incompatible", reason: "too_old" })));
    expect(() => registry.register(definition("late"))).toThrow(/not known/);
  });

  it("accepts a plugin declared by a development entry", () => {
    const registry = createRegistry(list(plugin("mine", { source: "development" })));
    expect(() => registry.register(definition("mine"))).not.toThrow();
  });

  it("refuses a second registration of the same plugin", () => {
    const registry = createRegistry(list(plugin("smartpi")));
    registry.register(definition("smartpi"));
    expect(() => registry.register(definition("smartpi"))).toThrow(/already registered/);
  });

  it("refuses a definition that is not valid, whoever calls it", () => {
    const registry = createRegistry(list(plugin("smartpi")));
    expect(() => registry.register({ id: "smartpi", translations: defineTranslations({}), contributions: { thermostat_config: [{ id: "other.tab", title: "t", component: "c" }] } })).toThrow(/contributions\.thermostat_config\[0\]\.id/);
  });

  it("accepts a configuration section with a status and a feature, and refuses a status that is not a function", () => {
    const registry = createRegistry(list(plugin("smartpi"), plugin("other")));
    const section = { id: "smartpi.tab", title: "t", component: "c", feature: "use_smartpi_feature", status: () => ({ kind: "complete" as const }) };
    expect(() => registry.register({ id: "smartpi", translations: defineTranslations({}), contributions: { thermostat_config: [section] } })).not.toThrow();
    const wrong = { id: "other.tab", title: "t", component: "c", status: "complete" };
    expect(() => registry.register({ id: "other", translations: defineTranslations({}), contributions: { thermostat_config: [wrong as never] } })).toThrow(/contributions\.thermostat_config\[0\]\.status/);
  });

  it("gives the version of the dashboard to the plugins", () => {
    installRegistry(createRegistry(list(plugin("a"))));
    expect(getDashboardVersion()).toBe("0.1.0");
  });
});

describe("bootstrap", () => {
  const server = (...plugins: Record<string, unknown>[]) => ({ callWS: vi.fn().mockResolvedValue({ dashboard_version: "0.1.0", plugins: list(...plugins).plugins }) });

  it("puts the registry in the page before the first module is imported, and loads core first", async () => {
    const seen: { url: string; registryReady: boolean }[] = [];
    const importModule = async (url: string) => {
      seen.push({ url, registryReady: (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry !== undefined });
      moduleOf(url.split("/")[1] as string)();
    };
    const result = await bootstrap(server(plugin("core"), plugin("core_tpi", { requires: ["core"] }), plugin("smartpi", { requires: ["core"] })) as never, { importModule });
    expect(seen).toEqual([
      { url: "/core/ui.js", registryReady: true },
      { url: "/core_tpi/ui.js", registryReady: true },
      { url: "/smartpi/ui.js", registryReady: true },
    ]);
    expect(result.registry.definitions().map((item) => item.id)).toEqual(["core", "core_tpi", "smartpi"]);
    expect(result.statuses.map((status) => status.state)).toEqual(["loaded", "loaded", "loaded"]);
  });

  it("fails a plugin that the server does not know when it tries to register, and keeps the others", async () => {
    const importModule = async (url: string) => {
      const id = url.split("/")[1] as string;
      moduleOf(id === "known" ? "known" : "stranger")();
    };
    const result = await bootstrap(server(plugin("known"), plugin("impostor")) as never, { importModule });
    expect(Object.fromEntries(result.statuses.map((status) => [status.id, status.state]))).toEqual({ known: "loaded", impostor: "failed" });
    expect(result.statuses[1]?.details["message"]).toEqual(expect.stringContaining("not known"));
    expect(result.registry.definitions().map((item) => item.id)).toEqual(["known"]);
  });

  it("starts with only the native plugins and sends the development entries to the server", async () => {
    const callWS = server(plugin("core")).callWS;
    const entry = { id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: ">=0.1" };
    const result = await bootstrap({ callWS } as never, { developmentEntries: [entry], importModule: async () => moduleOf("core")() });
    expect(callWS).toHaveBeenCalledWith({ type: "vtherm_dashboard/get_ui_plugins", dev_plugins: [entry] });
    expect(result.statuses[0]?.state).toBe("loaded");
  });
});
