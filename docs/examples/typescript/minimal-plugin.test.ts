import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { UiPluginDefinition, UiPluginRegistry } from "@vtherm/dashboard-sdk";

const page = globalThis as { VThermUiPluginRegistry?: UiPluginRegistry };

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("HTMLElement", class {});
  vi.stubGlobal("customElements", { define: vi.fn() });
});

afterEach(() => {
  delete page.VThermUiPluginRegistry;
  vi.unstubAllGlobals();
});

it("declares the plugin and defines its element, as the page shows", async () => {
  const registered: UiPluginDefinition[] = [];
  page.VThermUiPluginRegistry = { dashboardVersion: "1.4.0", register: (definition) => void registered.push(definition) };

  await import("./minimal-plugin.ts");

  expect(registered).toHaveLength(1);
  expect(registered[0]?.id).toBe("my_plugin");
  expect(registered[0]?.contributions.thermostat_config?.[0]).toMatchObject({ id: "my_plugin.tab.main", component: "my-plugin-tab", placement: { after: "core_tpi.tab.main" } });
  expect((globalThis.customElements.define as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("my-plugin-tab");
});
