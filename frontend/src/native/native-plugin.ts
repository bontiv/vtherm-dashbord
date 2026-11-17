/**
 * The contributions of the native tabs.
 *
 * Every native plugin declares its tabs with the SDK, as a third-party plugin does. The order of the menu of the flow is obtained
 * with placements: each tab goes after the tab that comes before it in the menu, which belongs to a plugin that is loaded before.
 */

import type { AnyTranslations, Contribution, VisibilityContext } from "@vtherm/dashboard-sdk";

import { defineNativeTab } from "./native-tab.ts";
import { TAB_DEFINITIONS, centralContributionId, thermostatContributionId } from "./tab-definitions.ts";
import type { TabDefinition } from "./tab-definitions.ts";

/** The first entry of the menu of a thermostat, which the native tabs follow. */
export const THERMOSTAT_OVERVIEW_ID = "core.page.thermostat_overview";

/** The first page of the group "Dashboard" of the menu of the configuration, which the sections of the central configuration come before. */
export const PLUGINS_PAGE_ID = "core.page.plugins";

/** The `thermostat_type` of the central configuration. */
const CENTRAL_TYPE = "thermostat_central_config";

/** The tag name of the element of a native tab. */
export const tagOf = (definition: TabDefinition, kind: "thermostat" | "central"): string => `vtherm-native-${definition.tab.replace(/_/g, "-")}-${kind}`;

/** The tab that comes just before a tab in the menu, for the same kind of configuration. */
function previous(definition: TabDefinition, kind: "thermostat" | "central"): TabDefinition | undefined {
  const index = TAB_DEFINITIONS.indexOf(definition);
  return TAB_DEFINITIONS.slice(0, index)
    .reverse()
    .find((candidate) => (kind === "thermostat" ? candidate.thermostat : candidate.central) !== undefined);
}

/**
 * Build the contributions of the tabs of a native plugin, and define their elements.
 *
 * @param plugin - The identifier of the native plugin.
 * @param translations - Its translations.
 */
export function nativeTabContributions(plugin: string, translations: AnyTranslations): { thermostat_config: Contribution<"thermostat_config">[]; general_config: Contribution<"general_config">[] } {
  const thermostat: Contribution<"thermostat_config">[] = [];
  const general: Contribution<"general_config">[] = [];
  for (const definition of TAB_DEFINITIONS.filter((candidate) => candidate.plugin === plugin)) {
    if (definition.thermostat !== undefined) {
      const tag = tagOf(definition, "thermostat");
      defineNativeTab(tag, definition, "thermostat", translations);
      const before = previous(definition, "thermostat");
      thermostat.push({
        id: thermostatContributionId(definition),
        title: `title.${definition.tab}`,
        component: tag,
        // The tab draws the save actions at the foot of its own card.
        save_actions: "component",
        placement: { after: before === undefined ? THERMOSTAT_OVERVIEW_ID : thermostatContributionId(before) },
        visible: (context: VisibilityContext<"thermostat_config">) => definition.applies(context.values, "thermostat"),
      });
    }
    if (definition.central !== undefined) {
      const tag = tagOf(definition, "central");
      defineNativeTab(tag, definition, "central", translations);
      const before = previous(definition, "central");
      general.push({
        id: centralContributionId(definition),
        title: `title.${definition.tab}`,
        group: "group.vtherm",
        component: tag,
        save_actions: "component",
        placement: before === undefined ? { before: PLUGINS_PAGE_ID } : { after: centralContributionId(before) },
        // The sections of the general configuration exist once the central configuration exists.
        visible: (context: VisibilityContext<"general_config">) => context.values["thermostat_type"] === CENTRAL_TYPE && definition.applies(context.values, "central"),
      });
    }
  }
  return { thermostat_config: thermostat, general_config: general };
}
