import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { getEntryEntities } from "../src/index.ts";
import type { Hass, HassDeviceRegistryEntry, HassEntityRegistryEntry } from "../src/index.ts";

/** The registries of a Home Assistant with a thermostat, the central configuration and an unrelated device. */
function registries(): { devices: Record<string, HassDeviceRegistryEntry>; entities: Record<string, HassEntityRegistryEntry> } {
  const devices: Record<string, HassDeviceRegistryEntry> = {
    dev_living: { id: "dev_living", identifiers: [["versatile_thermostat", "entry_living"]], config_entries: ["entry_living"] },
    dev_central: { id: "dev_central", identifiers: [["versatile_thermostat", "entry_central"]], config_entries: ["entry_central"] },
    dev_other: { id: "dev_other", identifiers: [["zha", "entry_living"]] },
  };
  const entities: Record<string, HassEntityRegistryEntry> = {
    "climate.living": { entity_id: "climate.living", device_id: "dev_living", platform: "versatile_thermostat", translation_key: null },
    "sensor.living_power": { entity_id: "sensor.living_power", device_id: "dev_living", platform: "versatile_thermostat", translation_key: "power_percent" },
    "sensor.living_slope": { entity_id: "sensor.living_slope", device_id: "dev_living", platform: "versatile_thermostat", translation_key: "temperature_slope" },
    "select.central_mode": { entity_id: "select.central_mode", device_id: "dev_central", platform: "versatile_thermostat" },
    "number.central_eco": { entity_id: "number.central_eco", device_id: "dev_central", platform: "versatile_thermostat", translation_key: "eco_temp" },
    "sensor.zha_power": { entity_id: "sensor.zha_power", device_id: "dev_other", platform: "zha", translation_key: "power_percent" },
    "light.kitchen": { entity_id: "light.kitchen", platform: "hue" },
  };
  return { devices, entities };
}

describe("getEntryEntities", () => {
  it("finds the climate entity and the sensors of a thermostat by their translation key", () => {
    const found = getEntryEntities(registries(), "entry_living");
    expect(found.deviceId).toBe("dev_living");
    expect(found.climate).toBe("climate.living");
    expect(found.byKey["power_percent"]).toBe("sensor.living_power");
    expect(found.byKey["temperature_slope"]).toBe("sensor.living_slope");
    expect(found.entities.map((entity) => entity.entityId)).toEqual(["climate.living", "sensor.living_power", "sensor.living_slope"]);
    expect(found.entities[1]).toEqual({ entityId: "sensor.living_power", domain: "sensor", translationKey: "power_percent", platform: "versatile_thermostat" });
  });

  it("finds the entities of the central configuration, the select of the central mode by its domain", () => {
    const found = getEntryEntities(registries(), "entry_central");
    expect(found.deviceId).toBe("dev_central");
    expect(found.climate).toBeUndefined();
    expect(found.entities.find((entity) => entity.domain === "select" && entity.translationKey === undefined)?.entityId).toBe("select.central_mode");
    expect(found.byKey).toEqual({ eco_temp: "number.central_eco" });
  });

  it("gives empty values for an entity identifier instead of a configuration entry", () => {
    expect(getEntryEntities(registries(), "climate.living")).toEqual({ deviceId: undefined, entities: [], climate: undefined, byKey: {} });
  });

  it("gives empty values for an unknown entry, and does not take a device of another integration", () => {
    expect(getEntryEntities(registries(), "entry_unknown").deviceId).toBeUndefined();
    const { devices } = registries();
    const onlyOther = { devices: { dev_other: devices["dev_other"] as HassDeviceRegistryEntry }, entities: registries().entities };
    expect(getEntryEntities(onlyOther, "entry_living").entities).toEqual([]);
  });

  it("gives empty values without an error when a registry is missing", () => {
    const { devices, entities } = registries();
    expect(getEntryEntities({ devices }, "entry_living")).toEqual({ deviceId: undefined, entities: [], climate: undefined, byKey: {} });
    expect(getEntryEntities({ entities }, "entry_living").entities).toEqual([]);
    expect(getEntryEntities({}, "entry_living").climate).toBeUndefined();
    expect(getEntryEntities({ devices: { broken: { id: "broken" } }, entities }, "entry_living").deviceId).toBeUndefined();
  });

  it("calls nothing on the server and answers at once", () => {
    const callWS = vi.fn();
    const callService = vi.fn();
    const hass: Hass = { language: "en", states: {}, ...registries(), callWS, callService };
    const found = getEntryEntities(hass, "entry_living");
    expect(found).not.toBeInstanceOf(Promise);
    expect(found.climate).toBe("climate.living");
    expect(callWS).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
  });
});

describe("registries in the type of hass", () => {
  it("keeps valid a hass written before the registries existed", () => {
    // A plugin published before this change builds its hass without registries nor formatters: it still compiles.
    const hass: Hass = { language: "en", states: { "climate.a": { state: "heat", attributes: {} } }, callService: async () => undefined, callWS: async <R>() => undefined as R };
    expect(hass.entities).toBeUndefined();
    expectTypeOf<Hass["entities"]>().toEqualTypeOf<Readonly<Record<string, HassEntityRegistryEntry>> | undefined>();
    expectTypeOf<Hass["devices"]>().toEqualTypeOf<Readonly<Record<string, HassDeviceRegistryEntry>> | undefined>();
  });

  it("describes the registries and the formatters as read-only", () => {
    const hass = { language: "en", states: {}, ...registries(), callService: async () => undefined, callWS: async <R>() => undefined as R } satisfies Hass;
    const typed: Hass = hass;
    // @ts-expect-error the registry of the entities is read-only
    typed.entities = {};
    // @ts-expect-error the formatter is read-only
    typed.formatEntityState = () => "";
    expect(typed).toBeDefined();
  });
});
