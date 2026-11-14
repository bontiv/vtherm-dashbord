import { describe, expect, it } from "vitest";

import { UiPluginValidationError, assertValidDefinition, defineTranslations, validateDefinition } from "../src/index.ts";

const translations = defineTranslations({ "tab.title": "Tab" });

/** Validate a definition and return its issues as `path: message` lines. */
function issuesOf(definition: unknown): string[] {
  return validateDefinition(definition).map((issue) => `${issue.path}: ${issue.message}`);
}

function paths(definition: unknown): string[] {
  return validateDefinition(definition).map((issue) => issue.path);
}

const tab = { id: "smartpi.tab.main", title: "tab.title", component: "smartpi-tab" };

describe("a valid definition", () => {
  it("has no issue", () => {
    expect(
      validateDefinition({
        id: "smartpi",
        translations,
        contributions: {
          top_tab: [{ id: "smartpi.top", title: "top.title", zone: "end" }],
          tab_page: [{ id: "smartpi.page", tab: "smartpi.top", title: "page.title", component: "smartpi-page", group: "page.group", icon: "mdi:brain" }],
          global_widget: [{ id: "smartpi.widget", component: "smartpi-widget", placement: { first: true } }],
          thermostat_config: [{ ...tab, placement: { after: "core_tpi.tab.main" }, on_missing: "skip", visible: () => true }],
          thermostat_widget: [{ id: "smartpi.remove", placement: { remove: "core.widget.cycle" } }],
        },
      }),
    ).toEqual([]);
  });

  it("can have no contribution", () => {
    expect(validateDefinition({ id: "smartpi", translations, contributions: {} })).toEqual([]);
  });
});

describe("identifiers", () => {
  it("refuses an identifier that does not start with the plugin identifier", () => {
    const issues = validateDefinition({ id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, id: "autre.tab.main" }] } });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("contributions.thermostat_config[0].id");
    expect(issues[0]?.message).toContain("autre.tab.main");
  });

  it("refuses the identifier of another plugin whose name starts with the same text", () => {
    expect(paths({ id: "core", translations, contributions: { thermostat_config: [{ ...tab, id: "core_tpi.tab.main" }] } })).toEqual(["contributions.thermostat_config[0].id"]);
    expect(paths({ id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, id: "smartpi_extra.tab" }] } })).toEqual(["contributions.thermostat_config[0].id"]);
  });

  it("accepts the identifiers of the plugin itself", () => {
    expect(validateDefinition({ id: "core", translations, contributions: { thermostat_config: [{ ...tab, id: "core.tab.main" }] } })).toEqual([]);
    expect(validateDefinition({ id: "core_tpi", translations, contributions: { thermostat_config: [{ ...tab, id: "core_tpi.tab.main" }] } })).toEqual([]);
  });

  it("refuses a prefix without a name, and a missing identifier", () => {
    expect(paths({ id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, id: "smartpi." }, { ...tab, id: undefined }] } })).toEqual([
      "contributions.thermostat_config[0].id",
      "contributions.thermostat_config[1].id",
    ]);
  });

  it("refuses an identifier used twice in a hook, and accepts it in two hooks", () => {
    const twice = { id: "smartpi", translations, contributions: { thermostat_config: [tab, { ...tab }] } };
    expect(issuesOf(twice)).toEqual([expect.stringContaining("contributions.thermostat_config[1].id: ")]);
    expect(issuesOf(twice)[0]).toContain("contributions.thermostat_config[0]");
    const twoHooks = { id: "smartpi", translations, contributions: { thermostat_config: [tab], general_config: [tab] } };
    expect(validateDefinition(twoHooks)).toEqual([]);
  });
});

describe("hooks", () => {
  it("refuses an unknown hook", () => {
    expect(issuesOf({ id: "smartpi", translations, contributions: { sidebar: [] } })).toEqual([expect.stringContaining("contributions.sidebar: Unknown hook 'sidebar'")]);
  });

  it("refuses contributions that are not a list", () => {
    expect(paths({ id: "smartpi", translations, contributions: { thermostat_config: tab } })).toEqual(["contributions.thermostat_config"]);
  });

  it("refuses a contribution that is not an object", () => {
    expect(paths({ id: "smartpi", translations, contributions: { thermostat_config: [null, "text"] } })).toEqual(["contributions.thermostat_config[0]", "contributions.thermostat_config[1]"]);
  });
});

describe("placements", () => {
  const withPlacement = (placement: unknown) => ({ id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, placement }] } });

  it("accepts each form", () => {
    for (const placement of [{ first: true }, { last: true }, { before: "a.b" }, { after: "a.b" }, { replace: "a.b" }]) {
      expect(validateDefinition(withPlacement(placement))).toEqual([]);
    }
  });

  it("refuses two forms", () => {
    expect(issuesOf(withPlacement({ after: "a.b", before: "c.d" }))[0]).toContain("exactly one form, found after and before");
  });

  it("refuses an empty placement", () => {
    expect(issuesOf(withPlacement({}))[0]).toContain("found none");
  });

  it("refuses a numeric value", () => {
    expect(paths(withPlacement({ after: 3 }))).toEqual(["contributions.thermostat_config[0].placement.after"]);
    expect(paths(withPlacement({ first: 1 }))).toEqual(["contributions.thermostat_config[0].placement.first"]);
    expect(paths(withPlacement({ before: "" }))).toEqual(["contributions.thermostat_config[0].placement.before"]);
  });

  it("refuses a numeric order key, in the placement and in the contribution", () => {
    expect(paths(withPlacement({ order: 3 }))).toContain("contributions.thermostat_config[0].placement.order");
    const definition = { id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, order: 3 }] } };
    expect(paths(definition)).toEqual(["contributions.thermostat_config[0].order"]);
  });

  it("refuses a placement that is not an object", () => {
    expect(paths(withPlacement("last"))).toEqual(["contributions.thermostat_config[0].placement"]);
  });

  it("refuses an invalid on_missing", () => {
    expect(paths({ id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, on_missing: "ignore" }] } })).toEqual(["contributions.thermostat_config[0].on_missing"]);
  });
});

describe("fields of the hooks", () => {
  it("requires a title for the navigation hooks", () => {
    for (const hook of ["top_tab", "global_page", "general_config", "thermostat_config"]) {
      const contribution = hook === "top_tab" ? { id: "smartpi.x" } : { id: "smartpi.x", component: "smartpi-x" };
      expect(paths({ id: "smartpi", translations, contributions: { [hook]: [contribution] } })).toEqual([`contributions.${hook}[0].title`]);
    }
  });

  it("requires a component for the hooks that show one, and none for a top tab", () => {
    expect(paths({ id: "smartpi", translations, contributions: { thermostat_widget: [{ id: "smartpi.x" }] } })).toEqual(["contributions.thermostat_widget[0].component"]);
    expect(validateDefinition({ id: "smartpi", translations, contributions: { top_tab: [{ id: "smartpi.x", title: "t" }] } })).toEqual([]);
  });

  it("requires the target tab of a tab page", () => {
    expect(paths({ id: "smartpi", translations, contributions: { tab_page: [{ id: "smartpi.x", title: "t", component: "c" }] } })).toEqual(["contributions.tab_page[0].tab"]);
  });

  it("accepts only start and end as zone", () => {
    expect(paths({ id: "smartpi", translations, contributions: { top_tab: [{ id: "smartpi.x", title: "t", zone: "middle" }] } })).toEqual(["contributions.top_tab[0].zone"]);
  });

  it("checks the optional fields", () => {
    const definition = { id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, icon: 3, group: "", visible: "yes" }] } };
    expect(paths(definition).sort()).toEqual(["contributions.thermostat_config[0].group", "contributions.thermostat_config[0].icon", "contributions.thermostat_config[0].visible"]);
  });

  it("does not require a title or a component from a removal", () => {
    expect(validateDefinition({ id: "smartpi", translations, contributions: { thermostat_config: [{ id: "smartpi.rm", placement: { remove: "core_lock.tab.main" } }] } })).toEqual([]);
  });
});

describe("the definition itself", () => {
  it("refuses a value that is not an object", () => {
    for (const value of [undefined, null, "plugin", 3, []]) {
      expect(paths(value)).toEqual(["definition"]);
    }
  });

  it("requires an identifier and contributions", () => {
    expect(paths({})).toEqual(["id", "translations", "contributions"]);
    expect(paths({ id: "", translations, contributions: {} })).toEqual(["id"]);
    expect(paths({ id: "smartpi", translations, contributions: [] })).toEqual(["contributions"]);
  });

  it("requires translations with an English catalog", () => {
    expect(paths({ id: "smartpi", contributions: {} })).toEqual(["translations"]);
    expect(paths({ id: "smartpi", translations: {}, contributions: {} })).toEqual(["translations"]);
    expect(paths({ id: "smartpi", translations: { english: "text" }, contributions: {} })).toEqual(["translations"]);
    expect(issuesOf({ id: "smartpi", contributions: {} })[0]).toContain("English catalog");
  });

  it("accepts an English catalog without any text", () => {
    expect(validateDefinition({ id: "smartpi", translations: defineTranslations({}), contributions: {} })).toEqual([]);
  });

  it("reports every problem at once", () => {
    const definition = { id: "smartpi", translations, contributions: { sidebar: [], thermostat_config: [{ id: "bad", placement: { after: 1 } }] } };
    expect(validateDefinition(definition).length).toBeGreaterThanOrEqual(4);
  });
});

describe("assertValidDefinition", () => {
  it("returns for a valid definition", () => {
    expect(() => assertValidDefinition({ id: "smartpi", translations, contributions: {} })).not.toThrow();
  });

  it("throws an error that names each faulty contribution", () => {
    const definition = { id: "smartpi", translations, contributions: { thermostat_config: [{ ...tab, id: "autre.tab.main" }] } };
    try {
      assertValidDefinition(definition);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UiPluginValidationError);
      expect((error as UiPluginValidationError).issues).toHaveLength(1);
      expect((error as Error).message).toContain("contributions.thermostat_config[0].id");
    }
  });
});
