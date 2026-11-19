/**
 * The widgets of the plugin `core_tpi`: the heating share that TPI asks for, and the times on and off of the cycle; and the learning of
 * Auto TPI (`core_tpi_auto.ts`). The position in the cycle is not shown: Versatile Thermostat does not publish it.
 */

import type { AnyTranslations, Contribution, Hass } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { formatNumber } from "../../components/overview/format.ts";
import { AUTO_TPI_SENSOR, AutoTpiWidget } from "./core_tpi_auto.ts";
import { DETAIL_WIDGET_IDS, WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, isUnavailable, numberOf, runtimeOf, sensorOf } from "./runtime.ts";
import type { Runtime } from "./runtime.ts";

/** The heating share and its availability: the attribute of the `climate` entity, else the sensor `power_percent`. */
function powerOf(hass: Hass | undefined, runtime: Runtime): { readonly exists: boolean; readonly value: number | undefined } {
  const attribute = runtime.climate?.attributes["power_percent"];
  if (attribute !== undefined && attribute !== null) {
    return { exists: true, value: isUnavailable(runtime.climate) ? undefined : read.powerPercent(runtime.climate) };
  }
  const sensor = sensorOf(hass, runtime, "power_percent");
  return { exists: sensor.entityId !== undefined, value: isUnavailable(sensor.state) ? undefined : numberOf(sensor.state?.state) };
}

/** A time of the cycle in seconds: the attribute of a thermostat over a switch, else its sensor. */
function cycleTime(hass: Hass | undefined, runtime: Runtime, attribute: number | undefined, key: "on_time" | "off_time"): number | undefined {
  if (attribute !== undefined) {
    return attribute;
  }
  const sensor = sensorOf(hass, runtime, key);
  return isUnavailable(sensor.state) ? undefined : numberOf(sensor.state?.state);
}

/** The heating share on a bar, and the times on and off of the cycle on a segmented bar when they are known. */
export class HeatingWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const runtime = this.runtime;
    const power = powerOf(this.hass, runtime);
    const on = cycleTime(this.hass, runtime, read.onTimeSec(runtime.climate), "on_time");
    const off = cycleTime(this.hass, runtime, read.offTimeSec(runtime.climate), "off_time");
    const seconds = (value: number) => `${formatNumber(this.hass, value, 0)} s`;
    return html`<vtherm-widget-card .heading=${this.text("widget.heating.title")} .text=${this.text}>
      <div class="lines">
        <vtherm-bar class="power" .hass=${this.hass} .label=${this.text("widget.heating.power")} .value=${power.value} .max=${100} .unit=${"%"} .text=${this.text}></vtherm-bar>
        ${on === undefined || off === undefined
          ? undefined
          : html`<vtherm-bar
              class="cycle"
              .hass=${this.hass}
              .label=${this.text("widget.heating.cycle")}
              .segments=${[
                { label: this.text("widget.heating.on"), value: on, display: seconds(on) },
                { label: this.text("widget.heating.off"), value: off, display: seconds(off), tone: "inactive" },
              ]}
              .text=${this.text}
            ></vtherm-bar>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widgets of `core_tpi` and give their contributions. The heating comes after the alerts: it is shown when the algorithm is TPI
 * and the thermostat has a heating share (over a switch, over a valve, or over a climate with a regulation by valve). The learning of
 * Auto TPI comes after the equipment: it is shown when the algorithm is TPI, the option Auto TPI is on and its sensor is not `disabled`.
 *
 * @param translations - The translations of the plugin `core_tpi`.
 */
export function tpiWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-tpi-widget-heating", HeatingWidget, translations);
  defineWidget("core-tpi-widget-auto-tpi", AutoTpiWidget, translations);
  return [
    {
      id: WIDGET_IDS.heating,
      component: "core-tpi-widget-heating",
      placement: { after: WIDGET_IDS.alerts },
      visible: ({ hass, thermostatId, values }) => {
        const algorithm = values["proportional_function"];
        return (algorithm === undefined || algorithm === "tpi") && powerOf(hass, runtimeOf(hass, thermostatId)).exists;
      },
    },
    {
      id: DETAIL_WIDGET_IDS.autoTpi,
      component: "core-tpi-widget-auto-tpi",
      placement: { after: DETAIL_WIDGET_IDS.devices },
      size: { columns: 1, rows: 2 },
      visible: (context) => {
        const algorithm = context.values["proportional_function"];
        const sensorId = runtimeOf(context.hass, context.thermostatId).entities.byKey[AUTO_TPI_SENSOR];
        const state = sensorId === undefined ? undefined : context.hass.states[sensorId]?.state;
        return existingThermostat(context) && (algorithm === undefined || algorithm === "tpi") && context.values["auto_tpi_mode"] === true && state !== undefined && state !== "disabled";
      },
    },
  ];
}
