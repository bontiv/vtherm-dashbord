import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCES = fileURLToPath(new URL("../../src", import.meta.url));

export function files(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(join(folder, entry.name)) : entry.name.endsWith(".ts") ? [join(folder, entry.name)] : []));
}

/** The CSS of the components: the content of the `css` template literals. */
export function styles(source: string): string {
  return [...source.matchAll(/css`([\s\S]*?)`/g)].map((match) => match[1] ?? "").join("\n");
}

let sources: readonly { readonly file: string; readonly css: string }[] | undefined;

/** The CSS of each source file of the frontend, read once: reading every file is slow, and several tests need it. */
export function sourceStyles(): readonly { readonly file: string; readonly css: string }[] {
  sources ??= files(SOURCES).map((file) => ({ file, css: styles(readFileSync(file, "utf8")) }));
  return sources;
}

/** The custom properties of Home Assistant that the components use. */
export function usedVariables(): string[] {
  const used = new Set<string>();
  for (const { css } of sourceStyles()) {
    for (const match of css.matchAll(/var\((--[a-z0-9_-]+)/g)) {
      used.add(match[1] as string);
    }
  }
  return [...used].sort();
}

/**
 * The custom properties that the dashboard defines itself in its styles (`--vtherm-...: value`), such as the unit of height of the grid
 * of the widgets. They are not colors of the theme: the components may use them.
 */
export function ownVariables(): string[] {
  const own = new Set<string>();
  for (const { css } of sourceStyles()) {
    for (const match of css.matchAll(/(--vtherm-[a-z0-9_-]+)\s*:/g)) {
      own.add(match[1] as string);
    }
  }
  return [...own].sort();
}
