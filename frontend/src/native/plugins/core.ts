/** The native plugin `core`: the top tabs, the overview pages, the pages of the configuration, and the tabs main, features and type. */

import { CORE_TOP_TABS, defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition, VisibilityContext } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core.ts";
import { defineCorePages } from "../core-pages.ts";
import { PLUGINS_PAGE_ID, THERMOSTAT_OVERVIEW_ID, nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

defineCorePages();
const tabs = nativeTabContributions("core", translations);

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
      { id: "core.page.dev_plugins", tab: CORE_TOP_TABS.configuration, title: "page.dev_plugins", group: "group.dashboard", component: "core-dev-plugins-page" },
    ],
    global_page: [{ id: "core.page.overview", title: "page.overview", icon: "mdi:view-dashboard-outline", component: "core-overview-page", placement: { first: true } }],
    general_config: [
      {
        id: "core.general.create",
        title: "page.create_central",
        group: "group.vtherm",
        component: "core-create-central-page",
        placement: { before: PLUGINS_PAGE_ID },
        visible: (context: VisibilityContext<"general_config">) => context.values["thermostat_type"] !== "thermostat_central_config",
      },
      ...tabs.general_config,
    ],
    thermostat_config: [{ id: THERMOSTAT_OVERVIEW_ID, title: "page.thermostat_overview", component: "core-thermostat-overview-page", placement: { first: true } }, ...tabs.thermostat_config],
  },
};

registerUiPlugin(definition);
