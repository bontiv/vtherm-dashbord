import { describe, expect, expectTypeOf, it } from "vitest";

import { HOOK_NAMES, defineTranslations } from "../src/index.ts";
import type {
  ComponentHookName,
  Contribution,
  DisplayProps,
  DraftControls,
  GeneralConfigProps,
  HookName,
  HookProps,
  Placement,
  SaveResult,
  SectionStatus,
  ThermostatConfigProps,
  ThermostatProps,
  UiPluginDefinition,
} from "../src/index.ts";

// The compile-time checks are done by `tsc` (npm run typecheck): a `@ts-expect-error` that no longer hides an error is reported.

describe("placement", () => {
  it("accepts each of the six forms", () => {
    const placements: Placement[] = [{ first: true }, { last: true }, { before: "a.b" }, { after: "a.b" }, { replace: "a.b" }, { remove: "a.b" }];
    expect(placements).toHaveLength(6);
  });

  it("refuses two forms at the same time", () => {
    // @ts-expect-error after and before cannot be combined
    const both: Placement = { after: "a.b", before: "c.d" };
    expect(both).toBeDefined();
  });

  it("refuses a numeric order", () => {
    // @ts-expect-error a numeric value is not a position
    const numeric: Placement = { after: 3 };
    // @ts-expect-error an order key does not exist
    const order: Placement = { order: 3 };
    // @ts-expect-error first is not a number
    const first: Placement = { first: 1 };
    expect([numeric, order, first]).toHaveLength(3);
  });

  it("refuses an empty placement", () => {
    // @ts-expect-error a placement has one form
    const empty: Placement = {};
    expect(empty).toBeDefined();
  });
});

describe("properties of the components", () => {
  it("gives the thermostat identifier to the components that are shown for a thermostat", () => {
    expectTypeOf<HookProps<"thermostat_widget">>().toEqualTypeOf<ThermostatProps & DisplayProps>();
    expectTypeOf<HookProps<"thermostat_widget">>().toHaveProperty("hass");
    expectTypeOf<HookProps<"thermostat_widget">>().toHaveProperty("thermostatId");
    expectTypeOf<HookProps<"thermostat_config">>().toHaveProperty("thermostatId");
    expectTypeOf<HookProps<"thermostat_config">>().toHaveProperty("centralValues");
  });

  it("tells every component whether the screen is narrow", () => {
    expectTypeOf<HookProps<"tab_page">["narrow"]>().toEqualTypeOf<boolean>();
    expectTypeOf<HookProps<"global_page">["narrow"]>().toEqualTypeOf<boolean>();
    expectTypeOf<HookProps<"global_widget">["narrow"]>().toEqualTypeOf<boolean>();
    expectTypeOf<HookProps<"general_config">["narrow"]>().toEqualTypeOf<boolean>();
    expectTypeOf<HookProps<"thermostat_config">["narrow"]>().toEqualTypeOf<boolean>();
    expectTypeOf<HookProps<"thermostat_widget">["narrow"]>().toEqualTypeOf<boolean>();
  });

  it("gives no thermostat identifier to the general configuration", () => {
    expectTypeOf<HookProps<"general_config">>().toEqualTypeOf<GeneralConfigProps & DisplayProps>();
    expectTypeOf<HookProps<"general_config">>().not.toHaveProperty("thermostatId");
    expectTypeOf<HookProps<"general_config">>().not.toHaveProperty("centralValues");
    expectTypeOf<HookProps<"global_widget">>().not.toHaveProperty("thermostatId");
  });

  it("gives the configuration context to the configuration hooks only", () => {
    for (const name of ["values", "errors", "proposeChanges"] as const) {
      expectTypeOf<HookProps<"general_config">>().toHaveProperty(name);
      expectTypeOf<HookProps<"thermostat_config">>().toHaveProperty(name);
      expectTypeOf<HookProps<"thermostat_widget">>().not.toHaveProperty(name);
    }
    expectTypeOf<ThermostatConfigProps["proposeChanges"]>().toBeFunction();
  });

  it("gives the state of the draft and its commands to the configuration hooks only", () => {
    expectTypeOf<HookProps<"general_config">["draft"]>().toEqualTypeOf<DraftControls | undefined>();
    expectTypeOf<HookProps<"thermostat_config">["draft"]>().toEqualTypeOf<DraftControls | undefined>();
    expectTypeOf<HookProps<"thermostat_widget">>().not.toHaveProperty("draft");
    expectTypeOf<DraftControls["save"]>().returns.toEqualTypeOf<Promise<SaveResult>>();
    expectTypeOf<SaveResult>().toEqualTypeOf<"success" | "error" | "partial">();
  });

  it("has no component for a top tab", () => {
    expectTypeOf<ComponentHookName>().toEqualTypeOf<Exclude<HookName, "top_tab">>();
  });
});

describe("contributions", () => {
  it("has the seven hooks", () => {
    expect(HOOK_NAMES).toHaveLength(7);
    expectTypeOf<HookName>().toEqualTypeOf<(typeof HOOK_NAMES)[number]>();
  });

  it("accepts a plugin that uses every hook", () => {
    const definition: UiPluginDefinition = {
      id: "smartpi",
      translations: defineTranslations({ "tab.title": "Tab" }),
      contributions: {
        top_tab: [{ id: "smartpi.top", title: "tab.title", icon: "mdi:brain", zone: "start" }],
        tab_page: [{ id: "smartpi.page", tab: "smartpi.top", title: "page.title", group: "page.group", component: "smartpi-page" }],
        global_page: [{ id: "smartpi.global", title: "global.title", component: "smartpi-global" }],
        global_widget: [{ id: "smartpi.widget", component: "smartpi-widget", placement: { first: true } }],
        general_config: [{ id: "smartpi.general", title: "general.title", component: "smartpi-general", placement: { after: "core_tpi.tab.main" } }],
        thermostat_config: [
          {
            id: "smartpi.tab.main",
            title: "config.title",
            component: "smartpi-config",
            placement: { replace: "core_tpi.tab.main" },
            on_missing: "skip",
            visible: (context) => context.thermostatType === "over_climate" && context.values["use_smartpi"] === true,
          },
        ],
        thermostat_widget: [{ id: "smartpi.thermostat_widget", component: "smartpi-thermostat-widget" }, { id: "smartpi.remove", placement: { remove: "core.widget.cycle" } }],
      },
    };
    expect(Object.keys(definition.contributions)).toHaveLength(7);
  });

  it("lets the configuration contributions only declare who draws the save actions", () => {
    const general: Contribution<"general_config"> = { id: "smartpi.general", title: "t", component: "smartpi-general", save_actions: "component" };
    const thermostat: Contribution<"thermostat_config"> = { id: "smartpi.tab", title: "t", component: "smartpi-tab", save_actions: "dashboard" };
    // @ts-expect-error a page of the Dashboard tab has no save actions
    const page: Contribution<"global_page"> = { id: "smartpi.page", title: "t", component: "smartpi-page", save_actions: "component" };
    // @ts-expect-error only component and dashboard are accepted
    const wrong: Contribution<"thermostat_config"> = { id: "smartpi.tab", title: "t", component: "smartpi-tab", save_actions: "panel" };
    expect([general, thermostat, page, wrong]).toHaveLength(4);
  });

  it("lets the configuration contributions declare a status and a feature", () => {
    const thermostat: Contribution<"thermostat_config"> = {
      id: "smartpi.tab",
      title: "t",
      component: "smartpi-tab",
      feature: "use_smartpi_feature",
      status: (context) => (context.values["smartpi_sensor"] === undefined ? { kind: "incomplete", missing: 1 } : { kind: "complete" }),
    };
    const general: Contribution<"general_config"> = { id: "smartpi.general", title: "t", component: "smartpi-general", status: () => ({ kind: "inherited" }) };
    // @ts-expect-error an incomplete status gives the number of missing values
    const noCount: Contribution<"general_config"> = { id: "smartpi.general", title: "t", component: "smartpi-general", status: () => ({ kind: "incomplete" }) };
    // @ts-expect-error off and refused are computed by the dashboard, not declared
    const off: Contribution<"general_config"> = { id: "smartpi.general", title: "t", component: "smartpi-general", status: () => ({ kind: "off" }) };
    // @ts-expect-error a page of the Dashboard tab has no status
    const page: Contribution<"global_page"> = { id: "smartpi.page", title: "t", component: "smartpi-page", feature: "use_x" };
    expectTypeOf<SectionStatus["kind"]>().toEqualTypeOf<"complete" | "inherited" | "incomplete">();
    expectTypeOf<Extract<SectionStatus, { kind: "incomplete" }>["missing"]>().toEqualTypeOf<number>();
    expect([thermostat, general, noCount, off, page]).toHaveLength(5);
  });

  it("refuses a navigation contribution without title", () => {
    // @ts-expect-error a title is required
    const contribution: Contribution<"thermostat_config"> = { id: "smartpi.tab.main", component: "smartpi-config" };
    expect(contribution).toBeDefined();
  });

  it("refuses a tab page without target tab", () => {
    // @ts-expect-error the tab is required
    const contribution: Contribution<"tab_page"> = { id: "smartpi.page", title: "page.title", component: "smartpi-page" };
    expect(contribution).toBeDefined();
  });

  it("refuses a zone other than start and end", () => {
    const contribution: Contribution<"top_tab"> =
      // @ts-expect-error the zone is start or end
      { id: "smartpi.top", title: "tab.title", zone: "middle" };
    expect(contribution).toBeDefined();
  });

  it("refuses a contribution that shows something without component", () => {
    // @ts-expect-error a widget needs a component
    const contribution: Contribution<"thermostat_widget"> = { id: "smartpi.widget" };
    expect(contribution).toBeDefined();
  });

  it("types the visibility condition by hook", () => {
    const contribution: Contribution<"general_config"> = {
      id: "smartpi.general",
      title: "general.title",
      component: "smartpi-general",
      // @ts-expect-error a general configuration has no thermostat type
      visible: (context) => context.thermostatType === "over_switch",
    };
    expect(contribution).toBeDefined();
  });
});
