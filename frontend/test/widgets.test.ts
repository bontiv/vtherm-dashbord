// @vitest-environment happy-dom
/** The grid of the widgets: its columns, the size of each card, its order, its cards and what each widget receives. */
import { resolveWidgetSize } from "@vtherm/dashboard-sdk";
import type { PlacedEntry, ShownContribution, WidgetSize } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VThermWidgets, WIDGET_GAP, gridColumns, minHeightOf, spanOf } from "../src/components/widgets.ts";

/** A widget that records what it receives. */
class RecordingWidget extends HTMLElement {
  hass: unknown;
  narrow: unknown;
  thermostatId: unknown;
  central: unknown;
}
if (customElements.get("recording-widget") === undefined) {
  customElements.define("recording-widget", RecordingWidget);
}

/** A resolved widget, as the placement engine gives it. */
function entry(id: string, size?: WidgetSize): PlacedEntry {
  const contribution = { id, component: "recording-widget", ...(size === undefined ? {} : { size }) } as ShownContribution;
  return { id, pluginId: id.split(".")[0] as string, hook: "thermostat_widget", contribution, size: resolveWidgetSize(size) };
}

/** A ResizeObserver whose measure the test gives. */
let observed: ((width: number) => void) | undefined;
class FakeResizeObserver {
  constructor(callback: (records: { contentRect: { width: number } }[]) => void) {
    observed = (width) => callback([{ contentRect: { width } }]);
  }
  observe(): void {}
  disconnect(): void {
    observed = undefined;
  }
}

async function mount(entries: readonly PlacedEntry[], props: Partial<Pick<VThermWidgets, "narrow" | "thermostatId">> = {}, width?: number): Promise<{ grid: VThermWidgets; cards: HTMLElement[] }> {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  const grid = document.createElement("vtherm-widgets") as VThermWidgets;
  Object.assign(grid, { entries, hass: { language: "en" }, ...props });
  document.body.append(grid);
  await grid.updateComplete;
  if (width !== undefined) {
    observed?.(width);
    await grid.updateComplete;
  }
  return { grid, cards: [...(grid.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>(".widget")] };
}

/** The styles of the grid, as one text. */
const css = (VThermWidgets.styles as readonly { cssText?: string }[]).map((style) => style.cssText ?? "").join("\n");

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("the number of columns", () => {
  it("is the number of columns of 280 px that the width holds, gaps included", () => {
    expect(gridColumns(1440, 16)).toBe(4);
    expect(gridColumns(1440 - 32, WIDGET_GAP)).toBe(4);
    expect(gridColumns(575, 16)).toBe(1);
    expect(gridColumns(576, 16)).toBe(2);
    expect(gridColumns(880, 16)).toBe(3);
  });

  it("is at least one, even before the width is known", () => {
    expect(gridColumns(343, 16)).toBe(1);
    expect(gridColumns(0, 16)).toBe(1);
    expect(gridColumns(Number.NaN, 16)).toBe(1);
  });

  it("follows the measure of the grid", async () => {
    const { grid } = await mount([entry("a.one")], {}, 1440 - 32);
    expect(grid.gridColumns).toBe(4);
    expect(grid.style.getPropertyValue("--vtherm-widget-columns")).toBe("4");
    observed?.(600);
    await grid.updateComplete;
    expect(grid.style.getPropertyValue("--vtherm-widget-columns")).toBe("2");
  });
});

describe("the width and the height of a card", () => {
  it("takes the columns that the widget declares", async () => {
    expect(spanOf({ columns: 2 }, 4)).toBe("span 2");
    const { cards } = await mount([entry("a.two", { columns: 2 })], {}, 1408);
    expect(cards[0]?.style.gridColumn).toBe("span 2");
  });

  it("reduces a width larger than the grid to the grid, so that nothing overflows", async () => {
    expect(spanOf({ columns: 3 }, 2)).toBe("span 2");
    const { cards } = await mount([entry("a.three", { columns: 3 })], {}, 600);
    expect(cards[0]?.style.gridColumn).toBe("span 2");
  });

  it("takes the whole row for full, whatever the number of columns", () => {
    expect(spanOf({ columns: "full" }, 1)).toBe("1 / -1");
    expect(spanOf({ columns: "full" }, 4)).toBe("1 / -1");
  });

  it("gives a minimal height of the rows and their gaps, and lets the card grow", async () => {
    expect(minHeightOf(2)).toBe("calc(2 * var(--vtherm-widget-row) + 1 * var(--vtherm-widget-gap))");
    expect(css).toContain("--vtherm-widget-row: 140px");
    expect(css).toContain("--vtherm-widget-gap: 16px");
    const { cards } = await mount([entry("a.tall", { rows: 2 })], {}, 1408);
    expect(cards[0]?.style.getPropertyValue("min-height")).toBe("calc(2 * var(--vtherm-widget-row) + 1 * var(--vtherm-widget-gap))");
    expect(cards[0]?.style.height).toBe("");
  });

  it("gives one column and no minimal height to a widget without size", async () => {
    expect(spanOf(undefined, 4)).toBe("span 1");
    expect(minHeightOf(undefined)).toBeUndefined();
    const { cards } = await mount([entry("a.plain")], {}, 1408);
    expect(cards[0]?.style.gridColumn).toBe("span 1");
    expect(cards[0]?.style.getPropertyValue("min-height")).toBe("");
    expect(cards[0]?.getAttribute("style")).not.toContain("min-height");
  });

  it("puts every card on one column on a narrow screen, and keeps the minimal height", async () => {
    const { grid, cards } = await mount([entry("a.full", { columns: "full", rows: 2 }), entry("a.wide", { columns: 3, rows: 1 })], { narrow: true }, 1408);
    expect(grid.gridColumns).toBe(1);
    expect(grid.style.getPropertyValue("--vtherm-widget-columns")).toBe("1");
    expect(cards[1]?.style.gridColumn).toBe("span 1");
    expect(cards[0]?.style.getPropertyValue("min-height")).toContain("2 * var(--vtherm-widget-row)");
    // Under the threshold of the phone, the styles alone give one column, before any measure.
    expect(css).toMatch(/@media \(max-width: 700px\)[^@]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(max-width: 700px\)[^@]*\.widget\s*\{[^}]*grid-column: 1 \/ -1 !important/);
  });
});

describe("the order of the cards", () => {
  it("never fills a hole by moving a card", () => {
    expect(css).not.toContain("dense");
    expect(css).toMatch(/grid-auto-flow: row/);
    expect(css).toMatch(/grid-template-columns: repeat\(var\(--vtherm-widget-columns, 1\), minmax\(0, 1fr\)\)/);
  });

  it("keeps the order of the placements in the page, whatever the sizes, for the reading and the keyboard", async () => {
    const entries = [entry("a.wide", { columns: 2 }), entry("a.small"), entry("a.full", { columns: "full" }), entry("a.last", { columns: 3, rows: 3 })];
    const { cards } = await mount(entries, {}, 900);
    expect(cards.map((card) => card.dataset["widget"])).toEqual(["a.wide", "a.small", "a.full", "a.last"]);
  });
});

describe("the card and what a widget receives", () => {
  it("draws the widget in an element of the look of a card when ha-card is not defined", async () => {
    expect(customElements.get("ha-card")).toBeUndefined();
    const { cards } = await mount([entry("a.plain")], {}, 1408);
    expect(cards[0]?.localName).toBe("div");
    expect(css).toMatch(/\.widget\s*\{[^}]*background-color: var\(--card-background-color\)[^}]*border: 1px solid var\(--divider-color\)[^}]*border-radius: var\(--ha-card-border-radius, 12px\)/);
  });

  it("draws the widget in ha-card when it is defined, with the same border, radius and background as before", async () => {
    defineHaControlMocks();
    const { cards } = await mount([entry("old.widget")], {}, 1408);
    expect(cards[0]?.localName).toBe("ha-card");
    expect(cards[0]?.classList.contains("widget")).toBe(true);
    // A widget of a plugin published before the sizes: one column, the height of its content.
    expect(cards[0]?.style.gridColumn).toBe("span 1");
    expect(cards[0]?.style.getPropertyValue("min-height")).toBe("");
    expect(cards[0]?.getAttribute("style")).not.toContain("min-height");
  });

  it("gives hass, narrow and the thermostat to each widget", async () => {
    const { grid, cards } = await mount([entry("a.plain")], { thermostatId: "entry_salon", narrow: true }, 1408);
    const host = cards[0]?.querySelector("vtherm-contribution") as HTMLElement & { updateComplete: Promise<unknown> };
    await host.updateComplete;
    const widget = (host.shadowRoot?.querySelector("recording-widget") ?? host.querySelector("recording-widget")) as RecordingWidget;
    expect(widget.hass).toBe(grid.hass);
    expect(widget.narrow).toBe(true);
    expect(widget.thermostatId).toBe("entry_salon");
    expect(widget.central).toBeUndefined();
  });
});
