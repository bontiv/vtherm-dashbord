import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SERVER_STATES } from "../src/plugin-list.ts";

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
