import { CORE_MENU_GROUPS, defineTranslations } from "@vtherm/dashboard-sdk";
import type { SectionStatus, UiPluginDefinition, VisibilityContext } from "@vtherm/dashboard-sdk";

/**
 * The status of a section without a feature switch, whose values can turn it off: `Off` when it would do nothing, `Central (off)` when
 * the central values that it uses turn it off. Its page stays as usual: only the switch of a `feature` replaces it.
 */
export function boostStatus(context: VisibilityContext<"thermostat_config">): SectionStatus {
  const inherited = Object.keys(context.centralValues).length > 0 && context.values["boost_use_central"] !== false;
  const minutes = inherited ? context.centralValues["boost_minutes"] : context.values["boost_minutes"];
  if (minutes === 0) {
    return inherited ? { kind: "inherited", off: true } : { kind: "off" };
  }
  return inherited ? { kind: "inherited" } : { kind: "complete" };
}

export const definition: UiPluginDefinition = {
  id: "my_boost",
  // The headings of the groups of the core are translated by the dashboard: the catalogs only hold the title.
  translations: defineTranslations({ "tab.title": "Boost" }),
  contributions: {
    thermostat_config: [
      {
        id: "my_boost.tab",
        title: "tab.title",
        component: "my-boost-tab",
        // Joins the heading "Optional features" of the native tabs, right after the presence detection.
        group: CORE_MENU_GROUPS.features,
        placement: { after: "core_presence.tab.main" },
        status: boostStatus,
      },
    ],
  },
};
