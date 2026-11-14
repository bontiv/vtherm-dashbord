/** The native plugin `core_complements`: the tab "VT add-ons", with the catalog and the installed add-ons. */
import { CORE_TOP_TABS, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition, VisibilityContext } from "@vtherm/dashboard-sdk";
import { defineElement } from "../../components/define.ts";
import { CATALOG_PAGE, COMPLEMENTS_TOP_TAB, ComplementsCatalogPage, ComplementsInstalledPage, INSTALLED_PAGE } from "../../complements/complements-page.ts";
import { translations } from "../../complements/translations.ts";

export { translations };

defineElement("core-complements-catalog-page", ComplementsCatalogPage);
defineElement("core-complements-installed-page", ComplementsInstalledPage);

/** Only an administrator can install, so only an administrator sees the tab. */
const administrator = (context: VisibilityContext<"top_tab">): boolean => context.hass.user?.is_admin === true;

/** The definition of the plugin `core_complements`. */
export const definition: UiPluginDefinition = {
  id: "core_complements",
  translations,
  contributions: {
    top_tab: [{ id: COMPLEMENTS_TOP_TAB, title: "top.complements", icon: "mdi:puzzle-outline", zone: "start", placement: { after: CORE_TOP_TABS.thermostats }, visible: administrator }],
    tab_page: [
      { id: CATALOG_PAGE, tab: COMPLEMENTS_TOP_TAB, title: "page.catalog", icon: "mdi:store-outline", component: "core-complements-catalog-page" },
      { id: INSTALLED_PAGE, tab: COMPLEMENTS_TOP_TAB, title: "page.installed", icon: "mdi:check-circle-outline", component: "core-complements-installed-page", placement: { after: CATALOG_PAGE } },
    ],
  },
};

registerUiPlugin(definition);
