import { registerUiPlugin } from "@vtherm/dashboard-sdk";
import { createFakeHost } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { definition } from "./widget-size.ts";

it("gives each widget its size, with the default values for the ones it does not declare", () => {
  const host = createFakeHost();
  host.registerPlugin(definition);
  expect(host.resolved("thermostat_widget").map((entry) => [entry.id, entry.size])).toEqual([
    ["my_sizes.widget.chart", { columns: 2, rows: 2 }],
    ["my_sizes.widget.gauge", { columns: 1, rows: 1 }],
    ["my_sizes.widget.alerts", { columns: "full", rows: 1 }],
  ]);
});

it("refuses a size that the grid does not have, as the dashboard does", () => {
  const wide = { ...definition, contributions: { thermostat_widget: [{ id: "my_sizes.widget.wide", component: "my-wide-widget", size: { columns: 4 } }] } };
  const host = createFakeHost();
  expect(() => host.registerPlugin(wide as never)).toThrow(/thermostat_widget\[0\]\.size\.columns/);
  host.install();
  try {
    expect(() => registerUiPlugin(wide as never)).toThrow(/thermostat_widget\[0\]\.size\.columns/);
  } finally {
    host.uninstall();
  }
});
