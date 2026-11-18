// @vitest-environment happy-dom
/** The help of a field: the button (i), its panel, the keyboard, the diagram of a plugin and the fallback of the icon. */
import { FIELD_HELP_ELEMENT } from "@vtherm/dashboard-sdk";
import type { FieldHelpProps } from "@vtherm/dashboard-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/components/field-help.ts";
import { INFORMATION_ICON } from "../src/components/field-help.ts";
import type { VThermFieldHelp } from "../src/components/field-help.ts";
import { find, findAll } from "./support/dashboard-harness.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

type Help = VThermFieldHelp & FieldHelpProps;

/** Show the help of a field in the page, with its properties. */
async function mount(props: Partial<FieldHelpProps>, parent: HTMLElement = document.body): Promise<Help> {
  const help = document.createElement(FIELD_HELP_ELEMENT) as Help;
  Object.assign(help, { label: "Cycle", ...props });
  parent.append(help);
  await help.updateComplete;
  return help;
}

const root = (help: Help) => help.shadowRoot as ShadowRoot;
const button = (help: Help) => find<HTMLButtonElement>(root(help), "button.toggle");
const panel = (help: Help) => find<HTMLElement>(root(help), ".panel") as HTMLElement;
const press = async (help: Help, target: HTMLElement, key: string) => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));
  await help.updateComplete;
};

describe("the help of a field", () => {
  it("shows only the hint, without button, when there is neither an explanation nor a diagram", async () => {
    const help = await mount({ hint: "How long a cycle lasts." });
    expect(root(help).textContent?.trim()).toBe("How long a cycle lasts.");
    expect(button(help)).toBeNull();
  });

  it("opens and closes its panel under the field with the button, which tells its state and the panel that it controls", async () => {
    const help = await mount({ info: "A longer cycle switches less often." });
    const toggle = button(help) as HTMLButtonElement;
    expect([toggle.getAttribute("aria-label"), toggle.getAttribute("aria-expanded")]).toEqual(["Help: Cycle", "false"]);
    // The grid of a field moves the button to the height of its input through this part.
    expect(toggle.getAttribute("part")).toBe("toggle");
    expect(toggle.getAttribute("aria-controls")).toBe(panel(help).id);
    expect(panel(help).hidden).toBe(true);
    toggle.click();
    await help.updateComplete;
    expect([toggle.getAttribute("aria-expanded"), panel(help).hidden]).toEqual(["true", false]);
    expect(panel(help).textContent).toContain("A longer cycle switches less often.");
    expect(panel(help).getAttribute("role")).toBe("region");
    toggle.click();
    await help.updateComplete;
    expect([toggle.getAttribute("aria-expanded"), panel(help).hidden]).toEqual(["false", true]);
  });

  it("closes with Escape, in the panel or in the field, and gives the focus back to the button", async () => {
    const field = document.createElement("div");
    const input = document.createElement("input");
    field.append(input);
    document.body.append(field);
    const help = await mount({ info: "Explanation." }, field);
    (button(help) as HTMLButtonElement).click();
    await help.updateComplete;
    await press(help, panel(help), "Escape");
    expect(panel(help).hidden).toBe(true);
    await help.updateComplete;
    expect(root(help).activeElement).toBe(button(help));
    (button(help) as HTMLButtonElement).click();
    await help.updateComplete;
    await press(help, input, "Escape");
    expect(panel(help).hidden).toBe(true);
  });

  it("keeps each panel in its own state", async () => {
    const first = await mount({ label: "Cycle", info: "First." });
    const second = await mount({ label: "Power", info: "Second." });
    (button(first) as HTMLButtonElement).click();
    await first.updateComplete;
    (button(second) as HTMLButtonElement).click();
    await second.updateComplete;
    expect([panel(first).hidden, panel(second).hidden]).toEqual([false, false]);
    (button(second) as HTMLButtonElement).click();
    await second.updateComplete;
    expect([panel(first).hidden, panel(second).hidden]).toEqual([false, true]);
  });

  it("stays open when the values of its diagram change", async () => {
    const help = await mount({ info: "Explanation.", diagram: "tpi_cycle", values: { cycle_min: 5 } });
    (button(help) as HTMLButtonElement).click();
    await help.updateComplete;
    help.values = { cycle_min: 10 };
    await help.updateComplete;
    expect(panel(help).hidden).toBe(false);
    expect(find(panel(help), '[role="img"]')).not.toBeNull();
  });

  it("shows the diagram of the library before the explanation", async () => {
    const help = await mount({ info: "Explanation.", diagram: "tpi_cycle", values: { cycle_min: 5 } });
    (button(help) as HTMLButtonElement).click();
    await help.updateComplete;
    const children = [...panel(help).children].map((child) => (child.getAttribute("role") === "img" || child.querySelector('[role="img"]') !== null ? "diagram" : child.className));
    expect(children).toEqual(["diagram", "info"]);
  });

  it("shows the explanation without diagram when the diagram is unknown", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const help = await mount({ info: "Explanation.", diagram: "unknown" as never });
    (button(help) as HTMLButtonElement).click();
    await help.updateComplete;
    expect(find(panel(help), '[role="img"]')).toBeNull();
    expect(panel(help).textContent).toContain("Explanation.");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unknown"));
  });

  it("shows the own diagram that a plugin gives in the slot diagram, instead of a diagram of the library", async () => {
    const help = document.createElement(FIELD_HELP_ELEMENT) as Help;
    const own = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    own.setAttribute("slot", "diagram");
    help.append(own);
    Object.assign(help, { label: "Threshold" });
    document.body.append(help);
    await help.updateComplete;
    (button(help) as HTMLButtonElement).click();
    await help.updateComplete;
    expect(find(panel(help), 'slot[name="diagram"]')).not.toBeNull();
    expect(find(panel(help), '[role="img"]')).toBeNull();
  });

  it("draws the icon of Home Assistant, and the letter i without it", async () => {
    const help = await mount({ info: "Explanation." });
    expect(button(help)?.textContent?.trim()).toBe("i");
    customElements.define("ha-svg-icon", class extends HTMLElement {});
    const iconic = await mount({ info: "Explanation." });
    expect((find(root(iconic), "ha-svg-icon") as HTMLElement & { path?: string }).path).toBe(INFORMATION_ICON);
  });

  it("is placed in the grid of a field with the attribute in-field, with its button on the first line", () => {
    const css = (customElements.get(FIELD_HELP_ELEMENT) as unknown as typeof VThermFieldHelp).styles;
    const text = (Array.isArray(css) ? css : [css]).map((style) => (style as { cssText?: string }).cssText ?? "").join("\n");
    expect(text).toMatch(/:host\(\[in-field\]\)\s*\{[^}]*display: contents/);
    expect(text).toMatch(/\.toggle\s*\{[^}]*grid-row: 1/);
    expect(findAll(document.body, FIELD_HELP_ELEMENT)).toEqual([]);
  });
});
