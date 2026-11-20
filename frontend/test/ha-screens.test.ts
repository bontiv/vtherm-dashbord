// @vitest-environment happy-dom
/** The screens outside the native tabs, drawn with the components of Home Assistant that the harness of the SDK simulates. */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import type { MockHaElement } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { cleanup, find, findAll, mountPanel, settle } from "./support/dashboard-harness.ts";
import { catalogAnswer, complement, createFakeStore } from "./support/fake-store.ts";
import type { FakeStoreOptions } from "./support/fake-store.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

// happy-dom cannot run DOMPurify, which `complements-sanitize.test.ts` checks on a complete DOM.
vi.mock("../src/complements/sanitize.ts", () => ({
  sanitizeDescription: (html: string) => `<div class="sanitized">${html.replace(/<script[\s\S]*?<\/script>/g, "")}</div>`,
  plainText: (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
}));

const TAB = "core_complements.top.complements";
const CATALOG = `/vtherm/${TAB}/core_complements.page.catalog`;
const HELPER = complement({ name: "Switch helper", family: "device-helper", certification: "official" });

let natives: { definition: UiPluginDefinition }[];
let model: { reset(): void };

beforeAll(async () => {
  defineHaControlMocks();
  const { definitions } = await nativeHost();
  natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
  ({ complementsModel: model } = (await import("../src/complements/model.ts")) as unknown as { complementsModel: typeof model });
});

afterEach(() => {
  cleanup();
  model.reset();
  vi.restoreAllMocks();
});

const root = (panel: HTMLElement) => panel.shadowRoot as ShadowRoot;
const page = (panel: HTMLElement) => find(find(root(panel), "vtherm-contribution")?.shadowRoot as ShadowRoot, "#mount")?.firstElementChild as HTMLElement | undefined;
const view = (panel: HTMLElement) => page(panel)?.shadowRoot as ShadowRoot;
const redraw = async (panel: HTMLElement) => {
  await (page(panel) as unknown as { updateComplete: Promise<boolean> }).updateComplete;
  await settle(panel as never);
};

async function openCatalog(path: string, hacs: FakeStoreOptions = {}) {
  const fake = createFakeStore(hacs);
  const catalog = async (message: Record<string, unknown>) => (message["type"] === "vtherm_dashboard/get_complements" ? catalogAnswer([HELPER]) : undefined);
  const mounted = await mountPanel({ plugins: natives, path, handlers: [catalog, fake.handle] });
  await vi.waitFor(() => expect(view(mounted.panel)?.querySelector("ha-card, .actions")).not.toBeNull());
  return { ...mounted, fake };
}

describe("the page of the add-ons", () => {
  it("shows each add-on in a card of Home Assistant, and its filters with the selectors of Home Assistant", async () => {
    const { panel } = await openCatalog(CATALOG);
    expect(findAll(view(panel), "ha-card.card")).toHaveLength(1);
    const type = find<MockHaElement>(view(panel), 'ha-selector[data-name="type"]') as MockHaElement;
    expect(type.value).toBe("__all__");
    type.change("integration");
    await redraw(panel);
    expect(findAll(view(panel), "ha-card.card")).toHaveLength(1);
    type.change("blueprint");
    await redraw(panel);
    expect(findAll(view(panel), "ha-card.card")).toHaveLength(0);
  });

  it("asks for the confirmation in a dialog of Home Assistant, and installs only when the user confirms", async () => {
    const { panel, fake } = await openCatalog(`${CATALOG}/owner%2Fswitch-helper`, { addable: ["owner/switch-helper"] });
    (find(view(panel), "ha-button.install") as HTMLElement).click();
    await redraw(panel);
    const dialog = find(view(panel), "ha-dialog") as MockHaElement;
    expect(dialog.getAttribute("header-title")).toContain("Switch helper");
    (find(dialog, "ha-button.cancel") as HTMLElement).click();
    await redraw(panel);
    expect(find(view(panel), "ha-dialog")).toBeNull();
    expect(fake.commands()).not.toContain("hacs/repositories/add");

    (find(view(panel), "ha-button.install") as HTMLElement).click();
    await redraw(panel);
    (find(view(panel), "ha-dialog ha-button.confirm-install") as HTMLElement).click();
    await vi.waitFor(() => expect(fake.commands()).toContain("hacs/repository/download"));
  });
});

describe("the creation of a thermostat", () => {
  const NEW = `/vtherm/${CORE_TOP_TABS.thermostats}/new`;
  const section = (panel: HTMLElement, tag: string) => find(root(panel), tag) as HTMLElement & { updateComplete: Promise<boolean> };

  it("chooses the type with one card of Home Assistant per type, which opens the page of configuration, with the actions of the card", async () => {
    const { panel } = await mountPanel({ plugins: natives, realThermostats: true, configs: {}, path: NEW });
    const choice = () => find(root(panel), "vtherm-type-choice") as (HTMLElement & { updateComplete: Promise<boolean> }) | null;
    const cards = () => findAll<HTMLElement>(choice()?.shadowRoot as ShadowRoot, "ha-card.type-card");
    await vi.waitFor(() => expect(cards()).toHaveLength(3));
    expect(cards().map((card) => card.dataset["type"])).toEqual(["thermostat_over_switch", "thermostat_over_climate", "thermostat_over_valve"]);
    // No card is selected on arrival: the first type is only the default of the draft.
    expect(cards().map((card) => card.getAttribute("aria-pressed"))).toEqual(["false", "false", "false"]);
    expect(cards().some((card) => card.classList.contains("selected"))).toBe(false);
    expect(find(choice()?.shadowRoot as ShadowRoot, "ha-selector")).toBeNull();
    expect(find(choice()?.shadowRoot as ShadowRoot, "ha-button.continue")).toBeNull();
    expect(find(root(panel), "vtherm-side-menu")).toBeNull();
    cards()[2]?.click();
    await settle(panel);
    await vi.waitFor(() => expect(find(root(panel), "vtherm-native-main-thermostat")).not.toBeNull());
    expect(find(root(panel), "vtherm-type-choice")).toBeNull();
    expect((section(panel, "vtherm-native-main-thermostat") as unknown as { values: Record<string, unknown> }).values["thermostat_type"]).toBe("thermostat_over_valve");
    const main = section(panel, "vtherm-native-main-thermostat");
    const actions = find(main.shadowRoot as ShadowRoot, "vtherm-card-actions") as HTMLElement & { updateComplete: Promise<boolean> };
    await actions.updateComplete;
    expect(find(actions.shadowRoot as ShadowRoot, "ha-progress-button.save")?.textContent).toContain("Create");
    expect(find(actions.shadowRoot as ShadowRoot, "ha-button.cancel")).not.toBeNull();
  });
  it("keeps the field of the name while it is typed in, so that it keeps the focus", async () => {
    const { panel } = await mountPanel({ plugins: natives, realThermostats: true, configs: {}, path: `${NEW}/core.tab.main` });
    const nameField = (): MockHaElement | null => section(panel, "vtherm-native-main-thermostat").shadowRoot?.querySelector('.field[data-key="name"] ha-selector') as MockHaElement | null;
    await vi.waitFor(() => expect(nameField()).not.toBeNull());
    const before = nameField() as MockHaElement;
    before.change("S");
    await settle(panel);
    before.change("Sa");
    await settle(panel);
    expect(nameField()).toBe(before);
    expect(before.isConnected).toBe(true);
    expect(before.value).toBe("Sa");
  });
});

describe("leaving a draft", () => {
  const CONFIG = `/vtherm/${CORE_TOP_TABS.thermostats}/climate.salon/core.tab.main`;

  async function dirtyConfiguration() {
    const mounted = await mountPanel({ plugins: natives, path: CONFIG });
    const tab = find(root(mounted.panel), "vtherm-contribution") as HTMLElement;
    await vi.waitFor(() => expect(find(tab.shadowRoot as ShadowRoot, "#mount")?.firstElementChild?.shadowRoot?.querySelector("ha-selector")).toBeTruthy());
    const selector = (find(tab.shadowRoot as ShadowRoot, "#mount")?.firstElementChild?.shadowRoot?.querySelector('.field[data-key="cycle_min"] ha-selector') ?? null) as MockHaElement | null;
    (selector as MockHaElement).change(8);
    await settle(mounted.panel);
    return mounted;
  }

  const goToDashboard = async (panel: HTMLElement) => {
    window.history.pushState(null, "", `/vtherm/${CORE_TOP_TABS.dashboard}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    await settle(panel as never);
  };

  it("asks in a dialog of Home Assistant, and the user stays on the page when it cancels", async () => {
    const { panel } = await dirtyConfiguration();
    expect(find(root(panel), "ha-progress-button.save")).not.toBeNull();
    await goToDashboard(panel);
    const dialog = find(root(panel), "ha-dialog") as MockHaElement;
    expect(dialog).not.toBeNull();
    expect(window.location.pathname).toBe(CONFIG);
    (find(dialog, "ha-button.cancel-leave") as HTMLElement).click();
    await settle(panel as never);
    expect(find(root(panel), "ha-dialog")).toBeNull();
    expect(window.location.pathname).toBe(CONFIG);
    expect(find(root(panel), "ha-progress-button.save")).not.toBeNull();
  });

  it("leaves without the draft when the user confirms", async () => {
    const { panel } = await dirtyConfiguration();
    await goToDashboard(panel);
    (find(root(panel), "ha-dialog ha-button.confirm-leave") as HTMLElement).click();
    await settle(panel as never);
    expect(window.location.pathname).toBe(`/vtherm/${CORE_TOP_TABS.dashboard}`);
    expect(find(root(panel), "ha-dialog")).toBeNull();
  });
});

describe("the pages of the plugins", () => {
  const configPage = async (panel: HTMLElement, tag: string) => {
    await vi.waitFor(() => expect(find(root(panel), tag)).not.toBeNull());
    const element = find(root(panel), tag) as HTMLElement & { updateComplete: Promise<boolean> };
    await element.updateComplete;
    return element.shadowRoot as ShadowRoot;
  };

  it("shows each plugin in a card of Home Assistant, with its state", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: `/vtherm/${CORE_TOP_TABS.configuration}/core.page.plugins` });
    const status = await configPage(panel, "vtherm-plugin-status");
    const cards = findAll<MockHaElement>(status, "ha-card.plugin");
    expect(cards.map((card) => card.header)).toEqual(NATIVE_LOAD_ORDER);
    expect(find(cards[0] as HTMLElement, ".state")?.textContent).not.toBe("");
    expect(find(status, "table")).toBeNull();
  });

  it("adds an entry of development with the fields of Home Assistant, and turns it off with its switch", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: `/vtherm/${CORE_TOP_TABS.configuration}/core.page.dev_plugins` });
    const dev = await configPage(panel, "vtherm-dev-plugins-page");
    (find(dev, 'ha-selector[data-name="id"]') as MockHaElement).change("mine");
    (find(dev, 'ha-selector[data-name="js_url"]') as MockHaElement).change("http://localhost:5173/src/main.ts");
    (find(dev, 'ha-selector[data-name="dashboard_version"]') as MockHaElement).change(">=0.1,<1.0");
    (find(dev, "ha-button.add") as HTMLElement).click();
    const page = find(root(panel), "vtherm-dev-plugins-page") as HTMLElement & { updateComplete: Promise<boolean> };
    await page.updateComplete;
    const entry = find(dev, 'ha-card.entry[data-plugin="mine"]') as HTMLElement;
    expect(entry).not.toBeNull();
    (find(entry, "ha-selector.enable") as MockHaElement).change(false);
    await page.updateComplete;
    expect(JSON.parse(localStorage.getItem("vtherm_dashboard.dev_plugins") ?? "[]")).toEqual([expect.objectContaining({ id: "mine", enabled: false })]);
    localStorage.clear();
  });
});

describe("the menus and the lists", () => {
  it("shows the entries of the menu as list items of Home Assistant that keep their link", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: `/vtherm/${CORE_TOP_TABS.configuration}` });
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    const items = findAll<HTMLElement>(menu.shadowRoot as ShadowRoot, "ha-md-list-item");
    expect(items.length).toBeGreaterThan(1);
    const plugins = items.find((item) => item.getAttribute("href")?.endsWith("/core.page.plugins")) as HTMLElement;
    // A click with the middle button is left to the browser, which opens the link in a new tab.
    const middle = new MouseEvent("click", { button: 1, bubbles: true, cancelable: true });
    plugins.dispatchEvent(middle);
    expect(middle.defaultPrevented).toBe(false);
    expect(window.location.pathname).toBe(`/vtherm/${CORE_TOP_TABS.configuration}`);
    // A simple click stays in the dashboard.
    const simple = new MouseEvent("click", { button: 0, bubbles: true, cancelable: true });
    plugins.dispatchEvent(simple);
    await settle(panel as never);
    expect(simple.defaultPrevented).toBe(true);
    expect(window.location.pathname).toBe(`/vtherm/${CORE_TOP_TABS.configuration}/core.page.plugins`);
  });

  it("shows the thermostats as cards of Home Assistant in links, and the tile New thermostat at the end", async () => {
    const { panel } = await mountPanel({ plugins: natives, path: `/vtherm/${CORE_TOP_TABS.thermostats}` });
    const list = find(root(panel), "vtherm-thermostat-list") as HTMLElement;
    const tiles = findAll<HTMLAnchorElement>(list.shadowRoot as ShadowRoot, "a.tile");
    expect(tiles.map((tile) => tile.getAttribute("href"))).toEqual([
      `/vtherm/${CORE_TOP_TABS.thermostats}/climate.chambre`,
      `/vtherm/${CORE_TOP_TABS.thermostats}/climate.salon`,
      `/vtherm/${CORE_TOP_TABS.thermostats}/new`,
    ]);
    expect(tiles.every((tile) => tile.querySelector("ha-card.tile-card") !== null)).toBe(true);
  });
});
