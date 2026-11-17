// @vitest-environment happy-dom
/** The styles of the narrow screen: one threshold, shared by the frame of the dashboard and by its native pages. */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import type { CSSResultGroup } from "lit";
import { afterEach, describe, expect, it } from "vitest";

import { ComplementsCatalogPage, ComplementsInstalledPage } from "../src/complements/complements-page.ts";
import { VThermBreadcrumb } from "../src/components/breadcrumb.ts";
import { VThermCardActions } from "../src/components/card-actions.ts";
import { NARROW_QUERY as SHARED_QUERY, TOUCH_TARGET, narrowStyles } from "../src/components/narrow-styles.ts";
import { VThermPluginStatus } from "../src/components/plugin-status.ts";
import { VThermSideMenu } from "../src/components/side-menu.ts";
import { VThermThermostatList } from "../src/components/thermostat-list.ts";
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

describe("the type of a new thermostat", () => {
  it("is chosen by touching its label", async () => {
    const { definitions } = await nativeHost();
    const natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
    const { panel } = await mountPanel({ plugins: natives, realThermostats: true, configs: {}, path: `/vtherm/${CORE_TOP_TABS.thermostats}/new` });
    const type = find(panel.shadowRoot as ShadowRoot, "vtherm-native-type-thermostat") as HTMLElement;
    const radios = findAll<HTMLInputElement>(type.shadowRoot as ShadowRoot, 'input[type="radio"]');
    expect(radios.length).toBeGreaterThan(1);
    expect(radios.every((radio) => radio.parentElement?.localName === "label")).toBe(true);
    const last = radios[radios.length - 1] as HTMLInputElement;
    expect(last.checked).toBe(false);
    (last.parentElement as HTMLLabelElement).click();
    await settle(panel);
    expect(last.checked).toBe(true);
  });
});
