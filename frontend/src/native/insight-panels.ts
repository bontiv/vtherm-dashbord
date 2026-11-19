/**
 * The panels of estimation of the native tabs: what Versatile Thermostat would do with the settings of the draft, computed on the
 * recorded history of the thermostat.
 *
 * - `vtherm-insight-tpi`: the share of heating now, decomposed, and its replay over 24 h or 7 days with the comfort indicators.
 * - `vtherm-insight-window`: the replay of the detection of an open window by the drop of the temperature.
 * - `vtherm-insight-safety`: the silences of the temperature sensors against the delay of the safety mode.
 *
 * Every value that the dashboard computes is marked as an estimation. The history is read only while a panel is shown.
 */

import { getEntryEntities } from "@vtherm/dashboard-sdk";
import type { ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { defineElement } from "../components/define.ts";
import { narrowStyles } from "../components/narrow-styles.ts";
import { renderAlert, renderProgress } from "../components/ha.ts";
import "../components/time-chart.ts";
import type { ChartBand, ChartRule, ChartSeries } from "../components/time-chart.ts";
import { comfortStats, resample, sensorGaps, slopeHistory, temperatureHistory, timeMean, tpiDecision, tpiHistory, windowDetections } from "../insights/index.ts";
import type { Sample, TpiDecision, TpiSettings, WindowSettings } from "../insights/index.ts";
import { PERIOD_MS, sharedHistory } from "./history.ts";
import type { EntityHistory, Period } from "./history.ts";
import { effectiveValues } from "./effective-values.ts";
import { thermostatTypeOf, usesValveRegulation, windowMethod, windowValues } from "./tab-definitions.ts";

export { effectiveValues };

/** Translate a key of the catalog of the native plugin of the tab. */
export type InsightText = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** How many points a chart draws over a period: enough for a curve, few enough for a phone. */
const CHART_POINTS = 300;

/** The entities of a thermostat that the panels read. */
export interface ThermostatEntities {
  readonly climate?: string;
  readonly powerPercent?: string;
  readonly slope?: string;
}

/**
 * Find the entities of a thermostat in the registries of `hass`: its climate entity, and the sensors of its device that Versatile
 * Thermostat creates, by their translation key. Nothing is asked to the server.
 *
 * @param hass - The state of Home Assistant.
 * @param entryId - The configuration entry of the thermostat.
 */
export function thermostatEntities(hass: Hass, entryId: string): ThermostatEntities {
  const found = getEntryEntities(hass, entryId);
  const powerPercent = found.byKey["power_percent"];
  const slope = found.byKey["temperature_slope"];
  return {
    ...(found.climate === undefined ? {} : { climate: found.climate }),
    ...(powerPercent === undefined ? {} : { powerPercent }),
    ...(slope === undefined ? {} : { slope }),
  };
}

/** Whether two sets of entities name the same entities. */
const sameEntities = (a: ThermostatEntities | undefined, b: ThermostatEntities): boolean => a !== undefined && a.climate === b.climate && a.powerPercent === b.powerPercent && a.slope === b.slope;

const numberOf = (value: unknown): number | undefined => {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value.replace(",", ".")) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
};

const textOf = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/** The settings of TPI of the values, with the defaults of Versatile Thermostat. */
export function tpiSettingsOf(values: ConfigValues): TpiSettings {
  return {
    coefInt: numberOf(values["tpi_coef_int"]) ?? 0.6,
    coefExt: numberOf(values["tpi_coef_ext"]) ?? 0.01,
    cycleMin: numberOf(values["cycle_min"]) ?? 5,
    minActivationSec: numberOf(values["minimal_activation_delay"]) ?? 10,
    minDeactivationSec: numberOf(values["minimal_deactivation_delay"]) ?? 0,
    thresholdLow: numberOf(values["tpi_threshold_low"]) ?? 0,
    thresholdHigh: numberOf(values["tpi_threshold_high"]) ?? 0,
    // A valve applies the share itself: the minimal delays do not change it.
    valve: thermostatTypeOf(values) === "thermostat_over_valve" || usesValveRegulation(values),
  };
}

/** The base of the panels: the properties that the tab gives, the period, the formats and the history. */
abstract class InsightPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    values: { attribute: false },
    centralValues: { attribute: false },
    thermostatId: { type: String },
    creating: { type: Boolean },
    text: { attribute: false },
    narrow: { type: Boolean },
    period: { state: true },
    history: { state: true },
    failure: { state: true },
    entities: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: grid;
        gap: 12px;
        min-width: 0;
        color: var(--primary-text-color);
      }
      .periods {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .periods button {
        min-height: 36px;
        padding: 4px 12px;
        font: inherit;
        color: var(--primary-text-color);
        background: none;
        border: 1px solid var(--divider-color);
        border-radius: 18px;
        cursor: pointer;
      }
      .periods button[aria-selected="true"] {
        color: var(--text-primary-color);
        background-color: var(--primary-color);
        border-color: var(--primary-color);
      }
      .periods button:disabled {
        cursor: default;
        opacity: 0.5;
      }
      .periods button:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      dl {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 4px 16px;
        margin: 0;
      }
      dt {
        color: var(--secondary-text-color);
      }
      dd {
        margin: 0;
        text-align: end;
        font-variant-numeric: tabular-nums;
      }
      dd.total {
        font-weight: 500;
      }
      .estimation {
        color: var(--secondary-text-color);
        font-style: italic;
        font-size: 0.875em;
      }
      .note,
      .limits {
        margin: 0;
        color: var(--secondary-text-color);
      }
      .notes {
        margin: 0;
        padding-inline-start: 20px;
      }
      .trial {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .trial input {
        width: 6em;
        min-height: 36px;
        box-sizing: border-box;
        padding: 4px 8px;
        font: inherit;
        color: var(--primary-text-color);
        background-color: var(--input-fill-color, var(--card-background-color));
        border: 1px solid var(--divider-color);
        border-radius: 4px;
      }
      .trial button {
        min-height: 36px;
        padding: 4px 8px;
        font: inherit;
        color: var(--primary-color);
        background: none;
        border: 0;
        cursor: pointer;
      }
      vtherm-time-chart {
        display: block;
        min-width: 0;
      }
    `,
  ];

  declare hass: Hass | undefined;
  declare values: ConfigValues;
  declare centralValues: ConfigValues;
  declare thermostatId: string;
  /** Whether the thermostat is being created: there is no history yet. */
  declare creating: boolean;
  declare text: InsightText;
  declare narrow: boolean;
  declare period: Period | "now";
  declare history: Readonly<Record<string, EntityHistory>> | undefined;
  declare failure: string | undefined;
  declare entities: ThermostatEntities | undefined;

  private loadedFor = "";

  constructor() {
    super();
    this.hass = undefined;
    this.values = {};
    this.centralValues = {};
    this.thermostatId = "";
    this.creating = false;
    this.text = (key) => key;
    this.narrow = false;
    this.period = "day";
    this.history = undefined;
    this.failure = undefined;
    this.entities = undefined;
  }

  /** The values of the draft, with the central ones of the sections that inherit. */
  protected get effective(): ConfigValues {
    return effectiveValues(this.values, this.centralValues);
  }

  /** The language of the user, for the formats. */
  protected get language(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? "en";
  }

  /** The unit of the temperatures. */
  protected get unit(): string {
    return this.hass?.config?.unit_system?.temperature ?? "°C";
  }

  protected number(value: number, digits = 1): string {
    return new Intl.NumberFormat(this.language, { maximumFractionDigits: digits }).format(value);
  }

  protected percent(fraction: number, digits = 1): string {
    return new Intl.NumberFormat(this.language, { style: "percent", maximumFractionDigits: digits }).format(fraction);
  }

  protected temperature(value: number): string {
    return `${this.number(value)} ${this.unit}`;
  }

  protected date(t: number): string {
    return new Intl.DateTimeFormat(this.language, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(t));
  }

  protected duration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);
    return minutes === 0 ? this.text("insight.seconds", { seconds: rest }) : rest === 0 ? this.text("insight.minutes", { minutes }) : this.text("insight.minutes_seconds", { minutes, seconds: rest });
  }

  /** The entities whose history the panel reads for a period, with the attributes to read. */
  protected abstract historyRequests(entities: ThermostatEntities): readonly { readonly key: string; readonly entityId: string; readonly attributes?: readonly string[] }[];

  /** Whether the panel reads a history now: not in a creation, nor on the period "now". */
  protected get needsHistory(): boolean {
    return !this.creating && this.period !== "now";
  }

  protected override willUpdate(changed: PropertyValues): void {
    // The element can be kept for another thermostat: it forgets the entities and the history of the previous one.
    if (changed.has("thermostatId") && changed.get("thermostatId") !== undefined) {
      this.entities = undefined;
      this.history = undefined;
      this.failure = undefined;
      this.loadedFor = "";
    }
    if (this.creating || this.hass === undefined) {
      return;
    }
    // The entities of the thermostat, from the registries of hass: they are there at once, and a change of the registries is followed.
    const found = thermostatEntities(this.hass, this.thermostatId);
    if (!sameEntities(this.entities, found)) {
      this.entities = found;
    }
    const entities = this.entities as ThermostatEntities;
    if (!this.needsHistory) {
      return;
    }
    const key = `${this.period}|${this.historyRequests(entities).map((request) => request.entityId).join(",")}`;
    if (key !== this.loadedFor || changed.has("period")) {
      this.loadedFor = key;
      void this.load(entities, this.period as Period);
    }
  }

  private async load(entities: ThermostatEntities, period: Period): Promise<void> {
    this.history = undefined;
    this.failure = undefined;
    try {
      const requests = this.historyRequests(entities);
      const read = await Promise.all(requests.map((request) => sharedHistory(this.hass).read(request.entityId, period, request.attributes ?? [])));
      if (this.period === period) {
        this.history = Object.fromEntries(requests.map((request, index) => [request.key, read[index] as EntityHistory]));
      }
    } catch (error) {
      if (this.period === period) {
        this.failure = error instanceof Error ? error.message : String(error);
      }
    }
  }

  /** The buttons of the periods. */
  protected renderPeriods(periods: readonly (Period | "now")[]): TemplateResult {
    return html`<div class="periods" role="tablist" aria-label=${this.text("insight.period.label")}>
      ${periods.map(
        (period) =>
          html`<button
            type="button"
            role="tab"
            aria-selected=${this.period === period ? "true" : "false"}
            ?disabled=${period !== "now" && this.creating}
            @click=${() => (this.period = period)}
          >
            ${this.text(`insight.period.${period}`)}
          </button>`,
      )}
    </div>`;
  }

  /** The state of the history when it cannot be drawn yet: a creation, a failure, a load. */
  protected renderHistoryState(): TemplateResult | undefined {
    if (this.creating) {
      return html`<p class="note">${this.text("insight.after_creation")}</p>`;
    }
    if (this.failure !== undefined) {
      return renderAlert("warning", this.text("insight.error", { message: this.failure }), "insight-error");
    }
    if (this.history === undefined) {
      return renderProgress(this.text("insight.loading"));
    }
    return undefined;
  }

  /** The period of the history that was read. */
  protected get span(): { readonly start: number; readonly end: number } {
    const first = Object.values(this.history ?? {})[0];
    const end = first?.end ?? Date.now();
    return { start: first?.start ?? end - PERIOD_MS[this.period === "week" ? "week" : "day"], end };
  }

  /** A chart of the period. */
  protected renderChart(label: string, summary: string, series: readonly ChartSeries[], bands: readonly ChartBand[] = [], rules: readonly ChartRule[] = []): TemplateResult {
    const { start, end } = this.span;
    return html`<vtherm-time-chart
      .label=${label}
      .summary=${summary}
      .series=${series}
      .bands=${bands}
      .rules=${rules}
      .start=${start}
      .end=${end}
      .language=${this.language}
    ></vtherm-time-chart>`;
  }

  /** The value of an entity now, as a number. */
  protected stateOf(entityId: string | undefined): number | undefined {
    return entityId === undefined ? undefined : numberOf(this.hass?.states[entityId]?.state);
  }
}

/** The share of heating now and its replay. */
export class VThermInsightTpi extends InsightPanel {
  static override properties = { ...InsightPanel.properties, trialTarget: { state: true } };

  /** The setpoint that the user tries in the panel, without changing the one of the thermostat. */
  declare trialTarget: number | undefined;

  constructor() {
    super();
    this.period = "now";
    this.trialTarget = undefined;
  }

  protected override historyRequests(entities: ThermostatEntities): readonly { readonly key: string; readonly entityId: string; readonly attributes?: readonly string[] }[] {
    const values = this.effective;
    const room = textOf(values["temperature_sensor_entity_id"]);
    const outdoor = textOf(values["external_temperature_sensor_entity_id"]);
    return [
      ...(room === undefined ? [] : [{ key: "room", entityId: room }]),
      ...(outdoor === undefined ? [] : [{ key: "outdoor", entityId: outdoor }]),
      ...(entities.climate === undefined ? [] : [{ key: "climate", entityId: entities.climate, attributes: ["temperature"] }]),
      ...(entities.powerPercent === undefined ? [] : [{ key: "recorded", entityId: entities.powerPercent }]),
      ...(entities.slope === undefined ? [] : [{ key: "slope", entityId: entities.slope }]),
    ];
  }

  /** The setpoint of the thermostat now. */
  private get currentTarget(): number | undefined {
    const climate = this.entities?.climate === undefined ? undefined : this.hass?.states[this.entities.climate];
    return numberOf(climate?.attributes["temperature"]);
  }

  private renderNow(): TemplateResult {
    const values = this.effective;
    const roomSensor = textOf(values["temperature_sensor_entity_id"]);
    const outdoorSensor = textOf(values["external_temperature_sensor_entity_id"]);
    const room = this.stateOf(roomSensor);
    const outdoor = this.stateOf(outdoorSensor);
    if (roomSensor === undefined || room === undefined) {
      return html`<p class="note">${this.text("insight.no_room")}</p>`;
    }
    const current = this.currentTarget;
    const target = this.trialTarget ?? current ?? 20;
    const climate = this.entities?.climate === undefined ? undefined : this.hass?.states[this.entities.climate];
    const slope = numberOf((climate?.attributes["specific_states"] as Readonly<Record<string, unknown>> | undefined)?.["temperature_slope"]);
    const settings = tpiSettingsOf(values);
    const decision = tpiDecision(settings, { target, room, ...(outdoor === undefined ? {} : { outdoor }), ...(slope === undefined ? {} : { slope }) });
    const estimation = html`<span class="estimation">${this.text("insight.estimation")}</span>`;
    return html`<div class="trial">
        <label for="trial">${this.text("insight.tpi.trial_target")}</label>
        <input
          id="trial"
          type="number"
          inputmode="decimal"
          step="0.1"
          .value=${String(target)}
          @change=${(event: Event) => {
            const value = numberOf((event.target as HTMLInputElement).value);
            this.trialTarget = value;
          }}
        />
        <span>${this.unit}</span>
        ${this.trialTarget === undefined || current === undefined
          ? undefined
          : html`<button type="button" class="reset" @click=${() => (this.trialTarget = undefined)}>${this.text("insight.tpi.reset", { target: this.temperature(current) })}</button>`}
      </div>
      <dl>
        <dt>${this.text("insight.tpi.room_part", { room: this.temperature(room), target: this.temperature(target) })}</dt>
        <dd class="room-part">${this.percent(decision.roomPart)} ${estimation}</dd>
        <dt>${outdoor === undefined ? this.text("insight.tpi.no_outdoor") : this.text("insight.tpi.outdoor_part", { outdoor: this.temperature(outdoor) })}</dt>
        <dd class="outdoor-part">${this.percent(decision.outdoorPart)} ${estimation}</dd>
        <dt>${this.text("insight.tpi.share")}</dt>
        <dd class="total share">${this.percent(decision.raw)} ${estimation}</dd>
        <dt>${this.text("insight.tpi.applied")}</dt>
        <dd class="total applied">${this.percent(decision.onPercent, 0)} ${estimation}</dd>
        <dt>${this.text("insight.tpi.cycle", { cycle: this.duration(settings.cycleMin * 60) })}</dt>
        <dd class="total on-time">${this.text("insight.tpi.on_off", { on: this.duration(decision.onSec), off: this.duration(decision.offSec) })} ${estimation}</dd>
      </dl>
      ${this.renderNotes(decision)}`;
  }

  private renderNotes(decision: TpiDecision): TemplateResult | undefined {
    return decision.notes.length === 0 ? undefined : html`<ul class="notes">${decision.notes.map((note) => html`<li class="note" data-note=${note}>${this.text(`insight.tpi.note.${note}`)}</li>`)}</ul>`;
  }

  private renderReplay(): TemplateResult {
    const state = this.renderHistoryState();
    if (state !== undefined) {
      return state;
    }
    const history = this.history ?? {};
    const { start, end } = this.span;
    const room = history["room"]?.state ?? [];
    const target = history["climate"]?.attributes["temperature"] ?? [];
    if (room.length < 2 || target.length === 0) {
      return html`<p class="note">${this.text("insight.too_few")}</p>`;
    }
    const outdoor = history["outdoor"]?.state;
    const slope = history["slope"]?.state;
    const settings = tpiSettingsOf(this.effective);
    // VT records its share before the minimal delays (power_percent): the replay gives the same share, to compare them.
    const estimated = tpiHistory(settings, { room, target, ...(outdoor === undefined ? {} : { outdoor }), ...(slope === undefined ? {} : { slope }) }, start, end, { value: "onPercent" });
    const recorded = (history["recorded"]?.state ?? []).map((sample) => ({ t: sample.t, v: sample.v / 100 }));
    const temperatures = temperatureHistory({ room, target, ...(outdoor === undefined ? {} : { outdoor }) }, start, end, CHART_POINTS);
    const estimatedMean = timeMean(estimated, start, end);
    const recordedMean = recorded.length === 0 ? undefined : timeMean(recorded, start, end);
    const comfort = comfortStats(room, target, start, end);
    const asPercent = (series: readonly Sample[]): Sample[] => series.map((sample) => ({ t: sample.t, v: sample.v * 100 }));
    const percentFormat = (v: number) => this.percent(v / 100, 0);
    const series: ChartSeries[] = [
      { id: "room", label: this.text("insight.series.room"), points: temperatures.room, axis: "left", tone: "secondary", format: (v) => this.temperature(v) },
      { id: "target", label: this.text("insight.series.target"), points: temperatures.target, axis: "left", tone: "accent", step: true, format: (v) => this.temperature(v) },
      { id: "estimated", label: this.text("insight.series.estimated"), points: asPercent(estimated), axis: "right", tone: "primary", dashed: true, step: true, format: percentFormat },
      ...(recorded.length === 0 ? [] : [{ id: "recorded", label: this.text("insight.series.recorded"), points: asPercent(recorded), axis: "right" as const, tone: "info" as const, step: true, format: percentFormat }]),
    ];
    const means = {
      estimated: estimatedMean === undefined ? "—" : this.percent(estimatedMean),
      recorded: recordedMean === undefined ? "—" : this.percent(recordedMean),
    };
    const summary = this.text("insight.tpi.summary", means);
    return html`${this.renderChart(this.text("insight.tpi.chart"), summary, series)}
      <dl>
        <dt>${this.text("insight.tpi.mean_estimated")}</dt>
        <dd class="mean-estimated">${means.estimated} <span class="estimation">${this.text("insight.estimation")}</span></dd>
        <dt>${this.text("insight.tpi.mean_recorded")}</dt>
        <dd class="mean-recorded">${recordedMean === undefined ? this.text("insight.tpi.no_recorded") : means.recorded}</dd>
        <dt>${this.text("insight.tpi.rise")}</dt>
        <dd class="rise">${comfort.riseMinutes === undefined ? "—" : this.duration(comfort.riseMinutes * 60)}</dd>
        <dt>${this.text("insight.tpi.overshoot")}</dt>
        <dd class="overshoot">${comfort.overshoot === undefined ? "—" : this.temperature(comfort.overshoot)}</dd>
        <dt>${this.text("insight.tpi.within")}</dt>
        <dd class="within">${this.percent(comfort.withinShare, 0)}</dd>
      </dl>
      ${recordedMean === undefined ? undefined : html`<p class="note differ">${this.text("insight.tpi.differ")}</p>`}
      ${comfort.excludedDrops > 0 ? html`<p class="note drops">${this.text("insight.tpi.drops", { count: comfort.excludedDrops })}</p>` : undefined}`;
  }

  protected override render(): TemplateResult {
    return html`${this.renderPeriods(["now", "day", "week"])} ${this.period === "now" ? this.renderNow() : this.renderReplay()}
      <p class="limits">${this.text("insight.tpi.limits")}</p>`;
  }
}

/** The replay of the detection of an open window by the drop of the temperature. */
export class VThermInsightWindow extends InsightPanel {
  protected override historyRequests(entities: ThermostatEntities): readonly { readonly key: string; readonly entityId: string }[] {
    const room = textOf(this.effective["temperature_sensor_entity_id"]);
    return room === undefined ? [] : [{ key: "room", entityId: room }, ...(entities.powerPercent === undefined ? [] : [{ key: "recorded", entityId: entities.powerPercent }])];
  }

  /** With an opening sensor, there is no detection to replay, so no history to read. */
  protected override get needsHistory(): boolean {
    return super.needsHistory && windowMethod(windowValues(this.values, this.centralValues)) !== "sensor";
  }

  /** The thresholds of the page; once an opening threshold is given, the others take the defaults of the form of Versatile Thermostat. */
  private get settings(): WindowSettings {
    const values = this.effective;
    const open = numberOf(values["window_auto_open_threshold"]);
    if (open === undefined) {
      return {};
    }
    return { openThreshold: open, closeThreshold: numberOf(values["window_auto_close_threshold"]) ?? 0, maxDurationMin: numberOf(values["window_auto_max_duration"]) ?? 30 };
  }

  private renderReplay(): TemplateResult {
    if (textOf(this.effective["temperature_sensor_entity_id"]) === undefined) {
      return html`<p class="note">${this.text("insight.no_room")}</p>`;
    }
    const state = this.renderHistoryState();
    if (state !== undefined) {
      return state;
    }
    const room = this.history?.["room"]?.state ?? [];
    const { start, end } = this.span;
    if (room.length < 2) {
      return html`<p class="note">${this.text("insight.too_few")}</p>`;
    }
    const cycleMin = numberOf(this.effective["cycle_min"]) ?? 5;
    const slope = slopeHistory(room, start, end, { cycleMin });
    const settings = this.settings;
    const recorded = this.history?.["recorded"]?.state.map((sample) => ({ t: sample.t, v: sample.v / 100 }));
    const { detections, strongestDrop, configured } = windowDetections(slope, settings, { end, ...(recorded === undefined || recorded.length === 0 ? {} : { onPercent: recorded }) });
    const slopeFormat = (v: number) => this.text("insight.window.slope_value", { slope: this.number(v) });
    const series: ChartSeries[] = [
      { id: "slope", label: this.text("insight.window.slope"), points: resample(slope, start, end, CHART_POINTS), axis: "left", tone: "primary", dashed: true, format: slopeFormat },
    ];
    // VT detects an opening when the slope falls below minus the opening threshold, and its end when it rises to the closing threshold.
    const rules: ChartRule[] = [
      ...(settings.openThreshold === undefined ? [] : [{ value: -settings.openThreshold, axis: "left" as const, label: this.text("insight.window.open_threshold"), tone: "warning" as const }]),
      ...(settings.closeThreshold === undefined ? [] : [{ value: settings.closeThreshold, axis: "left" as const, label: this.text("insight.window.close_threshold"), tone: "secondary" as const }]),
    ];
    const bands: ChartBand[] = detections.map((detection) => ({ start: detection.start, end: detection.end, label: this.text("insight.window.detection"), tone: "warning" }));
    const strongest = strongestDrop === undefined ? undefined : this.text("insight.window.strongest", { slope: slopeFormat(strongestDrop.v), date: this.date(strongestDrop.t) });
    const stopped = detections.filter((detection) => detection.endReason === "max_duration").length;
    const summary = !configured
        ? this.text("insight.window.no_threshold")
        : detections.length === 0
          ? `${this.text("insight.window.none")} ${strongest ?? ""}`
          : this.text("insight.window.count", { count: detections.length });
    // The chart shows the summary under its legend.
    return html`${this.renderChart(this.text("insight.window.chart"), summary, series, bands, rules)}
      ${detections.length > 0 && strongest !== undefined ? html`<p class="note strongest">${strongest}</p>` : undefined}
      ${stopped > 0 ? html`<p class="note max-duration">${this.text("insight.window.max_duration", { count: stopped })}</p>` : undefined}
      ${detections.length > 0
        ? html`<ul class="notes detections">
            ${detections.map((detection) => html`<li>${this.text("insight.window.detection_at", { start: this.date(detection.start), end: this.date(detection.end) })}</li>`)}
          </ul>`
        : undefined}`;
  }

  protected override render(): TemplateResult {
    if (windowMethod(windowValues(this.values, this.centralValues)) === "sensor") {
      return html`<p class="note">${this.text("insight.window.sensor_method")}</p>`;
    }
    return html`${this.renderPeriods(["day", "week"])} ${this.renderReplay()}
      <p class="limits">${this.text("insight.window.limits")}</p>`;
  }
}

/** The silences of the temperature sensors against the delay of the safety mode. */
export class VThermInsightSafety extends InsightPanel {
  protected override historyRequests(): readonly { readonly key: string; readonly entityId: string }[] {
    const values = this.effective;
    const room = textOf(values["temperature_sensor_entity_id"]);
    const outdoor = textOf(values["external_temperature_sensor_entity_id"]);
    // The same sensor for the room and the outdoor is read, and counted, once.
    return [...(room === undefined ? [] : [{ key: "room", entityId: room }]), ...(outdoor === undefined || outdoor === room ? [] : [{ key: "outdoor", entityId: outdoor }])];
  }

  /** Whether Versatile Thermostat never enters the safety mode for this thermostat: over a climate without valve regulation. */
  private get withoutSafety(): boolean {
    return this.values["thermostat_type"] === "thermostat_over_climate" && !usesValveRegulation(this.values);
  }

  protected override get needsHistory(): boolean {
    return super.needsHistory && !this.withoutSafety;
  }

  private renderReplay(): TemplateResult {
    if (textOf(this.effective["temperature_sensor_entity_id"]) === undefined) {
      return html`<p class="note">${this.text("insight.no_room")}</p>`;
    }
    const state = this.renderHistoryState();
    if (state !== undefined) {
      return state;
    }
    const values = this.effective;
    const delay = numberOf(values["safety_delay_min"]) ?? 60;
    const minOn = numberOf(values["safety_min_on_percent"]) ?? 0.5;
    const { start, end } = this.span;
    const room = this.history?.["room"]?.state ?? [];
    const outdoor = this.history?.["outdoor"]?.state;
    if (room.length < 2) {
      return html`<p class="note">${this.text("insight.too_few")}</p>`;
    }
    const roomGaps = sensorGaps(room, start, end, delay);
    const outdoorGaps = outdoor === undefined ? undefined : sensorGaps(outdoor, start, end, delay);
    const bands: ChartBand[] = [
      ...roomGaps.gaps.filter((gap) => gap.triggers).map((gap) => ({ start: gap.start, end: gap.end, label: this.text("insight.safety.room_silence"), tone: "error" as const })),
      ...(outdoorGaps?.gaps ?? []).filter((gap) => gap.triggers).map((gap) => ({ start: gap.start, end: gap.end, label: this.text("insight.safety.outdoor_silence"), tone: "warning" as const })),
    ];
    const triggering = bands.length;
    const longest = [roomGaps.longest, outdoorGaps?.longest].filter((gap) => gap !== undefined).sort((first, second) => second.minutes - first.minutes)[0];
    const summary = triggering === 0 ? this.text("insight.safety.none", { delay }) : this.text("insight.safety.count", { count: triggering, delay });
    const series: ChartSeries[] = [
      {
        id: "room",
        label: this.text("insight.series.room"),
        points: temperatureHistory({ room, target: [] }, start, end, CHART_POINTS).room,
        axis: "left",
        tone: "secondary",
        format: (v) => this.temperature(v),
      },
    ];
    // The chart shows the summary under its legend.
    return html`${this.renderChart(this.text("insight.safety.chart"), summary, series, bands)}
      ${longest === undefined ? undefined : html`<p class="note longest">${this.text("insight.safety.longest", { duration: this.duration(longest.minutes * 60), date: this.date(longest.start) })}</p>`}
      <p class="note min-on">${this.text("insight.safety.min_on", { percent: this.percent(minOn, 0) })}</p>`;
  }

  protected override render(): TemplateResult {
    if (this.withoutSafety) {
      return html`<p class="note over-climate">${this.text("insight.safety.over_climate")}</p>`;
    }
    return html`${this.renderPeriods(["day", "week"])} ${this.renderReplay()}
      <p class="limits">${this.text("insight.safety.limits")}</p>`;
  }
}

defineElement("vtherm-insight-tpi", VThermInsightTpi);
defineElement("vtherm-insight-window", VThermInsightWindow);
defineElement("vtherm-insight-safety", VThermInsightSafety);
