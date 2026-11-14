import { describe, expect, it } from "vitest";

import { autoTpiDefaults, defaultOf, entityChoices, formatInput, missingRequired, parseInput, shownValue } from "../src/native/fields.ts";
import type { FieldSpec } from "../src/native/schemas.ts";
import { fieldsOf } from "../src/native/schemas.ts";

const field = (key: string, schema: Parameters<typeof fieldsOf>[0]): FieldSpec => fieldsOf(schema).find((candidate) => candidate.key === key) as FieldSpec;

describe("defaults", () => {
  it("gives the temperatures of Celsius by default, and those of Fahrenheit for °F", () => {
    const min = field("temp_min", "STEP_CENTRAL_MAIN_DATA_SCHEMA");
    const max = field("temp_max", "STEP_CENTRAL_MAIN_DATA_SCHEMA");
    const step = field("step_temperature", "STEP_CENTRAL_MAIN_DATA_SCHEMA");
    expect([defaultOf(min, "°C"), defaultOf(max, "°C"), defaultOf(step, "°C")]).toEqual([7, 35, 0.1]);
    expect([defaultOf(min, "°F"), defaultOf(max, "°F"), defaultOf(step, "°F")]).toEqual([45, 95, 1.0]);
    expect(defaultOf(min, undefined)).toBe(7);
  });

  it("gives the defaults of the forms of Versatile Thermostat", () => {
    expect(defaultOf(field("cycle_min", "STEP_MAIN_DATA_SCHEMA"), "°C")).toBe(5);
    expect(defaultOf(field("tpi_coef_int", "STEP_CENTRAL_TPI_DATA_SCHEMA"), "°C")).toBe(0.6);
    expect(defaultOf(field("auto_regulation_mode", "STEP_THERMOSTAT_CLIMATE"), "°C")).toBe("auto_regulation_none");
  });

  it("shows the value of the configuration, and the default when there is none", () => {
    const cycle = field("cycle_min", "STEP_MAIN_DATA_SCHEMA");
    expect(shownValue(cycle, { cycle_min: 8 }, "°C")).toBe(8);
    expect(shownValue(cycle, {}, "°C")).toBe(5);
    expect(shownValue(cycle, { cycle_min: null }, "°C")).toBe(5);
  });
});

describe("inputs", () => {
  it("turns what the user typed into values", () => {
    expect(parseInput(field("cycle_min", "STEP_MAIN_DATA_SCHEMA"), "8")).toBe(8);
    expect(parseInput(field("tpi_coef_int", "STEP_CENTRAL_TPI_DATA_SCHEMA"), "0,7")).toBe(0.7);
    expect(parseInput(field("minimal_activation_delay", "STEP_CENTRAL_TPI_DATA_SCHEMA"), "12")).toBe(12);
    expect(parseInput(field("lock_users", "STEP_CENTRAL_LOCK_DATA_SCHEMA"), true)).toBe(true);
    expect(parseInput(field("lock_code", "STEP_CENTRAL_LOCK_DATA_SCHEMA"), "  ")).toBeNull();
    expect(parseInput(field("underlying_entity_ids", "STEP_THERMOSTAT_CLIMATE"), "climate.a\n\nclimate.b, climate.c")).toEqual(["climate.a", "climate.b", "climate.c"]);
  });

  it("keeps a text that is not a number, so that the server says what is wrong", () => {
    expect(parseInput(field("cycle_min", "STEP_MAIN_DATA_SCHEMA"), "often")).toBe("often");
    expect(parseInput(field("minimal_activation_delay", "STEP_CENTRAL_TPI_DATA_SCHEMA"), "1.5")).toBe("1.5");
  });

  it("writes a value into an input", () => {
    expect(formatInput(field("underlying_entity_ids", "STEP_THERMOSTAT_CLIMATE"), ["climate.a", "climate.b"])).toBe("climate.a\nclimate.b");
    expect(formatInput(field("cycle_min", "STEP_MAIN_DATA_SCHEMA"), null)).toBe("");
    expect(formatInput(field("cycle_min", "STEP_MAIN_DATA_SCHEMA"), 5)).toBe("5");
  });
});

describe("entities", () => {
  it("offers the entities of the domains that the field accepts", () => {
    const entities = ["climate.salon", "switch.heater", "sensor.temp", "input_number.t", "binary_sensor.window"];
    expect(entityChoices(field("underlying_entity_ids", "STEP_THERMOSTAT_CLIMATE"), entities)).toEqual(["climate.salon"]);
    expect(entityChoices(field("external_temperature_sensor_entity_id", "STEP_CENTRAL_MAIN_DATA_SCHEMA"), entities)).toEqual(["input_number.t", "sensor.temp"]);
  });
});

describe("required fields", () => {
  it("lists the required fields that have no value and no default", () => {
    const main = fieldsOf("STEP_MAIN_DATA_SCHEMA");
    expect(missingRequired(main, {}).map((item) => item.key)).toEqual(["name", "temperature_sensor_entity_id"]);
    expect(missingRequired(main, { name: "Salon", temperature_sensor_entity_id: "sensor.t" })).toEqual([]);
    expect(missingRequired(fieldsOf("STEP_THERMOSTAT_CLIMATE"), { underlying_entity_ids: [] }).map((item) => item.key)).toEqual(["underlying_entity_ids"]);
  });
});

describe("Auto TPI", () => {
  it("gives the values of Versatile Thermostat for each type of learning", () => {
    expect(autoTpiDefaults("discovery")).toEqual({ auto_tpi_calculation_method: "average", auto_tpi_avg_initial_weight: 1 });
    expect(autoTpiDefaults("fine_tuning")).toEqual({ auto_tpi_calculation_method: "ema", auto_tpi_ema_alpha: 0.08, auto_tpi_ema_decay_rate: 0.12 });
    expect(autoTpiDefaults("other")).toEqual({});
  });

  it("matches the defaults of the advanced EMA form of Versatile Thermostat", () => {
    const ema = fieldsOf("STEP_AUTO_TPI_EMA_SETTINGS_SCHEMA");
    expect(Object.fromEntries(ema.map((item) => [item.key, [item.default, item.min, item.max]]))).toMatchObject({ auto_tpi_continuous_kext_alpha: [0.04, 0.005, 0.2] });
  });
});
