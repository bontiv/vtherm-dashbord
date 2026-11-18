import { CORE_MENU_GROUPS, CORE_TOP_TABS, createPlacementEngine, defineTranslations } from "@vtherm/dashboard-sdk";
import type { PlacedEntry, UiPluginDefinition, VisibilityContext } from "@vtherm/dashboard-sdk";
import { describe, expect, it } from "vitest";

import { resolveNavigation, routeForThermostat } from "../src/navigation.ts";
import type { NavigationInput, ThermostatInfo } from "../src/navigation.ts";
import { buildPath } from "../src/router.ts";
import type { Route } from "../src/router.ts";

const translations = defineTranslations({ title: "Title" });
const DASHBOARD = CORE_TOP_TABS.dashboard;
const THERMOSTATS = CORE_TOP_TABS.thermostats;
const CONFIGURATION = CORE_TOP_TABS.configuration;

const page = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, component: `${id.replace(/\./g, "-")}-el`, ...extra });

function plugin(id: string, contributions: Record<string, unknown>): UiPluginDefinition {
  return { id, translations, contributions } as unknown as UiPluginDefinition;
}

/** The native plugins of the dashboard, as far as the navigation is concerned. */
const core = plugin("core", {
  top_tab: [
    { id: DASHBOARD, title: "Dashboard" },
    { id: THERMOSTATS, title: "Thermostats" },
    { id: CONFIGURATION, title: "Configuration", zone: "end", icon: "mdi:cog" },
  ],
  global_page: [page("core.page.overview")],
  thermostat_config: [page("core.page.thermostat_overview")],
  general_config: [page("core.general.main", { group: "Versatile Thermostat" }), page("core.general.window", { group: "Versatile Thermostat" }), page("core.page.plugins", { group: "Dashboard" })],
});
const nativePlugins = [
  core,
  plugin("core_tpi", { thermostat_config: [page("core_tpi.tab.main")] }),
  plugin("core_window", { thermostat_config: [page("core_window.tab.main", { visible: (context: VisibilityContext<"thermostat_config">) => context.values["window"] === true })] }),
  plugin("core_complements", { top_tab: [{ id: "core_complements.top", title: "Add-ons", placement: { after: THERMOSTATS } }] }),
];

const thermostats: ThermostatInfo[] = [
  { id: "climate.salon", name: "Salon", type: "over_switch" },
  { id: "climate.chambre", name: "Chambre", type: "over_climate" },
];

function input(route: Route, extra: Partial<NavigationInput> = {}, ...plugins: UiPluginDefinition[]): NavigationInput {
  const engine = createPlacementEngine();
  for (const definition of [...nativePlugins, ...plugins]) {
    engine.addPlugin(definition);
  }
  return {
    engine,
    route,
    thermostats,
    translate: (_entry: PlacedEntry, key: string) => key,
    contextOf: (_entry, thermostat) => ({ hass: {}, thermostatId: thermostat?.id ?? "", thermostatType: thermostat?.type ?? "over_switch", values: { window: thermostat?.id === "climate.salon" }, centralValues: {} }) as never,
    ...extra,
  };
}

const route = (tab?: string, thermostat?: string, entry?: string): Route => ({ ...(tab === undefined ? {} : { tab }), ...(thermostat === undefined ? {} : { thermostat }), ...(entry === undefined ? {} : { entry }), rest: [] });
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);
const menuIds = (model: ReturnType<typeof resolveNavigation>) => model.sections.flatMap((section) => ids(section.items));

describe("the top bar", () => {
  it("shows the tabs of the plugins and the configuration gear alone on the right", () => {
    const model = resolveNavigation(input(route()));
    expect(model.tabs.map((tab) => [tab.id, tab.zone])).toEqual([
      [DASHBOARD, "start"],
      [THERMOSTATS, "start"],
      ["core_complements.top", "start"],
      [CONFIGURATION, "end"],
    ]);
    expect(model.tabs.at(-1)).toMatchObject({ title: "Configuration", icon: "mdi:cog" });
  });

  it("puts the tab of a plugin after the native tabs and before the gear", () => {
    const model = resolveNavigation(input(route(), {}, plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "Smart" }] })));
    expect(ids(model.tabs)).toEqual([DASHBOARD, THERMOSTATS, "core_complements.top", "smartpi.top", CONFIGURATION]);
  });

  it("marks the tab of the route as active, and the first tab when there is no route", () => {
    expect(resolveNavigation(input(route())).activeTab?.id).toBe(DASHBOARD);
    expect(resolveNavigation(input(route(CONFIGURATION))).activeTab).toMatchObject({ id: CONFIGURATION, active: true });
  });

  it("hides a tab whose visibility condition is false", () => {
    const hidden = plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "Smart", visible: () => false }] });
    expect(ids(resolveNavigation(input(route(), {}, hidden)).tabs)).not.toContain("smartpi.top");
  });
});

describe("the left menu", () => {
  it("shows the default page of the first tab, with its menu", () => {
    const model = resolveNavigation(input(route()));
    expect(model.mode).toBe("page");
    expect(model.current?.id).toBe("core.page.overview");
    expect(model.notice).toBeUndefined();
  });

  it("makes the current entry active, with its address", () => {
    const model = resolveNavigation(input(route(CONFIGURATION, undefined, "core.general.window")));
    expect(model.current).toMatchObject({ id: "core.general.window", active: true, path: buildPath(route(CONFIGURATION, undefined, "core.general.window")) });
    expect(model.sections.flatMap((section) => section.items).filter((item) => item.active)).toHaveLength(1);
  });

  it("shows a heading above each run of entries of a group, and none for the entries without group", () => {
    const model = resolveNavigation(input(route(CONFIGURATION)));
    expect(model.sections.map((section) => [section.heading, ids(section.items)])).toEqual([
      ["Versatile Thermostat", ["core.general.main", "core.general.window"]],
      ["Dashboard", ["core.page.plugins"]],
    ]);
  });

  it("translates the headings of the groups that the core shares with the dashboard, whatever the plugin of the first entry", () => {
    const shared = plugin("smartpi", {
      thermostat_config: [page("smartpi.tab.a", { group: CORE_MENU_GROUPS.settings }), page("smartpi.tab.b", { group: CORE_MENU_GROUPS.features })],
    });
    const model = resolveNavigation(input(route(THERMOSTATS, "climate.salon"), {}, shared));
    expect(model.sections.map((section) => section.heading)).toEqual([undefined, "General settings", "Optional features"]);
  });

  it("translates the titles and the headings with the plugin of the entry", () => {
    const model = resolveNavigation(input(route(CONFIGURATION), { translate: (entry, key) => `${entry.pluginId}:${key}` }));
    expect(model.sections[0]?.heading).toBe("core:Versatile Thermostat");
    expect(model.sections[0]?.items[0]?.title).toBe("core:core.general.main");
    expect(model.tabs[0]?.title).toBe("core:Dashboard");
  });

  it("shows the pages of the tab of a plugin", () => {
    const smart = plugin("smartpi", { top_tab: [{ id: "smartpi.top", title: "Smart" }], tab_page: [page("smartpi.a", { tab: "smartpi.top" }), page("smartpi.b", { tab: "smartpi.top" })] });
    const model = resolveNavigation(input(route("smartpi.top", undefined, "smartpi.b"), {}, smart));
    expect(menuIds(model)).toEqual(["smartpi.a", "smartpi.b"]);
    expect(model.current?.id).toBe("smartpi.b");
  });

  it("shows no page for a tab that has no menu", () => {
    const model = resolveNavigation(input(route("core_complements.top")));
    expect(model).toMatchObject({ current: undefined, sections: [], mode: "page" });
  });

  it("hides an entry whose visibility condition is false", () => {
    const model = resolveNavigation(input(route(THERMOSTATS, "climate.chambre")));
    expect(menuIds(model)).toEqual(["core.page.thermostat_overview", "core_tpi.tab.main"]);
    expect(menuIds(resolveNavigation(input(route(THERMOSTATS, "climate.salon"))))).toContain("core_window.tab.main");
  });
});

describe("the Thermostats tab", () => {
  it("shows the list of the thermostats, without menu, until one is selected", () => {
    const model = resolveNavigation(input(route(THERMOSTATS)));
    expect(model).toMatchObject({ mode: "list", thermostat: undefined, sections: [], current: undefined, notice: undefined });
  });

  it("opens the overview of the thermostat that is selected, which is the first entry of its menu", () => {
    const model = resolveNavigation(input(route(THERMOSTATS, "climate.salon")));
    expect(model).toMatchObject({ mode: "page", thermostat: { id: "climate.salon" } });
    expect(model.current?.id).toBe("core.page.thermostat_overview");
    expect(model.current?.path).toBe(buildPath(route(THERMOSTATS, "climate.salon", "core.page.thermostat_overview")));
  });

  it("opens the page of the route", () => {
    expect(resolveNavigation(input(route(THERMOSTATS, "climate.salon", "core_tpi.tab.main"))).current?.id).toBe("core_tpi.tab.main");
  });

  it("keeps the open page when the user selects another thermostat that has it", () => {
    const current = input(route(THERMOSTATS, "climate.salon", "core_tpi.tab.main"));
    expect(routeForThermostat(current, "climate.chambre")).toEqual(route(THERMOSTATS, "climate.chambre", "core_tpi.tab.main"));
  });

  it("opens the overview when the new thermostat does not have the open page", () => {
    const current = input(route(THERMOSTATS, "climate.salon", "core_window.tab.main"));
    expect(routeForThermostat(current, "climate.chambre")).toEqual(route(THERMOSTATS, "climate.chambre"));
    expect(resolveNavigation({ ...current, route: routeForThermostat(current, "climate.chambre") }).current?.id).toBe("core.page.thermostat_overview");
  });
});

describe("the breadcrumb", () => {
  const crumbs = (model: ReturnType<typeof resolveNavigation>) => model.breadcrumb.map((crumb) => [crumb.label, crumb.path === undefined ? "no link" : "link"]);

  it("shows the tab, the thermostat and the page, and every segment but the last is a link", () => {
    const model = resolveNavigation(input(route(THERMOSTATS, "climate.salon", "core_tpi.tab.main")));
    expect(crumbs(model)).toEqual([["Thermostats", "link"], ["Salon", "link"], ["core_tpi.tab.main", "no link"]]);
    expect(model.breadcrumb[0]?.path).toBe(buildPath(route(THERMOSTATS)));
    expect(model.breadcrumb[1]?.path).toBe(buildPath(route(THERMOSTATS, "climate.salon")));
  });

  it("shows the tab and the section of the general configuration", () => {
    expect(crumbs(resolveNavigation(input(route(CONFIGURATION, undefined, "core.general.window"))))).toEqual([["Configuration", "link"], ["core.general.window", "no link"]]);
  });

  it("shows only the tab, without link, for the list of the thermostats and for a tab without page", () => {
    expect(crumbs(resolveNavigation(input(route(THERMOSTATS))))).toEqual([["Thermostats", "no link"]]);
    expect(crumbs(resolveNavigation(input(route("core_complements.top"))))).toEqual([["Add-ons", "no link"]]);
  });
});

describe("a route that designates nothing", () => {
  it("shows the default tab with a notice for an unknown tab", () => {
    const model = resolveNavigation(input(route("nothing.top", undefined, "x")));
    expect(model).toMatchObject({ notice: "route_unknown", activeTab: { id: DASHBOARD } });
    expect(model.current?.id).toBe("core.page.overview");
  });

  it("shows the default page of the tab with a notice for an unknown page", () => {
    const model = resolveNavigation(input(route(CONFIGURATION, undefined, "gone.page")));
    expect(model.notice).toBe("route_unknown");
    expect(model.current?.id).toBe("core.general.main");
  });

  it("shows the list of the thermostats with a notice for a thermostat that no longer exists", () => {
    expect(resolveNavigation(input(route(THERMOSTATS, "climate.deleted")))).toMatchObject({ mode: "list", notice: "route_unknown" });
  });

  it("shows the overview of the thermostat with a notice for a page that the thermostat does not have", () => {
    const model = resolveNavigation(input(route(THERMOSTATS, "climate.chambre", "core_window.tab.main")));
    expect(model.notice).toBe("route_unknown");
    expect(model.current?.id).toBe("core.page.thermostat_overview");
  });

  it("shows nothing, without failing, when no plugin gave a tab", () => {
    const model = resolveNavigation({ ...input(route()), engine: createPlacementEngine() });
    expect(model).toMatchObject({ tabs: [], activeTab: undefined, current: undefined, breadcrumb: [] });
  });
});

describe("the creation of a thermostat", () => {
  // The menu of an existing thermostat has the type after the main section, and so has the creation, whose type is chosen before.
  const sections = plugin("sections", { thermostat_config: [page("sections.main"), page("sections.type"), page("sections.features")] });
  const creation = { kind: "thermostat", entries: ["sections.main", "sections.type", "core_tpi.tab.main"], title: "New thermostat" } as const;
  const creating = (entry?: string) => resolveNavigation(input(route(THERMOSTATS, "new", entry), { creation }, sections));

  it("lists only the sections of the creation, in their order, with main first", () => {
    const model = creating("sections.main");
    expect(menuIds(model)).toEqual(["sections.main", "sections.type", "core_tpi.tab.main"]);
    expect(model.current?.id).toBe("sections.main");
    expect(model.thermostat).toMatchObject({ id: "new", name: "New thermostat" });
    expect(model.notice).toBeUndefined();
  });

  it("does not list a section that does not apply to the values of the creation", () => {
    // The window section is in the list of the creation but its visibility condition (`window`) is false.
    const hidden = resolveNavigation(input(route(THERMOSTATS, "new", "sections.type"), { creation: { ...creation, entries: ["sections.type", "core_window.tab.main"] } }, sections));
    expect(menuIds(hidden)).toEqual(["sections.type"]);
  });

  it("shows Thermostats > New thermostat > section, and the new thermostat links to the choice of the type", () => {
    const model = creating("core_tpi.tab.main");
    expect(model.breadcrumb.map((crumb) => crumb.label)).toEqual(["Thermostats", "New thermostat", "core_tpi.tab.main"]);
    expect(model.breadcrumb[1]?.path).toBe(buildPath(route(THERMOSTATS, "new")));
    expect(model.current?.path).toBe(buildPath(route(THERMOSTATS, "new", "core_tpi.tab.main")));
  });

  it("is the choice of the type, without menu, at the address of the new thermostat without section", () => {
    const model = creating();
    expect(model).toMatchObject({ mode: "type", sections: [], current: undefined, notice: undefined });
    expect(model.breadcrumb).toEqual([
      { label: "Thermostats", path: buildPath(route(THERMOSTATS)) },
      { label: "New thermostat", path: undefined },
    ]);
  });

  it("falls back to the first section with a notice for a section that is not part of the creation", () => {
    const model = creating("sections.features");
    expect(model.notice).toBe("route_unknown");
    expect(model.current?.id).toBe("sections.main");
  });

  it("is an unknown thermostat when no creation is in progress", () => {
    expect(resolveNavigation(input(route(THERMOSTATS, "new"), {}, sections))).toMatchObject({ mode: "list", notice: "route_unknown" });
  });
});
describe("the creation of the central configuration", () => {
  it("limits the menu of the Configuration tab to the sections of the creation", () => {
    const creation = { kind: "central", entries: ["core.general.main"], title: "" } as const;
    const model = resolveNavigation(input(route(CONFIGURATION), { creation }));
    expect(menuIds(model)).toEqual(["core.general.main"]);
    expect(model.breadcrumb.map((crumb) => crumb.label)).toEqual(["Configuration", "core.general.main"]);
  });
});

describe("the status of the configuration sections", () => {
  const SALON = route(THERMOSTATS, "climate.salon");
  /** A plugin whose sections declare their status and their feature, read from the values that the test gives. */
  const sections = plugin("smartpi", {
    thermostat_config: [
      page("smartpi.tab.main", { status: (context: VisibilityContext<"thermostat_config">) => context.values["status"] }),
      page("smartpi.tab.window", { feature: "use_window_feature", status: () => ({ kind: "complete" }) }),
      page("smartpi.tab.broken", {
        status: () => {
          throw new Error("broken");
        },
      }),
      page("smartpi.tab.silent"),
    ],
  });
  const model = (values: Record<string, unknown>, extra: Partial<NavigationInput> = {}) =>
    resolveNavigation(
      input(SALON, { contextOf: (_entry, thermostat) => ({ hass: {}, thermostatId: thermostat?.id ?? "", thermostatType: "over_switch", values, centralValues: {} }) as never, ...extra }, sections),
    );
  const statusOf = (navigation: ReturnType<typeof resolveNavigation>, id: string) => navigation.sections.flatMap((section) => section.items).find((item) => item.id === id)?.status;

  it("shows the status that a section declares: complete, inherited or incomplete with the number of missing values", () => {
    expect(statusOf(model({ status: { kind: "complete" } }), "smartpi.tab.main")).toEqual({ kind: "complete" });
    expect(statusOf(model({ status: { kind: "inherited" } }), "smartpi.tab.main")).toEqual({ kind: "inherited" });
    expect(statusOf(model({ status: { kind: "incomplete", missing: 1 } }), "smartpi.tab.main")).toEqual({ kind: "incomplete", missing: 1 });
  });

  it("shows a section whose feature is off as off, before what it declares", () => {
    expect(statusOf(model({}), "smartpi.tab.window")).toEqual({ kind: "off" });
    expect(statusOf(model({ use_window_feature: true }), "smartpi.tab.window")).toEqual({ kind: "complete" });
  });

  it("shows a refused section as refused, before off and before inherited", () => {
    const refused = { refused: (entry: PlacedEntry) => entry.id !== "smartpi.tab.silent" };
    expect(statusOf(model({ status: { kind: "inherited" } }, refused), "smartpi.tab.main")).toEqual({ kind: "refused" });
    expect(statusOf(model({}, refused), "smartpi.tab.window")).toEqual({ kind: "refused" });
  });

  it("shows no status for a section that says nothing, and refused only after a refused save", () => {
    expect(statusOf(model({}), "smartpi.tab.silent")).toBeUndefined();
    expect(statusOf(model({}, { refused: () => true }), "smartpi.tab.silent")).toEqual({ kind: "refused" });
  });

  it("shows no status when the function of a section raises, and reports it", () => {
    const errors: string[] = [];
    expect(statusOf(model({}, { onStatusError: (entry) => errors.push(entry.id) }), "smartpi.tab.broken")).toBeUndefined();
    expect(errors).toEqual(["smartpi.tab.broken"]);
  });

  it("shows what a section without feature declares: off, inherited off", () => {
    expect(statusOf(model({ status: { kind: "off" } }), "smartpi.tab.main")).toEqual({ kind: "off" });
    expect(statusOf(model({ status: { kind: "inherited", off: true } }), "smartpi.tab.main")).toEqual({ kind: "inherited", off: true });
  });

  it("shows no check mark for a complete section of the general settings, and keeps its other statuses", () => {
    const shared = plugin("shared", {
      thermostat_config: [
        page("shared.tab.settings", { group: CORE_MENU_GROUPS.settings, status: (context: VisibilityContext<"thermostat_config">) => context.values["status"] }),
        page("shared.tab.feature", { group: CORE_MENU_GROUPS.features, status: () => ({ kind: "complete" }) }),
      ],
    });
    const of = (values: Record<string, unknown>) =>
      resolveNavigation(input(SALON, { contextOf: (_entry, thermostat) => ({ hass: {}, thermostatId: thermostat?.id ?? "", thermostatType: "over_switch", values, centralValues: {} }) as never }, shared));
    expect(statusOf(of({ status: { kind: "complete" } }), "shared.tab.settings")).toBeUndefined();
    expect(statusOf(of({ status: { kind: "inherited" } }), "shared.tab.settings")).toEqual({ kind: "inherited" });
    expect(statusOf(of({ status: { kind: "incomplete", missing: 2 } }), "shared.tab.settings")).toEqual({ kind: "incomplete", missing: 2 });
    expect(statusOf(of({ status: { kind: "complete" } }), "shared.tab.feature")).toEqual({ kind: "complete" });
    expect(statusOf(of({ status: { kind: "complete" } }), "smartpi.tab.main")).toBeUndefined();
  });

  it("gives no status to an entry that is not a configuration section", () => {
    expect(statusOf(resolveNavigation(input(route(DASHBOARD))), "core.page.overview")).toBeUndefined();
  });
});
