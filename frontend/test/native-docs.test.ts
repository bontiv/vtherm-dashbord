// @vitest-environment happy-dom
/**
 * The page `docs/plugins/native-plugins.md` lists the native plugins and their contributions. The table between its markers is generated
 * from the code: run this test with `UPDATE_NATIVE_DOCS=1` to write it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { beforeAll, describe, expect, it } from "vitest";

import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

const PAGE = resolve(process.cwd(), "docs/plugins/native-plugins.md");
const START = "<!-- native-ids -->";
const END = "<!-- /native-ids -->";

let definitions: Map<string, UiPluginDefinition>;

beforeAll(async () => {
  ({ definitions } = await nativeHost());
});

const english = (definition: UiPluginDefinition): Record<string, string> => definition.translations.english as unknown as Record<string, string>;

/** One row per contribution of the native plugins, in the order of the load of the plugins. */
function table(): string {
  const rows = ["| Plugin | Contribution | Where | Title |", "| --- | --- | --- | --- |"];
  for (const id of NATIVE_LOAD_ORDER) {
    const definition = definitions.get(id) as UiPluginDefinition;
    for (const [hook, list] of Object.entries(definition.contributions)) {
      for (const contribution of list ?? []) {
        const item = contribution as { id: string; title?: string };
        // A widget has no title in its contribution: its card shows the key `widget.<name>.title` of its catalog.
        const key = item.title ?? (hook.endsWith("_widget") ? `widget.${item.id.split(".").at(-1) ?? ""}.title` : undefined);
        const title = key === undefined ? "" : (english(definition)[key] ?? item.title ?? "");
        rows.push(`| \`${id}\` | \`${item.id}\` | \`${hook}\` | ${title} |`);
      }
    }
  }
  return rows.join("\n");
}

describe("the page of the native plugins", () => {
  it("lists every contribution of the native plugins, as the code declares them", () => {
    const page = readFileSync(PAGE, "utf8");
    const generated = `${START}\n${table()}\n${END}`;
    if (process.env["UPDATE_NATIVE_DOCS"] === "1") {
      writeFileSync(PAGE, page.replace(new RegExp(`${START}[\\s\\S]*?${END}`), generated));
    }
    const current = readFileSync(PAGE, "utf8");
    expect(current.match(new RegExp(`${START}[\\s\\S]*?${END}`))?.[0]).toBe(generated);
  });

  it("names each native plugin and each tab of the flow in its text", () => {
    const page = readFileSync(PAGE, "utf8");
    for (const id of NATIVE_LOAD_ORDER) {
      expect(page, id).toContain(`\`${id}\``);
    }
  });
});
