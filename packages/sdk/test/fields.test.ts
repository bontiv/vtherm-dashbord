import { describe, expect, it } from "vitest";

import { selectorOf } from "../src/index.ts";
import type { FieldDefinition } from "../src/index.ts";

describe("the selector of a field", () => {
  it("shows a boolean with a switch", () => {
    expect(selectorOf({ type: "boolean", key: "on" })).toEqual({ boolean: {} });
  });

  it("shows a number in a box, with its limits, its step and its unit", () => {
    expect(selectorOf({ type: "number", key: "delay", min: 0, max: 600, step: 1, unit: "s" })).toEqual({ number: { min: 0, max: 600, step: 1, mode: "box", unit_of_measurement: "s" } });
    // Without a step, a number accepts any value and an integer goes by one; an absent limit is not given.
    expect(selectorOf({ type: "number", key: "ratio" })).toEqual({ number: { step: "any", mode: "box" } });
    expect(selectorOf({ type: "integer", key: "cycle", min: 1, unit: "min" })).toEqual({ number: { min: 1, step: 1, mode: "box", unit_of_measurement: "min" } });
  });

  it("shows a text on one line or on several", () => {
    expect(selectorOf({ type: "text", key: "name" })).toEqual({ text: {} });
    expect(selectorOf({ type: "text", key: "notes", multiline: true })).toEqual({ text: { multiline: true } });
  });

  it("shows a list of texts", () => {
    expect(selectorOf({ type: "text_list", key: "tags" })).toEqual({ text: { multiple: true } });
  });

  it("filters an entity by its domains, and by the class of the device for the domains that have one", () => {
    expect(selectorOf({ type: "entity", key: "temperature", domains: ["sensor", "input_number", "number"], device_classes: ["temperature"] })).toEqual({
      entity: { filter: [{ domain: ["sensor"], device_class: ["temperature"] }, { domain: ["input_number", "number"] }] },
    });
    expect(selectorOf({ type: "entity", key: "window", domains: ["binary_sensor", "input_boolean"] })).toEqual({ entity: { filter: [{ domain: ["binary_sensor", "input_boolean"] }] } });
    expect(selectorOf({ type: "entity", key: "any" })).toEqual({ entity: {} });
  });

  it("shows a list of entities that the user can put in order", () => {
    expect(selectorOf({ type: "entity_list", key: "underlyings", domains: ["climate"] })).toEqual({ entity: { multiple: true, reorder: true, filter: [{ domain: ["climate"] }] } });
    expect(selectorOf({ type: "entity_list", key: "set", domains: ["light"], reorder: false })).toEqual({ entity: { multiple: true, reorder: false, filter: [{ domain: ["light"] }] } });
  });

  it("shows a choice with its translated options, in a list or as buttons", () => {
    const options = [
      { value: "turn_off", label: "Turn off" },
      { value: "eco", label: "Eco" },
    ];
    expect(selectorOf({ type: "select", key: "action", options })).toEqual({ select: { options, mode: "dropdown" } });
    expect(selectorOf({ type: "select", key: "action", options, mode: "list" })).toEqual({ select: { options, mode: "list" } });
  });

  it("shows a duration, a time and a template with their own selectors", () => {
    expect(selectorOf({ type: "duration", key: "d" })).toEqual({ duration: {} });
    expect(selectorOf({ type: "time", key: "t" })).toEqual({ time: {} });
    expect(selectorOf({ type: "template", key: "tpl" })).toEqual({ template: {} });
  });

  it("refuses a type of field that the contract does not have, when it compiles", () => {
    // @ts-expect-error The type `color` is not a type of field.
    const field: FieldDefinition = { type: "color", key: "c" };
    expect(field.type).toBe("color");
  });
});
