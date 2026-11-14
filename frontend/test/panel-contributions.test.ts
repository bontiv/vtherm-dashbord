// @vitest-environment happy-dom
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestElement, cleanup, find, findAll, mountPanel, nativePlugins, page, plugin, widget } from "./support/dashboard-harness.ts";
import { settle } from "./support/dashboard-harness.ts";
import type { TestPlugin } from "./support/dashboard-harness.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const natives: TestPlugin[] = nativePlugins.map((definition) => ({ definition }));
const root = (panel: HTMLElement) => panel.shadowRoot as ShadowRoot;
const texts = (nodes: readonly HTMLElement[]) => nodes.map((node) => node.textContent?.trim());

/** The overview pages show the widgets of their hook, as the native pages do. */
class WidgetsOverview extends TestElement {
  override connectedCallback(): void {
    const widgets = document.createElement("vtherm-widgets-page") as HTMLElement & { hook: string; hass: unknown; thermostatId: string };
    widgets.hook = this.localName.includes("thermostat") ? "thermostat_widget" : "global_widget";
    widgets.hass = this.hass;
    widgets.thermostatId = this.thermostatId ?? "";
    this.append(widgets);
  }
}
for (const tag of ["core-page-overview-el", "core-page-thermostat_overview-el"]) {
  if (customElements.get(tag) === undefined) {
    customElements.define(tag, class extends WidgetsOverview {});
  }
}

/** A plugin that contributes to every hook, and a top tab with two pages. */
const everything = plugin("smartpi", {
  top_tab: [{ id: "smartpi.top", title: "Smart", placement: { after: CORE_TOP_TABS.thermostats } }],
  tab_page: [page("smartpi.page.a", { tab: "smartpi.top" }), page("smartpi.page.b", { tab: "smartpi.top" })],
  global_page: [page("smartpi.global")],
  global_widget: [widget("smartpi.widget.global")],
  general_config: [page("smartpi.general")],
  thermostat_config: [page("smartpi.thermostat")],
  thermostat_widget: [widget("smartpi.widget.thermostat")],
});
const withEverything: TestPlugin[] = [...natives, { definition: everything }];

describe("the contributions of the seven hooks", () => {
  it("shows the top tab of a plugin with its pages, and gives hass to each page", async () => {
    const { panel, hass } = await mountPanel({ plugins: withEverything, path: "/home-confort/smartpi.top" });
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(texts(findAll(bar.shadowRoot as ShadowRoot, "nav.start a"))).toEqual(["Dashboard", "Thermostats", "Smart"]);
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(texts(findAll(menu.shadowRoot as ShadowRoot, "a"))).toEqual(["smartpi.page.a", "smartpi.page.b"]);
    const shown = find(root(panel), "smartpi-page-a-el") as TestElement;
    expect(shown.hass).toBe(hass);
  });

  it("shows a global page in the menu of the Dashboard tab", async () => {
    const { panel, hass } = await mountPanel({ plugins: withEverything, path: `/home-confort/${CORE_TOP_TABS.dashboard}/smartpi.global` });
    expect((find(root(panel), "smartpi-global-el") as TestElement).hass).toBe(hass);
  });

  it("shows the global widgets on the Overview page, with hass", async () => {
    const { panel, hass } = await mountPanel({ plugins: withEverything });
    const shown = find(root(panel), "smartpi-widget-global-el") as TestElement;
    expect(shown).not.toBeNull();
    expect(shown.hass).toBe(hass);
    expect(shown.thermostatId).toBeUndefined();
  });

  it("shows a section of the general configuration with the configuration context and no thermostat", async () => {
    const { panel, hass } = await mountPanel({ plugins: withEverything, path: `/home-confort/${CORE_TOP_TABS.configuration}/smartpi.general` });
    const shown = find(root(panel), "smartpi-general-el") as TestElement & { errors: unknown; proposeChanges: unknown };
    expect(shown.hass).toBe(hass);
    expect(shown.values).toEqual({});
    expect(shown.errors).toEqual({});
    expect(typeof shown.proposeChanges).toBe("function");
    expect(shown.thermostatId).toBeUndefined();
  });

  it("shows an entry of the menu of a thermostat with the identifier of the thermostat", async () => {
    const { panel, hass } = await mountPanel({ plugins: withEverything, path: `/home-confort/${CORE_TOP_TABS.thermostats}/climate.salon/smartpi.thermostat` });
    const shown = find(root(panel), "smartpi-thermostat-el") as TestElement & { centralValues: unknown };
    expect(shown.hass).toBe(hass);
    expect(shown.thermostatId).toBe("climate.salon");
    expect(shown.centralValues).toEqual({});
  });

  it("shows the widgets of a thermostat in its overview, each with the thermostat identifier", async () => {
    const { panel } = await mountPanel({ plugins: withEverything, path: `/home-confort/${CORE_TOP_TABS.thermostats}/climate.chambre` });
    const shown = find(root(panel), "smartpi-widget-thermostat-el") as TestElement;
    expect(shown).not.toBeNull();
    expect(shown.thermostatId).toBe("climate.chambre");
  });

  it("does not show a widget whose visibility condition is false", async () => {
    const hidden = plugin("hidden", { global_widget: [widget("hidden.w", { visible: () => false })] });
    const { panel } = await mountPanel({ plugins: [...natives, { definition: hidden }] });
    expect(find(root(panel), "hidden-w-el")).toBeNull();
  });

  it("puts a plugin page where its placement says", async () => {
    const placed = plugin("placed", { general_config: [page("placed.first", { placement: { first: true } })] });
    const { panel } = await mountPanel({ plugins: [...natives, { definition: placed }], path: `/home-confort/${CORE_TOP_TABS.configuration}` });
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(texts(findAll(menu.shadowRoot as ShadowRoot, "a"))[0]).toBe("placed.first");
  });
});

describe("a page that cannot be shown", () => {
  it("replaces an element that is not defined by a message, and the rest of the dashboard still works", async () => {
    const broken = plugin("broken", { global_page: [{ id: "broken.page", title: "Broken", component: "Not A Valid Name" }] });
    const { panel } = await mountPanel({ plugins: [...natives, { definition: broken }], path: `/home-confort/${CORE_TOP_TABS.dashboard}/broken.page` });
    const host = find(root(panel), "vtherm-contribution") as HTMLElement;
    await (host as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await vi.waitFor(() => expect(find(host.shadowRoot as ShadowRoot, ".error")?.textContent).toContain("broken.page"));
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(findAll(bar.shadowRoot as ShadowRoot, "a").length).toBeGreaterThan(0);
  });
});

describe("a narrow screen", () => {
  function narrowScreen(initial: boolean) {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    vi.spyOn(window, "matchMedia").mockImplementation(
      () =>
        ({
          matches: initial,
          addEventListener: (_: string, callback: (event: { matches: boolean }) => void) => (listener = callback),
          removeEventListener: () => undefined,
        }) as never,
    );
    return (matches: boolean) => listener?.({ matches });
  }

  it("keeps the menu in a drawer that a button opens, and closes it after a page is chosen", async () => {
    narrowScreen(true);
    const { panel } = await mountPanel({ path: `/home-confort/${CORE_TOP_TABS.configuration}` });
    expect(find(root(panel), "vtherm-side-menu")).toBeNull();
    const button = find<HTMLButtonElement>(root(panel), ".menu-button") as HTMLButtonElement;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    button.click();
    await settle(panel);
    const menu = find(root(panel), "vtherm-side-menu") as HTMLElement;
    expect(menu).not.toBeNull();
    findAll<HTMLAnchorElement>(menu.shadowRoot as ShadowRoot, "a")[1]?.click();
    await settle(panel);
    expect(find(root(panel), "vtherm-side-menu")).toBeNull();
    expect(window.location.pathname).toBe(`/home-confort/${CORE_TOP_TABS.configuration}/core.page.plugins`);
  });

  it("keeps the last two segments of the breadcrumb", async () => {
    narrowScreen(true);
    const { panel } = await mountPanel({ path: `/home-confort/${CORE_TOP_TABS.thermostats}/climate.salon/core_tpi.tab.main` });
    expect(texts(findAll(find(root(panel), "vtherm-breadcrumb")?.shadowRoot as ShadowRoot, "li"))).toEqual(["Salon", "core_tpi.tab.main"]);
  });

  it("keeps the gear visible in its own area and lets the other tabs scroll", async () => {
    narrowScreen(true);
    const { panel } = await mountPanel();
    const bar = find(root(panel), "vtherm-top-bar") as HTMLElement;
    expect(findAll(bar.shadowRoot as ShadowRoot, "nav.end a")).toHaveLength(1);
    const css = String((bar.constructor as { styles?: { cssText: string } }).styles?.cssText);
    expect(css).toMatch(/nav\.start[^}]*overflow-x: auto/);
    // Without min-width, the tabs do not shrink and push the gear out of the screen.
    expect(css).toMatch(/nav\.start[^}]*min-width: 0/);
    expect(css).toMatch(/nav\.end[^}]*flex: 0 0 auto/);
  });

  it("goes back to the side menu when the screen becomes wide", async () => {
    const change = narrowScreen(true);
    const { panel } = await mountPanel({ path: `/home-confort/${CORE_TOP_TABS.configuration}` });
    expect(find(root(panel), "vtherm-side-menu")).toBeNull();
    change(false);
    await settle(panel);
    expect(find(root(panel), "vtherm-side-menu")).not.toBeNull();
  });
});
