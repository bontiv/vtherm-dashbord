import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { HOOK_NAMES } from "@vtherm/dashboard-sdk";

import { SERVER_STATES } from "../src/plugin-list.ts";
import { shell } from "../src/shell-translations.ts";
import { usedVariables } from "./support/css-variables.ts";

const page = (name: string): string => readFileSync(fileURLToPath(new URL(`../../docs/plugins/${name}`, import.meta.url)), "utf8");

describe("the documentation of the loading", () => {
  const loading = page("loading-and-dependencies.md");

  it("describes every state of a plugin, the ones of the server and the ones of the browser", () => {
    for (const state of [...SERVER_STATES, "loaded", "failed"]) {
      expect(loading, state).toContain(`\`${state}\``);
    }
  });

  it("describes every cause that the page can show", () => {
    for (const reason of ["too_old", "too_new", "reserved_id", "invalid_url", "invalid_constraint", "missing_constraint", "import_failed", "not_registered"]) {
      expect(loading, reason).toContain(`\`${reason}\``);
    }
  });

  it("describes the three load dependencies", () => {
    for (const field of ["requires", "load_after", "load_before"]) {
      expect(loading).toContain(`\`${field}\``);
    }
  });
});

describe("the documentation of the version constraints", () => {
  const constraints = page("version-constraints.md");

  it("lists every operator and the pre-release rule", () => {
    for (const operator of [">=", ">", "<=", "<", "=="]) {
      expect(constraints).toContain(`| \`${operator}\` |`);
    }
    expect(constraints).toContain("1.0.0-rc.1");
  });
});

describe("the documentation of the translations", () => {
  const translations = page("internationalization.md");

  it("covers every point that the specification asks for", () => {
    for (const heading of [
      "## English catalog",
      "## Declare the keys with types",
      "## Language resolution and fallback",
      "## Titles and groups are keys",
      "## Parameters and plurals",
      "## Load a language on demand",
      "## Add a language",
      "## Check the translations",
    ]) {
      expect(translations, heading).toContain(heading);
    }
  });

  it("explains the resolution chain, the fallback by key and the change of language", () => {
    for (const text of ["fr-CA", "`pt-BR`", "key by key", "without reloading", "`Intl.PluralRules`", "`satisfies CompleteCatalog<typeof en>`", "`error.generic`"]) {
      expect(translations, text).toContain(text);
    }
  });
});

describe("the documentation of the hooks and the placements", () => {
  const hooks = page("hooks-and-placement.md");

  it("describes each of the seven hooks", () => {
    expect(HOOK_NAMES).toHaveLength(7);
    for (const hook of HOOK_NAMES) {
      expect(hooks, hook).toContain(`| \`${hook}\` |`);
    }
  });

  it("describes each form of placement, the default, on_missing and the visibility", () => {
    for (const form of ["first: true", "last: true", "before:", "after:", "replace:", "remove:"]) {
      expect(hooks, form).toContain(`{ ${form}`);
    }
    for (const text of ["on_missing", "`skip`", "`visible`", "target_missing", "undeclared_dependency", "zone", "group"]) {
      expect(hooks, text).toContain(text);
    }
  });

  it("describes the menu of each top tab", () => {
    for (const tab of ["core.top.dashboard", "core.top.thermostats", "core.top.configuration"]) {
      expect(hooks, tab).toContain(tab);
    }
  });
});

describe("the documentation of the test harness", () => {
  const testing = page("testing.md");

  it("describes every member of the fake host and the translation checks", () => {
    for (const name of ["registerPlugin", "resolved", "menu", "visible", "render", "hass", "install", "uninstall", "issues", "createFakeHass", "assertCompleteTranslations", "findTranslationProblems", "knownPlugins", "dashboardVersion"]) {
      expect(testing, name).toContain(name);
    }
  });
});

describe("the documentation of the theme", () => {
  const theming = page("theming.md");

  it("lists the variables that the dashboard uses, and only variables that its code uses or that are documented as Home Assistant ones", () => {
    for (const variable of usedVariables()) {
      expect(theming, variable).toContain(`\`${variable}\``);
    }
    const cited = [...theming.matchAll(/\|\s*`(--[a-z0-9_-]+)`/g)].map((match) => match[1]);
    expect(cited.length).toBeGreaterThan(0);
    for (const variable of cited) {
      expect(usedVariables(), `${variable} is in the table but no component uses it`).toContain(variable);
    }
  });
});

describe("the documentation for the user", () => {
  const user = readFileSync(fileURLToPath(new URL("../../docs/user/dashboard.md", import.meta.url)), "utf8");

  it("describes every state of the plugin status page, with the label that the page shows", () => {
    for (const state of ["loaded", "ready", "missing_dependency", "dashboard_incompatible", "cycle", "invalid", "failed"]) {
      const label = shell.resolve("en", `status.state.${state}`);
      expect(user, label).toContain(`| ${label} |`);
    }
    for (const source of ["installed", "native", "development"]) {
      expect(user.toLowerCase(), source).toContain(source);
    }
  });

  it("describes the tabs, the menu, the breadcrumb, the thermostat selector, the phone and the colors", () => {
    for (const text of ["Dashboard", "Thermostats", "Configuration", "breadcrumb", "selector", "Menu", "phone", "drawer", "theme", "administrators"]) {
      expect(user, text).toContain(text);
    }
  });
});
