import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

const translations = defineTranslations({
  "top.title": "Smart",
  "page.title": "Overview",
  "section.title": "Smart TPI",
  "section.group": "Algorithms",
});

/** A plugin that contributes to every hook, and uses every form of placement. */
export const definition: UiPluginDefinition = {
  id: "smartpi",
  translations,
  contributions: {
    // A tab of the top bar, just after the Thermostats tab. `zone` is "start" (default) or "end".
    top_tab: [{ id: "smartpi.top", title: "top.title", icon: "mdi:brain", placement: { after: "core.top.thermostats" } }],
    // An entry of the left menu of that tab. `tab` says which top tab it belongs to.
    tab_page: [{ id: "smartpi.page.overview", tab: "smartpi.top", title: "page.title", component: "smartpi-overview" }],
    // A page of the Dashboard tab, first in its menu.
    global_page: [{ id: "smartpi.page.global", title: "page.title", component: "smartpi-global", placement: { first: true } }],
    // A widget of the Overview page. Without a placement, it goes last.
    global_widget: [{ id: "smartpi.widget.global", component: "smartpi-widget" }],
    // A section of the general configuration, under a group heading.
    general_config: [{ id: "smartpi.general", title: "section.title", group: "section.group", component: "smartpi-general", placement: { after: "core_tpi.general" } }],
    thermostat_config: [
      {
        // Replace the TPI section of every thermostat, only for the thermostats that use Smart TPI.
        id: "smartpi.tab.main",
        title: "section.title",
        component: "smartpi-tab",
        placement: { replace: "core_tpi.tab.main" },
        on_missing: "skip",
        visible: (context) => context.values["use_smartpi"] === true,
      },
      // Remove a section of another plugin.
      { id: "smartpi.remove.lock", placement: { remove: "core_lock.tab.main" } },
    ],
    thermostat_widget: [{ id: "smartpi.widget.thermostat", component: "smartpi-thermostat-widget", placement: { before: "core.widget.cycle" } }],
  },
};
