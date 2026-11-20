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

  it("describes every error of the adapter of the store and of the catalog", () => {
    const contributing = read("docs/contributing/complements.md");
    for (const code of ["store_error", "interface_changed", "unexpected_response", "add_refused", "category_unsupported", "not_loaded", "warning_not_accepted", "github_not_connected"]) {
      expect(contributing, code).toContain(`\`${code}\``);
    }
    expect(read("docs/reference/websocket-api.md")).toContain("`catalog_unavailable`");
  });

  it("explains each case of the user guide: no store, the Marketplace and HACS, disabled and changed, the restart, and the update", () => {
    const page = read("docs/user/complements.md");
    for (const text of ["Marketplace or HACS\nis disabled", "accept its warning", "GitHub connected", "not loaded", "Cancel", "Restart Home Assistant", "Later", "Configure", "Update and remove", "When the store changes", "five minutes"]) {
      expect(page, text).toContain(text);
    }
    for (const key of ["store.marketplace.open", "store.hacs.open", "store.reading"] as const) {
      expect(page, key).toContain(en[key]);
    }
  });

  it("documents every field of the catalog and of the answer of the command", () => {
    const format = read("docs/reference/catalog-format.md");
    for (const field of ["name", "type", "slug", "url", "description", "certification", "family", "ha_domain", "author", "hacs_category"]) {
      expect(format, field).toContain(`\`${field}\``);
    }
  });

  it("describes the new behaviours of the pages: update, filters, summary, manual install and documentation", () => {
    const page = read("docs/user/complements.md");
    for (const text of [en["update.available"], "1.2.0 → 1.3.0", "To handle", "Clear filters", "Filters (1)", "(EN)", "Experimental", "Manual install", "Import into Home Assistant", "Copy", "Documentation", "address of the page"]) {
      expect(page, text).toContain(text);
    }
    expect(page).not.toContain("Link only");
    expect(read("docs/reference/websocket-api.md")).toContain("`vtherm_dashboard/get_complement_readme`");
    expect(read("docs/reference/catalog-format.md")).toContain("[EXPERIMENTAL]");
    expect(read("docs/contributing/complements.md")).toContain("absolutize_links");
  });
});
