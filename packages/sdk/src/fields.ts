/**
 * The contract of the fields of configuration: one type of field for each control of Home Assistant.
 *
 * A plugin describes its fields with these types and draws each one with the `ha-selector` of Home Assistant, whose `selector` is
 * given by `selectorOf`. The dashboard draws its own native tabs the same way, so that every field looks and behaves as in the rest
 * of Home Assistant: same pickers, same filters, same themes. The SDK gives no form element: each plugin draws its fields itself.
 */

/** The types of fields, each one shown with a selector of Home Assistant. */
export type FieldType = "boolean" | "number" | "integer" | "text" | "text_list" | "entity" | "entity_list" | "select" | "duration" | "time" | "template";

/** What every field has. */
export interface FieldBase<Type extends FieldType> {
  /** The type of the field, which chooses the control of Home Assistant. */
  readonly type: Type;
  /** The key of the value in the configuration. */
  readonly key: string;
  /** Whether a value is required. */
  readonly required?: boolean;
}

/** A switch. The value is a boolean. */
export type BooleanField = FieldBase<"boolean">;

/** A number, typed in a box. The value is a number, in the unit of the field. */
export interface NumberField extends FieldBase<"number" | "integer"> {
  /** The smallest value. No limit when it is absent. */
  readonly min?: number;
  /** The largest value. No limit when it is absent. */
  readonly max?: number;
  /** The step. `any` by default for a `number`, `1` for an `integer`. */
  readonly step?: number | "any";
  /** The unit shown after the box, for example `min`, `s` or `°C`. The value is stored in this unit. */
  readonly unit?: string;
}

/** A text. The value is a string. */
export interface TextField extends FieldBase<"text"> {
  /** Whether the text has several lines. */
  readonly multiline?: boolean;
}

/** A list of texts. The value is an array of strings. */
export type TextListField = FieldBase<"text_list">;

/** What an entity field accepts. */
interface EntityFilter {
  /** The domains of the entities, for example `sensor` or `climate`. Every domain when it is absent. */
  readonly domains?: readonly string[];
  /**
   * The classes of the devices, for example `temperature`. They apply to the domains of `deviceClassDomains`; the other domains are
   * accepted without a class, since entities such as `input_number` have none.
   */
  readonly device_classes?: readonly string[];
  /** The domains whose entities must have one of `device_classes`. `sensor` and `binary_sensor` by default. */
  readonly device_class_domains?: readonly string[];
}

/** An entity. The value is an entity identifier. */
export interface EntityField extends FieldBase<"entity">, EntityFilter {}

/** A list of entities, in an order that the user can change. The value is an array of entity identifiers. */
export interface EntityListField extends FieldBase<"entity_list">, EntityFilter {
  /** Whether the user can change the order. True by default: lists are often matched by position with other lists. */
  readonly reorder?: boolean;
}

/** An option of a choice. */
export interface SelectOption {
  /** The value stored in the configuration. */
  readonly value: string;
  /** The label, already translated. */
  readonly label: string;
}

/** A choice among fixed values. The value is the `value` of an option. */
export interface SelectField extends FieldBase<"select"> {
  /** The values that the field accepts, with their labels. */
  readonly options: readonly SelectOption[];
  /** `dropdown` by default; `list` shows every option, as radio buttons. */
  readonly mode?: "dropdown" | "list";
}

/** A duration. The value is an object `{ days?, hours?, minutes?, seconds? }`. A delay stored as a number is a `number` with a unit. */
export type DurationField = FieldBase<"duration">;

/** A time of the day. The value is a string `HH:MM:SS`. */
export type TimeField = FieldBase<"time">;

/** A template of Home Assistant, in a code editor. The value is a string. */
export type TemplateField = FieldBase<"template">;

/** The definition of a field. Its `type` chooses the control. */
export type FieldDefinition =
  | BooleanField
  | NumberField
  | TextField
  | TextListField
  | EntityField
  | EntityListField
  | SelectField
  | DurationField
  | TimeField
  | TemplateField;

/** A filter of the entity selector of Home Assistant. */
export interface HaEntityFilter {
  /** The domains of the entities. */
  readonly domain?: string | readonly string[];
  /** The classes of the devices of the entities. */
  readonly device_class?: string | readonly string[];
}

/** The selector `number`: a number in a box or with a slider. */
export interface HaNumberSelector {
  /** The smallest value. */
  readonly min?: number;
  /** The largest value. */
  readonly max?: number;
  /** The step, or `any`. */
  readonly step?: number | "any";
  /** How the number is typed: in a box, or with a slider. */
  readonly mode: "box" | "slider";
  /** The unit shown after the number. */
  readonly unit_of_measurement?: string;
}

/** The selector `text`. */
export interface HaTextSelector {
  /** Whether the text has several lines. */
  readonly multiline?: boolean;
  /** Whether the value is a list of texts. */
  readonly multiple?: boolean;
}

/** The selector `entity`. */
export interface HaEntitySelector {
  /** Whether the value is a list of entities. */
  readonly multiple?: boolean;
  /** Whether the user can change the order of a list. */
  readonly reorder?: boolean;
  /** The entities offered: one of the filters must accept an entity. */
  readonly filter?: readonly HaEntityFilter[];
}

/** The selector `select`. */
export interface HaSelectSelector {
  /** The values offered, with their labels. */
  readonly options: readonly SelectOption[];
  /** A list that opens, or every option shown as a radio button. */
  readonly mode: "dropdown" | "list";
}

/** A selector without options. */
export type HaEmptySelector = Readonly<Record<string, never>>;

/** The description of a selector of Home Assistant: an object with one key, the type of the selector, given to `ha-selector`. */
export type HaSelector =
  | {
      /** A switch. */
      readonly boolean: HaEmptySelector;
    }
  | {
      /** A number. */
      readonly number: HaNumberSelector;
    }
  | {
      /** A text. */
      readonly text: HaTextSelector;
    }
  | {
      /** One entity or several. */
      readonly entity: HaEntitySelector;
    }
  | {
      /** A choice. */
      readonly select: HaSelectSelector;
    }
  | {
      /** A duration. */
      readonly duration: HaEmptySelector;
    }
  | {
      /** A time of the day. */
      readonly time: HaEmptySelector;
    }
  | {
      /** A template. */
      readonly template: HaEmptySelector;
    };

/** The domains whose entities have a class of device. */
const CLASSED_DOMAINS: readonly string[] = ["sensor", "binary_sensor"];

/**
 * The filter of an entity field: the domains with a class of device keep only the entities of the classes asked for; the other
 * domains are accepted as they are.
 */
function entityFilter(field: EntityFilter): HaEntityFilter[] | undefined {
  const domains = field.domains ?? [];
  const classes = field.device_classes ?? [];
  if (classes.length === 0) {
    return domains.length === 0 ? undefined : [{ domain: [...domains] }];
  }
  const classedDomains = field.device_class_domains ?? CLASSED_DOMAINS;
  const withClass = domains.length === 0 ? [...classedDomains] : domains.filter((domain) => classedDomains.includes(domain));
  const without = domains.filter((domain) => !classedDomains.includes(domain));
  return [
    ...(withClass.length === 0 ? [] : [{ domain: withClass, device_class: [...classes] }]),
    ...(without.length === 0 ? [] : [{ domain: without }]),
  ];
}

/** A key with its value, or nothing when the value is `undefined`: a selector of Home Assistant reads an absent key as no limit. */
function optional<Key extends string, Value>(key: Key, value: Value | undefined): { readonly [K in Key]?: Value } {
  return (value === undefined ? {} : { [key]: value }) as { readonly [K in Key]?: Value };
}

/**
 * Return the selector of Home Assistant that shows a field.
 *
 * It is a pure function: it reads the definition only, so it can be tested without a browser.
 *
 * @param field - The definition of the field.
 * @returns The value of the property `selector` of `ha-selector`.
 */
export function selectorOf(field: FieldDefinition): HaSelector {
  switch (field.type) {
    case "boolean":
      return { boolean: {} };
    case "number":
    case "integer":
      return {
        number: {
          ...optional("min", field.min),
          ...optional("max", field.max),
          step: field.step ?? (field.type === "integer" ? 1 : "any"),
          mode: "box",
          ...optional("unit_of_measurement", field.unit),
        },
      };
    case "text":
      return { text: field.multiline === true ? { multiline: true } : {} };
    case "text_list":
      return { text: { multiple: true } };
    case "entity":
      return { entity: { ...optional("filter", entityFilter(field)) } };
    case "entity_list":
      return { entity: { multiple: true, reorder: field.reorder ?? true, ...optional("filter", entityFilter(field)) } };
    case "select":
      return { select: { options: field.options.map((option) => ({ value: option.value, label: option.label })), mode: field.mode ?? "dropdown" } };
    case "duration":
      return { duration: {} };
    case "time":
      return { time: {} };
    case "template":
      return { template: {} };
  }
}
