import { describe, expect, it } from "vitest";

import { CORE_TOP_TABS, createPlacementEngine, defineTranslations, groupMenu } from "../src/index.ts";
import type { PlacementEngine, PluginRelations, UiPluginDefinition, VisibilityContext } from "../src/index.ts";

const translations = defineTranslations({ title: "Title" });

/** A plugin definition, with contributions given as plain objects. */
function plugin(id: string, contributions: Record<string, unknown>): UiPluginDefinition {
  return { id, translations, contributions } as unknown as UiPluginDefinition;
}

const page = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: "title", component: `${id.replace(/\./g, "-")}-el`, ...extra });
const widget = (id: string, extra: Record<string, unknown> = {}) => ({ id, component: `${id.replace(/\./g, "-")}-el`, ...extra });

/** The `core` plugin: the three top tabs, the Overview page and one widget, as the native plugin provides them. */
const core = plugin("core", {
  top_tab: [
    { id: CORE_TOP_TABS.dashboard, title: "title" },
    { id: CORE_TOP_TABS.thermostats, title: "title" },
    { id: CORE_TOP_TABS.configuration, title: "title", zone: "end" },
  ],
  global_page: [page("core.page.overview")],
  thermostat_config: [page("core_tpi.tab.main".replace("core_tpi", "core"), { id: "core.tab.main" })],
  thermostat_widget: [widget("core.widget.cycle")],
});

function engineWith(...plugins: UiPluginDefinition[]): PlacementEngine {
  const engine = createPlacementEngine();
  for (const definition of plugins) {
    engine.addPlugin(definition);
  }
  return engine;
}

const ids = (entries: readonly { id: string }[]) => entries.map((entry) => entry.id);
const codes = (engine: PlacementEngine) => engine.issues().map((issue) => issue.code);

/** The `core_tpi` plugin of the examples of the specification. */
const tpi = plugin("core_tpi", { thermostat_config: [page("core_tpi.tab.main")] });

describe("the hooks", () => {
  it("shows a thermostat_config contribution in the menu of the thermostats", () => {
    const engine = engineWith(core, tpi);
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "core_tpi.tab.main"]);
  });

  it("adds a top tab to the bar", () => {
    const engine = engineWith(core, plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "title" }] }));
    expect(ids(engine.topTabs().start)).toEqual([CORE_TOP_TABS.dashboard, CORE_TOP_TABS.thermostats, "smartpi.top"]);
    expect(ids(engine.topTabs().end)).toEqual([CORE_TOP_TABS.configuration]);
  });

  it("puts the global pages in the menu of the Dashboard tab and the widgets in their own lists", () => {
    const engine = engineWith(core, plugin("smartpi", { global_page: [page("smartpi.page")], global_widget: [widget("smartpi.gw")], thermostat_widget: [widget("smartpi.tw")] }));
    expect(ids(engine.menu(CORE_TOP_TABS.dashboard))).toEqual(["core.page.overview", "smartpi.page"]);
    expect(ids(engine.widgets("global_widget"))).toEqual(["smartpi.gw"]);
    expect(ids(engine.widgets("thermostat_widget"))).toEqual(["core.widget.cycle", "smartpi.tw"]);
  });

  it("ignores a contribution to an unknown hook, reports it, and keeps the others", () => {
    const engine = engineWith(core, plugin("smartpi", { sidebar: [page("smartpi.side")], global_page: [page("smartpi.page")] }));
    expect(ids(engine.menu(CORE_TOP_TABS.dashboard))).toEqual(["core.page.overview", "smartpi.page"]);
    expect(engine.issues().filter((issue) => issue.pluginId === "smartpi").map((issue) => [issue.level, issue.code])).toEqual([["error", "invalid_contribution"]]);
    expect(engine.issues()[0]?.message).toContain("Unknown hook 'sidebar'");
  });

  it("refuses the whole plugin when its definition has no identifier or no contributions", () => {
    const engine = engineWith(core, { translations } as unknown as UiPluginDefinition);
    expect(engine.issues().map((issue) => issue.code)).toEqual(["invalid_definition"]);
    expect(ids(engine.menu(CORE_TOP_TABS.dashboard))).toEqual(["core.page.overview"]);
  });
});

describe("the identifiers", () => {
  it("refuses a second contribution with the same identifier in a hook", () => {
    const engine = engineWith(core, tpi, plugin("core_tpi", { thermostat_config: [page("core_tpi.tab.main", { title: "title" })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "core_tpi.tab.main"]);
    expect(codes(engine)).toEqual(["duplicate_id"]);
  });

  it("refuses an identifier that is not prefixed by the plugin, and places the others", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_config: [page("autre.tab.main"), page("smartpi.tab.main")] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "smartpi.tab.main"]);
    expect(codes(engine)).toEqual(["invalid_contribution"]);
  });

  it("refuses a contribution of a navigation hook that has no title", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_config: [{ id: "smartpi.tab.main", component: "x-el" }] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main"]);
    expect(engine.issues()[0]?.message).toContain("'title' is required");
  });
});

describe("the positions", () => {
  const menu = (...entries: Record<string, unknown>[]) => ids(engineWith(core, tpi, plugin("a", { thermostat_config: entries })).menu(CORE_TOP_TABS.thermostats));

  it("goes last by default and with last", () => {
    expect(menu(page("a.one"), page("a.two", { placement: { last: true } }))).toEqual(["core.tab.main", "core_tpi.tab.main", "a.one", "a.two"]);
  });

  it("goes first", () => {
    expect(menu(page("a.one", { placement: { first: true } }))).toEqual(["a.one", "core.tab.main", "core_tpi.tab.main"]);
  });

  it("goes just after a target", () => {
    expect(menu(page("a.one", { placement: { after: "core.tab.main" } }))).toEqual(["core.tab.main", "a.one", "core_tpi.tab.main"]);
  });

  it("goes just before a target", () => {
    expect(menu(page("a.one", { placement: { before: "core_tpi.tab.main" } }))).toEqual(["core.tab.main", "a.one", "core_tpi.tab.main"]);
  });

  it("refuses a position with two forms or a numeric value", () => {
    const engine = engineWith(core, plugin("a", { thermostat_config: [page("a.one", { placement: { after: "core.tab.main", before: "core.tab.main" } }), page("a.two", { placement: { after: 2 } })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main"]);
    expect(codes(engine)).toEqual(["invalid_contribution", "invalid_contribution"]);
  });

  it("chains several contributions after the same target in the order of loading, the latest closest to the target", () => {
    const engine = engineWith(
      core,
      tpi,
      plugin("a", { thermostat_config: [page("a.tab", { placement: { after: "core_tpi.tab.main" } })] }),
      plugin("b", { thermostat_config: [page("b.tab", { placement: { after: "core_tpi.tab.main" } })] }),
    );
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "core_tpi.tab.main", "b.tab", "a.tab"]);
  });

  it("chains several contributions before the same target, the latest closest to the target", () => {
    const engine = engineWith(
      core,
      tpi,
      plugin("a", { thermostat_config: [page("a.tab", { placement: { before: "core_tpi.tab.main" } })] }),
      plugin("b", { thermostat_config: [page("b.tab", { placement: { before: "core_tpi.tab.main" } })] }),
    );
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "a.tab", "b.tab", "core_tpi.tab.main"]);
  });
});

describe("replace", () => {
  it("takes the place of the target, which is no longer shown", () => {
    const engine = engineWith(core, tpi, plugin("smartpi", { thermostat_config: [page("smartpi.tab.main", { placement: { replace: "core_tpi.tab.main" } })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "smartpi.tab.main"]);
  });

  it("makes the contributions that pointed at the target follow the replacement", () => {
    const engine = engineWith(
      core,
      tpi,
      plugin("b", { thermostat_config: [page("b.tab", { placement: { after: "core_tpi.tab.main" } }), page("b.before", { placement: { before: "core_tpi.tab.main" } })] }),
      plugin("smartpi", { thermostat_config: [page("smartpi.tab.main", { placement: { replace: "core_tpi.tab.main" } })] }),
    );
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "b.before", "smartpi.tab.main", "b.tab"]);
  });

  it("lets a later contribution target the original identifier or the replacement, through a chain of replacements", () => {
    const engine = engineWith(
      core,
      tpi,
      plugin("one", { thermostat_config: [page("one.tab", { placement: { replace: "core_tpi.tab.main" } })] }),
      plugin("two", { thermostat_config: [page("two.tab", { placement: { replace: "core_tpi.tab.main" } })] }),
      plugin("three", { thermostat_config: [page("three.tab", { placement: { after: "core_tpi.tab.main" } })] }),
    );
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "two.tab", "three.tab"]);
  });
});

describe("remove", () => {
  it("removes a widget and shows nothing for the removal itself", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_widget: [{ id: "smartpi.rm", placement: { remove: "core.widget.cycle" } }] }));
    expect(ids(engine.widgets("thermostat_widget"))).toEqual([]);
  });

  it("removes a menu entry whatever the hook that holds the removal", () => {
    const engine = engineWith(core, tpi, plugin("smartpi", { thermostat_config: [{ id: "smartpi.rm", placement: { remove: "core_tpi.tab.main" } }] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main"]);
  });

  it("keeps the removed contribution as a landmark for the other contributions", () => {
    const engine = engineWith(
      core,
      tpi,
      plugin("smartpi", { thermostat_config: [{ id: "smartpi.rm", placement: { remove: "core_tpi.tab.main" } }] }),
      plugin("late", { thermostat_config: [page("late.tab", { placement: { after: "core_tpi.tab.main" } })] }),
    );
    // Only the undeclared order of the removal is reported: the target of "late" is still found.
    expect(codes(engine)).toEqual(["undeclared_dependency"]);
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "late.tab"]);
  });

  it("reports a removal whose target does not exist", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_widget: [{ id: "smartpi.rm", placement: { remove: "absent.widget" } }] }));
    expect(codes(engine)).toEqual(["target_missing"]);
  });
});

describe("a target that does not exist", () => {
  it("goes last and records a warning by default", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_config: [page("smartpi.tab", { placement: { after: "absent.tab" } })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main", "smartpi.tab"]);
    expect(engine.issues()).toMatchObject([{ level: "warning", code: "target_missing", contributionId: "smartpi.tab" }]);
  });

  it("is skipped with on_missing skip, for a replace as well", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_config: [page("smartpi.tab", { placement: { replace: "absent.tab" }, on_missing: "skip" })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main"]);
    expect(codes(engine)).toEqual(["target_missing"]);
  });
});

describe("the order of the plugins", () => {
  const replacing = plugin("smartpi", { thermostat_config: [page("smartpi.tab.main", { placement: { replace: "core_tpi.tab.main" } })] });
  const warnings = (relations?: PluginRelations) => {
    const engine = createPlacementEngine();
    engine.addPlugin(core);
    engine.addPlugin(tpi);
    engine.addPlugin(replacing, relations);
    return engine.issues().map((issue) => issue.code);
  };

  it("warns when a replace targets another plugin that is neither required nor loaded before", () => {
    expect(warnings()).toEqual(["undeclared_dependency"]);
  });

  it("does not warn when the plugin requires or loads after the owner of the target", () => {
    expect(warnings({ requires: ["core_tpi"] })).toEqual([]);
    expect(warnings({ load_after: ["core_tpi"] })).toEqual([]);
  });

  it("warns for a removal too, and not for the contribution of the plugin itself", () => {
    const engine = engineWith(core, plugin("smartpi", { thermostat_widget: [{ id: "smartpi.rm", placement: { remove: "core.widget.cycle" } }, widget("smartpi.w"), { id: "smartpi.rm2", placement: { remove: "smartpi.w" } }] }));
    expect(engine.issues().map((issue) => [issue.code, issue.contributionId])).toEqual([["undeclared_dependency", "smartpi.rm"]]);
  });
});

describe("the visibility", () => {
  const context = { hass: {}, thermostatId: "t", thermostatType: "over_climate", values: { window: true }, centralValues: {} } as unknown as VisibilityContext<"thermostat_config">;
  const withCondition = (visible: (context: VisibilityContext<"thermostat_config">) => boolean) =>
    engineWith(core, plugin("smartpi", { thermostat_config: [page("smartpi.window", { visible })] }));

  it("shows the contributions whose condition is true, and hides the others", () => {
    const shown = withCondition((value) => value.values["window"] === true);
    expect(ids(shown.visible(shown.menu(CORE_TOP_TABS.thermostats), () => context))).toEqual(["core.tab.main", "smartpi.window"]);
    const hidden = withCondition(() => false);
    expect(ids(hidden.visible(hidden.menu(CORE_TOP_TABS.thermostats), () => context))).toEqual(["core.tab.main"]);
  });

  it("evaluates the condition again with each context, with no new resolution", () => {
    const engine = withCondition((value) => value.values["window"] === true);
    const entries = engine.menu(CORE_TOP_TABS.thermostats);
    const off = { ...context, values: { window: false } };
    expect(ids(engine.visible(entries, () => off))).toEqual(["core.tab.main"]);
    expect(ids(engine.visible(entries, () => context))).toEqual(["core.tab.main", "smartpi.window"]);
  });

  it("keeps the place of a hidden contribution, so the others do not move", () => {
    const engine = engineWith(
      core,
      plugin("a", { thermostat_config: [page("a.hidden", { visible: (value: { values: Record<string, unknown> }) => value.values["on"] === true })] }),
      plugin("b", { thermostat_config: [page("b.after", { placement: { after: "a.hidden" } })] }),
    );
    const entries = engine.menu(CORE_TOP_TABS.thermostats);
    const withValues = (on: boolean) => () => ({ ...context, values: { on } });
    expect(ids(engine.visible(entries, withValues(false)))).toEqual(["core.tab.main", "b.after"]);
    expect(ids(engine.visible(entries, withValues(true)))).toEqual(["core.tab.main", "a.hidden", "b.after"]);
  });

  it("hides a contribution whose condition raises an error, and reports it once", () => {
    const engine = withCondition(() => {
      throw new Error("boom");
    });
    const entries = engine.menu(CORE_TOP_TABS.thermostats);
    expect(ids(engine.visible(entries, () => context))).toEqual(["core.tab.main"]);
    engine.visible(entries, () => context);
    expect(engine.issues().filter((issue) => issue.code === "visibility_error")).toHaveLength(1);
    expect(engine.issues()[0]?.message).toContain("boom");
  });
});

describe("the top tabs", () => {
  it("puts a tab without zone at the end of the zone start, before the end zone", () => {
    const engine = engineWith(core, plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "title", placement: { last: true } }] }));
    expect(ids(engine.topTabs().start).at(-1)).toBe("smartpi.top");
    expect(ids(engine.topTabs().end)).toEqual([CORE_TOP_TABS.configuration]);
  });

  it("resolves a position in the zone of the tab, and treats a target of the other zone as absent", () => {
    const engine = engineWith(core, plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "title", placement: { after: CORE_TOP_TABS.configuration } }] }));
    expect(ids(engine.topTabs().start)).toEqual([CORE_TOP_TABS.dashboard, CORE_TOP_TABS.thermostats, "smartpi.top"]);
    expect(engine.issues()).toMatchObject([{ code: "target_missing" }]);
    expect(engine.issues()[0]?.message).toContain("other zone");
  });

  it("can put a tab in the zone end, and a position works in that zone", () => {
    const engine = engineWith(core, plugin("smartpi", { top_tab: [{ id: "smartpi.help", title: "title", zone: "end", placement: { before: CORE_TOP_TABS.configuration } }] }));
    expect(ids(engine.topTabs().end)).toEqual(["smartpi.help", CORE_TOP_TABS.configuration]);
  });
});

describe("the pages of a top tab", () => {
  const tabPlugin = plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "title" }], tab_page: [page("smartpi.page", { tab: "smartpi.top" }), page("smartpi.page2", { tab: "smartpi.top" })] });

  it("shows the pages in the menu of the tab that they target", () => {
    expect(ids(engineWith(core, tabPlugin).menu("smartpi.top"))).toEqual(["smartpi.page", "smartpi.page2"]);
  });

  it("ignores a page whose tab does not exist, and reports it", () => {
    const engine = engineWith(core, plugin("smartpi", { tab_page: [page("smartpi.page", { tab: "nothing.top" })] }));
    expect(engine.menu("nothing.top")).toEqual([]);
    expect(engine.issues()).toMatchObject([{ level: "error", code: "unknown_tab" }]);
  });

  it("does not show the pages of a tab that another plugin removed, and warns", () => {
    const engine = engineWith(core, tabPlugin, plugin("other", { top_tab: [{ id: "other.rm", placement: { remove: "smartpi.top" } }] }));
    expect(engine.menu("smartpi.top")).toEqual([]);
    expect(ids(engine.topTabs().start)).not.toContain("smartpi.top");
    expect(engine.issues().map((issue) => issue.code)).toContain("tab_removed");
  });

  it("refuses a page for the Thermostats tab and says to use thermostat_config", () => {
    const engine = engineWith(core, plugin("smartpi", { tab_page: [page("smartpi.page", { tab: CORE_TOP_TABS.thermostats })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.thermostats))).toEqual(["core.tab.main"]);
    expect(engine.issues()).toMatchObject([{ code: "thermostats_tab" }]);
    expect(engine.issues()[0]?.message).toContain("thermostat_config");
  });

  it("makes the pages follow a tab that another plugin replaced", () => {
    const engine = engineWith(core, tabPlugin, plugin("other", { top_tab: [{ id: "other.top", title: "title", placement: { replace: "smartpi.top" } }] }));
    expect(ids(engine.menu("other.top"))).toEqual(["smartpi.page", "smartpi.page2"]);
  });
});

describe("a menu made of several hooks", () => {
  const config = plugin("config", { general_config: [page("config.section.a"), page("config.section.b")] });

  it("resolves a position between hooks of the same menu", () => {
    const engine = engineWith(core, config, plugin("smartpi", { tab_page: [page("smartpi.page", { tab: CORE_TOP_TABS.configuration, placement: { after: "config.section.a" } })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.configuration))).toEqual(["config.section.a", "smartpi.page", "config.section.b"]);
  });

  it("refuses an identifier that two hooks of the same menu use", () => {
    const engine = engineWith(core, config, plugin("config", { tab_page: [page("config.section.a", { tab: CORE_TOP_TABS.configuration })] }));
    expect(ids(engine.menu(CORE_TOP_TABS.configuration))).toEqual(["config.section.a", "config.section.b"]);
    expect(codes(engine)).toEqual(["duplicate_id"]);
  });

  it("accepts the same identifier in two different menus of two different hooks", () => {
    const engine = engineWith(core, plugin("x", { general_config: [page("x.same")], global_page: [page("x.same")] }));
    expect(codes(engine)).toEqual([]);
  });
});

describe("the groups of a menu", () => {
  const entries = (...groups: (string | undefined)[]) => {
    const engine = engineWith(core, plugin("g", { global_page: groups.map((group, index) => page(`g.p${index}`, group === undefined ? {} : { group })) }));
    return engine.menu(CORE_TOP_TABS.dashboard).slice(1);
  };

  it("shows one heading above consecutive entries of a group", () => {
    expect(groupMenu(entries("dash", "dash", "dash")).map((section) => [section.group, section.entries.length])).toEqual([["dash", 3]]);
  });

  it("shows a heading above each run when entries of a group are separated by another group", () => {
    expect(groupMenu(entries("a", "b", "a")).map((section) => section.group)).toEqual(["a", "b", "a"]);
  });

  it("gives no heading to the entries without a group", () => {
    expect(groupMenu(entries(undefined, undefined, "a")).map((section) => [section.group, section.entries.length])).toEqual([
      [undefined, 2],
      ["a", 1],
    ]);
    expect(groupMenu([])).toEqual([]);
  });
});
