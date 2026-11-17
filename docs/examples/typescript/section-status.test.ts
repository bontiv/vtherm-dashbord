import { createFakeHost } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { definition } from "./section-status.ts";

const context = (values: Record<string, unknown>) => {
  const host = createFakeHost();
  host.registerPlugin(definition);
  const [section] = host.resolved("thermostat_config");
  return { host, section: section!, context: { hass: host.hass, thermostatId: "climate.salon", thermostatType: "over_switch" as const, values, centralValues: {} } };
};

it("says how many values the section misses, as the menu shows it", () => {
  const { host, section, context: empty } = context({ use_my_plugin: true, my_plugin_sensor: "sensor.forecast" });
  expect(host.status(section, empty)).toEqual({ kind: "incomplete", missing: 1 });
});

it("is complete once every required value is there", () => {
  const { host, section, context: full } = context({ use_my_plugin: true, my_plugin_sensor: "sensor.forecast", my_plugin_target: 20 });
  expect(host.status(section, full)).toEqual({ kind: "complete" });
  expect(host.statusErrors()).toEqual([]);
});

it("declares the value that turns its feature on", () => {
  const { section } = context({});
  expect((section.contribution as { feature?: string }).feature).toBe("use_my_plugin");
});
