import { getEntryEntities } from "@vtherm/dashboard-sdk";
import { createFakeHass, createFakeHost } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { centralMode, definition, heatingShare } from "./widget-entities.ts";

/** A fake hass with a thermostat whose device has a sensor of the share, and the central configuration with its mode. */
function withThermostat() {
  const hass = createFakeHass();
  hass.setDevice({ id: "device_salon", identifiers: [["versatile_thermostat", "entry_salon"]] });
  hass.setEntity({ entity_id: "climate.salon", device_id: "device_salon", platform: "versatile_thermostat" });
  hass.setEntity({ entity_id: "sensor.salon_power", device_id: "device_salon", platform: "versatile_thermostat", translation_key: "power_percent" });
  hass.setState("sensor.salon_power", "42.5");
  hass.setDevice({ id: "device_central", identifiers: [["versatile_thermostat", "entry_central"]] });
  hass.setEntity({ entity_id: "select.central_mode", device_id: "device_central", platform: "versatile_thermostat" });
  hass.setState("select.central_mode", "Auto");
  return hass;
}

it("reads the sensor of the share on the device of the thermostat", () => {
  expect(heatingShare(withThermostat(), "entry_salon")).toBe("42.5 %");
});

it("formats the value with the language of the user when Home Assistant gives no formatter", () => {
  const hass = withThermostat();
  hass.setLanguage("fr");
  expect(heatingShare(hass, "entry_salon")).toBe("42,5 %");
});

it("shows a dash for a sensor that is unavailable, or for an entry that the registries do not have", () => {
  const hass = withThermostat();
  hass.setState("sensor.salon_power", "unavailable");
  expect(heatingShare(hass, "entry_salon")).toBe("—");
  expect(getEntryEntities(hass, "entry_unknown").entities).toEqual([]);
  expect(heatingShare(hass, "entry_unknown")).toBe("—");
});

it("reads the central mode from the central configuration that the widget receives", () => {
  const hass = withThermostat();
  expect(centralMode(hass, { entryId: "entry_central", values: {} })).toBe("Auto");
  expect(centralMode(hass, undefined)).toBeUndefined();
});

it("hides the widgets that have nothing to show", () => {
  const host = createFakeHost();
  host.registerPlugin(definition);
  const hass = withThermostat();
  const thermostat = (thermostatId: string) => ({ hass, thermostatId, thermostatType: "over_switch" as const, values: {}, centralValues: {} });
  expect(host.visible(host.resolved("thermostat_widget"), thermostat("entry_salon"))).toHaveLength(1);
  expect(host.visible(host.resolved("thermostat_widget"), thermostat("entry_unknown"))).toHaveLength(0);
  expect(host.visible(host.resolved("global_widget"), { hass })).toHaveLength(0);
  expect(host.visible(host.resolved("global_widget"), { hass, central: { entryId: "entry_central", values: {} } })).toHaveLength(1);
});
