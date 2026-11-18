// @vitest-environment happy-dom
/** The styles of the narrow screen: one threshold, shared by the frame of the dashboard and by its native pages. */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import type { CSSResultGroup } from "lit";
import { afterEach, describe, expect, it } from "vitest";

import { ComplementsCatalogPage, ComplementsInstalledPage } from "../src/complements/complements-page.ts";
import { VThermBreadcrumb } from "../src/components/breadcrumb.ts";
import { VThermCardActions } from "../src/components/card-actions.ts";
import { VThermFieldHelp } from "../src/components/field-help.ts";
import { NARROW_QUERY as SHARED_QUERY, TOUCH_TARGET, narrowStyles } from "../src/components/narrow-styles.ts";
import { VThermPluginStatus } from "../src/components/plugin-status.ts";
import { VThermSideMenu } from "../src/components/side-menu.ts";
import { VThermThermostatList } from "../src/components/thermostat-list.ts";
import { VThermTimeChart } from "../src/components/time-chart.ts";
import { VThermTopBar } from "../src/components/top-bar.ts";
import { VThermWidgets } from "../src/components/widgets.ts";
import { VThermDevPluginsPage } from "../src/dev/dev-plugins-page.ts";
import { CoreThermostatOverviewPage } from "../src/native/core-pages.ts";
import { NativeTabElement } from "../src/native/native-tab.ts";
import { NARROW_QUERY, VThermDashboardPanel } from "../src/panel.ts";
import { cleanup, find, findAll, mountPanel, settle } from "./support/dashboard-harness.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

afterEach(() => cleanup());

const flatten = (styles: CSSResultGroup | undefined): unknown[] => (Array.isArray(styles) ? styles.flatMap((style) => flatten(style as CSSResultGroup)) : [styles]);

describe("the styles of the narrow screen", () => {
  it("are built on the threshold of the panel", () => {
    expect(NARROW_QUERY).toBe(SHARED_QUERY);
    expect(narrowStyles.cssText).toContain(`@media ${NARROW_QUERY}`);
    expect(narrowStyles.cssText).toContain(`min-height: ${TOUCH_TARGET}px`);
    expect(narrowStyles.cssText).toMatch(/\.breakable\s*\{[^}]*overflow-wrap: anywhere/);
  });

  it("are used by the frame of the dashboard and by every native page", () => {
    const components = {
      VThermDashboardPanel,
      VThermTopBar,
      VThermSideMenu,
      VThermBreadcrumb,
      VThermCardActions,
      VThermFieldHelp,
      VThermTimeChart,
      VThermThermostatList,
      VThermWidgets,
      VThermPluginStatus,
      VThermDevPluginsPage,
      CoreThermostatOverviewPage,
      NativeTabElement,
      ComplementsCatalogPage,
      ComplementsInstalledPage,
    };
    const without = Object.entries(components)
      .filter(([, component]) => !flatten((component as unknown as { styles?: CSSResultGroup }).styles).includes(narrowStyles))
      .map(([name]) => name);
    expect(without).toEqual([]);
  });
});

describe("the help of a field on a phone", () => {
  it("has a button of 44 px on a touch screen, and a panel that is never wider than the field", () => {
    const css = flatten(VThermFieldHelp.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(new RegExp(String.raw`@media \(pointer: coarse\)\s*\{\s*\.toggle\s*\{[^}]*width: ${TOUCH_TARGET}px;[^}]*height: ${TOUCH_TARGET}px`));
    expect(css).toMatch(/\.panel\s*\{[^}]*min-width: 0/);
    expect(css).toMatch(/\.info\s*\{[^}]*white-space: pre-line/);
  });
});

describe("the chart of time series on a phone", () => {
  it("cannot overflow a screen of 360 px: it shrinks with its container and keeps its readout and its legend inside", () => {
    const css = flatten(VThermTimeChart.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(/:host\s*\{[^}]*display: block;[^}]*min-width: 0;[^}]*max-width: 100%/);
    expect(css).toMatch(/\.plot\s*\{[^}]*position: relative;[^}]*min-width: 0;[^}]*width: 100%/);
    expect(css).toMatch(/\.plot > svg\s*\{[^}]*width: 100%;[^}]*max-width: 100%/);
    expect(css).toMatch(/\.readout\s*\{[^}]*position: absolute;[^}]*box-sizing: border-box;[^}]*max-width: calc\(100% - 8px\);[^}]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.legend\s*\{[^}]*flex-wrap: wrap;[^}]*min-width: 0/);
    expect(css).toMatch(/\.legend-item\s*\{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere/);
  });
});

describe("the fields of a native section on a phone", () => {
  it("are on one column without horizontal overflow: a field is never wider than the grid", () => {
    const css = flatten(NativeTabElement.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(/\.fields\s*\{[^}]*minmax\(min\(240px, 100%\), 1fr\)/);
    expect(css).toMatch(/\.field\s*\{[^}]*min-width: 0/);
    expect(css).toMatch(/\.chip\s*\{[^}]*overflow-wrap: anywhere/);
  });
});

describe("the status of the sections in the drawer of a phone", () => {
  it("stays on one line at the right, while the title wraps instead of widening the menu", () => {
    const css = flatten(VThermSideMenu.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(/\.status\s*\{[^}]*flex: 0 0 auto[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.title\s*\{[^}]*min-width: 0[^}]*overflow-wrap: anywhere/);
  });
});

describe("the save actions on a phone", () => {
  const css = flatten(VThermCardActions.styles)
    .map((style) => (style as { cssText?: string }).cssText ?? "")
    .join("\n");

  it("stay on one line, Discard on the left and Save on the right, with touch targets of 44 px", () => {
    expect(css).toMatch(/\.card-actions\s*\{[^}]*flex-wrap: nowrap[^}]*justify-content: space-between/);
    expect(css).toContain(`@media ${NARROW_QUERY}`);
    expect(css).toMatch(new RegExp(`\\.card-actions ha-progress-button\\s*\\{[^}]*min-height: ${TOUCH_TARGET}px`));
  });

  it("let their messages wrap instead of widening the card", () => {
    expect(css).toMatch(/\.messages\s*\{[^}]*overflow-wrap: anywhere/);
  });

  it("can be brought above the navigation bar of the system: the bottom of the page keeps the safe area", () => {
    const panel = flatten(VThermDashboardPanel.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(panel).toMatch(/main\s*\{[^}]*padding-bottom: max\(16px, var\(--safe-area-inset-bottom, env\(safe-area-inset-bottom, 0px\)\)\)/);
    expect(panel).not.toContain(".savebar");
  });
});

describe("the choice of the type of a new thermostat", () => {
  it("is made with focusable cards that a key or a touch chooses, with a name, a description and a touch target", async () => {
    const { definitions } = await nativeHost();
    const natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
    const { panel } = await mountPanel({ plugins: natives, realThermostats: true, configs: {}, path: `/vtherm/${CORE_TOP_TABS.thermostats}/new` });
    const type = find(panel.shadowRoot as ShadowRoot, "vtherm-type-choice") as HTMLElement;
    const cards = findAll<HTMLElement>(type.shadowRoot as ShadowRoot, '[role="button"].type-card');
    expect(cards).toHaveLength(3);
    expect(cards.every((card) => card.getAttribute("tabindex") === "0")).toBe(true);
    expect(cards.every((card) => (type.shadowRoot as ShadowRoot).getElementById(card.getAttribute("aria-labelledby") ?? "")?.textContent?.trim() !== "")).toBe(true);
    expect(((type.constructor as unknown as { styles: { cssText: string }[] }).styles.map((style) => style.cssText).join(" "))).toMatch(/min-height: 44px/);
    cards[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settle(panel);
    expect(window.location.pathname).toBe(`/vtherm/${CORE_TOP_TABS.thermostats}/new/core.tab.main`);
    expect(find(panel.shadowRoot as ShadowRoot, "vtherm-type-choice")).toBeNull();
  });
});