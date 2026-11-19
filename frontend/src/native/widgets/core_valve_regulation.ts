/** The widget of the plugin `core_valve_regulation`: the opening of the valve, and of each valve when the thermostat has several. */

import type { AnyTranslations, Contribution, Hass } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, isUnavailable, numberOf, runtimeOf, sensorOf } from "./runtime.ts";
import type { Runtime } from "./runtime.ts";

/** The opening of the valve and its availability: the attribute of the `climate` entity, else the sensor `valve_open_percent`. */
function openingOf(hass: Hass | undefined, runtime: Runtime): { readonly exists: boolean; readonly value: number | undefined } {
  const attribute = runtime.climate?.attributes["valve_open_percent"];
  if (attribute !== undefined && attribute !== null) {
    return { exists: true, value: isUnavailable(runtime.climate) ? undefined : read.valveOpenPercent(runtime.climate) };
  }
  const sensor = sensorOf(hass, runtime, "valve_open_percent");
  return { exists: sensor.entityId !== undefined, value: isUnavailable(sensor.state) ? undefined : numberOf(sensor.state?.state) };
}

/** The opening on a gauge, and a bar for each valve when there are several, named with the name of the valve. */
export class ValveWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const runtime = this.runtime;
    const valves = read.valves(runtime.climate);
    const nameOf = (entityId: string) => {
      const name = this.hass?.states[entityId]?.attributes["friendly_name"];
      return typeof name === "string" && name !== "" ? name : entityId;
    };
    return html`<vtherm-widget-card .heading=${this.text("widget.valve.title")} .text=${this.text}>
      <div class="lines">
        <vtherm-gauge
          .hass=${this.hass}
          .value=${openingOf(this.hass, runtime).value}
          .min=${0}
          .max=${100}
          .unit=${"%"}
          .label=${this.text("widget.valve.opening")}
          .text=${this.text}
        ></vtherm-gauge>
        ${valves.length > 1
          ? valves.map((valve) => html`<vtherm-bar class="valve" .hass=${this.hass} .label=${nameOf(valve.entityId)} .value=${valve.percent} .max=${100} .unit=${"%"} .text=${this.text}></vtherm-bar>`)
          : undefined}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_valve_regulation` and give its contribution, after the heating: as it loads after `core_presets`, it is then
 * just before the preset. It is shown when the thermostat has an opening of valve: over a valve, or over a climate with valves.
 *
 * @param translations - The translations of the plugin `core_valve_regulation`.
 */
export function valveWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-valve-regulation-widget-valve", ValveWidget, translations);
  return [
    {
      id: WIDGET_IDS.valve,
      component: "core-valve-regulation-widget-valve",
      placement: { after: WIDGET_IDS.heating },
      visible: ({ hass, thermostatId }) => openingOf(hass, runtimeOf(hass, thermostatId)).exists,
    },
  ];
}
