/**
 * The values of the fields of the native tabs: what a field shows, and what a value typed by the user becomes.
 *
 * Kept apart from the drawing, so that the rules can be tested.
 */

import type { FieldSpec } from "./schemas.ts";

/** The defaults of the temperatures that depend on the unit of Home Assistant, as Versatile Thermostat applies them. */
const UNIT_DEFAULTS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  "°F": { temp_min: 45, temp_max: 95, step_temperature: 1.0 },
  "°C": { temp_min: 7, temp_max: 35, step_temperature: 0.1 },
};

/**
 * Return the default value of a field, as the flow of Versatile Thermostat gives it.
 *
 * @param field - The field.
 * @param temperatureUnit - The unit of the temperatures of Home Assistant, `°C` or `°F`.
 */
export function defaultOf(field: FieldSpec, temperatureUnit: string | undefined): unknown {
  const byUnit = UNIT_DEFAULTS[temperatureUnit === "°F" ? "°F" : "°C"]?.[field.key];
  return byUnit ?? field.default;
}

/**
 * Return the value that a field shows: the value of the configuration, otherwise its default.
 *
 * @param field - The field.
 * @param values - The values of the configuration, draft included.
 * @param temperatureUnit - The unit of the temperatures.
 */
export function shownValue(field: FieldSpec, values: Readonly<Record<string, unknown>>, temperatureUnit: string | undefined): unknown {
  const value = values[field.key];
  return value === undefined || value === null ? defaultOf(field, temperatureUnit) : value;
}

/** Whether a field holds a list. */
export const isList = (field: FieldSpec): boolean => field.multiple === true;

/**
 * Turn what the user typed into the value of the configuration.
 *
 * An empty optional field is cleared (`null`). A list is typed one item per line.
 *
 * @param field - The field.
 * @param input - The text of the input, or the state of a checkbox.
 */
export function parseInput(field: FieldSpec, input: string | boolean): unknown {
  if (field.kind === "boolean") {
    return input === true;
  }
  const text = String(input);
  if (isList(field)) {
    return text
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }
  if (text.trim() === "") {
    return null;
  }
  if (field.kind === "integer") {
    const value = Number(text);
    return Number.isInteger(value) ? value : text;
  }
  if (field.kind === "number") {
    const value = Number(text.replace(",", "."));
    return Number.isFinite(value) ? value : text;
  }
  return text;
}

/** Turn a value of the configuration into the text of an input. */
export function formatInput(field: FieldSpec, value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join("\n");
  }
  return String(value);
}

/** The domains of the entities that a field accepts. */
export function domainsOf(field: FieldSpec): string[] {
  if (field.domain === undefined) {
    return [];
  }
  return typeof field.domain === "string" ? [field.domain] : [...field.domain];
}

/**
 * List the entities that a field can point at, from the states of Home Assistant.
 *
 * @param field - The field.
 * @param entityIds - The entity identifiers that exist.
 */
export function entityChoices(field: FieldSpec, entityIds: readonly string[]): string[] {
  const domains = domainsOf(field);
  return entityIds.filter((entityId) => domains.length === 0 || domains.includes(entityId.split(".")[0] ?? "")).sort();
}

/**
 * The fields that a required field misses: a required field without value and without default.
 *
 * @param fields - The fields that are shown.
 * @param values - The values of the configuration, draft included.
 */
export function missingRequired(fields: readonly FieldSpec[], values: Readonly<Record<string, unknown>>): FieldSpec[] {
  return fields.filter((field) => {
    if (!field.required || (field.default !== null && field.default !== undefined && field.default !== "")) {
      return false;
    }
    const value = values[field.key];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });
}

/** The values that Versatile Thermostat gives to Auto TPI when the type of learning changes. */
export function autoTpiDefaults(learningType: unknown): Readonly<Record<string, unknown>> {
  if (learningType === "discovery") {
    return { auto_tpi_calculation_method: "average", auto_tpi_avg_initial_weight: 1 };
  }
  if (learningType === "fine_tuning") {
    return { auto_tpi_calculation_method: "ema", auto_tpi_ema_alpha: 0.08, auto_tpi_ema_decay_rate: 0.12 };
  }
  return {};
}
