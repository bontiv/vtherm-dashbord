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
let model: { reset(): void; restartOptions: unknown; hacsLoading: boolean };

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
  /** Do not wait for HACS: the test looks at the page while HACS is read. */
  keepHacsLoading?: boolean;
  /** HACS answers only when this promise is resolved. */
  holdHacs?: Promise<void>;
  /** The answer to `vtherm_dashboard/get_complement_readme`. */
  readme?: (message: Record<string, unknown>) => Promise<unknown>;
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
  const hacsHandler = async (message: Record<string, unknown>) => {
    if (setup.holdHacs !== undefined && String(message["type"]).startsWith("hacs/")) {
      await setup.holdHacs;
    }
    return hacs.handle(message);
  };
  const mounted = await mountPanel({ plugins: natives, path, handlers: [catalog, hacsHandler, async (message) => (message["type"] === "vtherm_dashboard/get_complement_readme" ? await setup.readme?.(message) : undefined)], ...setup });
  await ready(mounted.panel, setup.keepHacsLoading !== true);
  return { ...mounted, hacs, catalogCalls: calls };
}

const root = (panel: HTMLElement) => panel.shadowRoot as ShadowRoot;
const page = (panel: HTMLElement) => find(find(root(panel), "vtherm-contribution")?.shadowRoot as ShadowRoot, "#mount")?.firstElementChild as HTMLElement | undefined;
const view = (panel: HTMLElement) => page(panel)?.shadowRoot as ShadowRoot;
const texts = (nodes: readonly HTMLElement[]) => nodes.map((node) => node.textContent?.trim());
const click = (panel: HTMLElement, selector: string) => (find(view(panel), selector) as HTMLElement).click();
const cardOf = (panel: HTMLElement, name: string) => findAll(view(panel), "li.card").find((item) => find(item, "a.name")?.textContent === name) as HTMLElement;
const openCard = (panel: HTMLElement, name: string) => (find(cardOf(panel, name), "a.name") as HTMLElement).click();
const names = (panel: HTMLElement) => texts(findAll(view(panel), "li.card a.name"));

/** Wait until the page shows something other than "loading". */
async function ready(panel: HTMLElement, hacs = true): Promise<void> {
  await vi.waitFor(() => {
    if (hacs && model.hacsLoading) {
      throw new Error("HACS is still read");
    }
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
    expect(names(panel)).toEqual(["A blueprint", "Nice card", "Switch helper", "Second feature"]);
    const switchCard = cardOf(panel, "Switch helper");
    expect(texts(findAll(switchCard, ".status"))).toEqual(["Not installed"]);
    expect(texts(findAll(switchCard, ".facts span"))).toEqual(["Integration", "Device helper", "Official"]);
    expect(switchCard.textContent).toContain("Author: someone");
    expect(texts(findAll(cardOf(panel, "Second feature"), ".status"))).toEqual(["Configured"]);
  });

  it("shows the description in the language of the user, and falls back on English", async () => {
    const french = await open(CATALOG, { language: "fr" });
    expect(findAll(view(french.panel), ".excerpt").map((node) => node.textContent?.trim())).toContain("Aide les interrupteurs");
    expect(findAll(view(french.panel), ".excerpt").map((node) => node.textContent?.trim())).toContain("Another thing (EN)");
    cleanup();
    model.reset();
    const german = await open(CATALOG, { language: "de" });
    expect(findAll(view(german.panel), ".excerpt").map((node) => node.textContent?.trim())).toContain("Helps switches (EN)");
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
    ["family", "device-helper", ["A blueprint", "Switch helper"]],
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
    expect(names(panel)).toEqual(["Nice card", "Second feature"]);
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
    openCard(panel, "Switch helper");
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
    expect(find(view(panel), ".status.state-link_only")).not.toBeNull();
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
    expect(dialog.textContent).toContain("Integration");
    expect(dialog.textContent).not.toContain("integration");
    const repositoryLink = find<HTMLAnchorElement>(dialog, "a") as HTMLAnchorElement;
    expect(repositoryLink.href).toBe("https://github.com/owner/switch-helper");
    expect(repositoryLink.target).toBe("_blank");
    expect(repositoryLink.rel).toBe("noopener noreferrer");
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
    expect(find(view(panel), ".status.state-restart_required")).not.toBeNull();
  });

  it("keeps the add-on in 'restart required' when the user postpones, and lets another one be installed", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { addable: ["owner/switch-helper"], afterDownload: (repository) => { repository.status = "pending-restart"; } } });
    await askToInstall(panel);
    click(panel, ".dialog button.confirm-install");
    await vi.waitFor(() => expect(find(view(panel), ".done")).not.toBeNull());
    click(panel, "button.later");
    await redraw(panel);
    expect(find(view(panel), ".done")).toBeNull();
    expect(find(view(panel), ".status.state-restart_required")).not.toBeNull();
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
    expect(find(view(panel), ".status.state-installed")).not.toBeNull();
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
    expect(find(view(panel), ".status.state-to_configure")).not.toBeNull();
    click(panel, "button.configure");
    expect(window.location.pathname + window.location.search).toBe("/config/integrations/dashboard/add?domain=waiting_domain");
  });

  it("proposes nothing when the integration has no config flow", async () => {
    const plain = complement({ name: "Plain", ha: { found: true, loaded: true, config_entries: 0, config_flow: false } });
    const { panel } = await open(detail("owner/plain"), { complements: [plain] });
    expect(find(view(panel), "button.configure")).toBeNull();
    expect(find(view(panel), ".status.state-installed")).not.toBeNull();
  });

  it("proposes the restart for an add-on that HACS downloaded before a restart", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { hacs: { repositories: [{ id: "3", full_name: "owner/switch-helper", category: "integration", installed: true, status: "pending-restart" }] } });
    expect(find(view(panel), ".status.state-restart_required")).not.toBeNull();
    expect(find(view(panel), "button.restart")).not.toBeNull();
  });
});

const withHacs = (id: string, fields: Record<string, unknown> = {}) => ({ hacs: { repositories: [{ id: "1", full_name: id, category: "integration", installed: true, ...fields }] } });
const toConfigure = (fields: Record<string, unknown> = {}) => complement({ name: "Waiting", ha_domain: "waiting_domain", ha: { found: true, loaded: true, config_entries: 0, config_flow: true }, ...fields });
const configured = (fields: Record<string, unknown> = {}) => complement({ name: "Done", ha: { found: true, loaded: true, config_entries: 1, config_flow: true }, ...fields });

describe("the page before HACS answers", () => {
  it("shows the name, the breadcrumb and the reading status without an install button, then the action", async () => {
    let release: () => void = () => undefined;
    const holdHacs = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { panel } = await open(`${CATALOG}/${encodeURIComponent("owner/switch-helper")}`, { holdHacs, keepHacsLoading: true });
    expect(find(view(panel), "h2")?.textContent).toBe("Switch helper");
    await vi.waitFor(() => expect(texts(findAll(root(panel), "vtherm-breadcrumb li"))).toEqual(["VT add-ons", "Catalog", "Switch helper"]));
    expect(find(view(panel), ".status.reading")?.textContent?.trim()).toBe("Reading HACS…");
    expect(find(view(panel), "button.install")).toBeNull();
    release();
    await vi.waitFor(() => expect(find(view(panel), "button.install")).not.toBeNull());
    expect(find(view(panel), ".status.state-not_installed")).not.toBeNull();
  });
});

describe("the description", () => {
  it("keeps the line breaks of a paragraph and adds no blank line between paragraphs", async () => {
    const { panel } = await open(`${CATALOG}/${encodeURIComponent("owner/lines")}`, { complements: [complement({ name: "Lines", description: "<p>a\nb\nc\nd\ne</p>\n<p>second</p>" })] });
    const css = ((page(panel)?.constructor as unknown as { styles: { cssText?: string }[] }).styles ?? []).map((style) => style.cssText ?? "").join("\n");
    expect(css).toMatch(/\.description p,\s*\.description li\s*\{[^}]*white-space: pre-line/);
    expect(css).not.toMatch(/\.description\s*\{[^}]*white-space/);
    const text = find(view(panel), ".description .sanitized p")?.textContent ?? "";
    expect(text.split("\n")).toHaveLength(5);
  });
});

describe("the filter bar", () => {
  it("aligns its fields on their top, since the search field keeps room for a hint under it", async () => {
    const { panel } = await open(CATALOG);
    const css = ((page(panel)?.constructor as unknown as { styles: { cssText?: string }[] }).styles ?? []).map((style) => style.cssText ?? "").join("\n");
    expect(css).toMatch(/\.filters\s*\{[^}]*align-items: flex-start/);
    expect(css).not.toMatch(/\.filters\s*\{[^}]*align-items: flex-end/);
  });
});

describe("the status and the cards", () => {
  it("separates the status from the metadata and shows the experimental badge on a name without prefix", async () => {
    const { panel } = await open(CATALOG, { complements: [complement({ name: "[EXPERIMENTAL] An assistant" })] });
    const item = cardOf(panel, "An assistant");
    expect(item).toBeDefined();
    expect(find(item, ".experimental")?.textContent).toBe("Experimental");
    expect(find(item, ".status")?.textContent?.trim()).toBe("Not installed");
    expect(find(item, ".facts")?.contains(find(item, ".status"))).toBe(false);
  });

  it("matches the search on the full name, with the prefix", async () => {
    const { panel } = await open(CATALOG, { complements: [complement({ name: "[EXPERIMENTAL] An assistant" })] });
    const input = find<HTMLInputElement>(view(panel), 'input[name="query"]') as HTMLInputElement;
    input.value = "experimental";
    input.dispatchEvent(new Event("input"));
    await redraw(panel);
    expect(names(panel)).toEqual(["An assistant"]);
  });

  it("writes the author with the typography of the language, and marks the English fallback", async () => {
    const { panel } = await open(CATALOG, { language: "fr" });
    expect(cardOf(panel, "Switch helper").textContent).toContain("Auteur : someone");
    const excerpt = find(cardOf(panel, "A blueprint"), ".excerpt") as HTMLElement;
    expect(excerpt.getAttribute("lang")).toBe("en");
    expect(excerpt.textContent).toContain("(EN)");
    expect(find(cardOf(panel, "Switch helper"), ".excerpt")?.getAttribute("lang")).toBeNull();
  });

  it("opens the page of the add-on when the user clicks on the link that covers the card, and offers no install button", async () => {
    const { panel } = await open(CATALOG);
    expect(find(view(panel), "li.card button.install")).toBeNull();
    openCard(panel, "Nice card");
    await redraw(panel);
    expect(window.location.pathname).toBe(`${CATALOG}/${encodeURIComponent("owner/nice-card")}`);
    const css = ((page(panel)?.constructor as unknown as { styles: { cssText?: string }[] }).styles ?? []).map((style) => style.cssText ?? "").join("\n");
    expect(css).toMatch(/\.card a\.name::after\s*\{[^}]*position: absolute;[^}]*inset: 0/);
    expect(css).toMatch(/\.card \.actions\s*\{[^}]*position: relative;[^}]*z-index: 1/);
  });

  it("shows the update and keeps the state, on the card and on the page", async () => {
    const { panel } = await open(CATALOG, { complements: [configured()], ...withHacs("owner/done", { installed_version: "1.2.0", available_version: "1.3.0" }) });
    const item = cardOf(panel, "Done");
    expect(texts(findAll(item, ".status"))).toEqual(["Configured", "Update available"]);
    expect(item.textContent).toContain("1.2.0 → 1.3.0");
    find<HTMLElement>(item, "button.open-hacs")?.click();
    expect(window.location.pathname).toBe("/hacs/repository/1");
    openCard(panel, "Done");
  });

  it("shows no update when the versions are the same", async () => {
    const { panel } = await open(CATALOG, { complements: [configured()], ...withHacs("owner/done", { installed_version: "1.2.0", available_version: "1.2.0" }) });
    expect(find(cardOf(panel, "Done"), ".status.update")).toBeNull();
    expect(cardOf(panel, "Done").textContent).toContain("Version 1.2.0");
  });

  it("configures from a card without opening the page", async () => {
    const { panel } = await open(CATALOG, { complements: [toConfigure()] });
    find<HTMLElement>(cardOf(panel, "Waiting"), "button.configure")?.click();
    expect(window.location.pathname + window.location.search).toBe("/config/integrations/dashboard/add?domain=waiting_domain");
  });

  it("asks to confirm a restart from a card, and does not restart without it", async () => {
    const { panel, hass } = await open(CATALOG, { complements: [complement({ name: "Pending" })], ...withHacs("owner/pending", { status: "pending-restart" }) });
    find<HTMLElement>(cardOf(panel, "Pending"), "button.restart")?.click();
    await redraw(panel);
    expect(find(view(panel), '[role="dialog"]')?.textContent).toContain("Restart Home Assistant now?");
    expect(hass.callService).not.toHaveBeenCalled();
    click(panel, "button.cancel");
    await redraw(panel);
    expect(hass.callService).not.toHaveBeenCalled();
  });
});

describe("the filters of the list", () => {
  const select = async (panel: HTMLElement, name: string, value: string) => {
    const element = find<HTMLSelectElement>(view(panel), `select[name="${name}"]`) as HTMLSelectElement;
    element.value = value;
    element.dispatchEvent(new Event("change"));
    await redraw(panel);
  };
  const options = (panel: HTMLElement, name: string) => findAll<HTMLOptionElement>(view(panel), `select[name="${name}"] option`).map((option) => option.value);

  it("proposes only the values of the add-ons of the page", async () => {
    const { panel } = await open(INSTALLED, { complements: [SECOND, SWITCH, BLUEPRINT], ...withHacs("owner/switch-helper") });
    expect(options(panel, "state")).toEqual(["", "installed", "configured"]);
    expect(options(panel, "family")).toEqual(["", "device-helper", "feature"]);
    expect(options(panel, "type")).toEqual(["", "integration"]);
  });

  it("keeps only the add-ons to handle with the option To handle", async () => {
    const { panel } = await open(CATALOG, { complements: [toConfigure(), configured(), complement({ name: "Plain" })] });
    expect(options(panel, "state")[1]).toBe("to_handle");
    await select(panel, "state", "to_handle");
    expect(names(panel)).toEqual(["Waiting"]);
  });

  it("counts the add-ons and clears the filters", async () => {
    const { panel } = await open(CATALOG);
    expect(find(view(panel), ".count")?.textContent).toBe("4 add-ons");
    expect(find(view(panel), ".bar .clear-filters")).toBeNull();
    await select(panel, "type", "blueprint");
    expect(find(view(panel), ".count")?.textContent).toBe("1 add-on");
    click(panel, ".bar .clear-filters");
    await redraw(panel);
    expect(find(view(panel), ".count")?.textContent).toBe("4 add-ons");
    expect(find<HTMLSelectElement>(view(panel), 'select[name="type"]')?.value).toBe("");
  });

  it("offers to clear the filters in the message of an empty list", async () => {
    const { panel } = await open(CATALOG);
    const input = find<HTMLInputElement>(view(panel), 'input[name="query"]') as HTMLInputElement;
    input.value = "nothing like it";
    input.dispatchEvent(new Event("input"));
    await redraw(panel);
    expect(find(view(panel), ".message")).not.toBeNull();
    expect(findAll(view(panel), ".clear-filters").length).toBeGreaterThanOrEqual(2);
    click(panel, ".clear-filters");
    await redraw(panel);
    expect(names(panel)).toHaveLength(4);
    expect(find<HTMLInputElement>(view(panel), 'input[name="query"]')?.value).toBe("");
  });

  it("groups by certification by default, in the order of the levels", async () => {
    const { panel } = await open(CATALOG, { complements: [SECOND, SWITCH, complement({ name: "Mid", certification: "recommended" })] });
    expect(texts(findAll(view(panel), "h3.group-title"))).toEqual(["Official", "Recommended", "Community"]);
    expect(names(panel)).toEqual(["Switch helper", "Mid", "Second feature"]);
  });

  it("sorts by name, then by state with the add-ons to handle first", async () => {
    const { panel } = await open(CATALOG, { complements: [complement({ name: "Zeta" }), configured({ name: "Alpha" }), toConfigure({ name: "Mid" })] });
    await select(panel, "sort", "name");
    expect(names(panel)).toEqual(["Alpha", "Mid", "Zeta"]);
    expect(find(view(panel), "h3.group-title")).toBeNull();
    await select(panel, "sort", "state");
    expect(names(panel)).toEqual(["Mid", "Alpha", "Zeta"]);
  });

  it("refreshes with an icon button that has a label, or a text button without it", async () => {
    const { panel } = await open(CATALOG);
    expect(find(view(panel), "ha-icon-button")).toBeNull();
    expect(find(view(panel), "button.refresh")?.textContent?.trim()).toBe("Refresh the catalog");
  });

  it("summarizes the add-ons to handle on both lists, and links to the installed ones to handle", async () => {
    const complements = [toConfigure(), configured({ name: "Updated" }), complement({ name: "Plain" })];
    const hacs = withHacs("owner/updated", { installed_version: "1.0.0", available_version: "1.1.0" });
    const catalog = await open(CATALOG, { complements, ...hacs });
    expect(find(view(catalog.panel), ".summary")?.textContent).toContain("2 add-ons need action");
    const link = find<HTMLAnchorElement>(view(catalog.panel), ".summary-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(`${INSTALLED}?state=to_handle`);
    link.click();
    await vi.waitFor(() => expect(window.location.pathname).toBe(INSTALLED));
    await vi.waitFor(() => expect(names(catalog.panel).sort()).toEqual(["Updated", "Waiting"]));
    expect(window.location.search).toBe("?state=to_handle");
    expect(find<HTMLSelectElement>(view(catalog.panel), 'select[name="state"]')?.value).toBe("to_handle");
    expect(find(view(catalog.panel), ".summary")?.textContent).toContain("2 add-ons need action");
  });

  it("shows no summary when nothing is to handle", async () => {
    const { panel } = await open(CATALOG);
    expect(find(view(panel), ".summary")).toBeNull();
  });
});

describe("the criteria in the address", () => {
  it("opens the list filtered by the address, and ignores an unknown value", async () => {
    const { panel } = await open(`${CATALOG}?type=blueprint&family=nothing&sort=weird`);
    expect(names(panel)).toEqual(["A blueprint"]);
    expect(find<HTMLSelectElement>(view(panel), 'select[name="family"]')?.value).toBe("");
    expect(find<HTMLSelectElement>(view(panel), 'select[name="sort"]')?.value).toBe("certification");
  });

  it("writes a change in the address without a new entry of the history", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const { panel } = await open(CATALOG);
    const before = push.mock.calls.length;
    const element = find<HTMLSelectElement>(view(panel), 'select[name="type"]') as HTMLSelectElement;
    element.value = "blueprint";
    element.dispatchEvent(new Event("change"));
    await redraw(panel);
    expect(window.location.search).toBe("?type=blueprint");
    expect(push.mock.calls.length).toBe(before);
    const input = find<HTMLInputElement>(view(panel), 'input[name="query"]') as HTMLInputElement;
    input.value = "bp";
    input.dispatchEvent(new Event("input"));
    await redraw(panel);
    expect(new URLSearchParams(window.location.search).get("q")).toBe("bp");
  });

  it("finds the criteria again when the user comes back from an add-on by the path without query", async () => {
    const { panel } = await open(`${CATALOG}?type=blueprint`);
    openCard(panel, "A blueprint");
    await redraw(panel);
    expect(window.location.search).toBe("");
    const back = findAll<HTMLAnchorElement>(root(panel), "vtherm-breadcrumb a").find((anchor) => anchor.textContent?.trim() === "Catalog") as HTMLAnchorElement;
    back.click();
    await vi.waitFor(() => expect(names(panel)).toEqual(["A blueprint"]));
    expect(window.location.search).toBe("?type=blueprint");
  });
});

describe("the filters on a narrow screen", () => {
  const narrow = () =>
    vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined }) as never);

  it("keeps the search visible and folds the filters behind a button that counts them", async () => {
    narrow();
    const { panel } = await open(CATALOG);
    expect(find(view(panel), 'input[name="query"]')).not.toBeNull();
    expect(find(view(panel), 'select[name="type"]')).toBeNull();
    const toggle = find(view(panel), ".filters-toggle") as HTMLElement;
    expect(toggle.textContent?.trim()).toBe("Filters");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    await redraw(panel);
    expect(find(view(panel), 'select[name="type"]')).not.toBeNull();
    expect(find(view(panel), ".filters-toggle")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("says how many filters are active", async () => {
    narrow();
    const { panel } = await open(`${CATALOG}?type=blueprint`);
    expect(find(view(panel), ".filters-toggle")?.textContent?.trim()).toBe("Filters (1)");
  });
});

describe("the layout of the page of an add-on", () => {
  const detail = (id: string) => `${CATALOG}/${encodeURIComponent(id)}`;

  it("stacks the header, the action card and the documentation, and lays them side by side on a wide container", async () => {
    const { panel } = await open(detail("owner/switch-helper"));
    const parts = Array.from(find(view(panel), ".detail")?.children ?? []).map((child) => child.className.split(" ").at(-1));
    expect(parts).toEqual(["head", "action-card", "doc-card"]);
    const css = ((page(panel)?.constructor as unknown as { styles: { cssText?: string }[] }).styles ?? []).map((style) => style.cssText ?? "").join("\n");
    expect(css).toMatch(/:host\s*\{[^}]*container-type: inline-size/);
    expect(css).toMatch(/@container \(min-width: 900px\)\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) 320px[\s\S]*\.action-card\s*\{[^}]*position: sticky/);
    expect(css).toMatch(/\.doc\s*\{[^}]*max-width: 70ch/);
    expect(css).toMatch(/(^|\n)\s*a\s*\{[^}]*color: var\(--primary-color\)/);
    expect(css).toMatch(/\.status\s*\{[^}]*color: var\(--primary-text-color\)/);
  });

  it("has no link back to the list, except when the add-on is not found", async () => {
    const found = await open(detail("owner/switch-helper"));
    expect(findAll(view(found.panel), "a").some((anchor) => anchor.textContent?.includes("Back to the list"))).toBe(false);
    cleanup();
    model.reset();
    const missing = await open(detail("owner/nothing"));
    expect(findAll(view(missing.panel), "a").some((anchor) => anchor.textContent?.includes("Back to the list"))).toBe(true);
  });

  it("names the source by its repository for GitHub and by its host for another site", async () => {
    const github = await open(detail("owner/switch-helper"));
    expect(find(find(view(github.panel), ".action-card") as HTMLElement, "dl a")?.textContent).toBe("owner/switch-helper");
    cleanup();
    model.reset();
    const other = await open(detail("https://example.org/bp.yaml"));
    expect(find(find(view(other.panel), ".action-card") as HTMLElement, "dl a")?.textContent).toBe("example.org");
  });

  it("shows the installed version, and the two versions of an update, in the action card", async () => {
    const installed = await open(detail("owner/done"), { complements: [configured()], ...withHacs("owner/done", { installed_version: "1.2.0", available_version: "1.2.0" }) });
    expect(find(find(view(installed.panel), ".action-card") as HTMLElement, ".versions")?.textContent).toBe("Version 1.2.0");
    cleanup();
    model.reset();
    const update = await open(detail("owner/done"), { complements: [configured()], ...withHacs("owner/done", { installed_version: "1.2.0", available_version: "1.3.0" }) });
    const card = find(view(update.panel), ".action-card") as HTMLElement;
    expect(find(card, ".versions")?.textContent).toBe("1.2.0 → 1.3.0");
    expect(find(card, ".status.update")?.textContent?.trim()).toBe("Update available");
    const hacs = vi.fn();
    find<HTMLElement>(card, "button.update-hacs")?.click();
    expect(window.location.pathname).toBe("/hacs/repository/1");
    expect(hacs).not.toHaveBeenCalled();
    expect(update.hacs.commands()).not.toContain("hacs/repository/download");
  });
});

describe("the experimental add-ons and the title of the tab", () => {
  const detail = (id: string) => `${CATALOG}/${encodeURIComponent(id)}`;
  const experimental = complement({ name: "[EXPERIMENTAL] An assistant", slug: "owner/assistant" });

  it("warns in the action card of an experimental add-on, and only there", async () => {
    const { panel } = await open(detail("owner/assistant"), { complements: [experimental, SWITCH] });
    expect(find(find(view(panel), ".action-card") as HTMLElement, ".experimental-warning")?.textContent).toContain("experimental");
    expect(find(view(panel), "h2")?.textContent).toBe("An assistantExperimental");
    cleanup();
    model.reset();
    const plain = await open(detail("owner/switch-helper"));
    expect(find(view(plain.panel), ".experimental-warning")).toBeNull();
  });

  it("starts the title of the tab with the name, and gives the previous title back on the list and on removal", async () => {
    document.title = "Home Assistant";
    const { panel } = await open(CATALOG);
    openCard(panel, "Switch helper");
    await redraw(panel);
    expect(document.title).toBe("Switch helper – Home Assistant");
    const back = findAll<HTMLAnchorElement>(root(panel), "vtherm-breadcrumb a").find((anchor) => anchor.textContent?.trim() === "Catalog") as HTMLAnchorElement;
    back.click();
    await vi.waitFor(() => expect(document.title).toBe("Home Assistant"));
    openCard(panel, "Switch helper");
    await redraw(panel);
    expect(document.title).toBe("Switch helper – Home Assistant");
    cleanup();
    expect(document.title).toBe("Home Assistant");
  });

  it("does not overwrite a title that changed meanwhile", async () => {
    document.title = "Home Assistant";
    const { panel } = await open(detail("owner/switch-helper"));
    expect(document.title).toBe("Switch helper – Home Assistant");
    document.title = "Settings";
    cleanup();
    expect(document.title).toBe("Settings");
    void panel;
  });
});

describe("the add-ons that the dashboard does not install", () => {
  const detail = (id: string) => `${CATALOG}/${encodeURIComponent(id)}`;
  const blueprint = complement({ id: "https://example.org/bp.yaml", name: "A blueprint", type: "blueprint", slug: null, url: "https://example.org/bp.yaml?a=1&b=2", link: "https://example.org/bp.yaml", repository: null, hacs_category: null, ha_domain: null });
  const addon = complement({ name: "An add-on", slug: "owner/an-addon", type: "addon", hacs_category: null, ha_domain: null });
  const unknown = complement({ name: "Mystery", slug: "owner/mystery", type: "mystery", known_type: false, hacs_category: null, ha_domain: null });
  const components = (...names: string[]) => (panel: HTMLElement) => {
    const hass = (page(panel) as unknown as { hass: { config?: { components?: string[] } } }).hass;
    hass.config = { ...hass.config, components: names };
  };
  const withComponents = async (id: string, complements: Record<string, unknown>[], ...names: string[]) => {
    const mounted = await open(detail(id), { complements });
    components(...names)(mounted.panel);
    (page(mounted.panel) as unknown as { requestUpdate(): void }).requestUpdate();
    await redraw(mounted.panel);
    return mounted;
  };

  it("imports a blueprint with the window of Home Assistant when the links of My Home Assistant exist", async () => {
    const { panel } = await withComponents("https://example.org/bp.yaml", [blueprint], "my");
    expect(find(view(panel), "button.install")).toBeNull();
    click(panel, "button.import-blueprint");
    expect(window.location.pathname + window.location.search).toBe(`/_my_redirect/blueprint_import?blueprint_url=${encodeURIComponent("https://example.org/bp.yaml?a=1&b=2")}`);
  });

  it("adds the repository of an add-on with the Supervisor and My Home Assistant", async () => {
    const { panel } = await withComponents("owner/an-addon", [addon], "my", "hassio");
    click(panel, "button.add-repository");
    expect(window.location.pathname + window.location.search).toBe(`/_my_redirect/supervisor_add_addon_repository?repository_url=${encodeURIComponent("https://github.com/owner/an-addon")}`);
  });

  it("says that an add-on needs Home Assistant OS or Supervised, without a button, when there is no Supervisor", async () => {
    const { panel } = await withComponents("owner/an-addon", [addon], "my");
    expect(find(view(panel), ".supervisor")?.textContent).toContain("Home Assistant OS or Supervised");
    expect(find(view(panel), "button.add-repository")).toBeNull();
    expect(find(find(view(panel), ".action-card") as HTMLElement, "a.source-link, dl a")).not.toBeNull();
  });

  it("shows the address with a button to copy it, and a link to the blueprints, without My Home Assistant", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const { panel } = await withComponents("https://example.org/bp.yaml", [blueprint]);
    expect(find<HTMLInputElement>(view(panel), "input.address")?.value).toBe("https://example.org/bp.yaml?a=1&b=2");
    click(panel, "button.copy");
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("https://example.org/bp.yaml?a=1&b=2"));
    await redraw(panel);
    expect(find(view(panel), ".copied")?.textContent).toBe("Copied");
    expect(find<HTMLAnchorElement>(view(panel), ".manual-address a")?.getAttribute("href")).toBe("/config/blueprint/dashboard");
  });

  it("links to the add-on store without My Home Assistant", async () => {
    const { panel } = await withComponents("owner/an-addon", [addon], "hassio");
    expect(find<HTMLAnchorElement>(view(panel), ".manual-address a")?.getAttribute("href")).toBe("/hassio/store");
    expect(find<HTMLInputElement>(view(panel), "input.address")?.value).toBe("https://github.com/owner/an-addon");
  });

  it("explains an unknown type and opens its source", async () => {
    const { panel } = await withComponents("owner/mystery", [unknown], "my", "hassio");
    expect(find(view(panel), ".action-card")?.textContent).toContain("does not install this kind of add-on");
    expect(find<HTMLAnchorElement>(view(panel), "a.source-link")?.href).toBe("https://github.com/owner/mystery");
  });
});

describe("the documentation of an add-on", () => {
  const detail = (id: string) => `${CATALOG}/${encodeURIComponent(id)}`;
  const readme = (fields: Record<string, unknown> = {}) => ({ markdown: "# Title\n[a link](https://example.org/x)", language: "en", source_url: "https://github.com/owner/switch-helper/blob/HEAD/README.md", fetched_at: 1, ...fields });

  beforeAll(() => {
    if (customElements.get("ha-markdown") === undefined) {
      customElements.define(
        "ha-markdown",
        class extends HTMLElement {
          content = "";
          connectedCallback(): void {
            queueMicrotask(() => {
              this.innerHTML = '<a href="https://example.org/x">a link</a><a href="#top">anchor</a>';
            });
          }
        },
      );
    }
  });

  it("asks the server for the README with the identifier and the language, once for the same add-on", async () => {
    const calls: Record<string, unknown>[] = [];
    const { panel } = await open(detail("owner/switch-helper"), {
      language: "fr",
      readme: async (message) => {
        calls.push(message);
        return readme({ language: "fr" });
      },
    });
    await vi.waitFor(() => expect(find(view(panel), "ha-markdown")).not.toBeNull());
    expect(calls).toEqual([{ type: "vtherm_dashboard/get_complement_readme", complement_id: "owner/switch-helper", language: "fr" }]);
    expect(find(view(panel), ".doc-card")?.textContent).not.toContain("(EN)");
    // Back to the list, then again on the same add-on.
    const back = findAll<HTMLAnchorElement>(root(panel), "vtherm-breadcrumb a").find((anchor) => anchor.textContent?.trim() === "Catalogue") as HTMLAnchorElement;
    back.click();
    await vi.waitFor(() => expect(names(panel).length).toBeGreaterThan(0));
    openCard(panel, "Switch helper");
    await redraw(panel);
    expect(calls).toHaveLength(1);
  });

  it("marks the README in English for a user who reads French, and links to GitHub", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { language: "fr", readme: async () => readme() });
    await vi.waitFor(() => expect(find(view(panel), ".doc-head .fallback-mark")?.textContent).toBe("(EN)"));
    expect(find(view(panel), ".doc-head .fallback-mark")?.getAttribute("lang")).toBe("en");
    expect(find<HTMLAnchorElement>(view(panel), ".doc-head a")?.href).toBe("https://github.com/owner/switch-helper/blob/HEAD/README.md");
  });

  it("opens the links of the README in a new tab without referrer", async () => {
    const { panel } = await open(detail("owner/switch-helper"), { readme: async () => readme() });
    await vi.waitFor(() => expect(findAll(find(view(panel), "ha-markdown") as HTMLElement, "a")).toHaveLength(2));
    await vi.waitFor(() => {
      const [external, anchor] = findAll<HTMLAnchorElement>(find(view(panel), "ha-markdown") as HTMLElement, "a");
      expect(external?.target).toBe("_blank");
      expect(external?.rel).toContain("noreferrer");
      expect(anchor?.getAttribute("target")).toBeNull();
    });
  });

  it("falls back on the description of the catalog when the command fails", async () => {
    const { panel } = await open(detail("owner/switch-helper"), {
      readme: async () => {
        throw { code: "readme_unavailable", message: "x" };
      },
    });
    await vi.waitFor(() => expect(find(view(panel), ".doc-card .banner")?.textContent).toContain("could not be read"));
    expect(find(view(panel), ".doc-card .sanitized")?.textContent).toContain("Helps switches");
    expect(find(view(panel), "ha-markdown")).toBeNull();
  });

  it("shows the description and asks nothing for an add-on without repository", async () => {
    const calls: Record<string, unknown>[] = [];
    const { panel } = await open(detail("https://example.org/bp.yaml"), {
      readme: async (message) => {
        calls.push(message);
        return readme();
      },
    });
    expect(find(view(panel), ".doc-card .sanitized")).not.toBeNull();
    expect(find(view(panel), "ha-markdown")).toBeNull();
    expect(calls).toEqual([]);
  });
});
