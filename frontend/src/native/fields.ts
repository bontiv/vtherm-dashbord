/**
 * The values of the fields of the native tabs: what a field shows, and what a value typed by the user becomes.
 *
 * Kept apart from the drawing, so that the rules can be tested.
 */

import type { FieldDefinition } from "@vtherm/dashboard-sdk";

import type { FieldSpec } from "./schemas.ts";

/** The defaults of the temperatures that depend on the unit of Home Assistant, as Versatile Thermostat applies them. */
const UNIT_DEFAULTS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  "°F": { temp_min: 45, temp_max: 95, step_temperature: 1.0 },
  "°C": { temp_min: 7, temp_max: 35, step_temperature: 0.1 },
};

/**
 * The limits of the shares (0 to 1) that the schema of Versatile Thermostat leaves open. Without limits, `selectorOf` gives the step
 * `any`, the one step that the other fractions of the forms (`heating_failure_threshold`) never use.
 */
const SHARE_LIMITS: Readonly<Record<string, { readonly min: number; readonly max: number; readonly step: number }>> = {
  safety_min_on_percent: { min: 0, max: 1, step: 0.01 },
  safety_default_on_percent: { min: 0, max: 1, step: 0.01 },
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

/** A key with its value, or nothing when the value is absent. */
function optional<Key extends string, Value>(key: Key, value: Value | undefined): { readonly [K in Key]?: Value } {
  return (value === undefined ? {} : { [key]: value }) as { readonly [K in Key]?: Value };
}

/**
 * Describe a field of a form of Versatile Thermostat with the contract of the SDK, so that `selectorOf` gives its control of Home
 * Assistant.
 *
 * @param field - The field.
 * @param optionLabel - The translated label of an option of a `select`.
 * @param extraOptions - Options that the form does not list but the configuration holds, such as an algorithm that a plugin added.
 */
export function definitionOf(field: FieldSpec, optionLabel: (option: string) => string = (option) => option, extraOptions: readonly string[] = []): FieldDefinition {
  const base = { key: field.key, required: field.required };
  const limits = SHARE_LIMITS[field.key];
  switch (field.kind) {
    case "boolean":
      return { type: "boolean", ...base };
    case "number":
    case "integer":
      return {
        type: field.kind,
        ...base,
        ...optional("min", field.min ?? limits?.min),
        ...optional("max", field.max ?? limits?.max),
        ...optional("step", field.step ?? limits?.step),
        ...optional("unit", field.unit_of_measurement ?? field.unit),
      };
    case "entity": {
      const filter = { ...optional("domains", field.domain === undefined ? undefined : domainsOf(field)), ...optional("device_classes", field.device_classes) };
      return field.multiple === true ? { type: "entity_list", ...base, ...filter } : { type: "entity", ...base, ...filter };
    }
    case "select": {
      const known = field.options ?? [];
      const options = [...known, ...extraOptions.filter((option) => !known.includes(option))];
      return { type: "select", ...base, options: options.map((option) => ({ value: option, label: optionLabel(option) })) };
    }
    case "template":
      return { type: "template", ...base };
    case "string":
    case "text":
      if (field.multiple === true) {
        return { type: "text_list", ...base };
      }
      return { type: "text", ...base, ...optional("multiline", field.multiline) };
  }
}

/**
 * Turn a value of the configuration into the value of the control of Home Assistant: a list for a list, nothing for no value.
 *
 * @param field - The field.
 * @param value - The value shown, from `shownValue`.
 */
export function valueForSelector(field: FieldSpec, value: unknown): unknown {
  if (isList(field)) {
    if (Array.isArray(value)) {
      return value;
    }
    return value === undefined || value === null || value === "" ? [] : [value];
  }
  return value === null ? undefined : value;
}

/**
 * Turn the value that the control of Home Assistant gives into the value of the configuration. An empty optional field is cleared
 * (`null`), as the forms of Versatile Thermostat do; a list keeps its order and loses its empty items.
 *
 * @param field - The field.
 * @param value - The `detail.value` of the event `value-changed`.
 */
export function valueFromSelector(field: FieldSpec, value: unknown): unknown {
  if (field.kind === "boolean") {
    return value === true;
  }
  if (isList(field)) {
    const items: unknown[] = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
    return items.map((item) => String(item).trim()).filter((item) => item !== "");
  }
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  if ((field.kind === "number" || field.kind === "integer") && typeof value === "string") {
    return parseInput(field, value);
  }
  return value;
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
/**
 * Whether a tab shows a field for these values. The sensor of humidity is only asked for when the feature is on.
 *
 * @param field - The field.
 * @param values - The values of the configuration, draft included.
 */
export function isFieldShown(field: FieldSpec, values: Readonly<Record<string, unknown>>): boolean {
  return field.key !== "humidity_sensor_entity_id" || values["use_humidity_feature"] === true;
}

/** The fields that hold the commands of the underlyings or of the central boiler: blocks of several controls. */
const COMMAND_BLOCKS = new Set(["vswitch_on_command", "vswitch_off_command", "central_boiler_activation_service", "central_boiler_deactivation_service"]);

/**
 * Whether a field takes the whole width of the grid of its section: a list, a template, a text of several lines or a block of commands.
 *
 * @param field - The field.
 */
export function isWideField(field: FieldSpec): boolean {
  return field.multiple === true || field.multiline === true || field.kind === "template" || COMMAND_BLOCKS.has(field.key);
}

/**
 * The height, in px, of the name that a control of Home Assistant shows above its input, as the entity picker does: the band that the
 * grid of a section reserves above the other controls of a row that holds such a control. Measured on the Home Assistant of the
 * devcontainer.
 */
export const LABEL_ABOVE_HEIGHT = 25;

/**
 * Whether the control of a field shows its name above its input instead of inside it: an entity picker of one entity. A wide field
 * takes a row of its own, so its name never shifts another field.
 *
 * @param field - The field.
 */
export function labelAbove(field: FieldSpec): boolean {
  return field.kind === "entity" && !isWideField(field);
}

/**
 * The longest name of a field that a tile shows on one line at its narrowest, required asterisk included. A longer name wraps, and its
 * second line covers the value of the field.
 */
export const LABEL_MAX_LENGTH = 38;

/**
 * The key of the name of a field in the catalog of its plugin: the short name of the dashboard (`label.<key>`) when the name of
 * Versatile Thermostat (`field.<key>`) is too long for a tile.
 *
 * @param key - The key of the field.
 * @param english - The English catalog of the plugin, which holds every key.
 */
export function fieldLabelKey(key: string, english: Readonly<Record<string, unknown>>): string {
  return `label.${key}` in english ? `label.${key}` : `field.${key}`;
}

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
