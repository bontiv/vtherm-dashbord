// @vitest-environment happy-dom
/** The tab "VT add-ons": the catalog, the filters, the page of an add-on, the installation, the restart and the configuration. */
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { cleanup, find, findAll, mountPanel, plugin, settle } from "./support/dashboard-harness.ts";
import type { MountOptions } from "./support/dashboard-harness.ts";
import { catalogAnswer, complement, createFakeHacs } from "./support/fake-hacs.ts";
import type { FakeHacsOptions } from "./support/fake-hacs.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

// happy-dom cannot run DOMPurify, which `complements-sanitize.test.ts` checks on a complete DOM. Here the sanitizer only has to be used.
vi.mock("../src/complements/sanitize.ts", () => ({
  sanitizeDescription: (html: string) => `<div class="sanitized">${html.replace(/<script[\s\S]*?<\/script>/g, "")}</div>`,
  plainText: (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
}));

const TAB = "core_complements.top.complements";
const CATALOG = `/vtherm/${TAB}/core_complements.page.catalog`;
const INSTALLED = `/vtherm/${TAB}/core_complements.page.installed`;

let natives: { definition: UiPluginDefinition }[];
let model: { reset(): void; restartOptions: unknown };

beforeAll(async () => {
  const { definitions } = await nativeHost();
  natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
  ({ complementsModel: model } = (await import("../src/complements/model.ts")) as unknown as { complementsModel: typeof model });
});

afterEach(() => {
  cleanup();
  model.reset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const card = (fields: Record<string, unknown> = {}) => complement({ type: "interface", family: "interface", hacs_category: "plugin", ha_domain: null, ...fields });
const SWITCH = complement({ name: "Switch helper", description: "<p>Helps switches</p>", description_fr: "<p>Aide les interrupteurs</p>", family: "device-helper", certification: "official" });
const SECOND = complement({ name: "Second feature", description: "<p>Another thing</p>", certification: "community", author: null, ha: { found: true, loaded: true, config_entries: 1, config_flow: true } });
const BLUEPRINT = complement({ id: "https://example.org/bp.yaml", name: "A blueprint", type: "blueprint", slug: null, url: "https://example.org/bp.yaml", link: "https://example.org/bp.yaml", repository: null, hacs_category: null, ha_domain: null, family: "device-helper" });

interface Setup extends MountOptions {
  complements?: Record<string, unknown>[];
  hacs?: FakeHacsOptions;
  catalog?: Record<string, unknown>;
  catalogFailure?: { code: string };
}

async function open(path: string, setup: Setup = {}) {
  const hacs = createFakeHacs(setup.hacs);
  const calls: Record<string, unknown>[] = [];
  const catalog = async (message: Record<string, unknown>) => {
    if (message["type"] !== "vtherm_dashboard/get_complements") {
      return undefined;
    }
    calls.push(message);
    if (setup.catalogFailure !== undefined) {
      throw { code: setup.catalogFailure.code, message: "failed" };
    }
    return catalogAnswer(setup.complements ?? [SWITCH, SECOND, BLUEPRINT, card({ name: "Nice card" })], setup.catalog);
  };
  const mounted = await mountPanel({ plugins: natives, path, handlers: [catalog, hacs.handle], ...setup });
  await ready(mounted.panel);
  return { ...mounted, hacs, catalogCalls: calls };
}

const root = (panel: HTMLElement) => panel.shadowRoot as ShadowRoot;
const page = (panel: HTMLElement) => find(find(root(panel), "vtherm-contribution")?.shadowRoot as ShadowRoot, "#mount")?.firstElementChild as HTMLElement | undefined;
const view = (panel: HTMLElement) => page(panel)?.shadowRoot as ShadowRoot;
const texts = (nodes: readonly HTMLElement[]) => nodes.map((node) => node.textContent?.trim());
const click = (panel: HTMLElement, selector: string) => (find(view(panel), selector) as HTMLElement).click();
const names = (panel: HTMLElement) => texts(findAll(view(panel), "li.card a.name"));

/** Wait until the page shows something other than "loading". */
async function ready(panel: HTMLElement): Promise<void> {
  await vi.waitFor(() => {
    const element = page(panel) as (HTMLElement & { updateComplete?: Promise<boolean> }) | undefined;
    if (element?.shadowRoot === null || element?.shadowRoot === undefined || (element.shadowRoot.textContent ?? "").includes("Loading the catalog") || (element.shadowRoot.textContent ?? "").includes("Chargement du catalogue")) {
      throw new Error("still loading");
    }
  });
  await settle(panel as never);
}

/** Wait for the page to draw again. */
const redraw = async (panel: HTMLElement) => {
  await vi.waitFor(() => expect(page(panel)).toBeDefined());
  await ((page(panel) as unknown as { updateComplete: Promise<boolean> }).updateComplete);
  await settle(panel as never);
};

describe("the tab", () => {
  it("is in the bar after Thermostats, before the gear, and has a catalog and an installed entry", async () => {
    const { panel } = await open(CATALOG);
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(texts(findAll(bar.shadowRoot as ShadowRoot, "nav.start a"))).toEqual(["Dashboard", "Thermostats", "VT add-ons"]);
    expect(findAll(bar.shadowRoot as ShadowRoot, "nav.end a")).toHaveLength(1);
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(texts(findAll(menu.shadowRoot as ShadowRoot, "a"))).toEqual(["Catalog", "Installed"]);
  });

  it.each([
    ["en", "VT add-ons"],
    ["fr", "VT Compléments"],
    ["de", "VT-Erweiterungen"],
  ])("is titled for the language %s", async (language, title) => {
    const { panel } = await open(CATALOG, { language });
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(texts(findAll(bar.shadowRoot as ShadowRoot, "nav.start a"))[2]).toBe(title);
  });

  it("is not shown to a user who is not an administrator", async () => {
    const { panel } = await mountPanel({ plugins: natives, admin: false, handlers: [createFakeHacs().handle] });
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(texts(findAll(bar.shadowRoot as ShadowRoot, "nav.start a"))).toEqual(["Dashboard", "Thermostats"]);
  });

  it("is hidden by a plugin that removes it", async () => {
    const remover = plugin("remover", { top_tab: [{ id: "remover.hide", placement: { remove: TAB } }] });
    const { panel } = await mountPanel({ plugins: [...natives, { definition: remover }], handlers: [createFakeHacs().handle] });
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(texts(findAll(bar.shadowRoot as ShadowRoot, "nav.start a"))).toEqual(["Dashboard", "Thermostats"]);
  });
});

describe("the catalog", () => {
  it("lists the add-ons with their type, certification and state", async () => {
    const { panel } = await open(CATALOG);
    expect(names(panel)).toEqual(["Switch helper", "Second feature", "A blueprint", "Nice card"]);
    const first = findAll(view(panel), "li.card")[0] as HTMLElement;
    expect(texts(findAll(first, ".badge"))).toEqual(["Integration", "Device helper", "Official", "Not installed"]);
    expect(first.textContent).toContain("someone");
    expect(texts(findAll(findAll(view(panel), "li.card")[1] as HTMLElement, ".badge")).at(-1)).toBe("Configured");
  });

  it("shows the description in the language of the user, and falls back on English", async () => {
    const french = await open(CATALOG, { language: "fr" });
    expect(findAll(view(french.panel), ".excerpt").map((node) => node.textContent?.trim())).toContain("Aide les interrupteurs");
    expect(findAll(view(french.panel), ".excerpt").map((node) => node.textContent?.trim())).toContain("Another thing");
    cleanup();
    model.reset();
    const german = await open(CATALOG, { language: "de" });
    expect(findAll(view(german.panel), ".excerpt").map((node) => node.textContent?.trim())).toContain("Helps switches");
  });

  it("keeps the add-ons whose name or description contains the search", async () => {
    const { panel } = await open(CATALOG);
    const input = find<HTMLInputElement>(view(panel), 'input[name="query"]') as HTMLInputElement;
    input.value = "another";
    input.dispatchEvent(new Event("input"));
    await redraw(panel);
    expect(names(panel)).toEqual(["Second feature"]);
    input.value = "NICE";
    input.dispatchEvent(new Event("input"));
    await redraw(panel);
    expect(names(panel)).toEqual(["Nice card"]);
    input.value = "nothing like it";
    input.dispatchEvent(new Event("input"));
    await redraw(panel);
    expect(find(view(panel), ".message")?.textContent).toContain("No add-on matches");
  });

  it.each([
    ["type", "blueprint", ["A blueprint"]],
    ["family", "device-helper", ["Switch helper", "A blueprint"]],
    ["certification", "community", ["Second feature"]],
    ["state", "configured", ["Second feature"]],
  ])("filters by %s", async (name, value, expected) => {
    const { panel } = await open(CATALOG);
    const select = find<HTMLSelectElement>(view(panel), `select[name="${name}"]`) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event("change"));
    await redraw(panel);
    expect(names(panel)).toEqual(expected);
  });

  it("lists only the installed add-ons in Installed", async () => {
    const { panel } = await open(INSTALLED, { hacs: { repositories: [{ id: "9", full_name: "owner/nice-card", category: "plugin", installed: true }] } });
    expect(names(panel)).toEqual(["Second feature", "Nice card"]);
  });

  it("says so when nothing is installed", async () => {
    const { panel } = await open(INSTALLED, { complements: [SWITCH] });
    expect(find(view(panel), ".message")?.textContent).toContain("No add-on is installed yet");
  });

  it("shows the copy with a warning when the catalog could not be refreshed", async () => {
    const { panel } = await open(CATALOG, { catalog: { stale: true } });
    expect(find(view(panel), ".banner.warning")?.textContent).toContain("could not be refreshed");
    expect(names(panel)).toHaveLength(4);
  });

  it("shows an error and a button to try again when there is no catalog", async () => {
    const { panel, catalogCalls } = await open(CATALOG, { catalogFailure: { code: "catalog_unavailable" } });
    expect(find(view(panel), ".banner.error")?.textContent).toContain("could not be read");
    click(panel, "button.retry");
    await vi.waitFor(() => expect(catalogCalls).toHaveLength(2));
    expect(catalogCalls[1]).toMatchObject({ refresh: true });
  });

  it("reads the catalog again without waiting when the user refreshes", async () => {
    const { panel, catalogCalls } = await open(CATALOG);
    click(panel, "button.refresh");
    await vi.waitFor(() => expect(catalogCalls).toHaveLength(2));
    expect(catalogCalls[0]).toMatchObject({ refresh: false });
    expect(catalogCalls[1]).toMatchObject({ refresh: true });
  });

  it("keeps the catalog readable and says why when HACS is absent, disabled, or too old", async () => {
    for (const [hacs, message] of [
      [{ absent: true }, "HACS is required"],
      [{ disabledReason: "rate_limit" }, "HACS is disabled: rate_limit"],
      [{ version: "1.30.0" }, "older than 2.0.0"],
    ] as const) {
      const { panel } = await open(CATALOG, { hacs });
      expect(names(panel)).toHaveLength(4);
      expect(find(view(panel), ".banner.warning")?.textContent).toContain(message);
      expect(find(view(panel), ".banner.warning a")?.getAttribute("href")).toBe("https://hacs.xyz/docs/use/");
      cleanup();
      model.reset();
    }
  });
});

describe("the page of an add-on", () => {
  const detail = (complementId: string) => `${CATALOG}/${encodeURIComponent(complementId)}`;

  it("opens from the list, with its own address and the breadcrumb of the catalog", async () => {
    const { panel } = await open(CATALOG);
    click(panel, "li.card a.name");
    await redraw(panel);
    expect(window.location.pathname).toBe(`${CATALOG}/${encodeURIComponent("owner/switch-helper")}`);
    await vi.waitFor(() => expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["VT add-ons", "Catalog", "Switch helper"]));
    expect(find(view(panel), "h2")?.textContent).toBe("Switch helper");
  });

  it("shows the same add-on after a reload of the browser", async () => {
    const { panel } = await open(detail("owner/second-feature"));
    expect(find(view(panel), "h2")?.textContent).toBe("Second feature");
    await vi.waitFor(() => expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["VT add-ons", "Catalog", "Second feature"]));
  });

  it("shows the description through the sanitizer, the repository link in a new tab, and the author", async () => {
    const { panel } = await open(detail("owner/switch-helper"));
    expect(find(view(panel), ".description .sanitized")?.textContent).toContain("Helps switches");
    const link = find<HTMLAnchorElement>(view(panel), "dl a") as HTMLAnchorElement;
    expect(link.href).toBe("https://github.com/owner/switch-helper");
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noreferrer");
    expect(find(view(panel), "dl")?.textContent).toContain("someone");
  });

  it("does not run a script of a description", async () => {
    const hostile = complement({ name: "Hostile", description: '<p>Text</p><script>window.__pwned = true</script><img src=x onerror="window.__pwned = true">' });
    const { panel } = await open(detail("owner/hostile"), { complements: [hostile] });
    expect(find(view(panel), ".description script")).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("offers a link and no installation for a blueprint", async () => {
    const { panel } = await open(detail("https://example.org/bp.yaml"));
    expect(find(view(panel), "button.install")).toBeNull();
    expect(find<HTMLAnchorElement>(view(panel), "dl a")?.href).toBe("https://example.org/bp.yaml");
    expect(find(view(panel), ".badge.state-link_only")).not.toBeNull();
  });

  it("says that the add-on is not in the catalog when the address is wrong", async () => {
    const { panel } = await open(detail("owner/nothing"));
    expect(find(view(panel), ".message")?.textContent).toContain("not in the catalog");
  });

  it("links to HACS for the update and the removal of an installed add-on", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { repositories: [{ id: "42", full_name: "owner/switch-helper", category: "integration", installed: true }] } });
    const link = findAll<HTMLAnchorElement>(view(panel), "p a").find((anchor) => anchor.href.includes("/hacs/"));
    expect(link?.getAttribute("href")).toBe("/hacs/repository/42");
  });
});

describe("the installation", () => {
  const detail = (id: string) => `${CATALOG}/${encodeURIComponent(id)}`;
  const askToInstall = async (panel: HTMLElement) => {
    click(panel, "button.install");
    await redraw(panel);
  };

  it("asks for a confirmation with the repository, the category, the certification and the author", async () => {
    const { panel } = await open(detail("owner/switch-helper"));
    await askToInstall(panel);
    const dialog = find(view(panel), '[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain("Install Switch helper?");
    expect(dialog.textContent).toContain("owner/switch-helper");
    expect(dialog.textContent).toContain("integration");
    expect(dialog.textContent).toContain("Official");
    expect(dialog.textContent).toContain("someone");
    expect(find(dialog, ".warning")).toBeNull();
  });

  it("warns about third-party code for a community add-on", async () => {
    const { panel } = await open(detail("owner/community"), { complements: [complement({ name: "Community", certification: "community" })] });
    await askToInstall(panel);
    expect(find(view(panel), '[role="dialog"] .warning')?.textContent).toContain("third-party code");
  });

  it("does not call HACS to install when the user cancels", async () => {
    const { panel, hacs } = await open(detail("owner/switch-helper"));
    const before = hacs.commands().length;
    await askToInstall(panel);
    click(panel, ".dialog button.cancel");
    await redraw(panel);
    expect(find(view(panel), '[role="dialog"]')).toBeNull();
    expect(hacs.commands().slice(before).filter((type) => type !== "hacs/info" && type !== "hacs/repositories/list")).toEqual([]);
  });

  it("adds the repository, downloads it and proposes the restart without doing it", async () => {
    const { panel, hacs, hass } = await open(detail("owner/switch-helper"), { hacs: { addable: ["owner/switch-helper"], afterDownload: (repository) => { repository.status = "pending-restart"; } } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".done")?.textContent).toContain("Restart Home Assistant"));
    expect(hacs.commands()).toContain("hacs/repositories/add");
    expect(hacs.commands()).toContain("hacs/repository/download");
    expect(hass.callService).not.toHaveBeenCalled();
    expect(find(view(panel), ".badge.state-restart_required")).not.toBeNull();
  });

  it("keeps the add-on in 'restart required' when the user postpones, and lets another one be installed", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { addable: ["owner/switch-helper"], afterDownload: (repository) => { repository.status = "pending-restart"; } } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".done")).not.toBeNull());
    click(panel, "button.later");
    await redraw(panel);
    expect(find(view(panel), ".done")).toBeNull();
    expect(find(view(panel), ".badge.state-restart_required")).not.toBeNull();
    window.history.pushState(null, "", detail("owner/nice-card"));
    window.dispatchEvent(new PopStateEvent("popstate"));
    await redraw(panel);
    expect(find(view(panel), "button.install")).not.toBeNull();
  });

  it("restarts only after a second confirmation, then shows the reconnection and the new states", async () => {
    const { panel, hass } = await open(detail("owner/switch-helper"), { hacs: { addable: ["owner/switch-helper"], afterDownload: (repository) => { repository.status = "pending-restart"; } } });
    model.restartOptions = { intervalMs: 1, timeoutMs: 1000, sleep: () => new Promise((resolve) => setTimeout(resolve, 60)) };
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".done button.restart")).not.toBeNull());
    click(panel, ".done button.restart");
    await redraw(panel);
    expect(find(view(panel), '[role="dialog"]')?.textContent).toContain("Restart Home Assistant now?");
    expect(hass.callService).not.toHaveBeenCalled();
    let down = 0;
    const answer = hass.callWS.getMockImplementation() as (message: Record<string, unknown>) => Promise<unknown>;
    hass.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message["type"] === "get_config") {
        down += 1;
        if (down < 3) {
          throw new Error("connection lost");
        }
        return {};
      }
      return answer(message);
    });
    click(panel, ".dialog button.confirm-restart");
    expect(hass.callService).toHaveBeenCalledWith("homeassistant", "restart");
    await vi.waitFor(() => expect(find(view(panel), ".banner.warning")?.textContent).toContain("is restarting"));
    await vi.waitFor(() => expect(find(view(panel), ".banner.warning")).toBeNull());
    expect(down).toBeGreaterThanOrEqual(3);
  });

  it("shows the message of HACS when the download fails, and offers to try again and a link to HACS", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { repositories: [{ id: "5", full_name: "owner/switch-helper", category: "integration" }], downloadErrors: { "owner/switch-helper": "No release found" } } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".banner.error")?.textContent).toContain("No release found"));
    expect(find(view(panel), ".banner.error a")?.getAttribute("href")).toBe("/hacs/repository/5");
    expect(find(view(panel), "button.install")?.textContent).toContain("Try again");
  });

  it("explains a repository that HACS silently refused", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { addable: [] } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".banner.error")?.textContent).toContain("did not add the repository"));
  });

  it("links to HACS when one of its commands changed", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { addable: ["owner/switch-helper"], unknownCommands: ["hacs/repositories/add"] } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".banner.error")?.textContent).toContain("no longer answers the way"));
    expect(find(view(panel), ".banner.error a")?.getAttribute("href")).toBe("/hacs");
  });

  it("asks to reload the page after a card, without a restart", async () => {
    const { panel } = await open(detail("owner/nice-card"), { hacs: { addable: ["owner/nice-card"] } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".done")?.textContent).toContain("Reload this page"));
    expect(find(view(panel), ".done button.restart")).toBeNull();
    expect(find(view(panel), ".badge.state-installed")).not.toBeNull();
  });

  it("does not offer to install without HACS", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { absent: true } });
    expect(find(view(panel), "button.install")).toBeNull();
    expect(find(view(panel), ".banner.warning")?.textContent).toContain("HACS is required");
  });
});

describe("the configuration", () => {
  const detail = (id: string) => `${CATALOG}/${encodeURIComponent(id)}`;

  it("opens the config flow of Home Assistant for an integration to configure", async () => {
    const toConfigure = complement({ name: "Waiting", ha_domain: "waiting_domain", ha: { found: true, loaded: true, config_entries: 0, config_flow: true } });
    const { panel } = await open(detail("owner/waiting"), { complements: [toConfigure] });
    expect(find(view(panel), ".badge.state-to_configure")).not.toBeNull();
    click(panel, "button.configure");
    expect(window.location.pathname + window.location.search).toBe("/config/integrations/dashboard/add?domain=waiting_domain");
  });

  it("proposes nothing when the integration has no config flow", async () => {
    const plain = complement({ name: "Plain", ha: { found: true, loaded: true, config_entries: 0, config_flow: false } });
    const { panel } = await open(detail("owner/plain"), { complements: [plain] });
    expect(find(view(panel), "button.configure")).toBeNull();
    expect(find(view(panel), ".badge.state-installed")).not.toBeNull();
  });

  it("proposes the restart for an add-on that HACS downloaded before a restart", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { repositories: [{ id: "3", full_name: "owner/switch-helper", category: "integration", installed: true, status: "pending-restart" }] } });
    expect(find(view(panel), ".badge.state-restart_required")).not.toBeNull();
    expect(find(view(panel), "button.restart")).not.toBeNull();
  });
});
