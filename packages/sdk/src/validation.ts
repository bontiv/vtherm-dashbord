/**
 * Validation of a plugin definition.
 *
 * The same rules are used by `registerUiPlugin`, by the dashboard and by the test harness, so a plugin cannot be
 * accepted by one and refused by another. The definition is checked at run time, because a plugin can be written
 * in plain JavaScript and TypeScript types do not exist then.
 */

import { HOOK_NAMES, WIDGET_COLUMNS, WIDGET_ROWS } from "./types.js";
import type { HookName, UiPluginDefinition } from "./types.js";

/** A problem found in a definition. */
export interface ValidationIssue {
  /** The path of the faulty element, for example `contributions.thermostat_config[0].id`. */
  readonly path: string;
  /** What is wrong. */
  readonly message: string;
}

/** The error of a definition that is not valid. Its message lists every issue with its path. */
export class UiPluginValidationError extends Error {
  /** The problems of the definition. */
  readonly issues: readonly ValidationIssue[];

  /**
   * @param issues - The problems of the definition.
   */
  constructor(issues: readonly ValidationIssue[]) {
    super(`The plugin definition is not valid:\n${issues.map((issue) => `  ${issue.path}: ${issue.message}`).join("\n")}`);
    this.name = "UiPluginValidationError";
    this.issues = issues;
  }
}

/** The hooks whose contributions have an entry in the navigation and so need a title. */
const NAVIGATION_HOOKS: readonly HookName[] = ["top_tab", "tab_page", "global_page", "general_config", "thermostat_config"];

/** The hooks whose contributions show a custom element. */
const COMPONENT_HOOKS: readonly HookName[] = ["tab_page", "global_page", "global_widget", "general_config", "thermostat_config", "thermostat_widget"];

/** The forms of a placement. `first` and `last` take `true`, the others take the identifier of a contribution. */
const PLACEMENT_FORMS = ["first", "last", "before", "after", "replace", "remove"] as const;

/** The keys that would be a numeric order. They are refused: the order is only declared with a placement. */
const ORDER_KEYS = ["order", "priority", "position", "weight"] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function describe(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function checkPlacement(placement: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!isRecord(placement)) {
    issues.push({ path, message: "The placement must be an object with one form: first, last, before, after, replace or remove" });
    return false;
  }
  const keys = Object.keys(placement);
  const unknown = keys.filter((key) => !(PLACEMENT_FORMS as readonly string[]).includes(key));
  for (const key of unknown) {
    issues.push({ path: `${path}.${key}`, message: `Unknown placement form '${key}', expected one of ${PLACEMENT_FORMS.join(", ")}. A numeric order is not supported` });
  }
  const forms = keys.filter((key) => (PLACEMENT_FORMS as readonly string[]).includes(key));
  if (forms.length !== 1) {
    issues.push({ path, message: `A placement has exactly one form, found ${forms.length === 0 ? "none" : forms.join(" and ")}` });
    return false;
  }
  const form = forms[0] as (typeof PLACEMENT_FORMS)[number];
  const value = placement[form];
  if ((form === "first" || form === "last") && value !== true) {
    issues.push({ path: `${path}.${form}`, message: `The value of '${form}' must be true, got ${describe(value)}` });
    return false;
  }
  if (form !== "first" && form !== "last" && !isText(value)) {
    issues.push({ path: `${path}.${form}`, message: `The value of '${form}' must be the identifier of a contribution, got ${describe(value)}` });
    return false;
  }
  return unknown.length === 0;
}

function checkOptionalText(contribution: UnknownRecord, key: string, path: string, issues: ValidationIssue[]): void {
  if (key in contribution && !isText(contribution[key])) {
    issues.push({ path: `${path}.${key}`, message: `'${key}' must be a non-empty string, got ${describe(contribution[key])}` });
  }
}

function checkRequiredText(contribution: UnknownRecord, key: string, path: string, issues: ValidationIssue[], hint: string): void {
  if (!isText(contribution[key])) {
    issues.push({ path: `${path}.${key}`, message: `'${key}' is required: ${hint}` });
  }
}

/** The hooks whose contributions edit a configuration, and can declare who draws their save actions. */
const CONFIG_HOOKS: readonly HookName[] = ["general_config", "thermostat_config"];

function checkSaveActions(hook: HookName, value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!CONFIG_HOOKS.includes(hook)) {
    issues.push({ path, message: `'save_actions' is only accepted by the contributions of ${CONFIG_HOOKS.join(" and ")}` });
  } else if (value !== "component" && value !== "dashboard") {
    issues.push({ path, message: `'save_actions' must be "component" or "dashboard", got ${describe(value)}` });
  }
}

/** Check a field that only the configuration contributions accept: on another hook it is refused, otherwise `problem` is reported. */
function checkConfigField(hook: HookName, name: string, path: string, issues: ValidationIssue[], problem: string | undefined): void {
  if (!CONFIG_HOOKS.includes(hook)) {
    issues.push({ path: `${path}.${name}`, message: `'${name}' is only accepted by the contributions of ${CONFIG_HOOKS.join(" and ")}` });
  } else if (problem !== undefined) {
    issues.push({ path: `${path}.${name}`, message: problem });
  }
}

/** The hooks whose contributions are widgets, and can declare a size. */
const WIDGET_HOOKS: readonly HookName[] = ["global_widget", "thermostat_widget"];

/** The keys of a widget size. */
const SIZE_KEYS = ["columns", "rows"] as const;

function checkSize(hook: HookName, size: unknown, path: string, issues: ValidationIssue[]): void {
  if (!WIDGET_HOOKS.includes(hook)) {
    issues.push({ path, message: `'size' is only accepted by the contributions of ${WIDGET_HOOKS.join(" and ")}` });
    return;
  }
  if (!isRecord(size)) {
    issues.push({ path, message: `'size' must be an object with 'columns' and 'rows', got ${describe(size)}` });
    return;
  }
  for (const key of Object.keys(size).filter((name) => !(SIZE_KEYS as readonly string[]).includes(name))) {
    issues.push({ path: `${path}.${key}`, message: `Unknown key '${key}' of 'size', expected ${SIZE_KEYS.join(" or ")}` });
  }
  if ("columns" in size && !(WIDGET_COLUMNS as readonly unknown[]).includes(size["columns"])) {
    issues.push({ path: `${path}.columns`, message: `'columns' must be 1, 2, 3 or "full", got ${describe(size["columns"])}` });
  }
  if ("rows" in size && !(WIDGET_ROWS as readonly unknown[]).includes(size["rows"])) {
    issues.push({ path: `${path}.rows`, message: `'rows' must be 1, 2 or 3, got ${describe(size["rows"])}` });
  }
}

function checkContribution(pluginId: string, hook: HookName, contribution: unknown, path: string, issues: ValidationIssue[]): string | undefined {
  if (!isRecord(contribution)) {
    issues.push({ path, message: "A contribution must be an object" });
    return undefined;
  }
  const prefix = `${pluginId}.`;
  const id = contribution["id"];
  if (!isText(id)) {
    issues.push({ path: `${path}.id`, message: "'id' is required and must be a non-empty string" });
  } else if (!id.startsWith(prefix) || id.length === prefix.length) {
    issues.push({ path: `${path}.id`, message: `The identifier ${describe(id)} must start with the identifier of the plugin and a dot, followed by a name (${prefix}<name>)` });
  }

  for (const key of ORDER_KEYS) {
    if (key in contribution) {
      issues.push({ path: `${path}.${key}`, message: "A numeric order is not supported, declare the position with 'placement'" });
    }
  }

  let isRemoval = false;
  if ("placement" in contribution) {
    checkPlacement(contribution["placement"], `${path}.placement`, issues);
    isRemoval = isRecord(contribution["placement"]) && "remove" in contribution["placement"];
  }
  if ("on_missing" in contribution && contribution["on_missing"] !== "last" && contribution["on_missing"] !== "skip") {
    issues.push({ path: `${path}.on_missing`, message: `'on_missing' must be "last" or "skip", got ${describe(contribution["on_missing"])}` });
  }
  if ("visible" in contribution && typeof contribution["visible"] !== "function") {
    issues.push({ path: `${path}.visible`, message: "'visible' must be a function" });
  }

  // A removal shows nothing, so it needs neither a title nor a component.
  if (!isRemoval) {
    if (NAVIGATION_HOOKS.includes(hook)) {
      checkRequiredText(contribution, "title", path, issues, "the key of the title in the translation catalog of the plugin");
    }
    if (COMPONENT_HOOKS.includes(hook)) {
      checkRequiredText(contribution, "component", path, issues, "the tag name of the custom element");
    }
    if (hook === "tab_page") {
      checkRequiredText(contribution, "tab", path, issues, "the identifier of the top tab where the entry is shown");
    }
    if (hook === "top_tab" && "zone" in contribution && contribution["zone"] !== "start" && contribution["zone"] !== "end") {
      issues.push({ path: `${path}.zone`, message: `'zone' must be "start" or "end", got ${describe(contribution["zone"])}` });
    }
    if ("save_actions" in contribution) {
      checkSaveActions(hook, contribution["save_actions"], `${path}.save_actions`, issues);
    }
    if ("status" in contribution) {
      checkConfigField(hook, "status", path, issues, typeof contribution["status"] === "function" ? undefined : "'status' must be a function");
    }
    if ("feature" in contribution) {
      checkConfigField(hook, "feature", path, issues, isText(contribution["feature"]) ? undefined : "'feature' must be a non-empty string: the key of the value that turns the feature on");
    }
    if ("size" in contribution) {
      checkSize(hook, contribution["size"], `${path}.size`, issues);
    }
    checkOptionalText(contribution, "icon", path, issues);
    checkOptionalText(contribution, "group", path, issues);
  }
  return isText(id) ? id : undefined;
}

/**
 * Check a plugin definition.
 *
 * @param definition - The value given to `registerUiPlugin`.
 * @returns The problems found, with the path of each faulty element. The list is empty when the definition is valid.
 */
export function validateDefinition(definition: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(definition)) {
    return [{ path: "definition", message: "The definition must be an object with an 'id' and 'contributions'" }];
  }
  const pluginId = definition["id"];
  if (!isText(pluginId)) {
    issues.push({ path: "id", message: "'id' is required and must be a non-empty string" });
  }
  const translations = definition["translations"];
  if (!isRecord(translations) || !isRecord(translations["english"])) {
    issues.push({ path: "translations", message: "'translations' is required and must be made with defineTranslations: a plugin needs at least an English catalog" });
  }
  const contributions = definition["contributions"];
  if (!isRecord(contributions)) {
    issues.push({ path: "contributions", message: "'contributions' is required and must be an object with the contributions by hook" });
    return issues;
  }
  for (const [hook, list] of Object.entries(contributions)) {
    if (!(HOOK_NAMES as readonly string[]).includes(hook)) {
      issues.push({ path: `contributions.${hook}`, message: `Unknown hook '${hook}', expected one of ${HOOK_NAMES.join(", ")}` });
      continue;
    }
    if (!Array.isArray(list)) {
      issues.push({ path: `contributions.${hook}`, message: "The contributions of a hook must be a list" });
      continue;
    }
    const seen = new Map<string, number>();
    list.forEach((contribution: unknown, index: number) => {
      const path = `contributions.${hook}[${index}]`;
      const id = checkContribution(isText(pluginId) ? pluginId : "", hook as HookName, contribution, path, issues);
      if (id !== undefined) {
        const first = seen.get(id);
        if (first !== undefined) {
          issues.push({ path: `${path}.id`, message: `The identifier ${describe(id)} is already used by contributions.${hook}[${first}]` });
        } else {
          seen.set(id, index);
        }
      }
    });
  }
  return issues;
}

/**
 * Check a plugin definition and refuse it when it is not valid.
 *
 * @param definition - The value given to `registerUiPlugin`.
 * @throws {@link UiPluginValidationError} when the definition has at least one problem.
 */
export function assertValidDefinition(definition: unknown): asserts definition is UiPluginDefinition {
  const issues = validateDefinition(definition);
  if (issues.length > 0) {
    throw new UiPluginValidationError(issues);
  }
}
