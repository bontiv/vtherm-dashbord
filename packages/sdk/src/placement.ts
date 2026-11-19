/**
 * The resolution of the positions of the contributions.
 *
 * The dashboard and the test harness both use this engine, so a plugin is placed the same way everywhere. The plugins are
 * added one after the other, in their load order. The position of a contribution is resolved when its plugin is added, in
 * relation to what is already there. A contribution that is removed or replaced stays in its list, marked, so that the other
 * contributions can still point at it.
 */

import { HOOK_NAMES } from "./types.js";
import type { Contribution, ContributionMap, HookName, UiPluginDefinition, VisibilityContext, WidgetSize } from "./types.js";
import { validateDefinition } from "./validation.js";

/** The identifiers of the top tabs that the `core` plugin provides. The left menus of three of the hooks belong to them. */
export interface CoreTopTabs {
  /** The Dashboard tab. Its menu holds the `global_page` contributions. */
  readonly dashboard: "core.top.dashboard";
  /** The Thermostats tab. Its menu holds the `thermostat_config` contributions and accepts no `tab_page`. */
  readonly thermostats: "core.top.thermostats";
  /** The Configuration tab, the gear on the right. Its menu holds the `general_config` contributions and `tab_page` ones. */
  readonly configuration: "core.top.configuration";
}

/** The identifiers of the top tabs of the `core` plugin. */
export const CORE_TOP_TABS: CoreTopTabs = {
  dashboard: "core.top.dashboard",
  thermostats: "core.top.thermostats",
  configuration: "core.top.configuration",
};

/** The groups of the menus that the core shares with every plugin. */
export interface CoreMenuGroups {
  /** "General settings": the sections that cannot be turned off, such as the main attributes or the presets. */
  readonly settings: "core:settings";
  /** "Optional features": the sections that can be turned off, such as the detection of an open window. */
  readonly features: "core:features";
}

/**
 * The groups of the menus that the core shares: a contribution that declares one as its `group` joins the heading of the native
 * sections, which the dashboard translates. The prefix `core:` is reserved for these groups.
 */
export const CORE_MENU_GROUPS: CoreMenuGroups = {
  settings: "core:settings",
  features: "core:features",
};

/** Whether a group is one of the groups that the core shares. */
export const isCoreMenuGroup = (group: string | undefined): group is CoreMenuGroups[keyof CoreMenuGroups] => group === CORE_MENU_GROUPS.settings || group === CORE_MENU_GROUPS.features;

/** A contribution that shows something, whatever its hook. */
export type ShownContribution = ContributionMap[HookName];

/** Something that the engine found about a plugin. It never stops the other plugins. */
export interface EngineIssue {
  /** The plugin that has the problem. */
  readonly pluginId: string;
  /** `error`: a contribution was refused. `warning`: it was placed, with a doubt. */
  readonly level: "error" | "warning";
  /** A stable code: `invalid_definition`, `invalid_contribution`, `duplicate_id`, `unknown_tab`, `thermostats_tab`, `tab_removed`, `target_missing`, `undeclared_dependency`, `visibility_error`. */
  readonly code: string;
  /** The identifier of the contribution concerned, when there is one. */
  readonly contributionId?: string;
  /** What happened, in English, for the logs and the plugin status page. */
  readonly message: string;
}

/** A contribution at its place. */
export interface PlacedEntry {
  /** The identifier of the contribution. */
  readonly id: string;
  /** The plugin that contributes it. */
  readonly pluginId: string;
  /** The hook of the contribution. */
  readonly hook: HookName;
  /** The contribution as the plugin declared it. */
  readonly contribution: ShownContribution;
  /** The size of a widget, with its default values: present for the contributions of `global_widget` and `thermostat_widget` only. */
  readonly size?: ResolvedWidgetSize;
}

/** The size of a widget once resolved: both values are given. */
export interface ResolvedWidgetSize {
  /** How many columns the widget takes, or `full` for the whole row. */
  readonly columns: NonNullable<WidgetSize["columns"]>;
  /**
   * The minimal height in units of 140 px. 1 when the widget declares none: the grid then gives it no minimal height, so that its height
   * follows its content as before.
   */
  readonly rows: NonNullable<WidgetSize["rows"]>;
}

/**
 * Give the values of a widget size that the widget does not declare: one column, one row.
 *
 * @param size - The size that the widget declares, already validated.
 */
export function resolveWidgetSize(size: WidgetSize | undefined): ResolvedWidgetSize {
  return { columns: size?.columns ?? 1, rows: size?.rows ?? 1 };
}

/** The tabs of the top bar, by zone. */
export interface TopTabZones {
  /** The tabs of the zone `start`, on the left. */
  readonly start: readonly PlacedEntry[];
  /** The tabs of the zone `end`, on the right. The gear of the configuration is alone there. */
  readonly end: readonly PlacedEntry[];
}

/** What the engine needs to know about the load order of the plugin that is added. */
export interface PluginRelations {
  /** The plugins that the plugin requires. */
  readonly requires?: readonly string[];
  /** The plugins that the plugin loads after. */
  readonly load_after?: readonly string[];
}

/** A run of consecutive entries of a menu that share a group, which the menu shows under one heading. */
export interface MenuSection {
  /** The key of the group in the translation catalog of the plugin of the first entry. Undefined for entries without a group. */
  readonly group: string | undefined;
  /** The entries of the run, in order. */
  readonly entries: readonly PlacedEntry[];
}

/** The engine that places the contributions of the plugins. */
export interface PlacementEngine {
  /**
   * Add a plugin and resolve the position of its contributions. Call it for each plugin, in the load order.
   *
   * @param definition - The definition of the plugin.
   * @param relations - Its load dependencies, to warn about a `replace` or a `remove` that is not ordered after its target.
   * @returns The problems found with this plugin.
   */
  addPlugin(definition: UiPluginDefinition, relations?: PluginRelations): EngineIssue[];
  /** The tabs of the top bar, in the zone `start` and in the zone `end`. */
  topTabs(): TopTabZones;
  /** The entries of the left menu of a top tab, composed of the contributions of several hooks. Empty when the tab was removed. */
  menu(tabId: string): readonly PlacedEntry[];
  /** The widgets of the Overview page (`global_widget`) or of the overview of a thermostat (`thermostat_widget`). */
  widgets(hook: "global_widget" | "thermostat_widget"): readonly PlacedEntry[];
  /**
   * Keep the entries whose visibility condition is true. A condition that raises hides the entry and records an issue.
   * The hidden entries keep their place, so the positions of the others do not move.
   *
   * @param entries - The entries of a list, in order.
   * @param contextOf - Gives the context that the condition of an entry reads.
   */
  visible(entries: readonly PlacedEntry[], contextOf: (entry: PlacedEntry) => VisibilityContext<HookName>): PlacedEntry[];
  /** Every problem found since the start, without repetition. */
  issues(): readonly EngineIssue[];
}

type State = "active" | "removed" | "replaced";

interface Slot {
  readonly entry: PlacedEntry;
  readonly list: string;
  state: State;
  replacedBy: string | undefined;
}

const MENU_HOOKS: readonly HookName[] = ["tab_page", "global_page", "general_config", "thermostat_config"];

/** The hooks whose contribution goes to the left menu of a top tab fixed by the hook. */
const FIXED_MENUS: Partial<Record<HookName, string>> = {
  global_page: CORE_TOP_TABS.dashboard,
  general_config: CORE_TOP_TABS.configuration,
  thermostat_config: CORE_TOP_TABS.thermostats,
};

function isRemoval(contribution: Contribution<HookName>): contribution is Extract<Contribution<HookName>, { placement: { remove: string } }> {
  return "placement" in contribution && contribution.placement !== undefined && "remove" in contribution.placement;
}

/** Create an engine that has no plugin. */
export function createPlacementEngine(): PlacementEngine {
  const lists = new Map<string, Slot[]>();
  const idsByHook = new Map<HookName, Set<string>>();
  const idsByList = new Map<string, Set<string>>();
  const issues: EngineIssue[] = [];
  const seenIssues = new Set<string>();

  const report = (issue: EngineIssue): void => {
    const key = `${issue.pluginId}|${issue.code}|${issue.contributionId ?? ""}|${issue.message}`;
    if (!seenIssues.has(key)) {
      seenIssues.add(key);
      issues.push(issue);
    }
  };
  const listOf = (key: string): Slot[] => {
    let list = lists.get(key);
    if (list === undefined) {
      list = [];
      lists.set(key, list);
    }
    return list;
  };

  /** Follow the replacements until the contribution that is in place now. */
  const current = (slot: Slot): Slot => {
    let found = slot;
    while (found.state === "replaced" && found.replacedBy !== undefined) {
      const next: Slot | undefined = listOf(found.list).find((candidate) => candidate.entry.id === found.replacedBy);
      if (next === undefined) {
        break;
      }
      found = next;
    }
    return found;
  };

  const topTabSlot = (id: string): Slot | undefined => {
    for (const zone of ["start", "end"]) {
      const slot = lists.get(`top_tab:${zone}`)?.find((candidate) => candidate.entry.id === id);
      if (slot !== undefined) {
        return current(slot);
      }
    }
    return undefined;
  };

  const listKey = (hook: HookName, contribution: ShownContribution): string => {
    if (hook === "top_tab") {
      return `top_tab:${(contribution as ContributionMap["top_tab"]).zone ?? "start"}`;
    }
    if (hook === "tab_page") {
      const tab = topTabSlot((contribution as ContributionMap["tab_page"]).tab)?.entry.id ?? (contribution as ContributionMap["tab_page"]).tab;
      return `menu:${tab}`;
    }
    const fixed = FIXED_MENUS[hook];
    return fixed === undefined ? hook : `menu:${fixed}`;
  };

  /** Find the target of a position in a list, following the replacements. */
  const findTarget = (key: string, id: string): Slot | undefined => {
    const slot = listOf(key).find((candidate) => candidate.entry.id === id);
    return slot === undefined ? undefined : current(slot);
  };

  /** Find the target of a removal, which has no list of its own: look in the lists of its hook, then in the menus for a menu hook. */
  const findRemovalTarget = (hook: HookName, id: string): Slot | undefined => {
    const wanted = (menusToo: boolean): Slot | undefined => {
      for (const [key, list] of lists) {
        const isMenu = key.startsWith("menu:");
        for (const slot of list) {
          if (slot.entry.id === id && (slot.entry.hook === hook || (menusToo && isMenu))) {
            return current(slot);
          }
        }
      }
      return undefined;
    };
    return wanted(false) ?? (MENU_HOOKS.includes(hook) ? wanted(true) : undefined);
  };

  const claimId = (pluginId: string, hook: HookName, key: string | undefined, id: string): boolean => {
    const hookIds = idsByHook.get(hook) ?? new Set<string>();
    const listIds = key === undefined ? new Set<string>() : (idsByList.get(key) ?? new Set<string>());
    if (hookIds.has(id) || listIds.has(id)) {
      report({ pluginId, level: "error", code: "duplicate_id", contributionId: id, message: `The identifier '${id}' is already used in ${hookIds.has(id) ? `the hook ${hook}` : `the menu ${key ?? ""}`}, the contribution is refused` });
      return false;
    }
    hookIds.add(id);
    idsByHook.set(hook, hookIds);
    if (key !== undefined) {
      listIds.add(id);
      idsByList.set(key, listIds);
    }
    return true;
  };

  const placeShown = (pluginId: string, hook: HookName, contribution: ShownContribution, relations: PluginRelations): void => {
    if (hook === "tab_page") {
      const tab = (contribution as ContributionMap["tab_page"]).tab;
      if (tab === CORE_TOP_TABS.thermostats) {
        report({ pluginId, level: "error", code: "thermostats_tab", contributionId: contribution.id, message: `The Thermostats tab does not accept tab_page, use thermostat_config for '${contribution.id}'` });
        return;
      }
      if (topTabSlot(tab) === undefined) {
        report({ pluginId, level: "error", code: "unknown_tab", contributionId: contribution.id, message: `The tab '${tab}' of '${contribution.id}' does not exist, the contribution is ignored` });
        return;
      }
    }
    const key = listKey(hook, contribution);
    if (!claimId(pluginId, hook, MENU_HOOKS.includes(hook) || hook === "top_tab" ? key : undefined, contribution.id)) {
      return;
    }
    const list = listOf(key);
    const size = hook === "global_widget" || hook === "thermostat_widget" ? { size: resolveWidgetSize((contribution as { size?: WidgetSize }).size) } : {};
    const slot: Slot = { entry: { id: contribution.id, pluginId, hook, contribution, ...size }, list: key, state: "active", replacedBy: undefined };
    const placement = contribution.placement ?? { last: true as const };
    const onMissing = contribution.on_missing ?? "last";

    if ("first" in placement) {
      list.unshift(slot);
      return;
    }
    if ("last" in placement) {
      list.push(slot);
      return;
    }
    const form = "before" in placement ? "before" : "after" in placement ? "after" : "replace";
    const targetId = (placement as Record<string, string>)[form] as string;
    const target = findTarget(key, targetId);
    if (target === undefined) {
      const elsewhere = hook === "top_tab" ? ["start", "end"].map((zone) => `top_tab:${zone}`).filter((other) => other !== key && lists.get(other)?.some((candidate) => candidate.entry.id === targetId)) : [];
      report({
        pluginId,
        level: "warning",
        code: "target_missing",
        contributionId: contribution.id,
        message: `The target '${targetId}' of ${form} does not exist${elsewhere.length > 0 ? " in this zone, it is in the other zone" : ""}, ${onMissing === "skip" ? "the contribution is skipped" : "the contribution goes last"}`,
      });
      if (onMissing === "last") {
        list.push(slot);
      }
      return;
    }
    const index = list.indexOf(target);
    if (form === "before") {
      list.splice(index, 0, slot);
    } else if (form === "after") {
      list.splice(index + 1, 0, slot);
    } else {
      // The new contribution takes the index of the target. The target stays behind it, marked, so that references still resolve.
      list.splice(index, 0, slot);
      target.state = "replaced";
      target.replacedBy = slot.entry.id;
      warnOrder(pluginId, contribution.id, target, relations);
    }
  };

  const warnOrder = (pluginId: string, contributionId: string, target: Slot, relations: PluginRelations): void => {
    const owner = target.entry.pluginId;
    if (owner !== pluginId && !(relations.requires ?? []).includes(owner) && !(relations.load_after ?? []).includes(owner)) {
      report({
        pluginId,
        level: "warning",
        code: "undeclared_dependency",
        contributionId,
        message: `'${contributionId}' changes '${target.entry.id}' of the plugin '${owner}' but does not require it or load after it, so the result depends on the load order`,
      });
    }
  };

  const applyRemoval = (pluginId: string, hook: HookName, contribution: Extract<Contribution<HookName>, { placement: { remove: string } }>, relations: PluginRelations): void => {
    if (!claimId(pluginId, hook, undefined, contribution.id)) {
      return;
    }
    const target = findRemovalTarget(hook, contribution.placement.remove);
    if (target === undefined) {
      report({ pluginId, level: "warning", code: "target_missing", contributionId: contribution.id, message: `The target '${contribution.placement.remove}' of remove does not exist, nothing is removed` });
      return;
    }
    target.state = "removed";
    warnOrder(pluginId, contribution.id, target, relations);
  };

  /** Warn about the entries of a tab that was removed: they are not shown. */
  const checkRemovedTabs = (pluginId: string): void => {
    for (const [key, list] of lists) {
      if (!key.startsWith("menu:") || list.length === 0) {
        continue;
      }
      const tab = topTabSlot(key.slice("menu:".length));
      if (tab?.state === "removed") {
        report({ pluginId, level: "warning", code: "tab_removed", contributionId: tab.entry.id, message: `The tab '${tab.entry.id}' was removed, its menu entries are not shown` });
      }
    }
  };

  return {
    addPlugin(definition, relations = {}) {
      const before = issues.length;
      const found = validateDefinition(definition);
      const pluginId = typeof definition?.id === "string" ? definition.id : "";
      const refused = new Map<string, Set<number>>();
      for (const issue of found) {
        const match = /^contributions\.(\w+)\[(\d+)\]/.exec(issue.path);
        const fatal = match === null && !/^contributions\.\w+$/.test(issue.path);
        report({ pluginId, level: "error", code: fatal ? "invalid_definition" : "invalid_contribution", message: `${issue.path}: ${issue.message}` });
        if (fatal) {
          return issues.slice(before);
        }
        if (match?.[1] !== undefined && match[2] !== undefined) {
          refused.set(match[1], (refused.get(match[1]) ?? new Set<number>()).add(Number(match[2])));
        }
      }
      for (const hook of HOOK_NAMES) {
        const contributions = (definition.contributions[hook] ?? []) as readonly Contribution<typeof hook>[];
        contributions.forEach((contribution, index) => {
          if (refused.get(hook)?.has(index) === true) {
            return;
          }
          if (isRemoval(contribution)) {
            applyRemoval(pluginId, hook, contribution, relations);
          } else {
            placeShown(pluginId, hook, contribution as ShownContribution, relations);
          }
        });
      }
      checkRemovedTabs(pluginId);
      return issues.slice(before);
    },

    topTabs() {
      const active = (zone: string): PlacedEntry[] => (lists.get(`top_tab:${zone}`) ?? []).filter((slot) => slot.state === "active").map((slot) => slot.entry);
      return { start: active("start"), end: active("end") };
    },

    menu(tabId) {
      const tab = topTabSlot(tabId);
      if (tab?.state === "removed") {
        return [];
      }
      const target = tab?.entry.id ?? tabId;
      // The entries of a tab that was replaced follow the tab that replaced it.
      const keys = [`menu:${target}`, ...[...lists.keys()].filter((key) => key.startsWith("menu:") && key !== `menu:${target}` && topTabSlot(key.slice("menu:".length))?.entry.id === target)];
      return keys.flatMap((key) => (lists.get(key) ?? []).filter((slot) => slot.state === "active").map((slot) => slot.entry));
    },

    widgets(hook) {
      return (lists.get(hook) ?? []).filter((slot) => slot.state === "active").map((slot) => slot.entry);
    },

    visible(entries, contextOf) {
      return entries.filter((entry) => {
        const condition = (entry.contribution as { visible?: (context: never) => boolean }).visible;
        if (condition === undefined) {
          return true;
        }
        try {
          return condition(contextOf(entry) as never) === true;
        } catch (error) {
          report({
            pluginId: entry.pluginId,
            level: "error",
            code: "visibility_error",
            contributionId: entry.id,
            message: `The visibility condition of '${entry.id}' raised an error, the contribution is hidden: ${error instanceof Error ? error.message : String(error)}`,
          });
          return false;
        }
      });
    },

    issues: () => issues,
  };
}

/**
 * Cut the entries of a menu into runs that share a group.
 *
 * A run is a consecutive sequence of entries of the same group. Two entries of one group that are separated by an entry of
 * another group give two runs, so the heading is shown above each. Entries without a group have no heading.
 *
 * @param entries - The visible entries of a menu, in order.
 */
export function groupMenu(entries: readonly PlacedEntry[]): MenuSection[] {
  const sections: { group: string | undefined; entries: PlacedEntry[] }[] = [];
  for (const entry of entries) {
    const group = (entry.contribution as { group?: string }).group;
    const last = sections[sections.length - 1];
    if (last !== undefined && last.group === group) {
      last.entries.push(entry);
    } else {
      sections.push({ group, entries: [entry] });
    }
  }
  return sections;
}
