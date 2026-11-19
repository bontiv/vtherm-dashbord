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
import { VThermWidgets, gridColumns } from "../src/components/widgets.ts";
import { AlertsWidget, ModeWidget, TemperatureWidget } from "../src/native/widgets/core.ts";
import { SafetyWidget } from "../src/native/widgets/core_advanced.ts";
import { PresetWidget } from "../src/native/widgets/core_presets.ts";
import { HeatingWidget } from "../src/native/widgets/core_tpi.ts";
import { ValveWidget } from "../src/native/widgets/core_valve_regulation.ts";
import { CentralModeWidget, OutdoorWidget, SummaryWidget } from "../src/native/widgets/core_overview.ts";
import { BoilerPowerWidget, BoilerWidget } from "../src/native/widgets/core_central_boiler.ts";
import { HousePowerWidget, OverpoweringWidget } from "../src/native/widgets/core_power.ts";
import { AutoStartStopWidget } from "../src/native/widgets/core_auto_start_stop.ts";
import { FailureWidget } from "../src/native/widgets/core_heating_failure.ts";
import { LockWidget } from "../src/native/widgets/core_lock.ts";
import { MotionWidget } from "../src/native/widgets/core_motion.ts";
import { WindowWidget } from "../src/native/widgets/core_window.ts";
import { DevicesWidget, HistoryWidget } from "../src/native/widgets/core_details.ts";
import { AutoTpiWidget } from "../src/native/widgets/core_tpi_auto.ts";
import { HumidityWidget } from "../src/native/widgets/core_humidity.ts";
import { SyncWidget } from "../src/native/widgets/core_sync_temp.ts";
import { BoilerDemandWidget } from "../src/native/widgets/core_central_boiler_thermostat.ts";
import { EnergyWidget } from "../src/native/widgets/core_power_energy.ts";
import { VThermHistoryCurve } from "../src/native/widgets/history-curve.ts";
import { PresenceWidget } from "../src/native/widgets/core_presence.ts";
import { VThermAge, VThermBar, VThermGauge, VThermStateIcon, VThermValueRow, VThermWidgetCard } from "../src/components/overview/index.ts";
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

describe("the breadcrumb on a phone", () => {
  const css = flatten(VThermBreadcrumb.styles)
    .map((style) => (style as { cssText?: string }).cssText ?? "")
    .join("\n");

  it("centers its segments on the height of the links", () => {
    expect(css).toMatch(/\bol\s*\{[^}]*align-items: center/);
  });

  it("never grows wider than the toolbar that holds it", () => {
    expect(css).toMatch(/:host\s*\{[^}]*min-width: 0/);
  });

  it("keeps the segments on one row, each ending with an ellipsis, the last one taking the rest of the row", () => {
    const narrow = css.slice(css.indexOf(`@media ${NARROW_QUERY}`));
    expect(narrow).toMatch(/\bol\s*\{[^}]*flex-wrap: nowrap/);
    expect(narrow).toMatch(/\bli\s*\{[^}]*min-width: 0[^}]*max-width: 50%[^}]*overflow: hidden[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/);
    expect(narrow).toMatch(/li > a\.touch-target\s*\{[^}]*display: block[^}]*text-overflow: ellipsis[^}]*line-height: 44px/);
    expect(narrow).toMatch(/li\[aria-current="page"\]\s*\{[^}]*flex: 0 1 auto[^}]*max-width: none/);
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

describe("the curves of the widgets on a phone", () => {
  it("cannot overflow a screen of 360 px: the charts of the history and of the energy shrink with their card", () => {
    for (const [name, element] of Object.entries({ HistoryWidget, VThermHistoryCurve })) {
      const css = flatten((element as unknown as { styles: CSSResultGroup }).styles)
        .map((style) => (style as { cssText?: string }).cssText ?? "")
        .join("\n");
      expect(css, name).toMatch(/vtherm-time-chart\s*\{[^}]*display: block;[^}]*min-width: 0/);
      expect(css, name).toMatch(/:host\s*\{[^}]*min-width: 0/);
    }
  });
});

describe("the grid of the widgets on a phone", () => {
  it("cannot overflow a screen of 360 px: one column that shrinks, every card on it whatever its size", () => {
    const css = flatten(VThermWidgets.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(/:host\s*\{[^}]*minmax\(0, 1fr\)[^}]*min-width: 0/);
    expect(css).toMatch(/\.widget\s*\{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*box-sizing: border-box/);
    const narrow = css.slice(css.indexOf(`@media ${NARROW_QUERY}`));
    expect(narrow).toMatch(/:host\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(narrow).toMatch(/\.widget\s*\{[^}]*grid-column: 1 \/ -1 !important/);
  });

  it("puts a card of three columns on the one column of a grid of 360 px", async () => {
    const grid = document.createElement("vtherm-widgets") as VThermWidgets;
    const contribution = { id: "a.wide", component: "a-wide-el", size: { columns: 3, rows: 2 } };
    grid.entries = [{ id: "a.wide", pluginId: "a", hook: "thermostat_widget", contribution: contribution as never, size: { columns: 3, rows: 2 } }];
    document.body.append(grid);
    await grid.updateComplete;
    // Measured at 360 px: 328 px of content once the padding is removed.
    grid.columns = gridColumns(360 - 32);
    await grid.updateComplete;
    const card = grid.shadowRoot?.querySelector<HTMLElement>(".widget");
    expect(grid.gridColumns).toBe(1);
    expect(card?.style.gridColumn).toBe("span 1");
  });
});

describe("the components of the widgets on a phone", () => {
  it("cannot overflow a screen of 360 px: each shrinks with its card, and its texts wrap", () => {
    const components = { VThermWidgetCard, VThermGauge, VThermBar, VThermStateIcon, VThermValueRow, VThermAge };
    for (const [name, component] of Object.entries(components)) {
      const css = flatten((component as unknown as { styles: CSSResultGroup }).styles)
        .map((style) => (style as { cssText?: string }).cssText ?? "")
        .join("\n");
      expect(css, name).toMatch(/:host\s*\{[^}]*min-width: 0/);
      expect(css, name).toContain("overflow-wrap: anywhere");
    }
    const gauge = flatten(VThermGauge.styles).map((style) => (style as { cssText?: string }).cssText ?? "").join("\n");
    expect(gauge).toMatch(/svg\s*\{[^}]*width: 100%;[^}]*max-width: 200px/);
    const bar = flatten(VThermBar.styles).map((style) => (style as { cssText?: string }).cssText ?? "").join("\n");
    expect(bar).toMatch(/ul\s*\{[^}]*flex-wrap: wrap/);
  });
});

describe("the native widgets of the overview of a thermostat on a phone", () => {
  it("shrink with their card and wrap their texts, so that nothing is cut at 375 px", () => {
    const widgets = {
      TemperatureWidget,
      ModeWidget,
      AlertsWidget,
      HeatingWidget,
      ValveWidget,
      PresetWidget,
      SafetyWidget,
      WindowWidget,
      MotionWidget,
      OverpoweringWidget,
      AutoStartStopWidget,
      LockWidget,
      FailureWidget,
      DevicesWidget,
      AutoTpiWidget,
      BoilerDemandWidget,
      EnergyWidget,
      HumidityWidget,
      SyncWidget,
      HistoryWidget,
    };
    for (const [name, widget] of Object.entries(widgets)) {
      const styles = flatten((widget as unknown as { styles: CSSResultGroup }).styles);
      expect(styles, name).toContain(narrowStyles);
      const css = styles.map((style) => (style as { cssText?: string }).cssText ?? "").join("\n");
      expect(css, name).toMatch(/:host\s*\{[^}]*min-width: 0/);
      expect(css, name).toMatch(/\.lines\s*\{[^}]*min-width: 0/);
      expect(css, name).toMatch(/\.note\s*\{[^}]*overflow-wrap: anywhere/);
    }
  });
});

describe("the native widgets of the Overview page on a phone", () => {
  it("shrink with their card and wrap their texts, so that nothing is cut at 375 px", () => {
    const widgets = { CentralModeWidget, SummaryWidget, BoilerWidget, BoilerPowerWidget, HousePowerWidget, OutdoorWidget, PresenceWidget };
    for (const [name, widget] of Object.entries(widgets)) {
      const styles = flatten((widget as unknown as { styles: CSSResultGroup }).styles);
      expect(styles, name).toContain(narrowStyles);
      const css = styles.map((style) => (style as { cssText?: string }).cssText ?? "").join("\n");
      expect(css, name).toMatch(/:host\s*\{[^}]*min-width: 0/);
      expect(css, name).toMatch(/\.lines\s*\{[^}]*min-width: 0/);
      expect(css, name).toMatch(/\.note\s*\{[^}]*overflow-wrap: anywhere/);
    }
  });
});

describe("the fields of a native section on a phone", () => {
  it("are on one column without horizontal overflow: a field is never wider than the grid", () => {
    const css = flatten(NativeTabElement.styles)
      .map((style) => (style as { cssText?: string }).cssText ?? "")
      .join("\n");
    expect(css).toMatch(/\.fields\s*\{[^}]*minmax\(min\(300px, 100%\), 1fr\)/);
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