/**
 * The contributions of the native tabs.
 *
 * Every native plugin declares its tabs with the SDK, as a third-party plugin does. The order of the menus (`MENU_ORDER`) is obtained
 * with placements: each tab goes after the closest tab before it in the menu whose plugin is loaded before, and declares the group
 * of the menus that the core shares, "General settings" or "Optional features".
 */

import { CORE_MENU_GROUPS } from "@vtherm/dashboard-sdk";
import type { AnyTranslations, ConfigValues, Contribution, SectionStatus, VisibilityContext } from "@vtherm/dashboard-sdk";

import { defineNativeTab } from "./native-tab.ts";
import { isFieldShown, missingRequired } from "./fields.ts";
import { fieldsOf } from "./schemas.ts";
import {
  CENTRAL_TYPE,
  MENU_ORDER,
  NATIVE_TAB_PLUGINS,
  TAB_DEFINITIONS,
  centralContributionId,
  isAvailable,
  menuGroupOf,
  thermostatContributionId,
  windowMethod,
  windowValues,
} from "./tab-definitions.ts";
import type { ConfigKind, TabDefinition } from "./tab-definitions.ts";

/** The first entry of the menu of a thermostat, which the native tabs follow. */
export const THERMOSTAT_OVERVIEW_ID = "core.page.thermostat_overview";

/** The first page of the group "Dashboard" of the menu of the configuration, which the sections of the central configuration come before. */
export const PLUGINS_PAGE_ID = "core.page.plugins";

/** The tag name of the element of a native tab. */
export const tagOf = (definition: TabDefinition, kind: "thermostat" | "central"): string => `vtherm-native-${definition.tab.replace(/_/g, "-")}-${kind}`;

/**
 * The tab that a tab is placed after, for the same kind of configuration: the closest tab before it in the menu whose plugin is loaded
 * by then. As `after` puts a tab just behind its target, this gives the order of the menu whatever the load order of the plugins.
 */
function previous(definition: TabDefinition, kind: "thermostat" | "central"): TabDefinition | undefined {
  const loaded = NATIVE_TAB_PLUGINS.indexOf(definition.plugin);
  const position = MENU_ORDER.findIndex((candidate) => candidate.tab === definition.tab);
  return MENU_ORDER.slice(0, position)
    .reverse()
    .map((candidate) => TAB_DEFINITIONS.find((other) => other.tab === candidate.tab))
    .find((other) => other !== undefined && (kind === "thermostat" ? other.thermostat : other.central) !== undefined && NATIVE_TAB_PLUGINS.indexOf(other.plugin) <= loaded);
}

/** The group of the menus that the core shares, for a tab. */
const groupOf = (definition: TabDefinition): string => CORE_MENU_GROUPS[menuGroupOf(definition.tab)];

/**
 * The status of a native tab in the menu, as its page shows it: `off` (or `inherited` and `off`) when its values (or the central values
 * that it uses) turn it off, `incomplete` when required fields that the tab shows have no value, or when the window is detected with a
 * sensor that is not chosen, `inherited` when the tab uses the central configuration, otherwise `complete`.
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
    // A tab that its values turn off does nothing: what it would miss does not matter.
    const off = definition.off?.(values, context.centralValues ?? {}, kind);
    if (off !== undefined) {
      return off === "off" ? { kind: "off" } : { kind: "inherited", off: true };
    }
    // As the page of the tab: the inheritance applies once a central configuration exists, until the option is turned off.
    const hasCentral = kind === "thermostat" && Object.keys(context.centralValues ?? {}).length > 0;
    const inherited = layout.inherit !== undefined && hasCentral && values[layout.inherit] !== false;
    const fields = [...layout.base, ...(inherited ? [] : [...(layout.specific ?? []), ...(layout.extra ?? [])])].flatMap((name) => fieldsOf(name)).filter((field) => isFieldShown(field, values));
    // With the method "sensor", the window needs its sensor, which Versatile Thermostat does not require.
    const windowSensorMissing =
      definition.tab === "window" && kind === "thermostat" && windowMethod(windowValues(values, context.centralValues ?? {})) === "sensor" && !values["window_sensor_entity_id"];
    const missing = missingRequired(fields, values).length + (windowSensorMissing ? 1 : 0);
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
  // In the order of the menu, so that a tab of the plugin finds the tab of the same plugin that it follows. A step of the flow that is
  // not in the menu, such as `features`, has neither contribution nor element.
  const menuIndex = (definition: TabDefinition): number => MENU_ORDER.findIndex((candidate) => candidate.tab === definition.tab);
  const ordered = TAB_DEFINITIONS.filter((candidate) => candidate.plugin === plugin && menuIndex(candidate) >= 0).sort((a, b) => menuIndex(a) - menuIndex(b));
  for (const definition of ordered) {
    if (definition.thermostat !== undefined) {
      const tag = tagOf(definition, "thermostat");
      defineNativeTab(tag, definition, "thermostat", translations);
      const before = previous(definition, "thermostat");
      thermostat.push({
        id: thermostatContributionId(definition),
        title: `title.${definition.tab}`,
        group: groupOf(definition),
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
        group: groupOf(definition),
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
