// @vitest-environment happy-dom
/** The chart of time series: the summary, the cursor with the keyboard and a touch, the legend, the bands and rules, the colors, the width. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/components/time-chart.ts";
import { timeTicks, valueAt } from "../src/components/time-chart.ts";
import type { ChartBand, ChartRule, ChartSeries, VThermTimeChart } from "../src/components/time-chart.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const HOUR = 3_600_000;
/** A round local hour, so that the times of the test are the same in every time zone. */
const START = new Date(2026, 10, 16, 8, 0, 0, 0).getTime();
const END = START + 6 * HOUR;

const celsius = (v: number): string => `${v.toFixed(1)} °C`;
const percent = (v: number): string => `${Math.round(v)} %`;

const ROOM: ChartSeries = {
  id: "room",
  label: "Room",
  axis: "left",
  tone: "primary",
  format: celsius,
  points: [
    { t: START, v: 19 },
    { t: START + 2 * HOUR, v: 19.5 },
    { t: START + 4 * HOUR, v: 20 },
  ],
};
const ESTIMATED: ChartSeries = {
  id: "estimated",
  label: "Heating share (estimation)",
  axis: "right",
  tone: "accent",
  dashed: true,
  step: true,
  format: percent,
  points: [
    { t: START, v: 62 },
    { t: START + 3 * HOUR, v: 40 },
  ],
};
const RECORDED: ChartSeries = { id: "recorded", label: "Heating share (recorded)", axis: "right", tone: "secondary", step: true, format: percent, points: [{ t: START + HOUR, v: 55 }] };
const BAND: ChartBand = { start: START + HOUR, end: START + 2 * HOUR, label: "Window open", tone: "warning" };
const RULE: ChartRule = { value: 21, axis: "left", label: "Setpoint", tone: "secondary" };

/** Show a chart in the page, with its properties. */
async function mount(props: Partial<VThermTimeChart> = {}): Promise<VThermTimeChart> {
  const chart = document.createElement("vtherm-time-chart") as VThermTimeChart;
  Object.assign(chart, { label: "Heating", summary: "Average heating share: 55 % estimated, 52 % recorded.", start: START, end: END, language: "en", series: [ROOM, ESTIMATED, RECORDED], bands: [BAND], rules: [RULE], ...props });
  document.body.append(chart);
  await chart.updateComplete;
  return chart;
}

const root = (chart: VThermTimeChart) => chart.shadowRoot as ShadowRoot;
const plot = (chart: VThermTimeChart) => root(chart).querySelector<HTMLElement>(".plot") as HTMLElement;
const readout = (chart: VThermTimeChart) => root(chart).querySelector<HTMLElement>(".readout");
const live = (chart: VThermTimeChart) => root(chart).querySelector<HTMLElement>('[aria-live="polite"]') as HTMLElement;
const press = async (chart: VThermTimeChart, key: string) => {
  plot(chart).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }));
  await chart.updateComplete;
};
const time = (t: number) => new Intl.DateTimeFormat("en", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(t);

describe("the chart of time series", () => {
  it("gives its name and its summary to the assistive technologies, and shows the summary under the chart", async () => {
    const chart = await mount();
    const target = plot(chart);
    expect([target.getAttribute("role"), target.getAttribute("tabindex")]).toEqual(["slider", "0"]);
    expect(root(chart).getElementById(target.getAttribute("aria-labelledby") ?? "")?.textContent).toBe("Heating");
    const summary = root(chart).getElementById(target.getAttribute("aria-describedby") ?? "") as HTMLElement;
    expect(summary.textContent).toBe("Average heating share: 55 % estimated, 52 % recorded.");
    expect(summary.closest("[aria-hidden]")).toBeNull();
    expect(root(chart).querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("reads a point with the keyboard: the time and the value of each series at that time, shown and announced", async () => {
    const chart = await mount();
    plot(chart).focus();
    expect(readout(chart)).toBeNull();
    await press(chart, "ArrowRight");
    expect(readout(chart)?.textContent).toContain(time(START));
    expect(readout(chart)?.textContent).toContain("Room: 19.0 °C");
    expect(readout(chart)?.textContent).toContain("Heating share (estimation): 62 %");
    // Before its first sample, a series has no value.
    expect(readout(chart)?.textContent).toContain("Heating share (recorded): —");
    expect(live(chart).textContent).toContain(time(START));
    expect(live(chart).textContent).toContain("Room: 19.0 °C");

    await press(chart, "ArrowRight");
    // The next time is the first sample of the recorded share, in the window open: the other series hold their last value.
    expect(readout(chart)?.textContent).toContain(time(START + HOUR));
    expect(readout(chart)?.textContent).toContain("Room: 19.0 °C");
    expect(readout(chart)?.textContent).toContain("Heating share (recorded): 55 %");
    expect(readout(chart)?.textContent).toContain("Window open");
    expect(plot(chart).getAttribute("aria-valuetext")).toBe(time(START + HOUR));

    await press(chart, "End");
    expect(readout(chart)?.textContent).toContain(time(START + 4 * HOUR));
    expect(readout(chart)?.textContent).toContain("Room: 20.0 °C");
    expect(readout(chart)?.textContent).toContain("Heating share (estimation): 40 %");
    await press(chart, "Home");
    expect(readout(chart)?.textContent).toContain(time(START));
    await press(chart, "ArrowLeft");
    expect(readout(chart)?.textContent).toContain(time(START));
    await press(chart, "Escape");
    expect(readout(chart)).toBeNull();
  });

  it("reads a point with a touch, and keeps the readout inside the chart on the side with the most room", async () => {
    const chart = await mount();
    const image = root(chart).querySelector("svg") as SVGSVGElement;
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 480, height: 180, right: 480, bottom: 180, x: 0, y: 0, toJSON: () => ({}) });
    plot(chart).dispatchEvent(new PointerEvent("pointerdown", { clientX: 479, pointerType: "touch", bubbles: true }));
    await chart.updateComplete;
    expect(readout(chart)?.textContent).toContain(time(START + 4 * HOUR));
    expect(readout(chart)?.getAttribute("style")).toMatch(/^right: calc\([\d.]+% \+ 6px\); max-width: calc\([\d.]+% - 10px\);$/);
    expect(live(chart).textContent).toContain("Room: 20.0 °C");
    // The touch ends: the readout stays.
    plot(chart).dispatchEvent(new PointerEvent("pointerup", { clientX: 479, pointerType: "touch", bubbles: true }));
    plot(chart).dispatchEvent(new PointerEvent("pointerleave", { clientX: 479, pointerType: "touch", bubbles: true }));
    await chart.updateComplete;
    expect(readout(chart)).not.toBeNull();

    plot(chart).dispatchEvent(new PointerEvent("pointermove", { clientX: 1, pointerType: "mouse", bubbles: true }));
    await chart.updateComplete;
    expect(readout(chart)?.textContent).toContain(time(START));
    expect(readout(chart)?.getAttribute("style")).toMatch(/^left: calc\([\d.]+% \+ 6px\); max-width: calc\([\d.]+% - 10px\);$/);
    plot(chart).dispatchEvent(new PointerEvent("pointerleave", { clientX: 1, pointerType: "mouse", bubbles: true }));
    await chart.updateComplete;
    expect(readout(chart)).toBeNull();
  });

  it("distinguishes in the legend a dashed estimation from a solid recorded series, by label and by line", async () => {
    const chart = await mount();
    const item = (id: string) => root(chart).querySelector<HTMLElement>(`.legend-item[data-series="${id}"]`) as HTMLElement;
    expect(item("estimated").textContent?.trim()).toBe("Heating share (estimation)");
    expect(item("estimated").dataset["style"]).toBe("dashed");
    expect(item("estimated").querySelector(".key-line")?.classList.contains("dashed")).toBe(true);
    expect(item("recorded").dataset["style"]).toBe("solid");
    expect(item("recorded").querySelector(".key-line")?.classList.contains("dashed")).toBe(false);
    expect(root(chart).querySelector('path.line[data-series="estimated"]')?.classList.contains("dashed")).toBe(true);
    expect(root(chart).querySelector('path.line[data-series="room"]')?.classList.contains("dashed")).toBe(false);
  });

  it("draws the bands and the rules, in the colors of their tones, with their labels in the legend", async () => {
    const chart = await mount();
    const band = root(chart).querySelector("rect.band") as SVGRectElement;
    expect(band.classList.contains("warning")).toBe(true);
    expect(Number(band.getAttribute("width"))).toBeGreaterThan(0);
    const rule = root(chart).querySelector("line.rule") as SVGLineElement;
    expect(rule.classList.contains("secondary")).toBe(true);
    expect(rule.getAttribute("y1")).toBe(rule.getAttribute("y2"));
    const legend = [...root(chart).querySelectorAll(".legend-item")].map((item) => item.textContent?.trim());
    expect(legend).toEqual(["Room", "Heating share (estimation)", "Heating share (recorded)", "Window open", "Setpoint"]);
  });

  it("draws only the axes when the series have no sample", async () => {
    const chart = await mount({ series: [{ ...ROOM, points: [] }], bands: [], rules: [] });
    expect(root(chart).querySelectorAll("path.line, circle.point")).toHaveLength(0);
    expect(root(chart).querySelectorAll("line.axis").length).toBeGreaterThan(1);
    await press(chart, "ArrowRight");
    expect(readout(chart)).toBeNull();
  });

  it("writes the times in the format of the language: hours up to two days, days beyond", async () => {
    const hours = await mount({ language: "fr" });
    const hour = new Intl.DateTimeFormat("fr", { hour: "numeric", minute: "2-digit" });
    const labels = [...root(hours).querySelectorAll(".time-tick")].map((tick) => tick.textContent);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels).toContain(hour.format(START + 2 * HOUR));
    document.body.innerHTML = "";
    const week = await mount({ language: "fr", end: START + 7 * 24 * HOUR });
    const day = new Intl.DateTimeFormat("fr", { weekday: "short", day: "numeric" });
    const days = [...root(week).querySelectorAll(".time-tick")].map((tick) => tick.textContent);
    expect(days).toContain(day.format(new Date(2026, 10, 18).getTime()));
  });

  it("has a fluid width: a viewBox, and a width of 100%", async () => {
    const chart = await mount();
    const image = root(chart).querySelector("svg") as SVGSVGElement;
    expect(image.getAttribute("viewBox")).toMatch(/^0 0 \d+ 180$/);
    expect(image.getAttribute("width")).toBe("100%");
  });

  it("uses no literal color: only the variables of the theme of Home Assistant", () => {
    const source = readFileSync(resolve(process.cwd(), "frontend/src/components/time-chart.ts"), "utf8");
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/);
    expect(source).not.toMatch(/(?:fill|stroke|color|background)(?:-color)?\s*[:=]\s*["']?(?:white|black|red|green|blue|gray|grey|orange|yellow|purple)\b/);
    expect(source).not.toMatch(/var\(--vtherm/);
  });
});

describe("the helpers of the chart", () => {
  it("read a series as steps: the last sample at or before a time", () => {
    expect(valueAt(ROOM.points, START - 1)).toBeUndefined();
    expect(valueAt(ROOM.points, START + HOUR)).toBe(19);
    expect(valueAt(ROOM.points, START + 2 * HOUR)).toBe(19.5);
    expect(valueAt(ROOM.points, END)).toBe(20);
  });

  it("put the ticks of the time axis on round local hours", () => {
    const ticks = timeTicks(START + 10 * 60_000, START + 6 * HOUR, 4);
    expect(ticks.length).toBeLessThanOrEqual(4);
    expect(ticks.every((tick) => new Date(tick).getMinutes() === 0 && new Date(tick).getHours() % 2 === 0)).toBe(true);
  });
});
