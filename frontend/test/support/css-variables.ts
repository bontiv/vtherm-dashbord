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

/** The custom properties of Home Assistant that the components use. */
export function usedVariables(): string[] {
  const used = new Set<string>();
  for (const file of files(SOURCES)) {
    for (const match of styles(readFileSync(file, "utf8")).matchAll(/var\((--[a-z0-9_-]+)/g)) {
      used.add(match[1] as string);
    }
  }
  return [...used].sort();
}

