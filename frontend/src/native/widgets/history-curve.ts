/**
 * The curve of a sensor over the last 24 hours, for the widgets of the Overview page. It reads the history with the client that the
 * dashboard shares (cache of a few minutes), only once its card is visible, and shows a message instead of the curve when the read fails.
 */

import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../../components/define.ts";
import { renderProgress } from "../../components/ha.ts";
import { formatNumber, withUnit } from "../../components/overview/format.ts";
import type { WidgetText } from "../../components/overview/format.ts";
import "../../components/time-chart.ts";
import type { ChartRule, ChartSeries } from "../../components/time-chart.ts";
import { CACHE_MS, isAbortError, sharedHistory } from "../history.ts";
import type { Sample } from "../history.ts";

/** Where the read of the history is. */
type CurveStatus = "idle" | "loading" | "ready" | "failed";

/** The curve of the state of a sensor over 24 hours, with a text summary. */
export class VThermHistoryCurve extends LitElement {
  static override properties = {
    hass: { attribute: false },
    entityId: { type: String },
    active: { type: Boolean },
    label: { type: String },
    unit: { type: String },
    language: { type: String },
    rules: { attribute: false },
    text: { attribute: false },
    status: { state: true },
    samples: { state: true },
  };

  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    vtherm-time-chart {
      display: block;
      min-width: 0;
    }
    .note {
      margin: 0;
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
  `;

  /** The state of Home Assistant. */
  declare hass: Hass | undefined;
  /** The sensor whose state is drawn. */
  declare entityId: string;
  /** Whether the card is visible: the history is read only then. */
  declare active: boolean;
  /** The translated name of the curve. */
  declare label: string;
  /** The unit of the values. */
  declare unit: string;
  /** The language of the user, for the time axis. */
  declare language: string;
  /** The thresholds drawn as horizontal rules. */
  declare rules: readonly ChartRule[];
  /** The translations of the plugin of the widget. */
  declare text: WidgetText;
  declare status: CurveStatus;
  declare samples: readonly Sample[];

  private span = { start: 0, end: 0 };
  private readEntity = "";
  private readAt = 0;
  private controller: AbortController | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.entityId = "";
    this.active = false;
    this.label = "";
    this.unit = "";
    this.language = "";
    this.rules = [];
    this.text = (key) => key;
    this.status = "idle";
    this.samples = [];
  }

  override disconnectedCallback(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.readEntity = "";
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    if (!this.active || this.entityId === "" || this.hass === undefined) {
      return;
    }
    if (this.entityId !== this.readEntity || Date.now() - this.readAt >= CACHE_MS) {
      this.load();
    }
  }

  /** Read the history of the sensor; a curve already drawn stays while a newer one is read. */
  private load(): void {
    const entityId = this.entityId;
    if (entityId !== this.readEntity) {
      this.status = "loading";
    }
    this.readEntity = entityId;
    this.readAt = Date.now();
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    sharedHistory(this.hass)
      .read(entityId, "day", [], controller.signal)
      .then((history) => {
        this.span = { start: history.start, end: history.end };
        this.samples = history.state;
        this.status = "ready";
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          this.status = "failed";
          // The next update reads again, once the cache would have expired.
          this.readAt = Date.now();
        }
      });
  }

  private format = (value: number): string => withUnit(formatNumber(this.hass, value), this.unit);

  protected override render(): TemplateResult {
    switch (this.status) {
      case "failed":
        return html`<p class="note failed" role="status">${this.text("widget.history_unavailable")}</p>`;
      case "ready":
        break;
      default:
        return html`<div class="note">${renderProgress(this.text("widget.loading"))}</div>`;
    }
    if (this.samples.length === 0) {
      return html`<p class="note empty">${this.text("widget.no_data")}</p>`;
    }
    const values = this.samples.map((sample) => sample.v);
    const series: ChartSeries[] = [{ id: "value", label: this.label, points: this.samples, axis: "left", tone: "primary", format: this.format }];
    const summary = this.text("widget.curve.summary", {
      min: this.format(Math.min(...values)),
      max: this.format(Math.max(...values)),
      last: this.format(values.at(-1) as number),
    });
    return html`<vtherm-time-chart
      .label=${this.label}
      .summary=${summary}
      .series=${series}
      .rules=${this.rules}
      .start=${this.span.start}
      .end=${this.span.end}
      .language=${this.language}
    ></vtherm-time-chart>`;
  }
}

defineElement("vtherm-history-curve", VThermHistoryCurve);
