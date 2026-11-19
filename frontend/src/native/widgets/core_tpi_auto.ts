/**
 * The widget of the learning of Auto TPI, of the plugin `core_tpi`: its state, the cycles learned, the coefficients computed, the
 * confidence of the model, the thermal time constant, the heating capacity, the status of the last learning and its start. It reads the
 * sensor `auto_tpi_learning` of Versatile Thermostat (`sensor.py`), and draws no button to start, stop or calibrate.
 */

import type { HassState } from "@vtherm/dashboard-sdk";
import { css, html } from "lit";
import type { TemplateResult } from "lit";

import { formatNumber } from "../../components/overview/format.ts";
import { NativeWidget, widgetStyles } from "./native-widget.ts";
import { isUnavailable, numberOf } from "./runtime.ts";

/** The key of the sensor of the learning. */
export const AUTO_TPI_SENSOR = "auto_tpi_learning";

/** The icon of each state of the learning. */
const STATE_ICONS: Readonly<Record<string, string>> = {
  active: "mdi:school",
  bootstrap: "mdi:rocket-launch-outline",
  off: "mdi:stop-circle-outline",
  disabled: "mdi:cancel",
};

/** The learning of Auto TPI. */
export class AutoTpiWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      .row {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 4px 8px;
        min-width: 0;
      }
    `,
  ];

  /** Clock of the age of the start, replaced in the tests. */
  now: () => number = Date.now;

  private get sensor(): HassState | undefined {
    const entityId = this.runtime.entities.byKey[AUTO_TPI_SENSOR];
    return entityId === undefined ? undefined : this.hass?.states[entityId];
  }

  protected override readEntities(): readonly string[] {
    const entityId = this.runtime.entities.byKey[AUTO_TPI_SENSOR];
    return entityId === undefined ? [] : [entityId];
  }

  /** A line of a label and a value; a value that the sensor does not give is "—". */
  private row(kind: string, value: string | undefined): TemplateResult {
    return html`<div class="row ${kind}"><span class="note">${this.text(`widget.auto_tpi.${kind}`)}</span><span>${value ?? "—"}</span></div>`;
  }

  protected override render(): TemplateResult {
    const sensor = this.sensor;
    if (sensor === undefined || isUnavailable(sensor)) {
      return html`<vtherm-widget-card .heading=${this.text("widget.auto_tpi.title")} .status=${"unavailable"} .text=${this.text}></vtherm-widget-card>`;
    }
    const attributes = sensor.attributes;
    const number = (key: string, digits = 3) => {
      const value = numberOf(attributes[key]);
      return value === undefined ? undefined : formatNumber(this.hass, value, digits);
    };
    const state = sensor.state;
    const stateKey = `widget.auto_tpi.state.${state}`;
    const cycles = numberOf(attributes["heating_cycles_count"]);
    const confidence = numberOf(attributes["model_confidence"]);
    const capacity = attributes["capacity_heat_status"];
    const status = attributes["last_learning_status"];
    const start = attributes["learning_start_dt"];
    return html`<vtherm-widget-card .heading=${this.text("widget.auto_tpi.title")} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon
          class="state ${state}"
          .icon=${STATE_ICONS[state] ?? "mdi:help-circle-outline"}
          .label=${this.knows(stateKey) ? this.text(stateKey) : state}
          tone=${state === "active" || state === "bootstrap" ? "active" : "normal"}
        ></vtherm-state-icon>
        ${this.row("cycles", cycles === undefined ? undefined : this.text("widget.auto_tpi.cycles_count", { count: formatNumber(this.hass, cycles, 0) }))}
        ${this.row("cycles_by_coef", this.text("widget.auto_tpi.cycles_value", { int: number("coeff_int_cycles", 0) ?? "—", ext: number("coeff_ext_cycles", 0) ?? "—" }))}
        ${this.row("coefficients", this.text("widget.auto_tpi.coefficients_value", { int: number("calculated_coef_int") ?? "—", ext: number("calculated_coef_ext") ?? "—" }))}
        <vtherm-bar
          class="confidence"
          .hass=${this.hass}
          .label=${this.text("widget.auto_tpi.confidence")}
          .value=${confidence === undefined ? undefined : Math.round(confidence * 100)}
          .max=${100}
          .unit=${"%"}
          .text=${this.text}
        ></vtherm-bar>
        ${this.row("time_constant", number("thermal_time_constant_hours", 1) === undefined ? undefined : `${number("thermal_time_constant_hours", 1)} h`)}
        ${capacity === undefined
          ? undefined
          : html`<vtherm-state-icon
              class="capacity ${String(capacity)}"
              .icon=${capacity === "learned" ? "mdi:check-circle-outline" : "mdi:progress-clock"}
              .label=${this.text(capacity === "learned" ? "widget.auto_tpi.capacity_learned" : "widget.auto_tpi.capacity_learning", {
                value: number("max_capacity_heat", 2) ?? "—",
                count: number("capacity_heat_count", 0) ?? "—",
              })}
            ></vtherm-state-icon>`}
        ${typeof status === "string" && status !== "" ? this.row("last_status", status) : undefined}
        ${typeof start === "string" && start !== ""
          ? html`<div class="row start"><span class="note">${this.text("widget.auto_tpi.start")}</span><vtherm-age .hass=${this.hass} .date=${start} .now=${this.now}></vtherm-age></div>`
          : undefined}
      </div>
    </vtherm-widget-card>`;
  }
}
