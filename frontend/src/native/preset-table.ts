/**
 * The model of the table of the preset temperatures: one row for each preset, one column for each situation.
 *
 * Kept apart from the drawing, so that the rules can be tested.
 */

import type { PresetData } from "../config/api.ts";

/** The situations of a preset, which are the columns of the table. */
export type Situation = "normal" | "away" | "ac" | "ac_away";

/** The columns, in order. */
export const SITUATIONS: readonly Situation[] = ["normal", "away", "ac", "ac_away"];

/** The presets that have a known order, from the coldest to the warmest in heating. */
export const ORDERED_PRESETS: readonly string[] = ["frost", "eco", "comfort", "boost"];

/** A cell that has a preset entity: the entity, and the temperature that the draft gives. */
export interface PresetCell {
  readonly data: PresetData;
  readonly value: number | null;
}

/** A row of the table: a preset, with its cell for each situation that has an entity. */
export interface PresetRow {
  /** The name of the preset without its situation, for example `eco`. */
  readonly id: string;
  readonly cells: Readonly<Partial<Record<Situation, PresetCell>>>;
}

/** The table. */
export interface PresetGrid {
  readonly columns: readonly Situation[];
  readonly rows: readonly PresetRow[];
  /** The columns that no entity backs yet, for example a column that the draft turned on before a save. */
  readonly emptyColumns: readonly Situation[];
}

/** The order that is not respected in a column. `first` should not be warmer (cooling: cooler) than `second`. */
export interface OrderWarning {
  readonly situation: Situation;
  readonly first: string;
  readonly second: string;
  /** Whether the column is a cooling column, where the expected order is the opposite. */
  readonly cooling: boolean;
}

const NAME = /^(.+?)(_ac)?(_away)?_temp$/;

/** Split the name of a preset, for example `eco_ac_away_temp`, into its row and its situation. A name that does not fit is its own row. */
export function splitPresetName(name: string): { readonly row: string; readonly situation: Situation } {
  const match = NAME.exec(name);
  if (match === null) {
    return { row: name, situation: "normal" };
  }
  const ac = match[2] !== undefined;
  const away = match[3] !== undefined;
  return { row: match[1] as string, situation: ac ? (away ? "ac_away" : "ac") : away ? "away" : "normal" };
}

/**
 * Build the table.
 *
 * @param data - The presets that Versatile Thermostat exposes.
 * @param values - The values of the draft, with the temperatures under the keys `preset:<name>`.
 * @param central - Whether the table is the one of the general configuration, which has every column.
 */
export function buildPresetGrid(data: readonly PresetData[], values: Readonly<Record<string, unknown>>, central: boolean, prefix: string): PresetGrid {
  const presence = central || values["use_presence_feature"] === true;
  const ac = central || values["ac_mode"] === true;
  const columns = SITUATIONS.filter((situation) => (situation === "normal" ? true : situation === "away" ? presence : situation === "ac" ? ac : presence && ac));
  const found = new Map<string, Partial<Record<Situation, PresetCell>>>();
  for (const preset of data) {
    const { row, situation } = splitPresetName(preset.preset);
    const draft = values[`${prefix}${preset.preset}`];
    const value = typeof draft === "number" ? draft : preset.value;
    found.set(row, { ...found.get(row), [situation]: { data: preset, value } });
  }
  // A preset that Versatile Thermostat adds later and that this table does not know is added as a row, so that nothing is lost.
  const ids = [...ORDERED_PRESETS, ...[...found.keys()].filter((id) => !ORDERED_PRESETS.includes(id)).sort()];
  const rows = ids.map((id) => ({ id, cells: found.get(id) ?? {} }));
  const emptyColumns = columns.filter((situation) => !data.some((preset) => splitPresetName(preset.preset).situation === situation));
  return { columns, rows, emptyColumns };
}

/**
 * Find the columns where the order of the presets is not the expected one: frost, eco, comfort, boost from the coldest to the warmest in
 * heating, and the opposite in cooling. Only the values that are known are compared, each with the previous known one.
 */
export function presetOrderWarnings(grid: PresetGrid): readonly OrderWarning[] {
  const warnings: OrderWarning[] = [];
  for (const situation of grid.columns) {
    const cooling = situation === "ac" || situation === "ac_away";
    let previous: { readonly id: string; readonly value: number } | undefined;
    for (const id of ORDERED_PRESETS) {
      const value = grid.rows.find((row) => row.id === id)?.cells[situation]?.value;
      if (value === undefined || value === null) {
        continue;
      }
      if (previous !== undefined && (cooling ? previous.value < value : previous.value > value)) {
        warnings.push({ situation, first: previous.id, second: id, cooling });
      }
      previous = { id, value };
    }
  }
  return warnings;
}

/** The result of the reading of a typed temperature: a number, or the reason why it is refused. */
export type ParsedTemperature = { readonly value: number } | { readonly error: "empty" | "not_a_number" | "out_of_range" };

/**
 * Read a typed temperature. The comma and the point are both accepted as the decimal separator.
 *
 * @param text - What the user typed.
 * @param preset - The entity, which gives the limits.
 */
export function parseTemperature(text: string, preset: Pick<PresetData, "min" | "max">): ParsedTemperature {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { error: "empty" };
  }
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value)) {
    return { error: "not_a_number" };
  }
  return (preset.min !== null && value < preset.min) || (preset.max !== null && value > preset.max) ? { error: "out_of_range" } : { value };
}
