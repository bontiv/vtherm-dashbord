import { CORE_MENU_GROUPS } from "@vtherm/dashboard-sdk";
import { createFakeHost } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { definition } from "./menu-groups.ts";

const statusOf = (values: Record<string, unknown>, centralValues: Record<string, unknown> = {}) => {
  const host = createFakeHost();
  host.registerPlugin(definition);
  const [section] = host.resolved("thermostat_config");
  return host.status(section!, { hass: host.hass, thermostatId: "climate.salon", thermostatType: "over_switch", values, centralValues });
};

it("declares the group of the optional features that the core shares", () => {
  const host = createFakeHost();
  host.registerPlugin(definition);
  expect((host.resolved("thermostat_config")[0]?.contribution as { group?: string }).group).toBe(CORE_MENU_GROUPS.features);
});

it("is off when its own values turn it off, and central and off when the central values do", () => {
  expect(statusOf({ boost_minutes: 0 })).toEqual({ kind: "off" });
  expect(statusOf({ boost_minutes: 30 })).toEqual({ kind: "complete" });
  expect(statusOf({}, { boost_minutes: 0 })).toEqual({ kind: "inherited", off: true });
  expect(statusOf({ boost_use_central: false, boost_minutes: 15 }, { boost_minutes: 0 })).toEqual({ kind: "complete" });
});
