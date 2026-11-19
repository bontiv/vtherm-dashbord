/**
 * The widget of the plugin `core_humidity` in the overview of a thermostat: the humidity of the room on a gauge from 0 to 100 %. It draws
 * no curve: the recorder of the attribute is not confirmed.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { DETAIL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { detailAttributes, runtimeOf } from "./runtime.ts";

/** The humidity of the room, from the standard attribute `current_humidity` of the `climate` entity. */
export class HumidityWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    return html`<vtherm-widget-card .heading=${this.text("widget.humidity.title")} .text=${this.text}>
      <vtherm-gauge .hass=${this.hass} .value=${detailAttributes.humidity(climate)} .min=${0} .max=${100} .unit=${"%"} .label=${this.text("widget.humidity.room")} .text=${this.text}></vtherm-gauge>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_humidity` and give its contribution, after the energy. It is shown when the `climate` entity publishes the
 * humidity.
 *
 * @param translations - The translations of the plugin `core_humidity`.
 */
export function humidityWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-humidity-widget-humidity", HumidityWidget, translations);
  return [
    {
      id: DETAIL_WIDGET_IDS.humidity,
      component: "core-humidity-widget-humidity",
      placement: { after: DETAIL_WIDGET_IDS.energy },
      visible: (context) => existingThermostat(context) && detailAttributes.hasHumidity(runtimeOf(context.hass, context.thermostatId).climate),
    },
  ];
}
