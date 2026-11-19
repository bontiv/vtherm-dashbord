/**
 * The native plugin `core`: the top tabs, the overview pages, the pages of the configuration, the tabs main and type, and the widgets of
 * the overview of a thermostat and of the Overview page.
 */

import { CORE_MENU_GROUPS, CORE_TOP_TABS, defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition, VisibilityContext } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core.ts";
import { defineCorePages } from "../core-pages.ts";
import { CORE_OVERVIEW_ID, PLUGINS_PAGE_ID, THERMOSTAT_OVERVIEW_ID, nativeTabContributions } from "../native-plugin.ts";
import { coreWidgets } from "../widgets/core.ts";
import { coreDetailWidgets } from "../widgets/core_details.ts";
import { coreGlobalWidgets } from "../widgets/core_overview.ts";

export const translations = defineTranslations(en, { fr, de });

defineCorePages();
const tabs = nativeTabContributions("core", translations);

/** The plugins in development are for administrators only. */
const administrator = (context: VisibilityContext<"tab_page">): boolean => context.hass.user?.is_admin === true;

/** The definition of the plugin `core`. */
export const definition: UiPluginDefinition = {
  id: "core",
  translations,
  contributions: {
    top_tab: [
      { id: CORE_TOP_TABS.dashboard, title: "top.dashboard", icon: "mdi:view-dashboard" },
      { id: CORE_TOP_TABS.thermostats, title: "top.thermostats", icon: "mdi:thermostat" },
      { id: CORE_TOP_TABS.configuration, title: "top.configuration", icon: "mdi:cog", zone: "end" },
    ],
    tab_page: [
      { id: PLUGINS_PAGE_ID, tab: CORE_TOP_TABS.configuration, title: "page.plugins", group: "group.dashboard", component: "core-plugins-page" },
      { id: "core.page.dev_plugins", tab: CORE_TOP_TABS.configuration, title: "page.dev_plugins", group: "group.dashboard", component: "core-dev-plugins-page", visible: administrator },
    ],
    global_page: [{ id: CORE_OVERVIEW_ID, title: "page.overview", icon: "mdi:view-dashboard-outline", component: "core-overview-page", placement: { first: true } }],
    general_config: [
      {
        id: "core.general.create",
        title: "page.create_central",
        group: CORE_MENU_GROUPS.settings,
        component: "core-create-central-page",
        // The page edits nothing: it draws no save action, and the dashboard draws none under it.
        save_actions: "component",
        placement: { before: PLUGINS_PAGE_ID },
        visible: (context: VisibilityContext<"general_config">) => context.values["thermostat_type"] !== "thermostat_central_config",
      },
      ...tabs.general_config,
    ],
    thermostat_config: [
      // The overview edits nothing: it draws no save action, and the dashboard draws none under it.
      { id: THERMOSTAT_OVERVIEW_ID, title: "page.thermostat_overview", component: "core-thermostat-overview-page", save_actions: "component", placement: { first: true } },
      ...tabs.thermostat_config,
    ],
    // The temperature, the mode and the action, and the alerts, first in the overview of a thermostat.
    // Then the equipment, and the history of 24 hours last.
    thermostat_widget: [...coreWidgets(translations), ...coreDetailWidgets(translations)],
    // The central mode, the summary of the thermostats and the outdoor temperature on the Overview page.
    global_widget: coreGlobalWidgets(translations),
  },
};

registerUiPlugin(definition);
