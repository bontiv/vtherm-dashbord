import { describe, expect, it } from "vitest";

import { creationContributionIds, creationMissing } from "../src/native/tab-definitions.ts";

describe("the sections of a creation", () => {
  it("lists the main, type, TPI and advanced sections of a thermostat on a switch, in that order, with main first", () => {
    expect(creationContributionIds("thermostat", { thermostat_type: "thermostat_over_switch" })).toEqual(["core.tab.main", "core.tab.type", "core_tpi.tab.main", "core_advanced.tab.main"]);
  });

  it("has no TPI section for a thermostat on a climate without valve regulation", () => {
    expect(creationContributionIds("thermostat", { thermostat_type: "thermostat_over_climate" })).toEqual(["core.tab.main", "core.tab.type", "core_advanced.tab.main"]);
  });

  it("has a TPI section for a thermostat on a climate with valve regulation, and for a valve", () => {
    expect(creationContributionIds("thermostat", { thermostat_type: "thermostat_over_climate", auto_regulation_mode: "auto_regulation_valve" })).toContain("core_tpi.tab.main");
    expect(creationContributionIds("thermostat", { thermostat_type: "thermostat_over_valve" })).toContain("core_tpi.tab.main");
  });

  it("lists the main, TPI and advanced sections of the central configuration", () => {
    expect(creationContributionIds("central", { thermostat_type: "thermostat_central_config" })).toEqual(["core.general.main", "core_tpi.general.main", "core_advanced.general.main"]);
  });
});

describe("what a creation misses", () => {
  const missing = (values: Record<string, unknown>, hasCentral = false) => creationMissing("thermostat", { thermostat_type: "thermostat_over_switch", ...values }, hasCentral).map(({ definition, fields }) => [definition.tab, fields.map((field) => field.key)]);

  it("names the required fields without value, by section", () => {
    expect(missing({})).toEqual([
      ["main", ["name", "temperature_sensor_entity_id", "external_temperature_sensor_entity_id"]],
      ["type", ["underlying_entity_ids"]],
    ]);
  });

  it("does not ask for the specific values of a section that uses the central configuration", () => {
    expect(missing({ use_main_central_config: true }, true)[0]).toEqual(["main", ["name", "temperature_sensor_entity_id"]]);
  });

  it("is empty once the required fields have a value", () => {
    expect(missing({ name: "Office", temperature_sensor_entity_id: "sensor.office", external_temperature_sensor_entity_id: "sensor.outdoor", underlying_entity_ids: ["switch.office"] })).toEqual([]);
  });
});
