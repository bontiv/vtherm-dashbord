import { describe, expect, it, vi } from "vitest";

import { GET_UI_PLUGINS, PluginListError, fetchPluginList, parsePluginList, pluginsToLoad } from "../src/plugin-list.ts";

/** A plugin as the server sends it. */
function plugin(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "smartpi",
    js_url: "/smartpi/ui.js",
    dashboard_version: ">=0.1,<1.0",
    requires: ["core"],
    load_after: [],
    load_before: [],
    source: "installed",
    state: "ready",
    reason: null,
    details: {},
    order: 0,
    ...overrides,
  };
}

const answer = (...plugins: Record<string, unknown>[]) => ({ dashboard_version: "0.1.0", plugins });

describe("parsePluginList", () => {
  it("reads a ready plugin", () => {
    const list = parsePluginList(answer(plugin()));
    expect(list.dashboard_version).toBe("0.1.0");
    expect(list.plugins[0]).toMatchObject({ id: "smartpi", state: "ready", order: 0, requires: ["core"], source: "installed" });
  });

  it("reads a plugin of each state that the server can report", () => {
    const list = parsePluginList(
      answer(
        plugin({ id: "a" }),
        plugin({ id: "b", state: "invalid", reason: "invalid_constraint", details: { fault: "^1.0" }, order: null }),
        plugin({ id: "c", state: "dashboard_incompatible", reason: "too_old", details: { constraint: ">=2.0", dashboard_version: "0.1.0" }, order: null }),
        plugin({ id: "d", state: "missing_dependency", details: { missing: ["x"] }, order: null }),
        plugin({ id: "e", state: "cycle", details: { plugins: ["e", "f"] }, order: null }),
        plugin({ id: "f", source: "development", dashboard_version: "", order: 1 }),
        plugin({ id: "g", source: "native" }),
      ),
    );
    expect(list.plugins.map((item) => [item.id, item.state, item.reason])).toEqual([
      ["a", "ready", null],
      ["b", "invalid", "invalid_constraint"],
      ["c", "dashboard_incompatible", "too_old"],
      ["d", "missing_dependency", null],
      ["e", "cycle", null],
      ["f", "ready", null],
      ["g", "ready", null],
    ]);
    expect(list.plugins[2]?.details).toEqual({ constraint: ">=2.0", dashboard_version: "0.1.0" });
  });

  it("accepts an empty list", () => {
    expect(parsePluginList({ dashboard_version: "0.1.0", plugins: [] }).plugins).toEqual([]);
  });

  it.each([
    ["not an object", null, "result"],
    ["no plugins", { dashboard_version: "0.1.0" }, "result.plugins"],
    ["no version", { plugins: [] }, "result.dashboard_version"],
    ["a plugin that is not an object", answer("text" as unknown as Record<string, unknown>), "result.plugins[0]"],
    ["an unknown state", answer(plugin({ state: "loaded" })), "result.plugins[0].state"],
    ["an unknown source", answer(plugin({ source: "store" })), "result.plugins[0].source"],
    ["a requires that is not a list", answer(plugin({ requires: "core" })), "result.plugins[0].requires"],
    ["a requires with a number", answer(plugin({ requires: [1] })), "result.plugins[0].requires"],
    ["a reason that is a number", answer(plugin({ reason: 3 })), "result.plugins[0].reason"],
    ["a negative rank", answer(plugin({ order: -1 })), "result.plugins[0].order"],
    ["a rank that is a text", answer(plugin({ order: "0" })), "result.plugins[0].order"],
    ["details that are a list", answer(plugin({ details: [] })), "result.plugins[0].details"],
    ["a ready plugin without rank", answer(plugin({ order: null })), "result.plugins[0].order"],
    ["a rank for a plugin that is not ready", answer(plugin({ state: "cycle", order: 0 })), "result.plugins[0].order"],
    ["a js_url that is missing", answer(plugin({ js_url: undefined })), "result.plugins[0].js_url"],
  ])("refuses %s and names the faulty element", (_name, raw, path) => {
    expect(() => parsePluginList(raw)).toThrow(PluginListError);
    expect(() => parsePluginList(raw)).toThrow(path);
  });
});

describe("pluginsToLoad", () => {
  it("keeps the ready plugins in the order of their rank", () => {
    const list = parsePluginList(answer(plugin({ id: "b", order: 1 }), plugin({ id: "x", state: "cycle", order: null }), plugin({ id: "a", order: 0 })));
    expect(pluginsToLoad(list).map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("fetchPluginList", () => {
  it("asks the server and reads the answer", async () => {
    const callWS = vi.fn().mockResolvedValue(answer(plugin()));
    const list = await fetchPluginList({ callWS } as never);
    expect(callWS).toHaveBeenCalledWith({ type: GET_UI_PLUGINS });
    expect(list.plugins).toHaveLength(1);
  });

  it("sends the development entries only when there are some", async () => {
    const callWS = vi.fn().mockResolvedValue(answer());
    const entry = { id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: ">=0.1" };
    await fetchPluginList({ callWS } as never, [entry]);
    expect(callWS).toHaveBeenCalledWith({ type: GET_UI_PLUGINS, dev_plugins: [entry] });
  });

  it("refuses an answer that is not valid", async () => {
    const callWS = vi.fn().mockResolvedValue({ plugins: "none" });
    await expect(fetchPluginList({ callWS } as never)).rejects.toThrow(PluginListError);
  });
});
