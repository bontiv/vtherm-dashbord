/**
 * The navigation of the dashboard: what the top bar, the left menu and the breadcrumb show for a route.
 *
 * It is computed from the contributions that the placement engine resolved, so the plugins build the navigation. This module
 * does no drawing: it gives a model that the components show, which keeps the rules testable.
 */

import { CORE_TOP_TABS, groupMenu, sectionStatusOf } from "@vtherm/dashboard-sdk";
import type { HookName, PlacedEntry, PlacementEngine, SectionStatus, ThermostatType, VisibilityContext } from "@vtherm/dashboard-sdk";

import { NEW_THERMOSTAT, buildPath } from "./router.ts";
import type { Route } from "./router.ts";

/** A thermostat of Versatile Thermostat, as the Thermostats tab lists it. */
export interface ThermostatInfo {
  /** The identifier, which is in the address of its pages. */
  readonly id: string;
  /** The name shown to the user. */
  readonly name: string;
  /** The type of the thermostat. */
  readonly type: ThermostatType;
  /** The device of the thermostat in Home Assistant, which the user opens to give it an area. */
  readonly deviceId?: string | null;
  /** The climate entity of the thermostat, whose state its tile shows live. */
  readonly climateEntityId?: string | null;
  /** The area of the thermostat in Home Assistant. Undefined or null when it has none. */
  readonly areaId?: string | null;
  /** The names of the area and of its floor when the list was read, used when `hass` does not have the registries of the areas. */
  readonly areaName?: string | null;
  readonly floorName?: string | null;
  readonly floorLevel?: number | null;
}

/** A configuration that is being created: the menu is limited to the sections that its creation needs, after the choice of the type. */
export interface CreationInput {
  /** `thermostat` for the page of a new thermostat, `central` for the central configuration in the Configuration tab. */
  readonly kind: "thermostat" | "central";
  /** The identifiers of the contributions of the sections, in the order of the menu. */
  readonly entries: readonly string[];
  /** The name of the new thermostat in the breadcrumb. */
  readonly title: string;
}

/** What the navigation needs to know. */
export interface NavigationInput {
  /** The engine that holds the contributions of the plugins. */
  readonly engine: PlacementEngine;
  /** The route to show. */
  readonly route: Route;
  /** The thermostats that exist. */
  readonly thermostats: readonly ThermostatInfo[];
  /** Translate a key of the plugin of an entry, such as its title. */
  readonly translate: (entry: PlacedEntry, key: string) => string;
  /** Give the context that the visibility condition of an entry reads. */
  readonly contextOf: (entry: PlacedEntry, thermostat: ThermostatInfo | undefined) => VisibilityContext<HookName>;
  /** The creation in progress, if any. It gives the page of the route `/thermostats/new` and limits the menu to its sections. */
  readonly creation?: CreationInput;
  /** Whether the last save refused a value of a configuration section, which then has the status `refused`. */
  readonly refused?: (entry: PlacedEntry, thermostat: ThermostatInfo | undefined) => boolean;
  /** Told when the status function of a section raises or returns a value that is not a status: the entry then shows no status. */
  readonly onStatusError?: (entry: PlacedEntry, error: unknown) => void;
}

/**
 * The status of a configuration section in the menu: the ones that the dashboard knows (`refused`, `off`) and the ones that the
 * section declares (`complete`, `inherited`, `incomplete`).
 */
export type MenuStatus = { readonly kind: "refused" } | { readonly kind: "off" } | SectionStatus;

/** A tab of the top bar. */
export interface NavTab {
  readonly id: string;
  /** The title, translated. It is also the accessible name and the tooltip of an icon-only tab. */
  readonly title: string;
  readonly icon: string | undefined;
  /** Whether the tab is the current one. */
  readonly active: boolean;
  /** The address of the default page of the tab. */
  readonly path: string;
  /** Whether the tab is in the zone `end`. */
  readonly zone: "start" | "end";
}

/** An entry of the left menu. */
export interface NavItem {
  readonly id: string;
  readonly title: string;
  readonly icon: string | undefined;
  readonly active: boolean;
  readonly path: string;
  /** The contribution that the entry shows. */
  readonly entry: PlacedEntry;
  /** The status of a configuration section, undefined for another entry or a section that says nothing. */
  readonly status: MenuStatus | undefined;
}

/** A run of entries of the left menu under one heading. */
export interface NavSection {
  /** The heading, translated. Undefined for entries that have no group. */
  readonly heading: string | undefined;
  readonly items: readonly NavItem[];
}

/** A segment of the breadcrumb. The last one has no address. */
export interface Crumb {
  readonly label: string;
  readonly path: string | undefined;
}

/** Why the route could not be followed. */
export type Notice = "route_unknown";

/** What the dashboard shows for a route. */
export interface NavigationModel {
  /** The tabs of the top bar. */
  readonly tabs: readonly NavTab[];
  /** The current tab, undefined when there is no tab. */
  readonly activeTab: NavTab | undefined;
  /** `list` is the list of the thermostats, `page` is a page of a menu, `type` is the choice of the type of a new thermostat. */
  readonly mode: "list" | "page" | "type";
  /** The selected thermostat, in the Thermostats tab. */
  readonly thermostat: ThermostatInfo | undefined;
  /** The left menu. Empty for the list of the thermostats. */
  readonly sections: readonly NavSection[];
  /** The page to show. */
  readonly current: NavItem | undefined;
  /** The breadcrumb. */
  readonly breadcrumb: readonly Crumb[];
  /** Set when the route was replaced by the default page. */
  readonly notice: Notice | undefined;
}

/**
 * The status of an entry of the menu, by priority: refused, off, then what the section declares. Only the configuration sections have
 * one.
 */
export function statusOf(input: NavigationInput, entry: PlacedEntry, thermostat: ThermostatInfo | undefined): MenuStatus | undefined {
  if (entry.hook !== "thermostat_config" && entry.hook !== "general_config") {
    return undefined;
  }
  if (input.refused?.(entry, thermostat) === true) {
    return { kind: "refused" };
  }
  const context = input.contextOf(entry, thermostat);
  const feature = (entry.contribution as { feature?: unknown }).feature;
  if (typeof feature === "string" && (context as { values?: Readonly<Record<string, unknown>> }).values?.[feature] !== true) {
    return { kind: "off" };
  }
  return sectionStatusOf(entry, context, (error) => input.onStatusError?.(entry, error));
}

const titleOf = (input: NavigationInput, entry: PlacedEntry): string => input.translate(entry, (entry.contribution as { title?: string }).title ?? entry.id);

/**
 * Compute the navigation for a route.
 *
 * An address that designates nothing shows the default page of its tab, or the default tab, with a notice.
 *
 * @param input - The contributions, the route, the thermostats and the translation of the titles.
 */
export function resolveNavigation(input: NavigationInput): NavigationModel {
  const { engine, route } = input;
  const zones = engine.topTabs();
  const visibleTabs = (entries: readonly PlacedEntry[]) => engine.visible(entries, (entry) => input.contextOf(entry, undefined));
  const start = visibleTabs(zones.start);
  const end = visibleTabs(zones.end);
  const all = [...start, ...end];
  let notice: Notice | undefined;

  const found = route.tab === undefined ? undefined : all.find((tab) => tab.id === route.tab);
  if (route.tab !== undefined && found === undefined) {
    notice = "route_unknown";
  }
  const activeEntry = found ?? all[0];

  const toTab = (entry: PlacedEntry, zone: "start" | "end"): NavTab => ({
    id: entry.id,
    title: titleOf(input, entry),
    icon: (entry.contribution as { icon?: string }).icon,
    active: entry.id === activeEntry?.id,
    path: buildPath({ tab: entry.id, rest: [] }),
    zone,
  });
  const tabs = [...start.map((entry) => toTab(entry, "start")), ...end.map((entry) => toTab(entry, "end"))];
  const activeTab = tabs.find((tab) => tab.active);
  if (activeEntry === undefined || activeTab === undefined) {
    return { tabs, activeTab: undefined, mode: "page", thermostat: undefined, sections: [], current: undefined, breadcrumb: [], notice };
  }

  const crumbs: Crumb[] = [{ label: activeTab.title, path: activeTab.path }];
  let thermostat: ThermostatInfo | undefined;
  if (activeTab.id === CORE_TOP_TABS.thermostats) {
    thermostat =
      route.thermostat === undefined
        ? undefined
        : route.thermostat === NEW_THERMOSTAT && input.creation?.kind === "thermostat"
          ? { id: NEW_THERMOSTAT, name: input.creation.title, type: "over_switch" }
          : input.thermostats.find((candidate) => candidate.id === route.thermostat);
    if (route.thermostat !== undefined && thermostat === undefined) {
      notice = "route_unknown";
    }
    if (thermostat === undefined) {
      return { tabs, activeTab, mode: "list", thermostat: undefined, sections: [], current: undefined, breadcrumb: [{ label: activeTab.title, path: undefined }], notice };
    }
    crumbs.push({ label: thermostat.name, path: buildPath({ tab: activeTab.id, thermostat: thermostat.id, rest: [] }) });
  }

  const visible = engine.visible(engine.menu(activeTab.id), (entry) => input.contextOf(entry, thermostat));
  const creation = input.creation;
  const creating = creation !== undefined && (creation.kind === "thermostat" ? thermostat?.id === NEW_THERMOSTAT : activeTab.id === CORE_TOP_TABS.configuration);
  // The address of a new thermostat without a section is the choice of its type, before the page of configuration.
  if (creating && creation.kind === "thermostat" && route.entry === undefined) {
    crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1]?.label ?? "", path: undefined };
    return { tabs, activeTab, mode: "type", thermostat, sections: [], current: undefined, breadcrumb: crumbs, notice };
  }
  // A creation shows its own sections, in its own order: the others are on the page of the configuration once it exists.
  const entries = creating ? creation.entries.flatMap((id) => visible.filter((entry) => entry.id === id)) : visible;
  const wanted = route.entry === undefined || route.tab !== activeTab.id ? undefined : entries.find((entry) => entry.id === route.entry);
  if (route.entry !== undefined && route.tab === activeTab.id && wanted === undefined) {
    notice = "route_unknown";
  }
  const currentEntry = wanted ?? entries[0];
  const pathOf = (entry: PlacedEntry): string => buildPath({ tab: activeTab.id, ...(thermostat === undefined ? {} : { thermostat: thermostat.id }), entry: entry.id, rest: [] });
  const toItem = (entry: PlacedEntry): NavItem => ({
    id: entry.id,
    title: titleOf(input, entry),
    icon: (entry.contribution as { icon?: string }).icon,
    active: entry.id === currentEntry?.id,
    path: pathOf(entry),
    entry,
    status: statusOf(input, entry, thermostat),
  });
  const sections = groupMenu(entries).map((section) => ({
    heading: section.group === undefined || section.entries[0] === undefined ? undefined : input.translate(section.entries[0], section.group),
    items: section.entries.map(toItem),
  }));
  const current = sections.flatMap((section) => section.items).find((item) => item.active);
  if (current !== undefined) {
    crumbs.push({ label: current.title, path: undefined });
  } else {
    crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1]?.label ?? "", path: undefined };
  }
  return { tabs, activeTab, mode: "page", thermostat, sections, current, breadcrumb: crumbs, notice };
}

/**
 * Give the route to open when the user selects another thermostat.
 *
 * The page that is open stays when the new thermostat has it, otherwise the first page of the thermostat opens, which is its overview.
 *
 * @param input - The navigation of the thermostat that is selected now.
 * @param thermostatId - The identifier of the thermostat to select.
 */
export function routeForThermostat(input: NavigationInput, thermostatId: string): Route {
  const tab = CORE_TOP_TABS.thermostats;
  const same = resolveNavigation({ ...input, route: { tab, thermostat: thermostatId, ...(input.route.entry === undefined ? {} : { entry: input.route.entry }), rest: [] } });
  const keeps = same.notice === undefined && same.current !== undefined && same.current.id === input.route.entry;
  return keeps ? { tab, thermostat: thermostatId, entry: input.route.entry as string, rest: [] } : { tab, thermostat: thermostatId, rest: [] };
}
