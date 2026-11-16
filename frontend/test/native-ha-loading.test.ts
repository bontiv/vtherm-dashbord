// @vitest-environment happy-dom
/** A native tab in a Home Assistant whose components are not defined: it waits for them, then uses its fallback. */
import type { PlacedEntry } from "@vtherm/dashboard-sdk";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { beforeAll, expect, it, vi } from "vitest";

import { find } from "./support/dashboard-harness.ts";
import { nativeHost } from "./support/native-host.ts";

let host: FakeHost;

beforeAll(async () => {
  ({ host } = await nativeHost());
  // The page is the one of Home Assistant, but this version does not define ha-selector.
  customElements.define("home-assistant", class extends HTMLElement {});
});

async function render(): Promise<HTMLElement> {
  const entry = host.resolved("thermostat_config").find((candidate: PlacedEntry) => candidate.id === "core.tab.main") as PlacedEntry;
  const props = { thermostatId: "entry-1", values: { thermostat_type: "thermostat_over_switch" }, centralValues: {}, errors: {}, proposeChanges: () => undefined };
  return host.render<"thermostat_config">(entry, props as never);
}

it("shows a waiting state while it waits for the components, then the plain controls with one warning", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  // The first load decides for the page: a short wait for the test. The native tabs were imported anew by nativeHost, so the SDK
  // is imported after it, to share their load.
  const { ensureHaControls } = await import("@vtherm/dashboard-sdk");
  const loading = ensureHaControls({ timeout: 20 });
  const element = await render();
  const root = element.shadowRoot as ShadowRoot;
  expect(root.textContent).toContain("Loading the controls of Home Assistant");
  expect(find(root, "#field-name")).toBeNull();

  await loading;
  await vi.waitFor(() => expect(find(root, "#field-name")).not.toBeNull());
  expect(warn).toHaveBeenCalledTimes(1);
  expect(String(warn.mock.calls[0]?.[0])).toContain("ha-selector");

  // Another tab uses the fallback at once, without a new warning.
  const other = await render();
  expect(find(other.shadowRoot as ShadowRoot, "#field-name")).not.toBeNull();
  expect(warn).toHaveBeenCalledTimes(1);
});
