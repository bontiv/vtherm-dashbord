import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import { defineElement } from "../define.ts";
import { isDefined } from "../ha.ts";
import { MISSING, formatNumber, withUnit } from "./format.ts";
import type { WidgetText } from "./format.ts";

/** The tone of a segment: the color of the theme that draws it. The text of the segment always says what it is. */
export type SegmentTone = "active" | "inactive" | "warning" | "error" | "success";

/** A part of a segmented bar. */
export interface BarSegment {
  /** What the part is, translated, for example "on". */
  readonly label: string;
  /** Its value, which gives its share of the bar. */
  readonly value: number;
  /** The value as the widget writes it, for example `3 min 6 s`. Without it, the number and the unit of the bar. */
  readonly display?: string;
  /** Its color. `active` by default. */
  readonly tone?: SegmentTone;
}

/** The color of the theme of each tone. */
const TONES: Readonly<Record<SegmentTone, string>> = {
  active: "var(--primary-color)",
  inactive: "var(--divider-color)",
  warning: "var(--warning-color)",
  error: "var(--error-color)",
  success: "var(--success-color)",
};

/**
 * A bar: a simple bar shows a value against a maximum (`ha-progress-bar` when Home Assistant defines it), a segmented bar shows parts
 * proportional to their values, each with its label and its value in text. The color never says something alone.
 */
export class VThermBar extends LitElement {
  static override properties = {
    hass: { attribute: false },
    label: { type: String },
    value: { type: Number },
    max: { type: Number },
    unit: { type: String },
    segments: { attribute: false },
    tone: { type: String },
    text: { attribute: false },
  };

  static override styles = css`
    :host {
      display: block;
      min-width: 0;
      color: var(--primary-text-color);
    }
    .head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }
    .label {
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
    .track {
      display: flex;
      height: 8px;
      margin: 4px 0;
      overflow: hidden;
      background-color: var(--divider-color);
      border-radius: 4px;
    }
    .fill,
    .segment {
      min-width: 0;
      height: 100%;
    }
    ha-progress-bar {
      display: block;
      margin: 4px 0;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .swatch {
      flex: none;
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
  `;

  /** The state of Home Assistant, for the language of the numbers. */
  declare hass: Hass | undefined;

  /** What the bar shows, translated. */
  declare label: string;

  /** The value of a simple bar. Undefined when it cannot be read: the bar shows "—". */
  declare value: number | undefined;

  /** The maximum of a simple bar. */
  declare max: number;

  /** The unit of the values. */
  declare unit: string;

  /** The parts of a segmented bar. A bar with segments ignores `value`. */
  declare segments: readonly BarSegment[] | undefined;

  /** The color of a simple bar. `active` by default; its label always says what it shows. */
  declare tone: SegmentTone;

  /** The translations of the plugin of the widget. */
  declare text: WidgetText;

  constructor() {
    super();
    this.hass = undefined;
    this.label = "";
    this.value = undefined;
    this.max = 100;
    this.unit = "";
    this.segments = undefined;
    this.tone = "active";
    this.text = (key) => key;
  }

  private displayOf(value: number): string {
    return withUnit(formatNumber(this.hass, value), this.unit);
  }

  private renderSegments(segments: readonly BarSegment[]): TemplateResult {
    const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
    const parts = segments.map((segment) => ({ ...segment, text: segment.display ?? this.displayOf(segment.value), color: TONES[segment.tone ?? "active"] }));
    return html`<div class="bar" role="group" aria-label=${this.label}>
      ${this.label === "" ? undefined : html`<div class="head"><span class="label">${this.label}</span></div>`}
      <div class="track" aria-hidden="true">
        ${parts.map(
          (part) =>
            html`<span class="segment" style=${styleMap({ width: total === 0 ? "0%" : `${(Math.max(0, part.value) / total) * 100}%`, backgroundColor: part.color })}></span>`,
        )}
      </div>
      <ul>
        ${parts.map((part) => html`<li><span class="swatch" style=${styleMap({ backgroundColor: part.color })} aria-hidden="true"></span>${part.label} ${part.text}</li>`)}
      </ul>
    </div>`;
  }

  private renderSimple(): TemplateResult {
    const known = this.value !== undefined && Number.isFinite(this.value);
    const percent = known && this.max > 0 ? Math.min(100, Math.max(0, ((this.value as number) / this.max) * 100)) : 0;
    const valueText = known ? this.displayOf(this.value as number) : MISSING;
    const name = known ? `${this.label} ${valueText}`.trim() : this.text("widget.value_unavailable", { label: this.label });
    // ha-progress-bar has the color of the theme: a bar of another tone is drawn by the dashboard.
    const bar =
      isDefined("ha-progress-bar") && this.tone === "active"
        ? html`<ha-progress-bar aria-hidden="true" .value=${percent}></ha-progress-bar>`
        : html`<div class="track" aria-hidden="true"><span class="fill" style=${styleMap({ width: `${percent}%`, backgroundColor: TONES[this.tone] ?? TONES.active })}></span></div>`;
    return html`<div
      class="bar"
      role="meter"
      aria-label=${name}
      aria-valuemin="0"
      aria-valuemax=${this.max}
      aria-valuenow=${known ? String(this.value) : "0"}
      aria-valuetext=${known ? valueText : this.text("widget.unavailable")}
    >
      <div class="head" aria-hidden="true"><span class="label">${this.label}</span><span class="value">${valueText}</span></div>
      ${bar}
    </div>`;
  }

  protected override render(): TemplateResult {
    return this.segments === undefined ? this.renderSimple() : this.renderSegments(this.segments);
  }
}

defineElement("vtherm-bar", VThermBar);
