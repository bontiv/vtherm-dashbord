/**
 * The navigation of the dashboard: what the top bar, the left menu and the breadcrumb show for a route.
 *
 * It is computed from the contributions that the placement engine resolved, so the plugins build the navigation. This module
 * does no drawing: it gives a model that the components show, which keeps the rules testable.
 */

import { CORE_TOP_TABS, groupMenu } from "@vtherm/dashboard-sdk";
import type { HookName, PlacedEntry, PlacementEngine, ThermostatType, VisibilityContext } from "@vtherm/dashboard-sdk";

import { buildPath } from "./router.ts";
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
  /** The area of the thermostat in Home Assistant. Undefined or null when it has none. */
  readonly areaId?: string | null;
  /** The names of the area and of its floor when the list was read, used when `hass` does not have the registries of the areas. */
  readonly areaName?: string | null;
  readonly floorName?: string | null;
  readonly floorLevel?: number | null;
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
}

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
  /** `list` is the list of the thermostats, `page` is a page of a menu. */
  readonly mode: "list" | "page";
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
    thermostat = route.thermostat === undefined ? undefined : input.thermostats.find((candidate) => candidate.id === route.thermostat);
    if (route.thermostat !== undefined && thermostat === undefined) {
      notice = "route_unknown";
    }
    if (thermostat === undefined) {
      return { tabs, activeTab, mode: "list", thermostat: undefined, sections: [], current: undefined, breadcrumb: [{ label: activeTab.title, path: undefined }], notice };
    }
    crumbs.push({ label: thermostat.name, path: buildPath({ tab: activeTab.id, thermostat: thermostat.id, rest: [] }) });
  }

  const entries = engine.visible(engine.menu(activeTab.id), (entry) => input.contextOf(entry, thermostat));
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
