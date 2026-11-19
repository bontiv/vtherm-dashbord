import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html, svg } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../define.ts";
import { isDefined } from "../ha.ts";
import { MISSING, formatNumber, withUnit } from "./format.ts";
import type { WidgetText } from "./format.ts";

/** The point of a circle of the fallback gauge at a share of its range, from the left end (0) to the right end (1). */
function arcPoint(share: number, radius = 40): { readonly x: number; readonly y: number } {
  const angle = Math.PI * Math.min(1, Math.max(0, share));
  return { x: 50 - radius * Math.cos(angle), y: 50 - radius * Math.sin(angle) };
}

/**
 * A gauge: a value on a range, with an optional marker such as the setpoint, and its unit. It draws `ha-gauge` when Home Assistant
 * defines it, otherwise an arc of its own. Its accessible name says the value, the range and the marker: "19.5 on a range of 7 to 35,
 * setpoint 21".
 */
export class VThermGauge extends LitElement {
  static override properties = {
    hass: { attribute: false },
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    marker: { type: Number },
    markerLabel: { type: String },
    label: { type: String },
    unit: { type: String },
    display: { type: String },
    tone: { type: String },
    text: { attribute: false },
  };

  static override styles = css`
    :host {
      display: block;
      min-width: 0;
      color: var(--primary-text-color);
    }
    .gauge {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 0;
    }
    svg {
      width: 100%;
      max-width: 200px;
      height: auto;
    }
    .track {
      fill: none;
      stroke: var(--divider-color);
      stroke-width: 8;
      stroke-linecap: round;
    }
    .level {
      fill: none;
      stroke: var(--primary-color);
      stroke-width: 8;
      stroke-linecap: round;
    }
    .warning .level {
      stroke: var(--warning-color);
    }
    .warning ha-gauge {
      --gauge-color: var(--warning-color);
    }
    .marker {
      stroke: var(--primary-text-color);
      stroke-width: 2;
    }
    ha-gauge {
      width: 100%;
      max-width: 200px;
    }
    .value {
      font-size: 1.5rem;
    }
    .detail {
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
  `;

  /** The state of Home Assistant, for the language of the numbers. */
  declare hass: Hass | undefined;

  /** The value. Undefined when it cannot be read: the gauge shows "—". */
  declare value: number | undefined;

  /** The lower bound of the range. */
  declare min: number;

  /** The upper bound of the range. */
  declare max: number;

  /** A marker on the range, such as the setpoint. */
  declare marker: number | undefined;

  /** What the marker is, translated, for example "setpoint". */
  declare markerLabel: string;

  /** What the value is, translated, for example "Temperature": it names a value that cannot be read. */
  declare label: string;

  /** The unit of the value and of the bounds, for example `°C`. */
  declare unit: string;

  /** The text of the value, when the widget writes it itself, for example `4.1 / 6 kW`. Without it, the value and the unit. */
  declare display: string;

  /** The color of the level: `warning` when the value goes beyond what it should, for example a power above the maximum. */
  declare tone: "active" | "warning";

  /** The translations of the plugin of the widget. */
  declare text: WidgetText;

  constructor() {
    super();
    this.hass = undefined;
    this.value = undefined;
    this.min = 0;
    this.max = 100;
    this.marker = undefined;
    this.markerLabel = "";
    this.label = "";
    this.unit = "";
    this.display = "";
    this.tone = "active";
    this.text = (key) => key;
  }

  /** The accessible name: the value, the range and the marker. */
  get accessibleName(): string {
    const number = (value: number) => formatNumber(this.hass, value);
    if (this.value === undefined || !Number.isFinite(this.value)) {
      return this.text("widget.value_unavailable", { label: this.label !== "" ? this.label : this.markerLabel !== "" ? this.markerLabel : this.unit });
    }
    const range = this.text("widget.gauge.range", { value: number(this.value), min: number(this.min), max: number(this.max) });
    return this.marker === undefined ? range : this.text("widget.gauge.marker", { range, marker: this.markerLabel, value: number(this.marker) });
  }

  private share(value: number): number {
    return this.max === this.min ? 0 : (value - this.min) / (this.max - this.min);
  }

  private renderFallback(): TemplateResult {
    const start = arcPoint(0);
    const end = arcPoint(1);
    const track = `M ${start.x} ${start.y} A 40 40 0 0 1 ${end.x} ${end.y}`;
    const known = this.value !== undefined && Number.isFinite(this.value);
    const reached = known ? arcPoint(this.share(this.value as number)) : start;
    const level = `M ${start.x} ${start.y} A 40 40 0 0 1 ${reached.x} ${reached.y}`;
    const marker = this.marker === undefined ? undefined : this.share(this.marker);
    const inner = marker === undefined ? undefined : arcPoint(marker, 30);
    const outer = marker === undefined ? undefined : arcPoint(marker, 48);
    return html`<svg viewBox="0 0 100 56" aria-hidden="true" class="fallback">
      ${svg`<path class="track" d=${track}></path>`} ${known ? svg`<path class="level" d=${level}></path>` : undefined}
      ${inner === undefined || outer === undefined ? undefined : svg`<line class="marker" x1=${inner.x} y1=${inner.y} x2=${outer.x} y2=${outer.y}></line>`}
    </svg>`;
  }

  protected override render(): TemplateResult {
    const known = this.value !== undefined && Number.isFinite(this.value);
    const valueText = !known ? MISSING : this.display !== "" ? this.display : withUnit(formatNumber(this.hass, this.value as number), this.unit);
    const drawing = isDefined("ha-gauge")
      ? html`<ha-gauge aria-hidden="true" .min=${this.min} .max=${this.max} .value=${known ? this.value : this.min} .valueText=${valueText} .label=${""} .needle=${true} .locale=${this.hass?.locale}></ha-gauge>`
      : this.renderFallback();
    return html`<div
      class="gauge ${this.tone === "warning" ? "warning" : ""}"
      role="meter"
      aria-label=${this.accessibleName}
      aria-valuemin=${this.min}
      aria-valuemax=${this.max}
      aria-valuenow=${known ? String(this.value) : String(this.min)}
      aria-valuetext=${known ? valueText : this.text("widget.unavailable")}
    >
      ${drawing}
      <span class="value" aria-hidden="true">${valueText}</span>
      ${known ? undefined : html`<span class="detail unavailable" aria-hidden="true">${this.text("widget.unavailable")}</span>`}
      ${this.marker === undefined ? undefined : html`<span class="detail" aria-hidden="true">${this.markerLabel} ${withUnit(formatNumber(this.hass, this.marker), this.unit)}</span>`}
    </div>`;
  }
}

defineElement("vtherm-gauge", VThermGauge);
