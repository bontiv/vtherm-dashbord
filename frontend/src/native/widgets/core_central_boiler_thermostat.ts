/**
 * The widget of the plugin `core_central_boiler` in the overview of a thermostat: whether this thermostat calls the central boiler, that
 * is, it is used by the boiler and its equipment is active. It draws no command.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { DETAIL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { detailAttributes, isUnavailable, runtimeOf } from "./runtime.ts";

/** A flame and "Calls the boiler" while the thermostat is used by the boiler and its equipment is active. */
export class BoilerDemandWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const calls = detailAttributes.usedByCentralBoiler(climate) !== false && detailAttributes.activity(climate).active === true;
    return html`<vtherm-widget-card .heading=${this.text("widget.boiler_demand.title")} .status=${climate === undefined || isUnavailable(climate) ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon
          class="demand ${calls ? "on" : "off"}"
          .icon=${calls ? "mdi:fire" : "mdi:fire-off"}
          .label=${this.text(calls ? "widget.boiler_demand.on" : "widget.boiler_demand.off")}
          tone=${calls ? "active" : "normal"}
        ></vtherm-state-icon>
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_central_boiler` in the overview of a thermostat and give its contribution, after the learning of Auto TPI.
 * It is shown when the thermostat is used by the central boiler and the central boiler is on in the central configuration.
 *
 * @param translations - The translations of the plugin `core_central_boiler`.
 */
export function boilerDemandWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-central-boiler-widget-thermostat", BoilerDemandWidget, translations);
  return [
    {
      id: DETAIL_WIDGET_IDS.boiler,
      component: "core-central-boiler-widget-thermostat",
      placement: { after: DETAIL_WIDGET_IDS.autoTpi },
      visible: (context) => {
        const used = context.values["used_by_controls_central_boiler"] === true || detailAttributes.usedByCentralBoiler(runtimeOf(context.hass, context.thermostatId).climate) === true;
        return existingThermostat(context) && used && context.centralValues["use_central_boiler_feature"] === true;
      },
    },
  ];
}
