/**
 * Write the translation catalogs of the native plugins, in `frontend/src/native/catalogs/`.
 *
 * The labels, the help and the names of the options of the fields come from the translations of Versatile Thermostat
 * (`VTHERM_VERSATILE_THERMOSTAT_DIR`, MIT license, Copyright (c) 2022 Jean-Marc Collin), so that the dashboard says what the
 * screens of Home Assistant say. `native-texts.ts` gives the other texts. Run it with `npm run catalogs:generate` after an update
 * of Versatile Thermostat; `--check` fails when a catalog is not the one that the script would write.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { NATIVE_TAB_PLUGINS, TAB_DEFINITIONS, fieldsOfPlugin } from "../frontend/src/native/tab-definitions.ts";
import { locate } from "./external-paths.ts";
import { COMMON_TEXTS, ERROR_TEXTS, PLUGIN_TEXTS } from "./native-texts.ts";
import type { Text } from "./native-texts.ts";

const LANGUAGES = ["en", "fr", "de"] as const;
type Language = (typeof LANGUAGES)[number];

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const VTHERM_TRANSLATIONS = `${join(locate("versatile_thermostat"), "custom_components/versatile_thermostat/translations")}/`;
const OUTPUT = `${ROOT}frontend/src/native/catalogs/`;

interface VthermTranslation {
  config: { step: Record<string, { title?: string; description?: string; data?: Record<string, string>; data_description?: Record<string, string>; menu_options?: Record<string, string> }>; error: Record<string, string> };
  selector: Record<string, { options: Record<string, string> }>;
  entity?: { number?: Record<string, { name?: string }> };
}

/** A catalog in the three languages, by key, in the order of the keys. */
export type Catalogs = Record<Language, Record<string, string>>;

/** Read the translations of Versatile Thermostat. */
export function readVthermTranslations(): Record<Language, VthermTranslation> | undefined {
  if (!existsSync(VTHERM_TRANSLATIONS)) {
    return undefined;
  }
  return Object.fromEntries(LANGUAGES.map((language) => [language, JSON.parse(readFileSync(`${VTHERM_TRANSLATIONS}${language}.json`, "utf8"))])) as Record<Language, VthermTranslation>;
}

function stepText(source: VthermTranslation, preferredSteps: readonly string[], part: "data" | "data_description", key: string): string | undefined {
  const steps = source.config.step;
  for (const step of [...preferredSteps, ...Object.keys(steps)]) {
    const text = steps[step]?.[part]?.[key];
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
}

/**
 * Build the catalogs of a native plugin.
 *
 * @param plugin - The identifier of the plugin.
 * @param vtherm - The translations of Versatile Thermostat.
 * @returns The catalogs, and the keys that a language misses.
 */
export function buildCatalogs(plugin: string, vtherm: Record<Language, VthermTranslation>): { catalogs: Catalogs; missing: string[] } {
  const catalogs: Catalogs = { en: {}, fr: {}, de: {} };
  const missing: string[] = [];
  const add = (key: string, texts: Partial<Record<Language, string | undefined>>): void => {
    for (const language of LANGUAGES) {
      const text = texts[language];
      if (text === undefined) {
        missing.push(`${plugin}: ${language} has no text for '${key}'`);
      } else {
        catalogs[language][key] = text.trim();
      }
    }
  };
  const fromText = (text: Text): Record<Language, string> => ({ en: text.en, fr: text.fr, de: text.de });
  const own = PLUGIN_TEXTS[plugin] ?? {};

  for (const [key, text] of Object.entries(COMMON_TEXTS)) {
    add(key, fromText(text));
  }
  const tabs = TAB_DEFINITIONS.filter((definition) => definition.plugin === plugin);
  for (const definition of tabs) {
    // A title or description of the dashboard takes precedence over the one of Versatile Thermostat.
    const titleKey = `title.${definition.tab}`;
    add(titleKey, own[titleKey] !== undefined ? fromText(own[titleKey]) : Object.fromEntries(LANGUAGES.map((language) => [language, vtherm[language].config.step["menu"]?.menu_options?.[definition.tab]])));
    const descriptionKey = `description.${definition.tab}`;
    const description = own[descriptionKey] !== undefined ? fromText(own[descriptionKey]) : Object.fromEntries(LANGUAGES.map((language) => [language, vtherm[language].config.step[definition.tab]?.description]));
    if (LANGUAGES.every((language) => description[language] !== undefined)) {
      add(`description.${definition.tab}`, description);
    }
  }
  const steps = tabs.map((definition) => definition.tab);
  for (const field of fieldsOfPlugin(plugin).sort((first, second) => first.key.localeCompare(second.key))) {
    const labelKey = `field.${field.key}`;
    if (!(labelKey in catalogs.en)) {
      add(labelKey, own[labelKey] !== undefined ? fromText(own[labelKey]) : Object.fromEntries(LANGUAGES.map((language) => [language, stepText(vtherm[language], steps, "data", field.key)])));
      const help = Object.fromEntries(LANGUAGES.map((language) => [language, stepText(vtherm[language], steps, "data_description", field.key)]));
      if (LANGUAGES.every((language) => help[language] !== undefined)) {
        add(`help.${field.key}`, help);
      }
    }
    if (field.kind === "select") {
      const translationKey = field.translation_key ?? field.key;
      for (const option of field.options ?? []) {
        const key = `option.${translationKey}.${option}`;
        if (!(key in catalogs.en)) {
          add(key, own[key] !== undefined ? fromText(own[key]) : Object.fromEntries(LANGUAGES.map((language) => [language, vtherm[language].selector[translationKey]?.options[option]])));
        }
      }
    }
  }
  if (tabs.some((definition) => definition.thermostat?.({}).presets === true)) {
    // The names of the preset temperatures, which are number entities of Versatile Thermostat.
    for (const preset of Object.keys(vtherm.en.entity?.number ?? {}).sort()) {
      add(`preset.${preset}`, Object.fromEntries(LANGUAGES.map((language) => [language, vtherm[language].entity?.number?.[preset]?.name])));
    }
  }
  for (const [key, text] of Object.entries(own)) {
    if (!(key in catalogs.en)) {
      add(key, fromText(text));
    }
  }
  return { catalogs, missing };
}

/** Build the messages of the error codes, in the three languages. */
export function buildErrorCatalogs(vtherm: Record<Language, VthermTranslation>): { catalogs: Catalogs; missing: string[] } {
  const catalogs: Catalogs = { en: {}, fr: {}, de: {} };
  const missing: string[] = [];
  const codes = new Set([...Object.keys(vtherm.en.config.error), ...Object.keys(ERROR_TEXTS)]);
  for (const code of [...codes].sort()) {
    for (const language of LANGUAGES) {
      const text = ERROR_TEXTS[code]?.[language] ?? vtherm[language].config.error[code];
      if (text === undefined) {
        missing.push(`errors: ${language} has no text for '${code}'`);
      } else {
        catalogs[language][`error.${code}`] = text.trim();
      }
    }
  }
  return { catalogs, missing };
}

const HEADER = [
  "/**",
  " * Generated by `scripts/generate-native-catalogs.ts`. Do not edit: change `scripts/native-texts.ts` or update Versatile Thermostat, then run",
  " * `npm run catalogs:generate`.",
  " *",
  " * The texts of the fields come from the translations of Versatile Thermostat, MIT license, Copyright (c) 2022 Jean-Marc Collin.",
  " */",
  "",
].join("\n");

/** Write a catalog module: the English catalog and the French and German ones, which must be complete. */
export function renderCatalogModule(catalogs: Catalogs): string {
  const object = (catalog: Record<string, string>): string => `{\n${Object.entries(catalog).map(([key, text]) => `  ${JSON.stringify(key)}: ${JSON.stringify(text)},`).join("\n")}\n}`;
  return [
    HEADER,
    'import type { CompleteCatalog } from "@vtherm/dashboard-sdk";',
    "",
    "/** The English catalog, which gives the keys. */",
    `export const en = ${object(catalogs.en)} as const;`,
    "",
    "/** The French catalog. */",
    `export const fr = ${object(catalogs.fr)} satisfies CompleteCatalog<typeof en>;`,
    "",
    "/** The German catalog. */",
    `export const de = ${object(catalogs.de)} satisfies CompleteCatalog<typeof en>;`,
    "",
  ].join("\n");
}

/** The files that the script writes, by path, with their content. */
export function renderAll(vtherm: Record<Language, VthermTranslation>): { files: Map<string, string>; missing: string[] } {
  const files = new Map<string, string>();
  const missing: string[] = [];
  for (const plugin of NATIVE_TAB_PLUGINS) {
    const built = buildCatalogs(plugin, vtherm);
    missing.push(...built.missing);
    files.set(`${OUTPUT}${plugin}.ts`, renderCatalogModule(built.catalogs));
  }
  const errors = buildErrorCatalogs(vtherm);
  missing.push(...errors.missing);
  files.set(`${OUTPUT}errors.ts`, renderCatalogModule(errors.catalogs));
  return { files, missing };
}

function main(): number {
  const vtherm = readVthermTranslations();
  if (vtherm === undefined) {
    console.error(`VTHERM_VERSATILE_THERMOSTAT_DIR: ${VTHERM_TRANSLATIONS} has no Versatile Thermostat translations`);
    return 1;
  }
  const { files, missing } = renderAll(vtherm);
  if (missing.length > 0) {
    console.error(`Some texts are missing. Add them to scripts/native-texts.ts:\n${missing.map((line) => `  ${line}`).join("\n")}`);
    return 1;
  }
  const check = process.argv.includes("--check");
  const stale = [...files].filter(([path, content]) => !existsSync(path) || readFileSync(path, "utf8") !== content).map(([path]) => path);
  if (check) {
    if (stale.length > 0) {
      console.error(`The catalogs are out of date, run 'npm run catalogs:generate':\n${stale.map((path) => `  ${path.slice(ROOT.length)}`).join("\n")}`);
      return 1;
    }
    console.log("The catalogs of the native plugins are up to date.");
    return 0;
  }
  for (const path of stale) {
    writeFileSync(path, files.get(path) as string);
    console.log(`Wrote ${path.slice(ROOT.length)}`);
  }
  console.log(stale.length === 0 ? "The catalogs were up to date." : `${stale.length} catalog(s) written.`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
