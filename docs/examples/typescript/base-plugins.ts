import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

/** Stand-ins for the native plugins of the dashboard, with the contributions that the examples point at. */
const translations = defineTranslations({ title: "Title" });

export const nativePlugins: readonly UiPluginDefinition[] = [
  {
    id: "core",
    translations,
    contributions: {
      top_tab: [
        { id: "core.top.dashboard", title: "title" },
        { id: "core.top.thermostats", title: "title" },
        { id: "core.top.configuration", title: "title", zone: "end" },
      ],
      thermostat_widget: [{ id: "core.widget.cycle", component: "core-cycle" }],
    },
  },
  {
    id: "core_tpi",
    translations,
    contributions: {
      general_config: [{ id: "core_tpi.general", title: "title", component: "core-tpi-general" }],
      thermostat_config: [{ id: "core_tpi.tab.main", title: "title", component: "core-tpi-tab" }],
    },
  },
  { id: "core_lock", translations, contributions: { thermostat_config: [{ id: "core_lock.tab.main", title: "title", component: "core-lock-tab" }] } },
];
