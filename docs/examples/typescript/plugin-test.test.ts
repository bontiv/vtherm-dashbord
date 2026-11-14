// @vitest-environment happy-dom
import { createFakeHost } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { nativePlugins } from "./base-plugins.ts";
import { definition } from "./hooks-and-placement.ts";

/** A host with the plugins of the dashboard, and the plugin under test registered after them. */
function hostWithPlugin() {
  const host = createFakeHost();
  for (const native of nativePlugins) {
    host.registerPlugin(native);
  }
  const issues = host.registerPlugin(definition, { requires: ["core"], load_after: ["core_tpi", "core_lock"] });
  return { host, issues };
}

it("replaces the TPI section and removes the lock section", () => {
  const { host, issues } = hostWithPlugin();
  expect(issues).toEqual([]);
  expect(host.resolved("thermostat_config").map((entry) => entry.id)).toEqual(["smartpi.tab.main"]);
});

it("places the tab after the Thermostats tab and keeps the configuration gear last", () => {
  const { host } = hostWithPlugin();
  expect(host.resolved("top_tab").map((entry) => entry.id)).toEqual(["core.top.dashboard", "core.top.thermostats", "smartpi.top", "core.top.configuration"]);
  expect(host.menu("smartpi.top").map((entry) => entry.id)).toEqual(["smartpi.page.overview"]);
});

it("shows the section only for the thermostats that use Smart TPI", () => {
  const { host } = hostWithPlugin();
  const sections = host.resolved("thermostat_config");
  const context = (use: boolean) => ({ hass: host.hass, thermostatId: "climate.salon", thermostatType: "over_switch" as const, values: { use_smartpi: use }, centralValues: {} });
  expect(host.visible(sections, context(true))).toHaveLength(1);
  expect(host.visible(sections, context(false))).toHaveLength(0);
});

it("shows the component with the properties that the dashboard gives it", async () => {
  class SmartTab extends HTMLElement {
    hass: unknown;
    thermostatId = "";
  }
  customElements.define("smartpi-tab", SmartTab);

  const { host } = hostWithPlugin();
  const [section] = host.resolved("thermostat_config");
  host.hass.setState("climate.salon", "heat");

  const element = (await host.render<"thermostat_config">(section as never, { thermostatId: "climate.salon", values: {}, centralValues: {}, errors: {}, proposeChanges: () => undefined })) as SmartTab;
  expect(element.thermostatId).toBe("climate.salon");
  expect(element.hass).toBe(host.hass);
});
