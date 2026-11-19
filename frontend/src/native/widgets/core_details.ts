/**
 * The widgets of details of the plugin `core` in the overview of a thermostat: the history of the last 24 hours, and the equipment that
 * carries out the setpoint. They only show: none calls a service of Home Assistant.
 */

import type { AnyTranslations, Contribution, HassState } from "@vtherm/dashboard-sdk";
import { css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { renderIcon } from "../../components/icon.ts";
import { renderProgress } from "../../components/ha.ts";
import { formatEntityValue, formatNumber, localeOf, temperatureUnit, withUnit } from "../../components/overview/format.ts";
import "../../components/time-chart.ts";
import type { ChartSeries } from "../../components/time-chart.ts";
import { effectiveValues } from "../effective-values.ts";
import { CACHE_MS, isAbortError, sharedHistory } from "../history.ts";
import type { Sample } from "../history.ts";
import { DETAIL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, detailAttributes, isUnavailable, runtimeOf } from "./runtime.ts";

/** The attributes of the `climate` entity that the recorder keeps and that the history draws. Nested attributes are not recorded. */
const RECORDED_ATTRIBUTES = ["current_temperature", "temperature", "power_percent"] as const;

/** The series of the history of a thermostat over 24 hours. */
interface HistorySeries {
  readonly start: number;
  readonly end: number;
  readonly room: readonly Sample[];
  readonly setpoint: readonly Sample[];
  readonly outdoor: readonly Sample[];
  readonly power: readonly Sample[];
}

/** Where the read of the history is. */
type HistoryStatus = "idle" | "loading" | "ready" | "failed";

/**
 * The history of the last 24 hours: the temperature of the room, the setpoint and the outdoor temperature of the sensor of the effective
 * configuration on a first chart, the heating share on a second chart when the thermostat has one. The history is read once the card is
 * visible, and kept a few minutes by the client that the dashboard shares.
 */
export class HistoryWidget extends NativeWidget {
  static override properties = { ...NativeWidget.properties, status: { state: true }, series: { state: true } };
  static override styles = [
    widgetStyles,
    css`
      vtherm-time-chart {
        display: block;
        min-width: 0;
      }
    `,
  ];

  declare status: HistoryStatus;
  declare series: HistorySeries | undefined;

  private readKey = "";
  private readAt = 0;
  private controller: AbortController | undefined;

  constructor() {
    super();
    this.status = "idle";
    this.series = undefined;
  }

  /** The outdoor sensor of the configuration that Versatile Thermostat applies: the thermostat's own, or the central one. */
  private get outdoorSensor(): string | undefined {
    const sensor = effectiveValues(this.values, this.centralValues)["external_temperature_sensor_entity_id"];
    return typeof sensor === "string" && sensor !== "" ? sensor : undefined;
  }

  /** The sensor of the heating share, read when the `climate` entity does not publish the share as an attribute. */
  private powerSensor(climate: HassState | undefined): string | undefined {
    return read.powerPercent(climate) === undefined ? this.runtime.entities.byKey["power_percent"] : undefined;
  }

  /** Whether the thermostat has a heating share: an attribute of its `climate` entity or its sensor. */
  private hasPower(climate: HassState | undefined): boolean {
    return read.powerPercent(climate) !== undefined || this.runtime.entities.byKey["power_percent"] !== undefined;
  }

  protected override readEntities(): readonly string[] {
    // The history does not draw again for each state: its curves are read once, then kept.
    const { climateId } = this.runtime;
    return climateId === undefined ? [] : [climateId];
  }

  override disconnectedCallback(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.readKey = "";
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const { climateId, climate } = this.runtime;
    if (!this.visible || climateId === undefined || this.hass === undefined) {
      return;
    }
    const key = [climateId, this.outdoorSensor ?? "", this.powerSensor(climate) ?? ""].join("|");
    if (key !== this.readKey || Date.now() - this.readAt >= CACHE_MS) {
      this.load(key, climateId, climate);
    }
  }

  /** Read the history of the `climate` entity, of the outdoor sensor and of the sensor of the heating share. */
  private load(key: string, climateId: string, climate: HassState | undefined): void {
    if (key !== this.readKey) {
      this.status = "loading";
    }
    this.readKey = key;
    this.readAt = Date.now();
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const client = sharedHistory(this.hass);
    const outdoor = this.outdoorSensor;
    const powerSensor = this.powerSensor(climate);
    // An outdoor or a power sensor that cannot be read only loses its series: the history of the thermostat is what matters.
    const optional = (entityId: string | undefined) => (entityId === undefined ? Promise.resolve(undefined) : client.read(entityId, "day", [], controller.signal).catch(() => undefined));
    Promise.all([client.read(climateId, "day", RECORDED_ATTRIBUTES, controller.signal), optional(outdoor), optional(powerSensor)])
      .then(([history, outdoorHistory, powerHistory]) => {
        this.series = {
          start: history.start,
          end: history.end,
          room: history.attributes["current_temperature"] ?? [],
          setpoint: history.attributes["temperature"] ?? [],
          outdoor: outdoorHistory?.state ?? [],
          power: powerSensor === undefined ? (history.attributes["power_percent"] ?? []) : (powerHistory?.state ?? []),
        };
        this.status = "ready";
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          this.status = "failed";
          this.readAt = Date.now();
        }
      });
  }

  /** A text summary of a chart: the range of its main series and its last value. */
  private summaryOf(points: readonly Sample[], format: (value: number) => string): string {
    const values = points.map((point) => point.v);
    return values.length === 0 ? "" : this.text("widget.curve.summary", { min: format(Math.min(...values)), max: format(Math.max(...values)), last: format(values.at(-1) as number) });
  }

  private renderCharts(series: HistorySeries, hasPower: boolean): TemplateResult {
    const unit = temperatureUnit(this.hass);
    const temperature = (value: number) => withUnit(formatNumber(this.hass, value), unit);
    const percent = (value: number) => withUnit(formatNumber(this.hass, value, 0), "%");
    // A value that the recorder does not keep has no sample: its series is left out, without an error.
    const temperatures: ChartSeries[] = [
      { id: "room", label: this.text("widget.history.room"), points: series.room, axis: "left" as const, tone: "primary" as const, format: temperature },
      { id: "setpoint", label: this.text("widget.history.setpoint"), points: series.setpoint, axis: "left" as const, tone: "accent" as const, step: true, dashed: true, format: temperature },
      { id: "outdoor", label: this.text("widget.history.outdoor"), points: series.outdoor, axis: "left" as const, tone: "secondary" as const, format: temperature },
    ].filter((line) => line.points.length > 0);
    const language = localeOf(this.hass);
    const chart = (label: string, lines: readonly ChartSeries[], summary: string) =>
      html`<vtherm-time-chart .label=${label} .summary=${summary} .series=${lines} .start=${series.start} .end=${series.end} .language=${language}></vtherm-time-chart>`;
    const main = temperatures[0];
    return html`${main === undefined
      ? html`<p class="note">${this.text("widget.no_data")}</p>`
      : chart(this.text("widget.history.temperatures"), temperatures, this.summaryOf(main.points, temperature))}
    ${hasPower && series.power.length > 0
      ? chart(
          this.text("widget.history.power_chart"),
          [{ id: "power", label: this.text("widget.history.power"), points: series.power, axis: "left", tone: "warning", step: true, format: percent }],
          this.summaryOf(series.power, percent),
        )
      : undefined}`;
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    let body: TemplateResult;
    switch (this.status) {
      case "failed":
        body = html`<p class="note failed" role="status">${this.text("widget.history_unavailable")}</p>`;
        break;
      case "ready":
        body = this.series === undefined ? html`` : this.renderCharts(this.series, this.hasPower(climate));
        break;
      default:
        body = html`<div class="note">${renderProgress(this.text("widget.loading"))}</div>`;
    }
    return html`<vtherm-widget-card .heading=${this.text("widget.history.title")} .text=${this.text}>
      <div class="lines">${body}</div>
    </vtherm-widget-card>`;
  }
}

/** The icon of an equipment by its domain, and when it is on. */
function equipmentIcon(entityId: string, state: HassState | undefined): string {
  if (state === undefined || isUnavailable(state)) {
    return "mdi:help-circle-outline";
  }
  const domain = entityId.slice(0, entityId.indexOf("."));
  const on = state.state === "on";
  switch (domain) {
    case "climate":
      return state.state === "off" ? "mdi:thermostat-off" : "mdi:thermostat";
    case "number":
    case "valve":
      return "mdi:valve";
    default:
      return on ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
  }
}

/**
 * The equipment of the thermostat: the state of each one, whether the thermostat has an active equipment or should have one, and the fan
 * mode of a thermostat over a climate.
 */
export class DevicesWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      ul {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      li .icon {
        flex: none;
        color: var(--secondary-text-color);
      }
      li.on .icon {
        color: var(--primary-color);
      }
      .state {
        color: var(--secondary-text-color);
      }
    `,
  ];

  protected override readEntities(): readonly string[] {
    const { climateId, climate } = this.runtime;
    return [...(climateId === undefined ? [] : [climateId]), ...detailAttributes.underlyings(climate)];
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const underlyings = detailAttributes.underlyings(climate);
    const activity = detailAttributes.activity(climate);
    const fan = detailAttributes.fanMode(climate);
    const fanKey = `widget.devices.fan.${fan ?? ""}`;
    return html`<vtherm-widget-card .heading=${this.text("widget.devices.title")} .status=${climate === undefined || isUnavailable(climate) ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <ul class="equipment">
          ${underlyings.map((entityId) => {
            const state = this.hass?.states[entityId];
            const value = formatEntityValue(this.hass, entityId);
            const name = state?.attributes["friendly_name"];
            return html`<li class="${state?.state === "on" || state?.state === "heat" ? "on" : ""} ${value.available ? "" : "unavailable"}" data-entity=${entityId}>
              <span class="icon" aria-hidden="true">${renderIcon(equipmentIcon(entityId, state))}</span>
              <span class="name">${typeof name === "string" && name !== "" ? name : entityId}</span>
              <span class="state">${value.available ? value.text : this.text("widget.unavailable")}</span>
            </li>`;
          })}
        </ul>
        ${activity.shouldBeActive === true && activity.active === false
          ? html`<vtherm-state-icon class="expected" .icon=${"mdi:alert-circle-outline"} .label=${this.text("widget.devices.expected")} tone="warning"></vtherm-state-icon>`
          : activity.active === undefined
            ? undefined
            : html`<vtherm-state-icon
                class="activity"
                .icon=${activity.active ? "mdi:power-plug" : "mdi:power-plug-off-outline"}
                .label=${activity.active ? this.text("widget.devices.active", { count: activity.count ?? 1 }) : this.text("widget.devices.inactive")}
                tone=${activity.active ? "active" : "normal"}
              ></vtherm-state-icon>`}
        ${fan === undefined
          ? undefined
          : html`<vtherm-state-icon class="fan" .icon=${"mdi:fan"} .label=${this.text("widget.devices.fan", { mode: this.knows(fanKey) ? this.text(fanKey) : fan })}></vtherm-state-icon>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widgets of details of `core` and give their contributions. `core` loads before the plugins of the features, so the equipment
 * is placed last; then the history, last too: the widgets of the other plugins are placed after their targets, so before them.
 *
 * @param translations - The translations of the plugin `core`.
 */
export function coreDetailWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-widget-devices", DevicesWidget, translations);
  defineWidget("core-widget-history", HistoryWidget, translations);
  return [
    {
      id: DETAIL_WIDGET_IDS.devices,
      component: "core-widget-devices",
      placement: { last: true },
      visible: (context) => existingThermostat(context) && detailAttributes.underlyings(runtimeOf(context.hass, context.thermostatId).climate).length > 0,
    },
    { id: DETAIL_WIDGET_IDS.history, component: "core-widget-history", placement: { last: true }, size: { columns: 2, rows: 2 }, visible: existingThermostat },
  ];
}
