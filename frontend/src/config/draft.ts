/**
 * The draft of a configuration: the changes that the user made and has not saved yet.
 *
 * The changes are kept by tab, because the server saves a configuration tab by tab through the flow of Versatile Thermostat.
 * A value that comes back to the saved one is no longer a change. The preset temperatures are kept apart: they are not in the
 * flow, and they are applied after it.
 */

import { domainsOf } from "../native/fields.ts";
import type { FieldSpec } from "../native/schemas.ts";
import { creationFields } from "../native/tab-definitions.ts";
import type { ConfigApi, SaveError, SaveResponse, TabChanges } from "./api.ts";

/** The prefix of a key that changes a preset temperature, in the changes that a component proposes: `preset:eco_temp`. */
export const PRESET_PREFIX = "preset:";

/** Compare two values of a configuration, lists and objects included. */
export function sameValue(first: unknown, second: unknown): boolean {
  if (first === second) {
    return true;
  }
  if (first === null || second === null || first === undefined || second === undefined) {
    return (first ?? null) === (second ?? null);
  }
  if (typeof first !== "object" || typeof second !== "object") {
    return false;
  }
  return JSON.stringify(first) === JSON.stringify(second);
}

/**
 * What a value becomes in a field of another type of thermostat: itself, or nothing when the field cannot hold it. An entity is kept
 * when its domain is accepted, and a list keeps the entities that are accepted.
 */
function acceptedValue(field: FieldSpec, value: unknown): unknown {
  if (field.kind === "select" && field.options !== undefined && typeof value === "string") {
    return field.options.includes(value) ? value : undefined;
  }
  const domains = field.kind === "entity" ? domainsOf(field) : [];
  if (domains.length === 0) {
    return value;
  }
  const accepts = (entity: unknown): boolean => typeof entity === "string" && domains.includes(entity.split(".")[0] ?? "");
  if (Array.isArray(value)) {
    const entities = value.filter(accepts);
    return entities.length === 0 ? undefined : entities;
  }
  return accepts(value) ? value : undefined;
}

/** The outcome of a save, for the user. */
export interface SaveOutcome {
  /** Whether everything was saved: the configuration and every preset. */
  readonly ok: boolean;
  /** Whether the configuration of the flow was saved. */
  readonly configSaved: boolean;
  /** The errors that belong to no field, such as an incomplete configuration. */
  readonly generalErrors: readonly SaveError[];
}

/** The draft of the configuration of one entry. */
export class ConfigDraft {
  /** The entry that the draft changes. */
  readonly entryId: string;

  private saved: Record<string, unknown>;
  private savedPresets: Record<string, number | null>;
  private readonly changes = new Map<string, Map<string, unknown>>();
  private readonly presetChanges = new Map<string, number>();
  private errors: SaveError[] = [];
  private readonly listeners = new Set<() => void>();

  /**
   * @param entryId - The entry.
   * @param saved - The saved values of the configuration.
   * @param presets - The saved temperatures of the presets, by preset.
   */
  constructor(entryId: string, saved: Readonly<Record<string, unknown>>, presets: Readonly<Record<string, number | null>> = {}) {
    this.entryId = entryId;
    this.saved = { ...saved };
    this.savedPresets = { ...presets };
  }

  /** Be told when the draft changes. Returns the function that stops it. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** The values to show: the saved values with the changes of the draft. */
  values(): Readonly<Record<string, unknown>> {
    const merged: Record<string, unknown> = { ...this.saved };
    for (const tab of this.changes.values()) {
      for (const [key, value] of tab) {
        merged[key] = value;
      }
    }
    return merged;
  }

  /** The temperatures to show: the saved ones with the changes of the draft. */
  presets(): Readonly<Record<string, number | null>> {
    return { ...this.savedPresets, ...Object.fromEntries(this.presetChanges) };
  }

  /** The saved values, without the draft. */
  savedValues(): Readonly<Record<string, unknown>> {
    return this.saved;
  }

  /** Whether the draft has a change that is not saved. */
  get dirty(): boolean {
    return this.changes.size > 0 || this.presetChanges.size > 0;
  }

  /**
   * Change values of a tab. A value that equals the saved one is no longer a change.
   * A key that starts with `preset:` changes the temperature of a preset.
   *
   * @param tab - The tab of the flow that holds the values.
   * @param values - The new values, by key.
   */
  propose(tab: string, values: Readonly<Record<string, unknown>>): void {
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith(PRESET_PREFIX)) {
        const preset = key.slice(PRESET_PREFIX.length);
        if (typeof value === "number" && !sameValue(value, this.savedPresets[preset])) {
          this.presetChanges.set(preset, value);
        } else {
          this.presetChanges.delete(preset);
        }
        continue;
      }
      const tabChanges = this.changes.get(tab) ?? new Map<string, unknown>();
      if (sameValue(value, this.saved[key])) {
        tabChanges.delete(key);
      } else {
        tabChanges.set(key, value);
      }
      if (tabChanges.size === 0) {
        this.changes.delete(tab);
      } else {
        this.changes.set(tab, tabChanges);
      }
    }
    this.notify();
  }

  /** Forget the changes: the fields show the saved values again. */
  discard(): void {
    this.changes.clear();
    this.presetChanges.clear();
    this.errors = [];
    this.notify();
  }

  /** The changes by tab, as the server takes them. */
  tabChanges(): TabChanges {
    return Object.fromEntries([...this.changes].map(([tab, values]) => [tab, Object.fromEntries(values)]));
  }

  /** The errors of a tab, by key. The error of the whole tab is on the key `base`. The errors of the presets are on the tab `presets`. */
  errorsOf(tab: string): Readonly<Record<string, string>> {
    return Object.fromEntries(this.errors.filter((error) => error.tab === tab).map((error) => [error.field, error.code]));
  }

  /** The errors that belong to no tab. */
  generalErrors(): readonly SaveError[] {
    return this.errors.filter((error) => error.tab === null);
  }

  /** Every error of the last save. */
  allErrors(): readonly SaveError[] {
    return this.errors;
  }

  /**
   * Save the draft: the tabs through the flow, all together or not at all, then the presets.
   *
   * After a save, the draft keeps what could not be saved: everything when the configuration was refused, the failed presets otherwise.
   *
   * @param api - The commands of the configuration.
   */
  async save(api: ConfigApi): Promise<SaveOutcome> {
    const response: SaveResponse = await api.save(this.entryId, this.tabChanges(), Object.fromEntries(this.presetChanges));
    this.errors = [...response.errors, ...response.preset_errors];
    if (response.config_saved) {
      this.saved = { ...this.saved, ...Object.fromEntries([...this.changes.values()].flatMap((values) => [...values])) };
      this.changes.clear();
      const failed = new Set(response.preset_errors.map((error) => error.field));
      for (const [preset, value] of [...this.presetChanges]) {
        if (!failed.has(preset)) {
          this.savedPresets[preset] = value;
          this.presetChanges.delete(preset);
        }
      }
    }
    this.notify();
    return { ok: response.ok, configSaved: response.config_saved, generalErrors: this.generalErrors() };
  }

  /**
   * Change the type of the thermostat that a creation makes. A value that the new type accepts stays in the draft: its field must be
   * in a section of the creation of the new type, and an entity must have an accepted domain. The other values are dropped.
   *
   * @param type - The new `thermostat_type`.
   */
  changeType(type: string): void {
    const previous = [...this.changes.values()].flatMap((values) => [...values]);
    this.saved = { ...this.saved, thermostat_type: type };
    const accepted = creationFields("thermostat", { ...this.saved, ...Object.fromEntries(previous) });
    this.changes.clear();
    for (const [key, value] of previous) {
      const field = accepted.get(key);
      const next = field === undefined ? undefined : acceptedValue(field.field, value);
      if (field !== undefined && next !== undefined && !sameValue(next, this.saved[key])) {
        this.changes.set(field.tab, new Map([...(this.changes.get(field.tab) ?? []), [key, next]]));
      }
    }
    this.errors = [];
    this.notify();
  }

  /** Show errors that do not come from a save of the draft, such as the errors of a creation. */
  setErrors(errors: readonly SaveError[]): void {
    this.errors = [...errors];
    this.notify();
  }

  /** Replace the saved values, after the configuration was read again from the server. The changes of the draft are kept. */
  refresh(saved: Readonly<Record<string, unknown>>, presets: Readonly<Record<string, number | null>> = this.savedPresets): void {
    this.saved = { ...saved };
    this.savedPresets = { ...presets };
    this.notify();
  }
}
