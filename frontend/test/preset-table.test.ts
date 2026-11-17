/** The model of the table of the preset temperatures. */
import { describe, expect, it } from "vitest";

import type { PresetData } from "../src/config/api.ts";
import { buildPresetGrid, parseTemperature, presetOrderWarnings, splitPresetName } from "../src/native/preset-table.ts";

const preset = (name: string, value: number | null): PresetData => ({ preset: name, entity_id: `number.${name}`, value, min: 7, max: 35, step: 0.5, unit: "°C" });
const PREFIX = "preset:";
const simple = [preset("frost_temp", 7), preset("eco_temp", 17), preset("comfort_temp", 20), preset("boost_temp", 22)];

describe("the grid of the presets", () => {
  it("splits the names into a row and a situation", () => {
    expect(splitPresetName("eco_temp")).toEqual({ row: "eco", situation: "normal" });
    expect(splitPresetName("comfort_away_temp")).toEqual({ row: "comfort", situation: "away" });
    expect(splitPresetName("boost_ac_temp")).toEqual({ row: "boost", situation: "ac" });
    expect(splitPresetName("frost_ac_away_temp")).toEqual({ row: "frost", situation: "ac_away" });
  });

  it("has only the normal column and four rows for a simple thermostat", () => {
    const grid = buildPresetGrid(simple, {}, false, PREFIX);
    expect(grid.columns).toEqual(["normal"]);
    expect(grid.rows.map((row) => row.id)).toEqual(["frost", "eco", "comfort", "boost"]);
    expect(grid.emptyColumns).toEqual([]);
  });

  it("has the four columns with presence and cooling, and a missing entity has no cell", () => {
    const data = [...simple, preset("eco_ac_temp", 26), preset("comfort_ac_away_temp", 27)];
    const grid = buildPresetGrid(data, { use_presence_feature: true, ac_mode: true }, false, PREFIX);
    expect(grid.columns).toEqual(["normal", "away", "ac", "ac_away"]);
    expect(grid.rows.find((row) => row.id === "frost")?.cells.ac).toBeUndefined();
    expect(grid.rows.find((row) => row.id === "eco")?.cells.ac?.value).toBe(26);
  });

  it("shows a column that the draft turned on before the save, without cells", () => {
    const grid = buildPresetGrid(simple, { use_presence_feature: true }, false, PREFIX);
    expect(grid.columns).toEqual(["normal", "away"]);
    expect(grid.emptyColumns).toEqual(["away"]);
  });

  it("has every column in the general configuration, and takes the temperature of the draft", () => {
    const grid = buildPresetGrid(simple, { "preset:eco_temp": 18.5 }, true, PREFIX);
    expect(grid.columns).toEqual(["normal", "away", "ac", "ac_away"]);
    expect(grid.rows.find((row) => row.id === "eco")?.cells.normal?.value).toBe(18.5);
  });

  it("adds a preset that it does not know as an extra row", () => {
    const grid = buildPresetGrid([...simple, preset("sleep_temp", 16)], {}, false, PREFIX);
    expect(grid.rows.map((row) => row.id)).toEqual(["frost", "eco", "comfort", "boost", "sleep"]);
  });
});

describe("the warnings of the order", () => {
  it("names eco and comfort when eco is warmer", () => {
    const grid = buildPresetGrid(simple, { "preset:eco_temp": 21, "preset:comfort_temp": 20 }, false, PREFIX);
    expect(presetOrderWarnings(grid)).toEqual([{ situation: "normal", first: "eco", second: "comfort", cooling: false }]);
  });

  it("has no warning when the order is respected, and skips the values that are unknown", () => {
    expect(presetOrderWarnings(buildPresetGrid(simple, {}, false, PREFIX))).toEqual([]);
    const skipped = [preset("frost_temp", null), preset("eco_temp", 17), preset("comfort_temp", 20), preset("boost_temp", 22)];
    expect(presetOrderWarnings(buildPresetGrid(skipped, {}, false, PREFIX))).toEqual([]);
  });

  it("expects the opposite order in cooling", () => {
    const data = [preset("eco_ac_temp", 24), preset("comfort_ac_temp", 26), preset("boost_ac_temp", 22)];
    const grid = buildPresetGrid(data, { ac_mode: true }, false, PREFIX);
    expect(presetOrderWarnings(grid)).toEqual([{ situation: "ac", first: "eco", second: "comfort", cooling: true }]);
    const ordered = buildPresetGrid([preset("eco_ac_temp", 27), preset("comfort_ac_temp", 26), preset("boost_ac_temp", 22)], { ac_mode: true }, false, PREFIX);
    expect(presetOrderWarnings(ordered)).toEqual([]);
  });
});

describe("the reading of a typed temperature", () => {
  const limits = { min: 7, max: 35 };

  it("accepts the comma and the point", () => {
    expect(parseTemperature("19,5", limits)).toEqual({ value: 19.5 });
    expect(parseTemperature(" 19.5 ", limits)).toEqual({ value: 19.5 });
  });

  it("refuses an empty text, a text that is not a number and a value beyond the limits", () => {
    expect(parseTemperature("", limits)).toEqual({ error: "empty" });
    expect(parseTemperature("abc", limits)).toEqual({ error: "not_a_number" });
    expect(parseTemperature("36", limits)).toEqual({ error: "out_of_range" });
    expect(parseTemperature("6.9", limits)).toEqual({ error: "out_of_range" });
    expect(parseTemperature("36", { min: null, max: null })).toEqual({ value: 36 });
  });
});
