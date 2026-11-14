import { CORE_TOP_TABS, createPlacementEngine, defineTranslations } from "@vtherm/dashboard-sdk";
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
