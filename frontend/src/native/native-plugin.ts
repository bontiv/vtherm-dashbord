/**
 * The contributions of the native tabs.
 *
 * Every native plugin declares its tabs with the SDK, as a third-party plugin does. The order of the menu of the flow is obtained
 * with placements: each tab goes after the tab that comes before it in the menu, which belongs to a plugin that is loaded before.
 */

import type { AnyTranslations, ConfigValues, Contribution, SectionStatus, VisibilityContext } from "@vtherm/dashboard-sdk";

import { defineNativeTab } from "./native-tab.ts";
import { isFieldShown, missingRequired } from "./fields.ts";
import { fieldsOf } from "./schemas.ts";
import { CENTRAL_TYPE, TAB_DEFINITIONS, centralContributionId, isAvailable, thermostatContributionId } from "./tab-definitions.ts";
import type { ConfigKind, TabDefinition } from "./tab-definitions.ts";

/** The first entry of the menu of a thermostat, which the native tabs follow. */
export const THERMOSTAT_OVERVIEW_ID = "core.page.thermostat_overview";

/** The first page of the group "Dashboard" of the menu of the configuration, which the sections of the central configuration come before. */
export const PLUGINS_PAGE_ID = "core.page.plugins";

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
 * The status of a native tab in the menu, as its page shows it: `incomplete` when required fields that the tab shows have no value,
 * `inherited` when the tab uses the central configuration, otherwise `complete`.
 *
 * @param definition - The tab.
 * @param kind - A thermostat or the central configuration.
 */
export function nativeStatus(definition: TabDefinition, kind: ConfigKind): (context: { readonly values: ConfigValues; readonly centralValues?: ConfigValues }) => SectionStatus {
  return (context) => {
    const values = context.values;
    const layout = (kind === "thermostat" ? definition.thermostat : definition.central)?.(values);
    if (layout === undefined) {
      return { kind: "complete" };
    }
    // As the page of the tab: the inheritance applies once a central configuration exists, until the option is turned off.
    const hasCentral = kind === "thermostat" && Object.keys(context.centralValues ?? {}).length > 0;
    const inherited = layout.inherit !== undefined && hasCentral && values[layout.inherit] !== false;
    const fields = [...layout.base, ...(inherited ? [] : [...(layout.specific ?? []), ...(layout.extra ?? [])])].flatMap((name) => fieldsOf(name)).filter((field) => isFieldShown(field, values));
    const missing = missingRequired(fields, values).length;
    if (missing > 0) {
      return { kind: "incomplete", missing };
    }
    return inherited ? { kind: "inherited" } : { kind: "complete" };
  };
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
        status: nativeStatus(definition, "thermostat"),
        ...(definition.feature === undefined ? {} : { feature: definition.feature }),
        // A tab of a feature stays in the menu while the feature is off: its page offers to turn it on.
        visible: (context: VisibilityContext<"thermostat_config">) => isAvailable(definition, context.values, "thermostat"),
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
        status: nativeStatus(definition, "central"),
        ...(definition.feature === undefined ? {} : { feature: definition.feature }),
        visible: (context: VisibilityContext<"general_config">) => context.values["thermostat_type"] === CENTRAL_TYPE && isAvailable(definition, context.values, "central"),
      });
    }
  }
  return { thermostat_config: thermostat, general_config: general };
}
