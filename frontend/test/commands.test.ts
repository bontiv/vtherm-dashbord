/** The commands of the underlyings of a thermostat on switch and the services of the central boiler, as they are stored. */
import { describe, expect, it } from "vitest";

import { commandsByUnderlying, formatBoilerService, formatCommand, needsCommands, parseBoilerService, parseCommand, storedCommands } from "../src/native/commands.ts";

describe("a command of an underlying", () => {
  it("reads the service, and the attribute with its value", () => {
    expect(parseCommand("select_option/option:comfort")).toEqual({ service: "select_option", attribute: "option:comfort" });
    expect(parseCommand("set_hvac_mode/hvac_mode:heat")).toEqual({ service: "set_hvac_mode", attribute: "hvac_mode:heat" });
    expect(parseCommand("turn_on")).toEqual({ service: "turn_on", attribute: "" });
    expect(parseCommand("press/x")).toEqual({ service: "press", attribute: "x" });
  });

  it("refuses a text that does not have the format, so that it is shown as it is", () => {
    expect(parseCommand("turn on")).toBeUndefined();
    expect(parseCommand("select_option/option: eco")).toBeUndefined();
    expect(parseCommand("")).toBeUndefined();
  });

  it("writes the command back, and nothing without a service", () => {
    expect(formatCommand({ service: "select_option", attribute: "option:comfort" })).toBe("select_option/option:comfort");
    expect(formatCommand({ service: "turn_off", attribute: " " })).toBe("turn_off");
    expect(formatCommand({ service: "", attribute: "option:eco" })).toBe("");
  });
});

describe("the commands of the underlyings", () => {
  it("keeps each command in front of its underlying", () => {
    expect(commandsByUnderlying(["turn_on"], 3)).toEqual(["turn_on", "", ""]);
    expect(commandsByUnderlying(undefined, 2)).toEqual(["", ""]);
    // A command beyond the underlyings is not lost.
    expect(commandsByUnderlying(["a", "b"], 1)).toEqual(["a", "b"]);
  });

  it("stores no command as an empty list, and the commands of each underlying otherwise", () => {
    expect(storedCommands(["", " "])).toEqual([]);
    expect(storedCommands(["turn_on", ""])).toEqual(["turn_on", ""]);
  });

  it("asks for commands for an underlying that is not a switch", () => {
    expect([needsCommands("switch.heater"), needsCommands("input_boolean.heater"), needsCommands("select.pilot"), needsCommands("climate.ac")]).toEqual([false, false, true, true]);
  });
});

describe("a service of the central boiler", () => {
  it("reads and writes the entity, the service and the attribute", () => {
    expect(parseBoilerService("switch.boiler/turn_on")).toEqual({ entity: "switch.boiler", service: "turn_on", attribute: "" });
    expect(parseBoilerService("climate.boiler/set_temperature/temperature:21")).toEqual({ entity: "climate.boiler", service: "set_temperature", attribute: "temperature:21" });
    expect(formatBoilerService({ entity: "climate.boiler", service: "set_temperature", attribute: "temperature:21" })).toBe("climate.boiler/set_temperature/temperature:21");
    expect(formatBoilerService({ entity: "", service: "turn_on", attribute: "" })).toBe("");
  });

  it("refuses a text without an entity", () => {
    expect(parseBoilerService("turn_on")).toBeUndefined();
  });
});
