import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

/** A plugin whose widgets declare their size in the grid of the overview of a thermostat. */
export const definition: UiPluginDefinition = {
  id: "my_sizes",
  translations: defineTranslations({ "widget.chart.title": "Last 24 hours", "widget.gauge.title": "Heating share", "widget.alerts.title": "Alerts" }),
  contributions: {
    thermostat_widget: [
      // Two columns of the grid, and at least two units of 140 px high: room for a chart.
      { id: "my_sizes.widget.chart", component: "my-chart-widget", size: { columns: 2, rows: 2 } },
      // No size: one column, and the height of its content, as every widget written before the sizes.
      { id: "my_sizes.widget.gauge", component: "my-gauge-widget" },
      // The whole row, whatever the number of columns. Without `rows`, no minimal height.
      { id: "my_sizes.widget.alerts", component: "my-alerts-widget", size: { columns: "full" } },
    ],
  },
};
