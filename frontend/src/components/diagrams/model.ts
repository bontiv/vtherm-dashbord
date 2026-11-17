/**
 * The model of the diagrams of the help of the fields: what a diagram is, how it reads the values of the draft, and the helpers
 * that the drawings share.
 *
 * A diagram draws inside a viewBox `0 0 240 96`. It never writes a color, since its elements carry the classes of `diagramStyles`, which
 * use the variables of the theme of Home Assistant. It never writes a text: every label comes from `diagramTexts`, and every
 * number goes through the formatter of the context.
 */

import { svg } from "lit";
import type { SVGTemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

import { diagramTexts } from "./texts.ts";
import type { DiagramTextKey } from "./texts.ts";

/** What a diagram is drawn with. */
export interface DiagramContext {
  /** The effective values of the draft, by key of VT (own values, or central ones when the section inherits). */
  readonly values: Readonly<Record<string, unknown>>;
  /** The key of VT of the setting to highlight, if any. */
  readonly focus?: string;
  /** Formats a number with the regional settings of the user. */
  readonly format: (value: number, options?: Intl.NumberFormatOptions) => string;
}

/** A diagram of the library. */
export interface Diagram {
  /** The keys of VT that the diagram reads. */
  readonly keys: readonly string[];
  /** The example value of each key, used when the value is empty, invalid or out of its bounds. */
  readonly examples: Readonly<Record<string, number>>;
  /** The bounds of each key. */
  readonly bounds: Readonly<Record<string, readonly [number, number]>>;
  /** The file of VT that the diagram illustrates. */
  readonly source: string;
  /** The translated title. */
  title(): string;
  /** The translated caption, which states the values shown (and says which ones are examples). */
  caption(context: DiagramContext): string;
  /** The content of the SVG, inside a viewBox 0 0 240 96. */
  draw(context: DiagramContext): SVGTemplateResult;
  /**
   * Whether the diagram shows an example instead of a value of the draft. Only for a diagram that reads a value that is not a number
   * (a select) or that falls back on another key; otherwise the numeric keys of `examples` are checked.
   */
  usesExample?(context: DiagramContext): boolean;
}

/** The value of a key for a diagram, and whether it is the example. */
export interface DiagramValue {
  /** The value drawn. */
  readonly value: number;
  /** Whether the value is the example, because the draft has no usable value. */
  readonly example: boolean;
}

/** The units of the values shown, each with its translated text. */
export type Unit = "percent" | "min" | "s" | "deg" | "deg_h";

/** Translate a text of the diagrams into the language of the user. */
export function t(key: DiagramTextKey, params?: Readonly<Record<string, string | number>>): string {
  return diagramTexts.t(key, params);
}

/**
 * Read a value of the draft as a number.
 *
 * VT stores some numbers as text, and the lists per valve as text separated by commas (`"10,15"`): the first item is read and the
 * items are counted. A list such as the underlying entities is read as its number of items.
 *
 * @param raw - The value of the draft.
 * @returns The number and the count of items, or `undefined` when the value is empty or not a number.
 */
export function parseValue(raw: unknown): { readonly value: number; readonly count: number } | undefined {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw, count: 1 } : undefined;
  }
  if (Array.isArray(raw)) {
    return { value: raw.length, count: raw.length };
  }
  if (typeof raw === "string") {
    const items = raw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");
    const first = items[0];
    if (first === undefined) {
      return undefined;
    }
    const value = Number(first);
    return Number.isFinite(value) ? { value, count: items.length } : undefined;
  }
  return undefined;
}

/**
 * The value of a key for the diagram: the value of the draft when usable, otherwise the example.
 *
 * @param diagram - The diagram, which gives the example and the bounds of the key.
 * @param values - The effective values of the draft.
 * @param key - The key of VT.
 */
export function diagramValue(diagram: Diagram, values: Readonly<Record<string, unknown>>, key: string): DiagramValue {
  const parsed = parseValue(values[key]);
  const bounds = diagram.bounds[key];
  if (parsed !== undefined && (bounds === undefined || (parsed.value >= bounds[0] && parsed.value <= bounds[1]))) {
    return { value: parsed.value, example: false };
  }
  return { value: diagram.examples[key] ?? 0, example: true };
}

/**
 * The number of items of a value of the draft: the number of valves of a list per valve, 1 for a single value.
 *
 * @param values - The effective values of the draft.
 * @param key - The key of VT.
 */
export function valueCount(values: Readonly<Record<string, unknown>>, key: string): number {
  return parseValue(values[key])?.count ?? 1;
}

/** Whether a diagram shows at least one example instead of a value of the draft. */
export function showsExample(diagram: Diagram, context: DiagramContext): boolean {
  if (diagram.usesExample !== undefined) {
    return diagram.usesExample(context);
  }
  return Object.keys(diagram.examples).some((key) => diagramValue(diagram, context.values, key).example);
}

/**
 * The emphasis of an element of a diagram: `focus` for the element of the setting in focus, `recede` for the elements of the other
 * settings of the diagram while one of its settings is in focus, nothing otherwise.
 *
 * @param diagram - The diagram.
 * @param context - The context, which gives the focus.
 * @param key - The key of VT that the element illustrates.
 */
export function emphasis(diagram: Diagram, context: DiagramContext, key: string): string {
  const focus = context.focus;
  if (focus === undefined || !diagram.keys.includes(focus)) {
    return "";
  }
  return focus === key ? "focus" : "recede";
}

/** Join the classes of an element, without the empty ones. */
export function classes(...names: readonly (string | false | undefined)[]): string {
  return names.filter((name): name is string => typeof name === "string" && name !== "").join(" ");
}

/**
 * A number with its unit, in the language and the regional format of the user.
 *
 * @param context - The context, which gives the formatter.
 * @param value - The number.
 * @param unit - The unit.
 * @param digits - The maximum number of decimals.
 * @param signed - Whether a positive number shows its sign.
 */
export function quantity(context: DiagramContext, value: number, unit: Unit, digits = 1, signed = false): string {
  const options: Intl.NumberFormatOptions = { maximumFractionDigits: digits };
  if (signed) {
    options.signDisplay = "exceptZero";
  }
  const number = context.format(value, options);
  return t(`diagram.unit.${unit}`, { value: number });
}

/**
 * A text of a value for a caption: marked as an example when it is one.
 *
 * @param text - The value with its unit.
 * @param example - Whether the value is an example.
 */
export function stated(text: string, example: boolean): string {
  return example ? t("diagram.example_value", { value: text }) : text;
}

/** A coordinate rounded to a tenth, to keep the SVG short. */
export function r(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Keep a number between two bounds. */
export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** A linear scale from a domain to a range of coordinates. */
export function scale(from: number, to: number, start: number, end: number): (value: number) => number {
  const span = to - from === 0 ? 1 : to - from;
  return (value: number) => start + ((value - from) / span) * (end - start);
}

/**
 * Place labels at the heights they ask for, moved apart so that two labels are never closer than `gap`, and kept between `top` and
 * `bottom`. The labels keep their order from top to bottom.
 *
 * @param wanted - The height asked by each label (its baseline).
 * @returns The height of each label, in the order of `wanted`.
 */
export function spreadLabels(wanted: readonly number[], gap: number, top: number, bottom: number): number[] {
  const order = wanted.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y);
  const placed = order.map((entry) => entry.y);
  for (let index = 0; index < placed.length; index += 1) {
    placed[index] = Math.max(placed[index] ?? 0, index === 0 ? top : (placed[index - 1] ?? 0) + gap);
  }
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    placed[index] = Math.min(placed[index] ?? 0, index === placed.length - 1 ? bottom : (placed[index + 1] ?? 0) - gap);
  }
  const result: number[] = new Array<number>(wanted.length).fill(0);
  order.forEach((entry, position) => {
    result[entry.index] = placed[position] ?? entry.y;
  });
  return result;
}

/** The options of a label. */
export interface LabelOptions {
  /** The alignment of the text on its point. */
  readonly anchor?: "start" | "middle" | "end";
  /** The classes of the text: `d-note` (small, secondary) by default. */
  readonly className?: string;
  /** The key of VT that the label shows. */
  readonly key?: string | undefined;
}

/** A label: a text of the catalog at a point. */
export function label(x: number, y: number, content: string, options: LabelOptions = {}): SVGTemplateResult {
  return svg`<text x=${r(x)} y=${r(y)} text-anchor=${options.anchor ?? "start"} class=${options.className ?? "d-note"} data-key=${ifDefined(options.key)}>${content}</text>`;
}

/** A horizontal bracket from `x1` to `x2`, with its ends turned up, for a duration or a span. */
export function bracket(x1: number, x2: number, y: number, className: string, key?: string): SVGTemplateResult {
  return svg`<path d=${`M ${r(x1)} ${r(y - 3)} V ${r(y)} H ${r(x2)} V ${r(y - 3)}`} class=${className} data-key=${ifDefined(key)}></path>`;
}

/** A straight line. */
export function line(x1: number, y1: number, x2: number, y2: number, className: string, key?: string): SVGTemplateResult {
  return svg`<line x1=${r(x1)} y1=${r(y1)} x2=${r(x2)} y2=${r(y2)} class=${className} data-key=${ifDefined(key)}></line>`;
}

/** A rectangle given by its corners; a negative width is drawn as nothing. */
export function box(x1: number, y1: number, x2: number, y2: number, className: string, key?: string): SVGTemplateResult {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return svg`<rect x=${r(x)} y=${r(y)} width=${r(Math.abs(x2 - x1))} height=${r(Math.abs(y2 - y1))} class=${className} data-key=${ifDefined(key)}></rect>`;
}

/** A polyline through points. */
export function path(points: readonly (readonly [number, number])[], className: string, key?: string): SVGTemplateResult {
  const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${r(x)} ${r(y)}`).join(" ");
  return svg`<path d=${d} class=${className} data-key=${ifDefined(key)}></path>`;
}

/** A dot. */
export function dot(x: number, y: number, radius: number, className: string, key?: string): SVGTemplateResult {
  return svg`<circle cx=${r(x)} cy=${r(y)} r=${radius} class=${className} data-key=${ifDefined(key)}></circle>`;
}
