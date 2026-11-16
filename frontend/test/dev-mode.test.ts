// @vitest-environment happy-dom
/** The plugins in development: the entries of the browser, their page, the banner, and what the status page tells their author. */
import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { diagnoseDevelopmentFailure } from "../src/components/plugin-status.ts";
import { DEV_STORAGE_KEY, DevStore, isDevelopmentUrl, parseList, validateEntry } from "../src/dev/dev-store.ts";
import type { DevEntry } from "../src/dev/dev-store.ts";
import { cleanup, find, findAll, mountPanel, settle } from "./support/dashboard-harness.ts";
import type { TestPlugin } from "./support/dashboard-harness.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const INSTALLED = new Set(["smartpi"]);
const VERSION = ">=0.1,<1.0";

describe("the entries of the browser", () => {
  it("keeps an entry for an installed plugin without a constraint, enabled", () => {
    const store = new DevStore(new MemoryStorage());
    const result = store.add({ id: "smartpi", js_url: "http://localhost:5173/ui.js" }, INSTALLED);
    expect(result).toMatchObject({ ok: true, entry: { id: "smartpi", js_url: "http://localhost:5173/ui.js", enabled: true } });
    expect(store.list()).toHaveLength(1);
  });

  it("needs the constraint of the dashboard for a plugin that is not installed", () => {
    const store = new DevStore(new MemoryStorage());
    expect(store.add({ id: "mine", js_url: "http://localhost:5173/ui.js" }, INSTALLED)).toEqual({ ok: false, problem: "missing_constraint" });
    expect(store.list()).toEqual([]);
    const result = store.add({ id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION, requires: "core, core_tpi", load_after: "core_tpi" }, INSTALLED);
    expect(result).toMatchObject({ ok: true, entry: { dashboard_version: VERSION, requires: ["core", "core_tpi"], load_after: ["core_tpi"] } });
  });

  it.each(["javascript:alert(1)", "data:text/javascript,alert(1)", "ftp://example.org/ui.js", "/relative/ui.js", "http://", "not a url"])("refuses the address %s", (url) => {
    expect(validateEntry({ id: "smartpi", js_url: url }, [], INSTALLED)).toEqual({ ok: false, problem: "invalid_url" });
  });

  it("accepts http and https only", () => {
    expect(isDevelopmentUrl("http://localhost:5173/a.js")).toBe(true);
    expect(isDevelopmentUrl("https://dev.example.org/a.js")).toBe(true);
  });

  it("refuses an identifier that is not valid, one that repeats, and a dependency that is not an identifier", () => {
    const store = new DevStore(new MemoryStorage());
    expect(store.add({ id: "Bad Id", js_url: "http://localhost/a.js" }, INSTALLED)).toEqual({ ok: false, problem: "invalid_id" });
    store.add({ id: "smartpi", js_url: "http://localhost/a.js" }, INSTALLED);
    expect(store.add({ id: "smartpi", js_url: "http://localhost/b.js" }, INSTALLED)).toEqual({ ok: false, problem: "duplicate_id" });
    expect(store.add({ id: "other", js_url: "http://localhost/c.js", dashboard_version: VERSION, requires: "Not An Id" }, INSTALLED)).toEqual({ ok: false, problem: "invalid_list" });
  });

  it("disables an entry without removing it, and sends only the enabled ones, without the flag", () => {
    const store = new DevStore(new MemoryStorage());
    store.add({ id: "smartpi", js_url: "http://localhost/a.js" }, INSTALLED);
    store.add({ id: "mine", js_url: "http://localhost/b.js", dashboard_version: VERSION }, INSTALLED);
    store.setEnabled("smartpi", false);
    expect(store.list().map((entry) => [entry.id, entry.enabled])).toEqual([["smartpi", false], ["mine", true]]);
    expect(store.active()).toEqual([{ id: "mine", js_url: "http://localhost/b.js", dashboard_version: VERSION }]);
    store.remove("mine");
    expect(store.list().map((entry) => entry.id)).toEqual(["smartpi"]);
  });

  it("stays in the browser that wrote it", () => {
    const first = new MemoryStorage();
    new DevStore(first).add({ id: "smartpi", js_url: "http://localhost/a.js" }, INSTALLED);
    expect(new DevStore(first).list()).toHaveLength(1);
    expect(new DevStore(new MemoryStorage()).list()).toEqual([]);
  });

  it("ignores a storage that is not readable", () => {
    const storage = new MemoryStorage();
    storage.setItem(DEV_STORAGE_KEY, "{not json");
    expect(new DevStore(storage).list()).toEqual([]);
    storage.setItem(DEV_STORAGE_KEY, JSON.stringify([{ id: 3 }, { id: "ok", js_url: "http://a/b.js", enabled: true }, "text"]));
    expect(new DevStore(storage).list().map((entry) => entry.id)).toEqual(["ok"]);
  });

  it("reads a typed list", () => {
    expect(parseList("core, core_tpi\ncore_lock  ")).toEqual(["core", "core_tpi", "core_lock"]);
    expect(parseList(undefined)).toEqual([]);
  });
});

describe("the diagnosis of a module that does not load", () => {
  it("gives the URL and the common causes", () => {
    const lines = diagnoseDevelopmentFailure("http://localhost:5173/ui.js", "http:");
    expect(lines[0]).toContain("http://localhost:5173/ui.js");
    expect(lines.join(" ")).toContain("stopped");
    expect(lines.join(" ")).toContain("Access-Control-Allow-Origin");
    expect(lines.join(" ")).not.toContain("mixed content");
  });

  it("names the mixed content first when an HTTPS page loads an HTTP module", () => {
    const lines = diagnoseDevelopmentFailure("http://localhost:5173/ui.js", "https:");
    expect(lines[1]).toContain("mixed content");
    expect(diagnoseDevelopmentFailure("https://dev.example.org/ui.js", "https:").join(" ")).not.toContain("mixed content");
  });
});

describe("in the dashboard", () => {
  let natives: TestPlugin[];

  beforeAll(async () => {
    const { definitions } = await nativeHost();
    natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  const PAGE = "/vtherm/core.top.configuration/core.page.dev_plugins";
  const root = (panel: HTMLElement) => panel.shadowRoot as ShadowRoot;
  const devPage = (panel: HTMLElement) => find(find(find(root(panel), "vtherm-contribution")?.shadowRoot as ShadowRoot, "core-dev-plugins-page")?.shadowRoot as ShadowRoot, "vtherm-dev-plugins-page") as HTMLElement & { reload: () => void; updateComplete: Promise<boolean> };
  const view = (panel: HTMLElement) => devPage(panel).shadowRoot as ShadowRoot;
  const store = () => new DevStore(window.localStorage);
  const request = (hass: { callWS: ReturnType<typeof vi.fn> }) => hass.callWS.mock.calls.map(([message]) => message as Record<string, unknown>).find((message) => message["type"] === "vtherm_dashboard/get_ui_plugins");
  const fill = (panel: HTMLElement, values: Record<string, string>) => {
    for (const [name, value] of Object.entries(values)) {
      (find<HTMLInputElement>(view(panel), `input[name="${name}"]`) as HTMLInputElement).value = value;
    }
    (find<HTMLFormElement>(view(panel), "form") as HTMLFormElement).dispatchEvent(new SubmitEvent("submit", { cancelable: true, bubbles: true }));
  };

  it("adds an entry from the page, which is listed and enabled, and asks to reload", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: PAGE });
    expect(find(view(panel), ".empty")).not.toBeNull();
    fill(panel, { id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION });
    await devPage(panel).updateComplete;
    expect(findAll(view(panel), "tr[data-plugin]").map((row) => row.getAttribute("data-plugin"))).toEqual(["mine"]);
    expect((find<HTMLInputElement>(view(panel), "input.enable") as HTMLInputElement).checked).toBe(true);
    expect(find(view(panel), ".notice")?.textContent).toContain("Reload the page");
    expect(store().list()).toMatchObject([{ id: "mine", enabled: true }]);
    const reload = vi.fn();
    devPage(panel).reload = reload;
    (find(view(panel), "button.reload") as HTMLElement).click();
    expect(reload).toHaveBeenCalled();
  });

  it("refuses an address with another scheme and says why", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: PAGE });
    fill(panel, { id: "mine", js_url: "javascript:alert(1)", dashboard_version: VERSION });
    await devPage(panel).updateComplete;
    expect(find(view(panel), ".error")?.textContent).toContain("http or https");
    expect(store().list()).toEqual([]);
  });

  it("refuses a plugin that is not installed when no constraint is given", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: PAGE });
    fill(panel, { id: "mine", js_url: "http://localhost:5173/ui.js" });
    await devPage(panel).updateComplete;
    expect(find(view(panel), ".error")?.textContent).toContain("version of the dashboard");
  });

  it("takes an entry for an installed plugin without a constraint, and says that it replaces the module", async () => {
    const { panel } = await mountPanel({ plugins: [...natives, { definition: { id: "smartpi", translations: defineTranslations({ a: "A" }), contributions: {} } }], path: PAGE });
    fill(panel, { id: "smartpi", js_url: "http://localhost:5173/ui.js" });
    await devPage(panel).updateComplete;
    expect(find(view(panel), "tr[data-plugin] td:nth-child(3)")?.textContent).toContain("Replaces the installed module");
  });

  it("disables an entry, keeps it in the list, and removes it on request", async () => {
    store().add({ id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION }, new Set());
    const { panel } = await mountPanel({ plugins: natives, path: PAGE });
    const box = find<HTMLInputElement>(view(panel), "input.enable") as HTMLInputElement;
    box.checked = false;
    box.dispatchEvent(new Event("change"));
    await devPage(panel).updateComplete;
    expect(store().list()).toMatchObject([{ id: "mine", enabled: false }]);
    expect(store().active()).toEqual([]);
    expect(find(view(panel), ".state")?.textContent).toBe("Disabled");
    (find(view(panel), "button.remove") as HTMLElement).click();
    await devPage(panel).updateComplete;
    expect(store().list()).toEqual([]);
  });

  it("sends the active entries with the request, and shows the banner with their identifiers on every page", async () => {
    const entries = store();
    entries.add({ id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION }, new Set());
    entries.add({ id: "off", js_url: "http://localhost:5174/ui.js", dashboard_version: VERSION }, new Set());
    entries.setEnabled("off", false);
    const { panel, hass } = await mountPanel({ plugins: natives, path: "/vtherm" });
    expect(request(hass)?.["dev_plugins"]).toEqual([{ id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION }]);
    expect(find(root(panel), ".devbanner")?.textContent).toContain("Development mode: mine");
    expect(find(root(panel), ".devbanner")?.textContent).not.toContain("off");
  });

  it("shows no banner and sends nothing without an active entry", async () => {
    const { panel, hass } = await mountPanel({ plugins: natives, path: "/vtherm" });
    expect(request(hass)).not.toHaveProperty("dev_plugins");
    expect(find(root(panel), ".devbanner")).toBeNull();
  });

  it("ignores the entries of the browser for a user who is not an administrator, and hides the page", async () => {
    store().add({ id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION }, new Set());
    const { panel, hass } = await mountPanel({ plugins: natives, path: "/vtherm/core.top.configuration", admin: false });
    expect(request(hass)).not.toHaveProperty("dev_plugins");
    expect(find(root(panel), ".devbanner")).toBeNull();
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(findAll(menu.shadowRoot as ShadowRoot, "a").map((link) => link.getAttribute("href"))).not.toContain("/vtherm/core.top.configuration/core.page.dev_plugins");
  });

  it("shows the page to an administrator in the group Dashboard", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: "/vtherm/core.top.configuration" });
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(findAll(menu.shadowRoot as ShadowRoot, "a").map((link) => link.getAttribute("href"))).toContain("/vtherm/core.top.configuration/core.page.dev_plugins");
  });

  it("shows the URL and the causes when the module of a plugin in development does not load, and the other plugins load", async () => {
    store().add({ id: "mine", js_url: "http://localhost:5173/ui.js", dashboard_version: VERSION }, new Set());
    const mine: TestPlugin = { definition: { id: "mine", translations: defineTranslations({ a: "A" }), contributions: {} }, source: "development" };
    const { panel } = await mountPanel({ plugins: [...natives, mine], path: "/vtherm/core.top.configuration/core.page.plugins", failing: { mine: new Error("Failed to fetch dynamically imported module") } });
    await settle(panel as never);
    const status = find(find(find(root(panel), "vtherm-contribution")?.shadowRoot as ShadowRoot, "core-plugins-page")?.shadowRoot as ShadowRoot, "vtherm-plugin-status-page");
    const table = find(status?.shadowRoot as ShadowRoot, "vtherm-plugin-status") as HTMLElement;
    const row = findAll(table.shadowRoot as ShadowRoot, "tr[data-plugin]").find((candidate) => candidate.getAttribute("data-plugin") === "mine") as HTMLElement;
    expect(row.textContent).toContain("Failed");
    expect(row.textContent).toContain("/mine/ui.js");
    expect(row.textContent).toContain("Access-Control-Allow-Origin");
    expect(findAll(table.shadowRoot as ShadowRoot, "tr[data-plugin]").some((candidate) => candidate.getAttribute("data-plugin") === "core" && candidate.textContent?.includes("Loaded"))).toBe(true);
  });

  it("lists the texts that a plugin in development lacks in the language of the user", async () => {
    const translations = defineTranslations({ title: "Title", help: "Help" }, { de: { title: "Titel" } });
    const mine: TestPlugin = { definition: { id: "mine", translations, contributions: {} }, source: "development" };
    const other: TestPlugin = { definition: { id: "other", translations: defineTranslations({ a: "A", b: "B" }, { de: { a: "A" } }), contributions: {} } };
    const { panel } = await mountPanel({ plugins: [...natives, mine, other], language: "de", path: "/vtherm/core.top.configuration/core.page.plugins" });
    translations.t("help");
    (other.definition.translations.t as (key: string) => string)("b");
    window.dispatchEvent(new CustomEvent("vtherm-state-changed"));
    await settle(panel as never);
    const status = find(find(find(root(panel), "vtherm-contribution")?.shadowRoot as ShadowRoot, "core-plugins-page")?.shadowRoot as ShadowRoot, "vtherm-plugin-status-page");
    const table = find(status?.shadowRoot as ShadowRoot, "vtherm-plugin-status") as HTMLElement;
    const rows = new Map(findAll(table.shadowRoot as ShadowRoot, "tr[data-plugin]").map((row) => [row.getAttribute("data-plugin"), row.textContent ?? ""]));
    expect(rows.get("mine")).toContain("Fehlende Texte in de");
    expect(rows.get("mine")).toContain("help");
    // The author of a plugin that is not in development is not told: its catalogs are not his to fix here.
    expect(rows.get("other")).not.toContain("b");
  });

  it("is a development entry that the registry accepts, whether it replaces an installed plugin or declares its own", () => {
    const entries: DevEntry[] = [{ id: "a", js_url: "http://x/a.js", enabled: true }];
    expect(validateEntry({ id: "b", js_url: "http://x/b.js", dashboard_version: VERSION }, entries, new Set()).ok).toBe(true);
    expect(validateEntry({ id: "a", js_url: "http://x/b.js" }, entries, new Set(["a"]))).toEqual({ ok: false, problem: "duplicate_id" });
  });
});
