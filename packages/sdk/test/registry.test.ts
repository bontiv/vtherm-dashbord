import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardNotFoundError, UiPluginValidationError, defineTranslations, getDashboardVersion, registerUiPlugin } from "../src/index.ts";
import type { UiPluginDefinition, UiPluginRegistry } from "../src/index.ts";

type Page = { VThermUiPluginRegistry?: UiPluginRegistry };
const page = globalThis as Page;

const definition = (id: string): UiPluginDefinition => ({
  id,
  translations: defineTranslations({ "tab.title": "Tab" }),
  contributions: { thermostat_config: [{ id: `${id}.tab.main`, title: "tab.title", component: `${id}-tab` }] },
});

/** A registry like the one of the dashboard: it knows the plugins that were declared in Python. */
function createRegistry(knownPlugins: readonly string[]): UiPluginRegistry & { readonly applied: UiPluginDefinition[] } {
  const applied: UiPluginDefinition[] = [];
  return {
    applied,
    dashboardVersion: "1.4.0",
    register(registered) {
      if (!knownPlugins.includes(registered.id)) {
        throw new Error(`The plugin '${registered.id}' is not registered in Python`);
      }
      applied.push(registered);
    },
  };
}

beforeEach(() => {
  delete page.VThermUiPluginRegistry;
});

afterEach(() => {
  delete page.VThermUiPluginRegistry;
  vi.resetModules();
});

describe("registerUiPlugin", () => {
  it("gives the contributions to the registry of the dashboard", () => {
    const registry = createRegistry(["smartpi"]);
    page.VThermUiPluginRegistry = registry;
    registerUiPlugin(definition("smartpi"));
    expect(registry.applied.map((registered) => registered.id)).toEqual(["smartpi"]);
  });

  it("fails with a clear error when the dashboard is not in the page", () => {
    expect(() => registerUiPlugin(definition("smartpi"))).toThrow(DashboardNotFoundError);
    expect(() => registerUiPlugin(definition("smartpi"))).toThrow(/dashboard was not found/);
  });

  it("checks the definition before it reaches the registry", () => {
    const registry = createRegistry(["smartpi"]);
    page.VThermUiPluginRegistry = registry;
    const invalid = { id: "smartpi", translations: defineTranslations({}), contributions: { thermostat_config: [{ id: "autre.tab.main", title: "t", component: "c" }] } };
    expect(() => registerUiPlugin(invalid as UiPluginDefinition)).toThrow(UiPluginValidationError);
    expect(registry.applied).toEqual([]);
  });

  it("checks the definition even when the dashboard is absent", () => {
    expect(() => registerUiPlugin({ id: "", translations: defineTranslations({}), contributions: {} })).toThrow(UiPluginValidationError);
  });

  it("refuses a plugin that is not known in Python, without applying any contribution", () => {
    const registry = createRegistry(["smartpi"]);
    page.VThermUiPluginRegistry = registry;
    expect(() => registerUiPlugin(definition("stranger"))).toThrow(/not registered in Python/);
    expect(registry.applied).toEqual([]);
  });

  it("registers two plugins that each embed their own copy of the SDK in the same registry", async () => {
    const registry = createRegistry(["first", "second"]);
    page.VThermUiPluginRegistry = registry;

    vi.resetModules();
    const firstCopy = await import("../src/index.ts");
    vi.resetModules();
    const secondCopy = await import("../src/index.ts");

    expect(firstCopy.registerUiPlugin).not.toBe(secondCopy.registerUiPlugin);
    firstCopy.registerUiPlugin(definition("first"));
    secondCopy.registerUiPlugin(definition("second"));
    expect(registry.applied.map((registered) => registered.id)).toEqual(["first", "second"]);
  });
});

describe("getDashboardVersion", () => {
  it("returns the version of the dashboard of the page", () => {
    page.VThermUiPluginRegistry = createRegistry([]);
    expect(getDashboardVersion()).toBe("1.4.0");
  });

  it("fails when the dashboard is not in the page", () => {
    expect(() => getDashboardVersion()).toThrow(DashboardNotFoundError);
  });
});
