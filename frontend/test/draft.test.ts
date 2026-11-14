import { describe, expect, it, vi } from "vitest";

import type { ConfigApi, SaveResponse } from "../src/config/api.ts";
import { ConfigDraft, sameValue } from "../src/config/draft.ts";

const saved = { name: "Salon", cycle_min: 5, underlying_entity_ids: ["switch.a"], use_window_feature: false };

function api(response: Partial<SaveResponse>): ConfigApi & { save: ReturnType<typeof vi.fn> } {
  const save = vi.fn().mockResolvedValue({ ok: true, config_saved: true, entry_id: "e", errors: [], preset_errors: [], ...response });
  return { save } as unknown as ConfigApi & { save: ReturnType<typeof vi.fn> };
}

describe("sameValue", () => {
  it("compares lists and treats a missing value as null", () => {
    expect(sameValue(["a"], ["a"])).toBe(true);
    expect(sameValue(["a"], ["a", "b"])).toBe(false);
    expect(sameValue(undefined, null)).toBe(true);
    expect(sameValue(0, null)).toBe(false);
    expect(sameValue(5, "5")).toBe(false);
  });
});

describe("a draft", () => {
  it("shows the saved values with its changes, and is not saved until the user saves", () => {
    const draft = new ConfigDraft("e", saved);
    expect(draft.dirty).toBe(false);
    draft.propose("main", { cycle_min: 8 });
    expect(draft.dirty).toBe(true);
    expect(draft.values()["cycle_min"]).toBe(8);
    expect(draft.savedValues()["cycle_min"]).toBe(5);
  });

  it("is no longer changed when a value comes back to the saved one", () => {
    const draft = new ConfigDraft("e", saved);
    draft.propose("main", { cycle_min: 8 });
    draft.propose("main", { cycle_min: 5 });
    expect(draft.dirty).toBe(false);
    expect(draft.tabChanges()).toEqual({});
  });

  it("keeps the changes by tab, as the server saves them", () => {
    const draft = new ConfigDraft("e", saved);
    draft.propose("main", { cycle_min: 8 });
    draft.propose("features", { use_window_feature: true });
    draft.propose("type", { underlying_entity_ids: ["switch.a", "switch.b"] });
    expect(draft.tabChanges()).toEqual({ main: { cycle_min: 8 }, features: { use_window_feature: true }, type: { underlying_entity_ids: ["switch.a", "switch.b"] } });
  });

  it("goes back to the saved values when the changes are discarded", () => {
    const draft = new ConfigDraft("e", saved, { eco_temp: 17 });
    draft.propose("main", { cycle_min: 8, "preset:eco_temp": 18 });
    draft.discard();
    expect(draft.dirty).toBe(false);
    expect(draft.values()).toEqual(saved);
    expect(draft.presets()).toEqual({ eco_temp: 17 });
  });

  it("keeps the preset temperatures apart from the values of the flow", () => {
    const draft = new ConfigDraft("e", saved, { eco_temp: 17 });
    draft.propose("presets", { "preset:eco_temp": 18, use_presets_central_config: false });
    expect(draft.presets()).toEqual({ eco_temp: 18 });
    expect(draft.tabChanges()).toEqual({ presets: { use_presets_central_config: false } });
    draft.propose("presets", { "preset:eco_temp": 17 });
    expect(draft.presets()).toEqual({ eco_temp: 17 });
  });

  it("tells its listeners when it changes", () => {
    const draft = new ConfigDraft("e", saved);
    const listener = vi.fn();
    const stop = draft.subscribe(listener);
    draft.propose("main", { cycle_min: 8 });
    draft.discard();
    stop();
    draft.propose("main", { cycle_min: 9 });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("saving a draft", () => {
  it("sends the changes by tab and the presets, and becomes the saved configuration", async () => {
    const draft = new ConfigDraft("e", saved, { eco_temp: 17 });
    draft.propose("main", { cycle_min: 8 });
    draft.propose("presets", { "preset:eco_temp": 18 });
    const server = api({});
    const outcome = await draft.save(server);
    expect(server.save).toHaveBeenCalledWith("e", { main: { cycle_min: 8 } }, { eco_temp: 18 });
    expect(outcome).toEqual({ ok: true, configSaved: true, generalErrors: [] });
    expect(draft.dirty).toBe(false);
    expect(draft.savedValues()["cycle_min"]).toBe(8);
    expect(draft.presets()).toEqual({ eco_temp: 18 });
  });

  it("keeps every change and gives the errors to the fields when the configuration is refused", async () => {
    const draft = new ConfigDraft("e", saved);
    draft.propose("main", { cycle_min: 8, temperature_sensor_entity_id: "sensor.nothing" });
    const outcome = await draft.save(api({ ok: false, config_saved: false, errors: [{ tab: "main", field: "temperature_sensor_entity_id", code: "unknown_entity" }] }));
    expect(outcome.ok).toBe(false);
    expect(draft.dirty).toBe(true);
    expect(draft.savedValues()["cycle_min"]).toBe(5);
    expect(draft.errorsOf("main")).toEqual({ temperature_sensor_entity_id: "unknown_entity" });
    expect(draft.errorsOf("tpi")).toEqual({});
  });

  it("puts an error of the whole form on base, and an error of no tab apart", async () => {
    const draft = new ConfigDraft("e", saved);
    draft.propose("lock", { lock_code: "12" });
    await draft.save(api({ ok: false, config_saved: false, errors: [{ tab: "lock", field: "base", code: "lock_code_incorrect" }, { tab: null, field: "base", code: "configuration_not_complete" }] }));
    expect(draft.errorsOf("lock")).toEqual({ base: "lock_code_incorrect" });
    expect(draft.errorsOf("main")).toEqual({});
    expect(draft.generalErrors()).toEqual([{ tab: null, field: "base", code: "configuration_not_complete" }]);
  });

  it("keeps the saved configuration and only the preset that failed", async () => {
    const draft = new ConfigDraft("e", saved, { eco_temp: 17, comfort_temp: 19 });
    draft.propose("main", { cycle_min: 8 });
    draft.propose("presets", { "preset:eco_temp": 99, "preset:comfort_temp": 20 });
    const outcome = await draft.save(api({ ok: false, config_saved: true, preset_errors: [{ tab: "presets", field: "eco_temp", code: "out_of_range" }] }));
    expect(outcome).toEqual({ ok: false, configSaved: true, generalErrors: [] });
    expect(draft.savedValues()["cycle_min"]).toBe(8);
    expect(draft.presets()).toEqual({ eco_temp: 99, comfort_temp: 20 });
    expect(draft.dirty).toBe(true);
    expect(draft.tabChanges()).toEqual({});
    expect(draft.errorsOf("presets")).toEqual({ eco_temp: "out_of_range" });
  });

  it("clears the errors of the previous save", async () => {
    const draft = new ConfigDraft("e", saved);
    draft.propose("main", { cycle_min: 8 });
    await draft.save(api({ ok: false, config_saved: false, errors: [{ tab: "main", field: "cycle_min", code: "invalid_value" }] }));
    await draft.save(api({}));
    expect(draft.allErrors()).toEqual([]);
  });
});
