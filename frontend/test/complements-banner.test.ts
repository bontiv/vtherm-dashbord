// @vitest-environment happy-dom
/**
 * The banners of the add-ons pages when Home Assistant defines `ha-alert`. In its own file: a custom element cannot be undefined, and the
 * other tests of the pages draw the fallback.
 */
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { find, mountPanel } from "./support/dashboard-harness.ts";
import { catalogAnswer, complement, createFakeStore } from "./support/fake-store.ts";
import { NATIVE_LOAD_ORDER, nativeHost } from "./support/native-host.ts";

vi.mock("../src/complements/sanitize.ts", () => ({
  sanitizeDescription: (html: string) => html,
  plainText: (html: string) => html.replace(/<[^>]*>/g, " ").trim(),
}));

const CATALOG = "/vtherm/core_complements.top.complements/core_complements.page.catalog";

let natives: { definition: UiPluginDefinition }[];
let model: { loading: boolean; storeLoading: boolean };

beforeAll(async () => {
  customElements.define("ha-alert", class extends HTMLElement {});
  const { definitions } = await nativeHost();
  natives = NATIVE_LOAD_ORDER.map((id) => ({ definition: definitions.get(id) as UiPluginDefinition }));
  ({ complementsModel: model } = (await import("../src/complements/model.ts")) as unknown as { complementsModel: typeof model });
});

const view = (panel: HTMLElement) => {
  const contribution = find(panel.shadowRoot as ShadowRoot, "vtherm-contribution")?.shadowRoot as ShadowRoot;
  return (find(contribution, "#mount")?.firstElementChild as HTMLElement | undefined)?.shadowRoot as ShadowRoot;
};

describe("the banner with the components of Home Assistant", () => {
  it("is an ha-alert, which no rule of the page gives a border, a padding or a radius", async () => {
    const store = createFakeStore({ absent: true });
    const catalog = async (message: Record<string, unknown>) => (message["type"] === "vtherm_dashboard/get_complements" ? catalogAnswer([complement({ name: "Switch helper" })]) : undefined);
    const { panel } = await mountPanel({ plugins: natives, path: CATALOG, handlers: [catalog, store.handle] });
    await vi.waitFor(() => {
      expect(model.loading || model.storeLoading).toBe(false);
      expect(find(view(panel), "ha-alert.banner.warning")).not.toBeNull();
    });
    const alert = find(view(panel), "ha-alert.banner.warning") as HTMLElement;
    expect(alert.getAttribute("alert-type")).toBe("warning");
    const page = (view(panel).host as HTMLElement).constructor as unknown as { styles: { cssText?: string }[] };
    const css = page.styles.map((style) => style.cssText ?? "").join("\n");
    for (const rule of css.match(/[^{}]+\{[^}]*\}/g) ?? []) {
      const selectors = rule.slice(0, rule.indexOf("{")).split(",").map((selector) => selector.trim());
      // A rule applies to the ha-alert when its selector is the class alone, or names ha-alert.
      if (selectors.some((selector) => /^(ha-alert)?\.banner(\.[\w-]+)*$/.test(selector))) {
        expect(rule, rule).not.toMatch(/border|padding/);
      }
    }
  });
});
