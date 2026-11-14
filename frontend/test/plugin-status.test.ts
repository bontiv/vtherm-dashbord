// @vitest-environment happy-dom
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import { afterEach, describe, expect, it } from "vitest";

import { TestElement, cleanup, find, findAll, mountPanel, nativePlugins, page, plugin } from "./support/dashboard-harness.ts";
import type { TestPlugin } from "./support/dashboard-harness.ts";

afterEach(cleanup);

class PluginsPage extends TestElement {
  override connectedCallback(): void {
    this.append(document.createElement("vtherm-plugin-status-page"));
  }
}
if (customElements.get("core-page-plugins-el") === undefined) {
  customElements.define("core-page-plugins-el", PluginsPage);
}

const natives: TestPlugin[] = nativePlugins.map((definition) => ({ definition }));
const stub = (id: string, overrides: Partial<TestPlugin> = {}): TestPlugin => ({ definition: plugin(id, {}), ...overrides });
const PATH = `/home-confort/${CORE_TOP_TABS.configuration}/core.page.plugins`;

/** Mount the panel on the plugin status page and give the row of each plugin. */
async function statusRows(plugins: readonly TestPlugin[], failing: Record<string, Error> = {}) {
  const { panel } = await mountPanel({ plugins: [...natives, ...plugins], path: PATH, failing });
  const view = find(find(panel.shadowRoot as ShadowRoot, "vtherm-plugin-status-page")?.shadowRoot as ShadowRoot, "vtherm-plugin-status") as HTMLElement;
  const rows = new Map(findAll(view.shadowRoot as ShadowRoot, "tr[data-plugin]").map((row) => [row.getAttribute("data-plugin") as string, row]));
  return { view, rows };
}
const cells = (row: HTMLElement | undefined) => [...(row?.querySelectorAll("td") ?? [])].map((cell) => cell.textContent?.trim());

describe("the plugin status page", () => {
  it("shows a plugin that loaded, with its source", async () => {
    const { rows } = await statusRows([stub("smartpi")]);
    expect(cells(rows.get("smartpi"))).toEqual(["smartpi", "Installed", "Loaded", ""]);
    expect(cells(rows.get("core_tpi"))[1]).toBe("Installed");
  });

  it("shows the native plugins with the source native", async () => {
    const { rows } = await statusRows([{ ...stub("core_window"), source: "native" }]);
    expect(cells(rows.get("core_window"))[1]).toBe("Native");
  });

  it("shows a missing dependency with the missing plugins", async () => {
    const { rows } = await statusRows([stub("b", { state: "missing_dependency", details: { missing: ["a", "c"] } })]);
    expect(cells(rows.get("b"))).toEqual(["b", "Installed", "Missing dependency", "Missing: a, c"]);
  });

  it("shows a plugin that needs a newer or an older dashboard, with the constraint and the version", async () => {
    const details = { constraint: ">=2.0", dashboard_version: "0.1.0" };
    const { rows } = await statusRows([stub("old", { state: "dashboard_incompatible", reason: "too_old", details }), stub("new", { state: "dashboard_incompatible", reason: "too_new", details: { constraint: "<0.1", dashboard_version: "0.1.0" } })]);
    expect(cells(rows.get("old"))[2]).toBe("Dashboard incompatible");
    expect(cells(rows.get("old"))[3]).toBe("The dashboard 0.1.0 is older than >=2.0 requires.");
    expect(cells(rows.get("new"))[3]).toBe("The dashboard 0.1.0 is more recent than <0.1 accepts.");
  });

  it("shows a cycle with the plugins of the loop", async () => {
    const { rows } = await statusRows([stub("a", { state: "cycle", details: { plugins: ["a", "b"] } })]);
    expect(cells(rows.get("a"))).toEqual(["a", "Installed", "Dependency cycle", "Loop between: a, b"]);
  });

  it("shows an invalid plugin with the cause", async () => {
    const { rows } = await statusRows([
      stub("u", { state: "invalid", reason: "invalid_url", details: { url: "https://other/x.js" } }),
      stub("c", { state: "invalid", reason: "invalid_constraint", details: { fault: "^1.0" } }),
      stub("core_custom", { state: "invalid", reason: "reserved_id" }),
    ]);
    expect(cells(rows.get("u"))[3]).toBe("The URL https://other/x.js is not valid for this plugin.");
    expect(cells(rows.get("c"))[3]).toBe("The constraint on the dashboard version is not valid: ^1.0");
    expect(cells(rows.get("core_custom"))[3]).toBe("The identifier is reserved for the native plugins.");
  });

  it("shows a module that failed to import with the message, and a module that did not register", async () => {
    const { rows } = await statusRows([stub("broken"), stub("silent")], { broken: new Error("Failed to fetch module") });
    expect(cells(rows.get("broken"))[2]).toBe("Failed");
    expect(cells(rows.get("broken"))[3]).toBe("The module could not be imported: Failed to fetch module");
  });

  it("shows a plugin in development with its source and the URL that was used", async () => {
    const { rows } = await statusRows([stub("mine", { source: "development" })]);
    expect(cells(rows.get("mine"))[1]).toBe("Development");
    expect(cells(rows.get("mine"))[3]).toBe("URL: /mine/ui.js");
  });

  it("shows the problems found with the contributions", async () => {
    const warned = plugin("warned", { thermostat_config: [page("warned.tab", { placement: { after: "absent.tab" } })] });
    const { view } = await statusRows([{ definition: warned }]);
    const issue = find(view.shadowRoot as ShadowRoot, "li[data-code]") as HTMLElement;
    expect(issue.getAttribute("data-code")).toBe("target_missing");
    expect(issue.textContent).toContain("warned");
  });

  it("says so when there is no problem", async () => {
    const { view } = await statusRows([stub("smartpi")]);
    expect(view.shadowRoot?.textContent).toContain("None.");
  });

  it("shows the page in French", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: PATH, language: "fr" });
    const view = find(find(panel.shadowRoot as ShadowRoot, "vtherm-plugin-status-page")?.shadowRoot as ShadowRoot, "vtherm-plugin-status") as HTMLElement;
    expect(view.shadowRoot?.textContent).toContain("Avertissements et erreurs");
  });
});

describe("when there is nothing to show", () => {
  it("works with the native plugins only, with the message of the empty thermostats list", async () => {
    const { panel } = await mountPanel({ plugins: natives, thermostats: [], path: `/home-confort/${CORE_TOP_TABS.thermostats}` });
    const list = find(panel.shadowRoot as ShadowRoot, "vtherm-thermostat-list") as HTMLElement;
    expect(find(list.shadowRoot as ShadowRoot, ".empty")?.textContent).toContain("No Versatile Thermostat thermostat");
    expect(find(panel.shadowRoot as ShadowRoot, ".error")).toBeNull();
  });

  it("shows the frame without error when the server gives no plugin at all", async () => {
    const { panel } = await mountPanel({ plugins: [] });
    expect(panel.phase).toBe("ready");
    expect(find(panel.shadowRoot as ShadowRoot, '[role="alert"]')).toBeNull();
    expect(find(panel.shadowRoot as ShadowRoot, "main")?.textContent).toContain("no page");
  });

  it("shows an error message when the server cannot be reached", async () => {
    const failing = document.createElement("vtherm-dashboard-panel") as Awaited<ReturnType<typeof mountPanel>>["panel"];
    failing.hass = { language: "en", locale: { language: "en" }, states: {}, callWS: () => Promise.reject(new Error("offline")) } as never;
    document.body.append(failing);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await failing.updateComplete;
    expect(failing.shadowRoot?.textContent).toContain("The plugins could not be loaded: offline");
  });
});
