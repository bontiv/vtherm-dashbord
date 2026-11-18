/**
 * A chart of time series of the dashboard, for the panels that show what Versatile Thermostat would do with the settings.
 *
 * It draws in SVG the series (solid when recorded, dashed when estimated), the periods (detections, silences) as translucent bands,
 * the thresholds as horizontal rules, a time axis in the regional format of the user and up to two value axes. A cursor reads the
 * values at one time, with the mouse, a touch or the keyboard; a text summary is shown under the chart and given to the assistive
 * technologies.
 *
 * Why a chart of the dashboard instead of `ha-chart-base` of Home Assistant: `ha-chart-base` is an internal component of the frontend,
 * loaded on demand by the pages that need it (it may not be defined when the dashboard opens), and its API has changed several times
 * (Chart.js, then ECharts). The rule "a control of Home Assistant first" (spec `ha-native-controls`) targets the input controls, not
 * the charts, and a fallback would be needed anyway for the case where the element is missing or its API changes. A small chart in
 * SVG, with the colors of the theme of Home Assistant, follows the light and dark themes and stays under the control of the dashboard.
 */

import { LitElement, css, html, nothing, svg } from "lit";
import type { PropertyValues, SVGTemplateResult, TemplateResult } from "lit";

import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";

/** A sample of a series: a time and a value. */
export interface ChartSample {
  /** The time, in milliseconds since the epoch. */
  readonly t: number;
  /** The value. A value that is not finite breaks the line. */
  readonly v: number;
}

/** The tone of an element of the chart: each one is a color of the theme of Home Assistant. */
export type ChartTone = "primary" | "accent" | "secondary" | "warning" | "error" | "info";

/** A series of the chart. */
export interface ChartSeries {
  /** The identifier of the series, unique in the chart. */
  readonly id: string;
  /** The translated label, shown in the legend and in the readout of the cursor. An estimation says so in its label. */
  readonly label: string;
  /** The samples, sorted by time. */
  readonly points: readonly ChartSample[];
  /** The value axis: left for the temperatures, right for the percentages or the slopes. */
  readonly axis: "left" | "right";
  /** The color of the series, from the theme. */
  readonly tone: ChartTone;
  /** Whether the series is an estimation of the dashboard: it is drawn dashed, in the chart and in the legend. */
  readonly dashed?: boolean;
  /** Whether the series is drawn as steps (setpoints, shares): each value holds until the next sample. */
  readonly step?: boolean;
  /** Formats a value with its unit, for the cursor, the axis and the summary, e.g. "19,5 °C" or "62 %". */
  readonly format: (v: number) => string;
}

/** A period of the chart, drawn as a translucent band over the whole height: a detection, a silence. */
export interface ChartBand {
  /** The start of the period, in milliseconds since the epoch. */
  readonly start: number;
  /** The end of the period, in milliseconds since the epoch. */
  readonly end: number;
  /** The translated label, shown in the legend and in the readout when the cursor is in the period. */
  readonly label: string;
  /** The color of the band, from the theme. */
  readonly tone: "warning" | "error" | "info";
}

/** A horizontal threshold of the chart. */
export interface ChartRule {
  /** The value of the threshold. */
  readonly value: number;
  /** The value axis of the threshold. */
  readonly axis: "left" | "right";
  /** The translated label, shown in the legend. */
  readonly label: string;
  /** The color of the rule, from the theme. */
  readonly tone: "warning" | "error" | "secondary";
}

/** A value axis, with its range and its ticks. */
interface ValueAxis {
  readonly min: number;
  readonly max: number;
  readonly ticks: readonly number[];
  readonly labels: readonly string[];
}

/** Where the plot is in the SVG, and how a time or a value is placed in it. */
interface Layout {
  readonly width: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly axes: { readonly left?: ValueAxis; readonly right?: ValueAxis };
  x(t: number): number;
  y(v: number, axis: "left" | "right"): number | undefined;
}

/** The height of the SVG, in pixels: the viewBox follows the width of the element, so the height stays the same. */
const HEIGHT = 180;
/** The width used before the element is measured. */
const DEFAULT_WIDTH = 480;
/** The smallest width of the viewBox. */
const MIN_WIDTH = 160;
const TOP = 8;
const BOTTOM = 22;
/** The space between the labels of a value axis and the plot. */
const GAP = 6;
/** The width of a character of the labels (11 px), to reserve the room of the value axes. */
const CHAR = 6.2;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Up to this span, the time axis shows hours; beyond, days. */
const TWO_DAYS = 2 * DAY;

/**
 * The index of the last sample at or before a time, or -1.
 *
 * @param points - The samples, sorted by time.
 * @param t - The time.
 */
function lastAtOrBefore(points: readonly ChartSample[], t: number): number {
  let low = 0;
  let high = points.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((points[middle] as ChartSample).t <= t) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * The value of a series at a time: the last sample at or before it (step-hold), or `undefined` before the first sample.
 *
 * @param points - The samples, sorted by time.
 * @param t - The time.
 */
export function valueAt(points: readonly ChartSample[], t: number): number | undefined {
  const index = lastAtOrBefore(points, t);
  const value = index < 0 ? undefined : (points[index] as ChartSample).v;
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

/** The samples drawn in the window: from the one that holds at its start to the first one at or after its end. */
function visible(points: readonly ChartSample[], start: number, end: number): readonly ChartSample[] {
  const first = Math.max(0, lastAtOrBefore(points, start));
  let last = lastAtOrBefore(points, end);
  if (last < points.length - 1 && (points[last]?.t ?? Number.NEGATIVE_INFINITY) < end) {
    last += 1;
  }
  return points.slice(first, last + 1);
}

/** A step of 1, 2, 2.5 or 5 times a power of ten, for about `count` ticks over a span. */
function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / magnitude;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * magnitude;
}

/** A number without the noise of the floating point. */
const clean = (value: number): number => Number(value.toPrecision(12));

/**
 * The formatter of the dates and times in a language, with the language of the browser when the language is not valid.
 *
 * @param language - The language of the user.
 * @param options - The options of `Intl.DateTimeFormat`.
 */
function dateFormat(language: string, options: Intl.DateTimeFormatOptions): (t: number) => string {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat(language === "" ? undefined : language, options);
  } catch {
    format = new Intl.DateTimeFormat(undefined, options);
  }
  return (t) => format.format(t);
}

/**
 * The times of the ticks of the time axis, on round local hours (up to two days) or local midnights (beyond).
 *
 * @param start - The start of the window.
 * @param end - The end of the window.
 * @param most - The largest number of ticks that fits in the width.
 */
export function timeTicks(start: number, end: number, most: number): number[] {
  const span = end - start;
  const hours = span <= TWO_DAYS;
  const steps = hours ? [1, 2, 3, 4, 6, 12, 24] : [1, 2, 7, 14, 28];
  const step = steps.find((candidate) => span / (candidate * (hours ? HOUR : DAY)) <= most) ?? (steps.at(-1) as number);
  const date = new Date(start);
  if (hours) {
    date.setMinutes(0, 0, 0);
    date.setHours(Math.ceil(date.getHours() / step) * step);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  const advance = (): void => {
    if (hours) {
      date.setHours(date.getHours() + step);
    } else {
      date.setDate(date.getDate() + step);
    }
  };
  while (date.getTime() < start) {
    advance();
  }
  const ticks: number[] = [];
  while (date.getTime() <= end) {
    ticks.push(date.getTime());
    advance();
  }
  return ticks;
}

/** The SVG path of a series in the plot. */
function seriesPath(series: ChartSeries, layout: Layout, start: number, end: number): string {
  let path = "";
  let drawing = false;
  for (const { t, v } of visible(series.points, start, end)) {
    const y = layout.y(v, series.axis);
    if (y === undefined || !Number.isFinite(v)) {
      drawing = false;
      continue;
    }
    const x = round(layout.x(t));
    if (!drawing) {
      path += `M${x},${round(y)}`;
    } else if (series.step === true) {
      path += `H${x}V${round(y)}`;
    } else {
      path += `L${x},${round(y)}`;
    }
    drawing = true;
  }
  // A step holds its last value until the end of the window, as the readout of the cursor does.
  if (drawing && series.step === true) {
    path += `H${round(layout.x(end))}`;
  }
  return path;
}

const round = (value: number): number => Math.round(value * 10) / 10;

let lastId = 0;

/**
 * The element of a chart of time series.
 *
 * The plot is a `slider` over the times of the samples: it is focusable, ArrowLeft and ArrowRight (or ArrowDown and ArrowUp) move the
 * cursor to the previous or next time, PageDown and PageUp by a tenth of the times, Home and End to the first and last, Escape hides it.
 * A touch, a drag or the mouse moves it too. The readout of the cursor (the time, the value of each series, the periods) is shown inside
 * the chart and announced by a polite live region, for the keyboard and the touch. The summary is visible under the chart and describes
 * the plot.
 */
export class VThermTimeChart extends LitElement {
  static override properties = {
    label: { type: String },
    summary: { type: String },
    series: { attribute: false },
    bands: { attribute: false },
    rules: { attribute: false },
    start: { type: Number },
    end: { type: Number },
    language: { type: String },
    leftRange: { attribute: false },
    rightRange: { attribute: false },
    cursor: { state: true },
    announcement: { state: true },
    width: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        max-width: 100%;
        color: var(--primary-text-color);
      }
      .chart {
        position: relative;
        min-width: 0;
        margin: 0;
      }
      .chart-title {
        margin: 0 0 4px;
        color: var(--primary-text-color);
        font-size: 0.875rem;
        font-weight: 500;
      }
      .plot {
        position: relative;
        min-width: 0;
        width: 100%;
        border-radius: 4px;
        /* A horizontal drag moves the cursor; a vertical one still scrolls the page. */
        touch-action: pan-y;
        cursor: crosshair;
      }
      .plot:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .plot > svg {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
      }
      .plot text {
        font-family: inherit;
        font-size: 11px;
        fill: var(--secondary-text-color);
      }
      .axis {
        fill: none;
        stroke: var(--secondary-text-color);
        stroke-width: 1;
      }
      .grid {
        fill: none;
        stroke: var(--divider-color);
        stroke-width: 1;
        stroke-dasharray: 2 2;
      }
      .line,
      .key-line {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .line.dashed,
      .key-line.dashed {
        stroke-dasharray: 6 4;
      }
      .rule,
      .key-rule {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-dasharray: 2 3;
      }
      .band,
      .key-band {
        fill: currentColor;
        fill-opacity: 0.18;
        stroke: none;
      }
      .point {
        fill: currentColor;
        stroke: none;
      }
      .cursor {
        fill: none;
        stroke: var(--primary-text-color);
        stroke-width: 1;
      }
      .dot {
        fill: currentColor;
        stroke: var(--card-background-color);
        stroke-width: 1.5;
      }
      /* The tones: each one sets the color that the elements draw with (currentColor). */
      .primary {
        color: var(--primary-color);
      }
      .accent {
        color: var(--state-climate-heat-color);
      }
      .secondary {
        color: var(--secondary-text-color);
      }
      .warning {
        color: var(--warning-color);
      }
      .error {
        color: var(--error-color);
      }
      .info {
        color: var(--state-climate-cool-color);
      }
      /* The readout of the cursor stays inside the plot: it is anchored on the side of the cursor with the most room, and is never
         wider than that room (see its inline style). */
      .readout {
        position: absolute;
        top: 4px;
        z-index: 1;
        box-sizing: border-box;
        max-width: calc(100% - 8px);
        padding: 4px 8px;
        color: var(--primary-text-color);
        background-color: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        font-size: 0.75rem;
        line-height: 1.35;
        overflow-wrap: anywhere;
        pointer-events: none;
      }
      .readout-time {
        font-weight: 500;
      }
      .readout-row {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .key {
        flex: 0 0 auto;
        width: 24px;
        height: 10px;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        min-width: 0;
        margin: 4px 0 0;
        padding: 0;
        list-style: none;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
      }
      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .summary {
        margin: 4px 0 0;
        color: var(--secondary-text-color);
        font-size: 0.8125rem;
      }
      .live {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    `,
  ];

  /** The name of the chart, shown as its title and given to the plot. */
  declare label: string;
  /** The text summary of the chart, shown under it and describing the plot for the assistive technologies. */
  declare summary: string;
  /** The series. Without any sample, only the axes are drawn: the panel shows its own message. */
  declare series: readonly ChartSeries[];
  /** The periods, drawn as translucent bands. */
  declare bands: readonly ChartBand[];
  /** The horizontal thresholds. */
  declare rules: readonly ChartRule[];
  /** The start of the window, in milliseconds since the epoch. */
  declare start: number;
  /** The end of the window, in milliseconds since the epoch. */
  declare end: number;
  /** The language of the user, for the times of the axis and of the cursor. */
  declare language: string;
  /** A fixed range of the left axis, instead of the range of the data. */
  declare leftRange: readonly [number, number] | undefined;
  /** A fixed range of the right axis, instead of the range of the data. */
  declare rightRange: readonly [number, number] | undefined;
  /** The time of the cursor, if shown. */
  declare cursor: number | undefined;
  /** The text of the live region: the readout of the last move made with the keyboard or a touch. */
  declare announcement: string;
  /** The width of the viewBox: the measured width of the element. */
  declare width: number;

  /** The times of the samples in the window, sorted and unique: the stops of the cursor. */
  private times: readonly number[] = [];
  private pressed = false;
  /** The identifier of the clip path of the plot: unique in the page, for the browsers that do not scope it to the shadow root. */
  private readonly clipId = `time-chart-clip-${(lastId += 1)}`;
  private observer: ResizeObserver | undefined;

  constructor() {
    super();
    this.label = "";
    this.summary = "";
    this.series = [];
    this.bands = [];
    this.rules = [];
    const now = Date.now();
    this.start = now - DAY;
    this.end = now;
    this.language = "en";
    this.leftRange = undefined;
    this.rightRange = undefined;
    this.cursor = undefined;
    this.announcement = "";
    this.width = DEFAULT_WIDTH;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    this.observer ??= new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width > 0) {
        this.width = Math.max(MIN_WIDTH, width);
      }
    });
    this.observer.observe(this);
  }

  override disconnectedCallback(): void {
    this.observer?.disconnect();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("series") || changed.has("start") || changed.has("end")) {
      const times = new Set<number>();
      for (const series of this.series) {
        for (const { t } of series.points) {
          if (t >= this.start && t <= this.end) {
            times.add(t);
          }
        }
      }
      this.times = [...times].sort((a, b) => a - b);
      if (this.cursor !== undefined) {
        this.cursor = this.times.length === 0 ? undefined : (this.times[this.nearest(this.cursor)] as number);
      }
    }
  }

  /** The end of the window, after the start. */
  private get last(): number {
    return this.end > this.start ? this.end : this.start + 1;
  }

  /** The index of the time of the cursor nearest to a time. */
  private nearest(t: number): number {
    const times = this.times;
    let low = 0;
    let high = times.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((times[middle] as number) < t) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    const before = low > 0 ? (times[low - 1] as number) : undefined;
    return before !== undefined && t - before <= (times[low] as number) - t ? low - 1 : low;
  }

  /** The range and the ticks of a value axis, or `undefined` when nothing is drawn on it. */
  private valueAxis(side: "left" | "right", fixed: readonly [number, number] | undefined, count: number): ValueAxis | undefined {
    const onAxis = this.series.filter((series) => series.axis === side);
    let min: number;
    let max: number;
    if (fixed === undefined) {
      const values = [
        ...onAxis.flatMap((series) => visible(series.points, this.start, this.last).map(({ v }) => v)),
        ...this.rules.filter((rule) => rule.axis === side).map((rule) => rule.value),
      ].filter((value) => Number.isFinite(value));
      if (values.length === 0) {
        return undefined;
      }
      min = Math.min(...values);
      max = Math.max(...values);
      if (min === max) {
        min -= 1;
        max += 1;
      }
      const step = niceStep(max - min, count);
      min = clean(Math.floor(min / step) * step);
      max = clean(Math.ceil(max / step) * step);
    } else {
      [min, max] = fixed[0] < fixed[1] ? fixed : [fixed[0] - 1, fixed[0] + 1];
    }
    const step = niceStep(max - min, count);
    const ticks: number[] = [];
    for (let index = Math.ceil(clean(min / step)); clean(index * step) <= max; index += 1) {
      ticks.push(clean(index * step));
    }
    const format = onAxis[0]?.format ?? ((value: number) => this.number(value));
    return { min, max, ticks, labels: ticks.map((tick) => format(tick)) };
  }

  /** A number in the language of the user. */
  private number(value: number): string {
    try {
      return new Intl.NumberFormat(this.language === "" ? undefined : this.language, { maximumFractionDigits: 2 }).format(value);
    } catch {
      return String(value);
    }
  }

  private layout(): Layout {
    const width = this.width;
    const count = Math.max(2, Math.floor((HEIGHT - TOP - BOTTOM) / 36));
    const left = this.valueAxis("left", this.leftRange, count);
    const right = this.valueAxis("right", this.rightRange, count);
    const room = (axis: ValueAxis | undefined): number => (axis === undefined ? 8 : Math.max(...axis.labels.map((label) => label.length)) * CHAR + GAP);
    const x0 = Math.ceil(Math.max(room(left), 8));
    const x1 = width - Math.ceil(Math.max(room(right), 12));
    const y0 = TOP;
    const y1 = HEIGHT - BOTTOM;
    const start = this.start;
    const span = this.last - start;
    return {
      width,
      left: x0,
      right: x1,
      top: y0,
      bottom: y1,
      axes: { ...(left === undefined ? {} : { left }), ...(right === undefined ? {} : { right }) },
      x: (t) => x0 + ((t - start) / span) * (x1 - x0),
      y: (v, side) => {
        const axis = side === "left" ? left : right;
        return axis === undefined ? undefined : y1 - ((v - axis.min) / (axis.max - axis.min)) * (y1 - y0);
      },
    };
  }

  /** The format of the time of the cursor: the day and the hour. */
  private cursorTime(t: number): string {
    const options: Intl.DateTimeFormatOptions =
      this.last - this.start <= TWO_DAYS ? { weekday: "short", hour: "numeric", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
    return dateFormat(this.language, options)(t);
  }

  /** The text of the readout at a time: the time, the value of each series, then the periods that hold it. */
  private readoutText(t: number): string {
    const values = this.series.map((series) => {
      const value = valueAt(series.points, t);
      return `${series.label}: ${value === undefined ? "—" : series.format(value)}`;
    });
    const periods = this.bands.filter((band) => band.start <= t && t <= band.end).map((band) => band.label);
    return [this.cursorTime(t), ...values, ...periods].join(". ");
  }

  /** Move the cursor, and announce its readout when the move comes from the keyboard or a touch. */
  private moveCursor(t: number | undefined, announce: boolean): void {
    this.cursor = t;
    if (t === undefined) {
      this.announcement = "";
    } else if (announce) {
      this.announcement = this.readoutText(t);
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    const times = this.times;
    if (event.key === "Escape" && this.cursor !== undefined) {
      event.preventDefault();
      this.moveCursor(undefined, false);
      return;
    }
    if (times.length === 0) {
      return;
    }
    const last = times.length - 1;
    const current = this.cursor === undefined ? undefined : this.nearest(this.cursor);
    const page = Math.max(1, Math.round(times.length / 10));
    const by = (delta: number): number => (current === undefined ? (delta > 0 ? 0 : last) : Math.min(last, Math.max(0, current + delta)));
    const moves: Readonly<Record<string, () => number>> = {
      ArrowRight: () => by(1),
      ArrowUp: () => by(1),
      ArrowLeft: () => by(-1),
      ArrowDown: () => by(-1),
      PageUp: () => by(page),
      PageDown: () => by(-page),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[event.key];
    if (move === undefined) {
      return;
    }
    event.preventDefault();
    this.moveCursor(times[move()], true);
  }

  /** The time of the samples nearest to a position of the pointer, or `undefined` when the plot has no size or no sample. */
  private timeAt(clientX: number): number | undefined {
    const box = this.renderRoot.querySelector("svg")?.getBoundingClientRect();
    if (box === undefined || box.width <= 0 || this.times.length === 0) {
      return undefined;
    }
    const layout = this.layout();
    const x = ((clientX - box.left) * layout.width) / box.width;
    const t = this.start + ((x - layout.left) / (layout.right - layout.left)) * (this.last - this.start);
    return this.times[this.nearest(t)];
  }

  private onPointer(event: PointerEvent): void {
    if (event.type === "pointerdown") {
      this.pressed = true;
    } else if (event.pointerType !== "mouse" && !this.pressed) {
      return;
    }
    const t = this.timeAt(event.clientX);
    if (t !== undefined) {
      this.moveCursor(t, event.pointerType !== "mouse");
    }
  }

  private onPointerEnd(event: PointerEvent): void {
    this.pressed = false;
    // A touch leaves its cursor, so that the values stay readable once the finger is lifted; the mouse takes it away.
    if (event.type === "pointerleave" && event.pointerType === "mouse") {
      this.moveCursor(undefined, false);
    }
  }

  private renderAxes(layout: Layout): SVGTemplateResult {
    const { left, right, top, bottom, axes } = layout;
    const span = this.last - this.start;
    const ticks = timeTicks(this.start, this.last, Math.max(2, Math.floor((right - left) / 72)));
    const hourly = span <= TWO_DAYS;
    const hour = dateFormat(this.language, { hour: "numeric", minute: "2-digit" });
    const weekday = dateFormat(this.language, { weekday: "short" });
    const day = dateFormat(this.language, { weekday: "short", day: "numeric" });
    // On more than a day of hours, midnight shows the day instead of the hour.
    const timeLabel = (t: number): string => (hourly ? (span > DAY && new Date(t).getHours() === 0 ? weekday(t) : hour(t)) : day(t));
    const grid = axes.left ?? axes.right;
    const gridSide = axes.left === undefined ? "right" : "left";
    return svg`
      ${(grid?.ticks ?? []).map((tick) => {
        const y = round(layout.y(tick, gridSide) ?? bottom);
        return svg`<line class="grid" x1=${left} x2=${right} y1=${y} y2=${y}></line>`;
      })}
      <line class="axis" x1=${left} x2=${right} y1=${bottom} y2=${bottom}></line>
      <line class="axis" x1=${left} x2=${left} y1=${top} y2=${bottom}></line>
      ${axes.right === undefined ? nothing : svg`<line class="axis" x1=${right} x2=${right} y1=${top} y2=${bottom}></line>`}
      ${ticks.map((t) => {
        const x = round(layout.x(t));
        return svg`<line class="axis" x1=${x} x2=${x} y1=${bottom} y2=${bottom + 3}></line>
          <text class="time-tick" x=${x} y=${HEIGHT - 6} text-anchor="middle">${timeLabel(t)}</text>`;
      })}
      ${(["left", "right"] as const).map((side) => {
        const axis = axes[side];
        return axis === undefined
          ? nothing
          : axis.ticks.map(
              (tick, index) =>
                svg`<text class="value-tick ${side}" x=${side === "left" ? left - GAP : right + GAP} y=${round((layout.y(tick, side) ?? bottom) + 4)} text-anchor=${side === "left" ? "end" : "start"}>${axis.labels[index]}</text>`,
            );
      })}
    `;
  }

  private renderPlot(layout: Layout): SVGTemplateResult {
    const { left, right, top, bottom } = layout;
    const start = this.start;
    const end = this.last;
    const cursorX = this.cursor === undefined ? undefined : round(layout.x(this.cursor));
    return svg`
      <defs>
        <clipPath id=${this.clipId}><rect x=${left} y=${top - 2} width=${Math.max(0, right - left)} height=${bottom - top + 4}></rect></clipPath>
      </defs>
      ${this.bands
        .filter((band) => band.end >= start && band.start <= end)
        .map((band) => {
          const x = round(layout.x(Math.max(band.start, start)));
          const width = Math.max(1, round(layout.x(Math.min(band.end, end)) - x));
          return svg`<rect class="band ${band.tone}" x=${x} y=${top} width=${width} height=${bottom - top}><title>${band.label}</title></rect>`;
        })}
      ${this.renderAxes(layout)}
      <g clip-path="url(#${this.clipId})">
        ${this.rules.map((rule) => {
          const y = layout.y(rule.value, rule.axis);
          return y === undefined ? nothing : svg`<line class="rule ${rule.tone}" x1=${left} x2=${right} y1=${round(y)} y2=${round(y)}></line>`;
        })}
        ${this.series.map((series) => {
          const shown = visible(series.points, start, end).filter(({ v }) => Number.isFinite(v));
          const only = shown.length === 1 ? shown[0] : undefined;
          const y = only === undefined ? undefined : layout.y(only.v, series.axis);
          if (only !== undefined && y !== undefined && series.step !== true) {
            return svg`<circle class="point ${series.tone}" data-series=${series.id} cx=${round(layout.x(only.t))} cy=${round(y)} r="2.5"></circle>`;
          }
          const path = seriesPath(series, layout, start, end);
          return path === "" ? nothing : svg`<path class="line ${series.tone}${series.dashed === true ? " dashed" : ""}" data-series=${series.id} d=${path}></path>`;
        })}
      </g>
      ${cursorX === undefined || this.cursor === undefined
        ? nothing
        : svg`<line class="cursor" x1=${cursorX} x2=${cursorX} y1=${top} y2=${bottom}></line>
          ${this.series.map((series) => {
            const value = valueAt(series.points, this.cursor as number);
            const y = value === undefined ? undefined : layout.y(value, series.axis);
            return y === undefined ? nothing : svg`<circle class="dot ${series.tone}" cx=${cursorX} cy=${round(y)} r="3.5"></circle>`;
          })}`}
    `;
  }

  /** The key of a series in the legend and the readout: a short line, solid or dashed like the series. */
  private renderKey(series: ChartSeries): TemplateResult {
    return html`<svg class="key ${series.tone}" viewBox="0 0 24 10" aria-hidden="true" focusable="false">
      <line class="key-line${series.dashed === true ? " dashed" : ""}" x1="2" x2="22" y1="5" y2="5"></line>
    </svg>`;
  }

  private renderReadout(layout: Layout): TemplateResult | typeof nothing {
    const t = this.cursor;
    if (t === undefined) {
      return nothing;
    }
    // The readout goes on the side of the cursor with the most room, and is never wider than that room.
    const share = Math.min(1, Math.max(0, layout.x(t) / layout.width));
    const percent = (value: number): string => `${round(value * 100)}%`;
    const style =
      share <= 0.5
        ? `left: calc(${percent(share)} + 6px); max-width: calc(${percent(1 - share)} - 10px);`
        : `right: calc(${percent(1 - share)} + 6px); max-width: calc(${percent(share)} - 10px);`;
    const periods = this.bands.filter((band) => band.start <= t && t <= band.end);
    return html`<div class="readout" style=${style} aria-hidden="true">
      <div class="readout-time">${this.cursorTime(t)}</div>
      ${this.series.map((series) => {
        const value = valueAt(series.points, t);
        return html`<div class="readout-row" data-series=${series.id}>${this.renderKey(series)}<span>${series.label}: ${value === undefined ? "—" : series.format(value)}</span></div>`;
      })}
      ${periods.map(
        (band) => html`<div class="readout-row">
          <svg class="key ${band.tone}" viewBox="0 0 24 10" aria-hidden="true" focusable="false"><rect class="key-band" x="2" y="1" width="20" height="8"></rect></svg
          ><span>${band.label}</span>
        </div>`,
      )}
    </div>`;
  }

  private renderLegend(): TemplateResult | typeof nothing {
    if (this.series.length === 0 && this.bands.length === 0 && this.rules.length === 0) {
      return nothing;
    }
    return html`<ul class="legend">
      ${this.series.map(
        (series) => html`<li class="legend-item" data-series=${series.id} data-style=${series.dashed === true ? "dashed" : "solid"}>${this.renderKey(series)}<span>${series.label}</span></li>`,
      )}
      ${this.bands
        .filter((band, index) => this.bands.findIndex((other) => other.label === band.label && other.tone === band.tone) === index)
        .map(
          (band) => html`<li class="legend-item" data-style="band">
            <svg class="key ${band.tone}" viewBox="0 0 24 10" aria-hidden="true" focusable="false"><rect class="key-band" x="2" y="1" width="20" height="8"></rect></svg
            ><span>${band.label}</span>
          </li>`,
        )}
      ${this.rules.map(
        (rule) => html`<li class="legend-item" data-style="rule">
          <svg class="key ${rule.tone}" viewBox="0 0 24 10" aria-hidden="true" focusable="false"><line class="key-rule" x1="2" x2="22" y1="5" y2="5"></line></svg
          ><span>${rule.label}</span>
        </li>`,
      )}
    </ul>`;
  }

  protected override render(): TemplateResult {
    const layout = this.layout();
    const hasSummary = this.summary !== "";
    const hasTitle = this.label !== "";
    const range = `${this.cursorTime(this.start)} – ${this.cursorTime(this.last)}`;
    return html`<figure class="chart">
      ${hasTitle ? html`<figcaption class="chart-title" id="title">${this.label}</figcaption>` : nothing}
      <div
        class="plot"
        role="slider"
        tabindex="0"
        aria-labelledby=${hasTitle ? "title" : nothing}
        aria-describedby=${hasSummary ? "summary" : nothing}
        aria-orientation="horizontal"
        aria-valuemin=${this.start}
        aria-valuemax=${this.last}
        aria-valuenow=${this.cursor ?? this.start}
        aria-valuetext=${this.cursor === undefined ? range : this.cursorTime(this.cursor)}
        @keydown=${(event: KeyboardEvent) => this.onKeydown(event)}
        @pointerdown=${(event: PointerEvent) => this.onPointer(event)}
        @pointermove=${(event: PointerEvent) => this.onPointer(event)}
        @pointerup=${(event: PointerEvent) => this.onPointerEnd(event)}
        @pointercancel=${(event: PointerEvent) => this.onPointerEnd(event)}
        @pointerleave=${(event: PointerEvent) => this.onPointerEnd(event)}
      >
        <svg viewBox="0 0 ${layout.width} ${HEIGHT}" width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${this.renderPlot(layout)}</svg>
        ${this.renderReadout(layout)}
      </div>
      ${this.renderLegend()} ${hasSummary ? html`<p class="summary" id="summary">${this.summary}</p>` : nothing}
      <div class="live" aria-live="polite">${this.announcement}</div>
    </figure>`;
  }
}

defineElement("vtherm-time-chart", VThermTimeChart);
