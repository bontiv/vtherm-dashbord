/**
 * The widget of the energy of a thermostat, of the plugin `core_power`: the mean power of the cycle with its curve over 24 hours, and the
 * energy that the thermostat used, with the unit of its sensor. It reads the sensors `mean_power_cycle` and `energy` of Versatile
 * Thermostat (`sensor.py`); the curve is read once the card is visible.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { formatEntityValue, localeOf } from "../../components/overview/format.ts";
import "./history-curve.ts";
import { DETAIL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { runtimeOf } from "./runtime.ts";

/** The translation keys of the sensors of the energy. */
const MEAN_POWER = "mean_power_cycle";
const ENERGY = "energy";

/** The mean power of the cycle with its curve, and the energy counter. */
export class EnergyWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override readEntities(): readonly string[] {
    const { byKey } = this.runtime.entities;
    return [byKey[MEAN_POWER], byKey[ENERGY]].filter((entityId): entityId is string => entityId !== undefined);
  }

  protected override render(): TemplateResult {
    const { byKey } = this.runtime.entities;
    const powerId = byKey[MEAN_POWER];
    const energyId = byKey[ENERGY];
    const unit = powerId === undefined ? undefined : this.hass?.states[powerId]?.attributes["unit_of_measurement"];
    return html`<vtherm-widget-card .heading=${this.text("widget.energy.title")} .text=${this.text}>
      <div class="lines">
        ${powerId === undefined
          ? undefined
          : html`<vtherm-value-row class="mean-power" .label=${this.text("widget.energy.mean_power")} .value=${formatEntityValue(this.hass, powerId)} .text=${this.text}></vtherm-value-row>`}
        ${energyId === undefined
          ? undefined
          : html`<vtherm-value-row class="energy" .label=${this.text("widget.energy.energy")} .value=${formatEntityValue(this.hass, energyId)} .text=${this.text}></vtherm-value-row>`}
        ${powerId === undefined
          ? undefined
          : html`<vtherm-history-curve
              .hass=${this.hass}
              .entityId=${powerId}
              .active=${this.visible}
              .label=${this.text("widget.energy.curve")}
              .unit=${typeof unit === "string" ? unit : "W"}
              .language=${localeOf(this.hass)}
              .text=${this.text}
            ></vtherm-history-curve>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of the energy of `core_power` and give its contribution, after the demand to the boiler. It is shown when the
 * thermostat has a sensor of energy or of mean power: the power of its equipment is set.
 *
 * @param translations - The translations of the plugin `core_power`.
 */
export function energyWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-power-widget-energy", EnergyWidget, translations);
  return [
    {
      id: DETAIL_WIDGET_IDS.energy,
      component: "core-power-widget-energy",
      placement: { after: DETAIL_WIDGET_IDS.boiler },
      size: { columns: 1, rows: 2 },
      visible: (context) => {
        const { byKey } = runtimeOf(context.hass, context.thermostatId).entities;
        return existingThermostat(context) && (byKey[MEAN_POWER] !== undefined || byKey[ENERGY] !== undefined);
      },
    },
  ];
}
