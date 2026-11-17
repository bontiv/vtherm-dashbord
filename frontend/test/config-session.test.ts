import { describe, expect, it, vi } from "vitest";

import type { ConfigApi } from "../src/config/api.ts";
import { ConfigSession } from "../src/config/config-session.ts";

function fakeApi(): ConfigApi & Record<string, ReturnType<typeof vi.fn>> {
  let cycle = 5;
  return {
    thermostats: vi.fn(async () => ({ thermostats: [{ id: "a", name: "Salon", type: "over_switch", read_only: false }], has_central_config: true, central_config_id: "c", supported_config_version: [2, 4] })),
    config: vi.fn(async (id: string) => ({ id, name: "Salon", type: "over_switch", values: { cycle_min: cycle }, version: 2, minor_version: 4, read_only: false, read_only_reason: null })),
    centralConfig: vi.fn(),
    presets: vi.fn(async () => [{ preset: "eco_temp", entity_id: "number.eco", value: 17, min: 7, max: 35, step: 0.1, unit: "°C" }]),
    save: vi.fn(async (_id: string, changes: Record<string, Record<string, unknown>>) => {
      cycle = Number(changes["main"]?.["cycle_min"] ?? cycle);
      return { ok: true, config_saved: true, entry_id: "a", errors: [], preset_errors: [] };
    }),
    create: vi.fn(),
  } as unknown as ConfigApi & Record<string, ReturnType<typeof vi.fn>>;
}

describe("the configurations of the panel", () => {
  it("reads a configuration once, with its presets, and opens a draft", async () => {
    const api = fakeApi();
    const session = new ConfigSession(api);
    const [first, second] = await Promise.all([session.load("a"), session.load("a")]);
    expect(first).toBe(second);
    expect(api["config"]).toHaveBeenCalledTimes(1);
    expect(first.draft.values()).toEqual({ cycle_min: 5 });
    expect(first.draft.presets()).toEqual({ eco_temp: 17 });
  });

  it("keeps the draft while the configuration is open, and drops it when it is closed", async () => {
    const session = new ConfigSession(fakeApi());
    (await session.load("a")).draft.propose("main", { cycle_min: 8 });
    expect(session.dirtyDrafts()).toHaveLength(1);
    expect((await session.load("a")).draft.values()["cycle_min"]).toBe(8);
    session.close("a");
    expect(session.dirtyDrafts()).toHaveLength(0);
    expect((await session.load("a")).draft.values()["cycle_min"]).toBe(5);
  });

  it("reads the configuration and the list again after a save", async () => {
    const api = fakeApi();
    const session = new ConfigSession(api);
    (await session.load("a")).draft.propose("main", { cycle_min: 8 });
    const outcome = await session.save("a");
    expect(outcome.ok).toBe(true);
    expect(session.get("a")?.draft.dirty).toBe(false);
    expect(session.get("a")?.draft.savedValues()["cycle_min"]).toBe(8);
    expect(api["thermostats"]).toHaveBeenCalledTimes(1);
    expect(session.centralId).toBe("c");
  });

  it("tells its listeners when a draft changes", async () => {
    const session = new ConfigSession(fakeApi());
    const listener = vi.fn();
    session.subscribe(listener);
    (await session.load("a")).draft.propose("main", { cycle_min: 9 });
    expect(listener).toHaveBeenCalled();
  });
});

describe("the areas of the thermostats", () => {
  const located = (deviceArea: string | null, entityArea: string | null = null) => ({
    devices: { "device-a": { area_id: deviceArea } },
    entities: { "climate.salon": { area_id: entityArea } },
  });

  function sessionWithLocatedThermostat(): ConfigSession {
    const api = fakeApi();
    vi.mocked(api.thermostats).mockImplementation(async () => ({
      thermostats: [
        {
          id: "a",
          name: "Salon",
          type: "over_switch",
          read_only: false,
          device_id: "device-a",
          climate_entity_id: "climate.salon",
          area_id: "living",
          area_name: "Living room",
          floor_name: null,
          floor_level: null,
        },
      ],
      has_central_config: false,
      central_config_id: null,
      supported_config_version: [2, 4],
    }));
    return new ConfigSession(api);
  }

  it("takes note of the areas first, then tells when the device of a thermostat moves to another area", async () => {
    const session = sessionWithLocatedThermostat();
    await session.refreshList();
    expect(session.areasMoved(located("living"))).toBe(false);
    expect(session.areasMoved(located("living"))).toBe(false);
    expect(session.areasMoved(located("office"))).toBe(true);
    expect(session.areasMoved(located("office"))).toBe(false);
  });

  it("tells when the climate entity gets an area of its own", async () => {
    const session = sessionWithLocatedThermostat();
    await session.refreshList();
    session.areasMoved(located("living"));
    expect(session.areasMoved(located("living", "office"))).toBe(true);
  });

  it("takes note of the areas again after the list is read again", async () => {
    const session = sessionWithLocatedThermostat();
    await session.refreshList();
    session.areasMoved(located("living"));
    await session.refreshList();
    expect(session.areasMoved(located("office"))).toBe(false);
  });

  it("does nothing without the list, or without the registries of the devices and of the entities", async () => {
    const session = sessionWithLocatedThermostat();
    expect(session.areasMoved(located("living"))).toBe(false);
    await session.refreshList();
    expect(session.areasMoved({})).toBe(false);
    expect(session.areasMoved({})).toBe(false);
  });
});
