// @vitest-environment happy-dom
/** The styles of the narrow screen: one threshold, shared by the frame of the dashboard and by its native pages. */
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { CSSResultGroup } from "lit";
import { afterEach, describe, expect, it } from "vitest";

import { ComplementsCatalogPage, ComplementsInstalledPage } from "../src/complements/complements-page.ts";
import { VThermBreadcrumb } from "../src/components/breadcrumb.ts";
import { VThermCreateWizard } from "../src/components/create-wizard.ts";
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
      VThermCreateWizard,
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

describe("the type of a new thermostat", () => {
  it("is chosen by touching its label", async () => {
    const { panel } = await mountPanel({ path: `/vtherm/${CORE_TOP_TABS.thermostats}/new` });
    const wizard = find(panel.shadowRoot as ShadowRoot, "vtherm-create-wizard") as HTMLElement;
    const radios = findAll<HTMLInputElement>(wizard.shadowRoot as ShadowRoot, 'input[type="radio"]');
    expect(radios.length).toBeGreaterThan(1);
    expect(radios.every((radio) => radio.parentElement?.localName === "label")).toBe(true);
    const last = radios[radios.length - 1] as HTMLInputElement;
    expect(last.checked).toBe(false);
    (last.parentElement as HTMLLabelElement).click();
    await settle(panel);
    expect(last.checked).toBe(true);
  });
});
