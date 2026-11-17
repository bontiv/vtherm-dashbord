import { describe, expect, it } from "vitest";

import { NATIVE_TAB_PLUGINS, fieldsOfPlugin } from "../src/native/tab-definitions.ts";

type Catalog = Readonly<Record<string, string>>;

const catalogs = import.meta.glob<{ en: Catalog; fr: Catalog; de: Catalog }>("../src/native/catalogs/*.ts", { eager: true });
const catalogOf = (plugin: string): { en: Catalog; fr: Catalog; de: Catalog } => {
  const catalog = catalogs[`../src/native/catalogs/${plugin}.ts`];
  if (catalog === undefined) {
    throw new Error(`The native plugin ${plugin} has no catalog.`);
  }
  return catalog;
};
const fieldsOf = (catalog: Catalog, prefix: string): string[] =>
  Object.keys(catalog)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));

/** The fields whose help shows a diagram: their explanation must exist wherever they are shown. */
const DIAGRAM_FIELDS = [
  "cycle_min",
  "tpi_coef_int",
  "tpi_coef_ext",
  "minimal_activation_delay",
  "minimal_deactivation_delay",
  "tpi_threshold_low",
  "tpi_threshold_high",
  "min_opening_degrees",
  "max_opening_degrees",
  "opening_threshold_degree",
  "max_closing_degree",
  "auto_regulation_dtemp",
  "auto_regulation_periode_min",
  "auto_regulation_mode",
  "window_delay",
  "window_off_delay",
  "window_auto_open_threshold",
  "window_auto_close_threshold",
  "window_auto_max_duration",
  "motion_delay",
  "motion_off_delay",
  "safety_delay_min",
  "safety_min_on_percent",
  "safety_default_on_percent",
  "manual_override_duration_min",
  "heating_failure_threshold",
  "cooling_failure_threshold",
  "heating_failure_detection_delay",
  "temperature_change_tolerance",
  "underlying_entity_ids",
];

describe("the help texts of the native plugins", () => {
  it("give a hint for every field that a plugin shows, and no hint or explanation for a field that it does not show", () => {
    for (const plugin of NATIVE_TAB_PLUGINS) {
      const english = catalogOf(plugin).en;
      const shown = new Set(fieldsOfPlugin(plugin).map((field) => field.key));
      const hinted = new Set(fieldsOf(english, "hint."));
      expect([...shown].filter((key) => !hinted.has(key)), `${plugin} lacks hints`).toEqual([]);
      expect([...hinted].filter((key) => !shown.has(key)), `${plugin} has unused hints`).toEqual([]);
      expect(
        fieldsOf(english, "info.").filter((key) => !shown.has(key)),
        `${plugin} has unused explanations`,
      ).toEqual([]);
    }
  });

  it("explain every field that has a diagram, in each plugin that shows it", () => {
    for (const plugin of NATIVE_TAB_PLUGINS) {
      const english = catalogOf(plugin).en;
      const shown = fieldsOfPlugin(plugin).map((field) => field.key);
      const missing = DIAGRAM_FIELDS.filter((key) => shown.includes(key) && english[`info.${key}`] === undefined);
      expect(missing, `${plugin} lacks explanations`).toEqual([]);
    }
  });

  it("write each hint as one short sentence, and never repeat it as the explanation, in the three languages", () => {
    for (const plugin of NATIVE_TAB_PLUGINS) {
      for (const language of ["en", "fr", "de"] as const) {
        const catalog = catalogOf(plugin)[language];
        for (const key of fieldsOf(catalog, "hint.")) {
          const hint = catalog[`hint.${key}`] as string;
          expect(hint.length, `${plugin} ${language} hint.${key}`).toBeLessThanOrEqual(130);
          expect(hint, `${plugin} ${language} hint.${key}`).toMatch(/[.!?]$/);
          // The German abbreviation "z. B." does not end a sentence.
          expect(hint.replaceAll("z. B.", "zB"), `${plugin} ${language} hint.${key} has several sentences`).not.toMatch(/[.!?] +\p{Lu}/u);
          expect(catalog[`info.${key}`], `${plugin} ${language} info.${key}`).not.toBe(hint);
        }
        for (const key of fieldsOf(catalog, "info.")) {
          expect(catalog[`hint.${key}`], `${plugin} ${language} info.${key} has no hint`).toBeDefined();
        }
      }
    }
  });

  it("give the same text to a field that several plugins show", () => {
    const seen = new Map<string, { plugin: string; text: string }>();
    for (const plugin of NATIVE_TAB_PLUGINS) {
      const english = catalogOf(plugin).en;
      for (const key of Object.keys(english).filter((candidate) => candidate.startsWith("hint.") || candidate.startsWith("info."))) {
        // The power unit of the central configuration is the unit of the sensors of the home, not the one of a heater.
        if (key === "hint.power_unit") {
          continue;
        }
        const previous = seen.get(key);
        if (previous === undefined) {
          seen.set(key, { plugin, text: english[key] as string });
        } else {
          expect(english[key], `${key} in ${plugin} and ${previous.plugin}`).toBe(previous.text);
        }
      }
    }
  });
});
