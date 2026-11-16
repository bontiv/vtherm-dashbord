/**
 * The forms of the config flow of Versatile Thermostat, as `shared/vtherm-config-schemas.json` describes them.
 *
 * The description is written from the real forms and checked by `tests/test_schema_drift.py`, so the native tabs show the fields
 * that Versatile Thermostat expects, with its defaults and its limits.
 */

import description from "../../../shared/vtherm-config-schemas.json" with { type: "json" };

/** A field of a form. */
export interface FieldSpec {
  /** The key of the value in the configuration. */
  readonly key: string;
  /** Whether the form refuses to go on without a value. */
  readonly required: boolean;
  /** The value that the form gives when the user gives none. */
  readonly default: unknown;
  /** What the field holds. */
  readonly kind: "boolean" | "number" | "integer" | "string" | "text" | "entity" | "select" | "template";
  readonly min?: number;
  readonly max?: number;
  readonly step?: number | "any";
  /** The values that a `select` accepts. */
  readonly options?: readonly string[];
  /** The key of the translations of the options of a `select`. */
  readonly translation_key?: string;
  /** The domains that an `entity` accepts. */
  readonly domain?: string | readonly string[];
  /** Whether an `entity` or a `text` holds a list. */
  readonly multiple?: boolean;
  /** Whether a `text` has several lines. */
  readonly multiline?: boolean;
  /** The classes of devices that an `entity` accepts, for its domains that have one. Written by hand, see `tests/test_schema_drift.py`. */
  readonly device_classes?: readonly string[];
  /** The unit of a delay stored as a number, `min` or `s`. Written by hand, see `tests/test_schema_drift.py`. */
  readonly unit?: string;
  /** The unit that the form of Versatile Thermostat gives to a number. */
  readonly unit_of_measurement?: string;
}

/** The names of the forms. */
export type SchemaName = keyof typeof description;

const forms = description as unknown as Readonly<Record<SchemaName, readonly FieldSpec[]>>;

/** The fields that a form only shows as a heading, without a value: Versatile Thermostat uses them as labels. */
const LABEL_ONLY_FIELDS = new Set(["on_command_text", "off_command_text"]);

/**
 * Return the fields of a form that hold a value.
 *
 * @param name - The name of the form, for example `STEP_CENTRAL_TPI_DATA_SCHEMA`.
 */
export function fieldsOf(name: SchemaName): readonly FieldSpec[] {
  return forms[name].filter((field) => !LABEL_ONLY_FIELDS.has(field.key));
}

/** Every form, by name. */
export function allForms(): Readonly<Record<SchemaName, readonly FieldSpec[]>> {
  return forms;
}
