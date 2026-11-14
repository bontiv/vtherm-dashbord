import { describe, expect, it, vi } from "vitest";

import { loadPlugins } from "../src/loader.ts";
import type { PluginStatus } from "../src/loader.ts";
import { parsePluginList } from "../src/plugin-list.ts";

/** A plugin as the server sends it. */
function plugin(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    js_url: `/${id}/ui.js`,
    dashboard_version: ">=0.1,<1.0",
    requires: [],
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

/** The list that the server would send, with the ranks given by the position in the arguments. */
function list(...plugins: Record<string, unknown>[]) {
  let rank = 0;
  return parsePluginList({ dashboard_version: "0.1.0", plugins: plugins.map((item) => (item["state"] === "ready" || item["state"] === undefined ? { ...item, order: rank++ } : { ...item, order: null })) });
}

/** An environment where every module registers itself, except the ones that fail. */
function environment(failures: Record<string, unknown> = {}, unregistered: string[] = []) {
  const registered = new Set<string>();
  const imported: string[] = [];
  const importModule = vi.fn(async (url: string) => {
    imported.push(url);
    const id = url.split("/")[1] as string;
    if (id in failures) {
      throw failures[id];
    }
    if (!unregistered.includes(id)) {
      registered.add(id);
    }
  });
  return { imported, importModule, isRegistered: (id: string) => registered.has(id) };
}

const states = (statuses: readonly PluginStatus[]) => Object.fromEntries(statuses.map((status) => [status.id, status.state]));

describe("loadPlugins", () => {
  it("imports the ready plugins in the order received", async () => {
    const env = environment();
    const statuses = await loadPlugins(list(plugin("core"), plugin("a", { requires: ["core"] }), plugin("b")), env);
    expect(env.imported).toEqual(["/core/ui.js", "/a/ui.js", "/b/ui.js"]);
    expect(states(statuses)).toEqual({ core: "loaded", a: "loaded", b: "loaded" });
  });

  it("waits for each module before it imports the next one", async () => {
    const events: string[] = [];
    const importModule = async (url: string) => {
      events.push(`start ${url}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`end ${url}`);
    };
    await loadPlugins(list(plugin("a"), plugin("b")), { importModule, isRegistered: () => true });
    expect(events).toEqual(["start /a/ui.js", "end /a/ui.js", "start /b/ui.js", "end /b/ui.js"]);
  });

  it("does not download a plugin that the server excluded, and keeps the reason of the server", async () => {
    const env = environment();
    const statuses = await loadPlugins(
      list(
        plugin("old", { state: "dashboard_incompatible", reason: "too_old", details: { constraint: ">=9.0", dashboard_version: "0.1.0" } }),
        plugin("new", { state: "dashboard_incompatible", reason: "too_new", details: { constraint: "<0.1", dashboard_version: "0.1.0" } }),
        plugin("bad", { state: "invalid", reason: "invalid_url" }),
        plugin("loop", { state: "cycle", details: { plugins: ["loop", "other"] } }),
        plugin("lonely", { state: "missing_dependency", details: { missing: ["ghost"] } }),
        plugin("good"),
      ),
      env,
    );
    expect(env.imported).toEqual(["/good/ui.js"]);
    expect(states(statuses)).toEqual({ old: "dashboard_incompatible", new: "dashboard_incompatible", bad: "invalid", loop: "cycle", lonely: "missing_dependency", good: "loaded" });
    expect(statuses[0]).toMatchObject({ reason: "too_old", details: { constraint: ">=9.0" } });
  });

  it("isolates a module that cannot be found, and still loads the others", async () => {
    const env = environment({ a: new TypeError("Failed to fetch dynamically imported module: /a/ui.js") });
    const statuses = await loadPlugins(list(plugin("a"), plugin("b")), env);
    expect(states(statuses)).toEqual({ a: "failed", b: "loaded" });
    expect(statuses[0]).toMatchObject({ reason: "import_failed", details: { url: "/a/ui.js", message: expect.stringContaining("Failed to fetch") } });
  });

  it("isolates a module that throws an exception, whatever it throws", async () => {
    const env = environment({ a: new Error("boom"), b: "a text" });
    const statuses = await loadPlugins(list(plugin("a"), plugin("b"), plugin("c")), env);
    expect(states(statuses)).toEqual({ a: "failed", b: "failed", c: "loaded" });
    expect(statuses[1]?.details).toMatchObject({ message: "a text" });
  });

  it("refuses a module that does not register its plugin", async () => {
    const env = environment({}, ["a"]);
    const statuses = await loadPlugins(list(plugin("a"), plugin("b")), env);
    expect(states(statuses)).toEqual({ a: "failed", b: "loaded" });
    expect(statuses[0]).toMatchObject({ reason: "not_registered" });
  });

  it("does not import a plugin whose required plugin failed, and spreads it to the plugins that require it", async () => {
    const env = environment({ a: new Error("boom") });
    const statuses = await loadPlugins(list(plugin("a"), plugin("b", { requires: ["a"] }), plugin("c", { requires: ["b"] }), plugin("d")), env);
    expect(env.imported).toEqual(["/a/ui.js", "/d/ui.js"]);
    expect(states(statuses)).toEqual({ a: "failed", b: "missing_dependency", c: "missing_dependency", d: "loaded" });
    expect(statuses[1]?.details).toEqual({ missing: ["a"] });
    expect(statuses[2]?.details).toEqual({ missing: ["b"] });
  });

  it("does not stop a plugin that only loads after a plugin that failed", async () => {
    const env = environment({ a: new Error("boom") });
    const statuses = await loadPlugins(list(plugin("a"), plugin("b", { load_after: ["a"] })), env);
    expect(states(statuses)).toEqual({ a: "failed", b: "loaded" });
  });

  it("reports every change of status, starting with the answer of the server", async () => {
    const env = environment();
    const snapshots: string[] = [];
    await loadPlugins(list(plugin("a"), plugin("b", { state: "cycle" })), { ...env, onStatus: (statuses) => snapshots.push(statuses.map((status) => `${status.id}:${status.state}`).join(",")) });
    expect(snapshots).toEqual(["a:ready,b:cycle", "a:loaded,b:cycle"]);
  });

  it("returns the status of every plugin in the order of the list, and works with an empty list", async () => {
    const env = environment();
    expect((await loadPlugins(list(plugin("z"), plugin("a", { state: "invalid" })), env)).map((status) => status.id)).toEqual(["z", "a"]);
    expect(await loadPlugins(list(), env)).toEqual([]);
  });

  it("keeps the source of a development plugin and its URL", async () => {
    const env = environment();
    const statuses = await loadPlugins(list(plugin("mine", { source: "development", js_url: "/mine/ui.js" })), env);
    expect(statuses[0]).toMatchObject({ source: "development", js_url: "/mine/ui.js", state: "loaded" });
  });
});
