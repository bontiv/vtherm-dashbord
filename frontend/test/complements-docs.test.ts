/** The pages of the add-ons document every state and every error. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { en } from "../src/complements/catalogs.ts";
import { COMPLEMENT_STATES } from "../src/complements/types.ts";

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), "utf8");

describe("the documentation of the add-ons", () => {
  it("describes every state of an add-on, with the name that the page shows", () => {
    const page = read("docs/user/complements.md");
    for (const state of COMPLEMENT_STATES) {
      expect(page, state).toContain(`| ${en[`state.${state}`]} |`);
    }
  });

  it("describes every error of the adapter of HACS and of the catalog", () => {
    const contributing = read("docs/contributing/complements.md");
    for (const code of ["hacs_error", "interface_changed", "unexpected_response", "add_refused", "category_unsupported"]) {
      expect(contributing, code).toContain(`\`${code}\``);
    }
    expect(read("docs/reference/websocket-api.md")).toContain("`catalog_unavailable`");
  });

  it("explains each case of the user guide: HACS missing, disabled and changed, the restart, and the update by HACS", () => {
    const page = read("docs/user/complements.md");
    for (const text of ["HACS is disabled", "Cancel", "Restart Home Assistant", "Later", "Configure", "Update and remove", "When HACS changes", "five minutes"]) {
      expect(page, text).toContain(text.replace("HACS is disabled", "When HACS is disabled"));
    }
  });

  it("documents every field of the catalog and of the answer of the command", () => {
    const format = read("docs/reference/catalog-format.md");
    for (const field of ["name", "type", "slug", "url", "description", "certification", "family", "ha_domain", "author", "hacs_category"]) {
      expect(format, field).toContain(`\`${field}\``);
    }
  });
});
