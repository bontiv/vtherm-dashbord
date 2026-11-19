/**
 * The widgets of the plugin `core_power`: on the Overview page, the power of the home against its maximum, the margin that the dashboard
 * computes, and the total energy of the thermostats; in the overview of a thermostat, its load shedding. They read what the thermostats
 * publish in `power_manager`; they draw no command.
 */

import type { AnyTranslations, Contribution, Hass, VisibilityContext } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { formatNumber, withUnit } from "../../components/overview/format.ts";
import { FEATURE_WIDGET_IDS, GLOBAL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, sectionApplies, widgetStyles } from "./native-widget.ts";
import { centralPowerUnit, housePowerOf, thermostatsOf } from "./home.ts";
import type { HomeThermostat } from "./home.ts";
import { featureAttributes, featureStateOf, isUnavailable, numberOf, runtimeOf } from "./runtime.ts";
import type { FeatureState } from "./runtime.ts";

/** The energy of the thermostats with its unit, or undefined when a counter cannot be read or the counters have different units. */
export function totalEnergyOf(hass: Hass | undefined, thermostats: readonly HomeThermostat[]): { readonly value: number; readonly unit: string } | undefined {
  const states = thermostats.flatMap((thermostat) => (thermostat.energyId === undefined ? [] : [hass?.states[thermostat.energyId]]));
  if (states.length === 0) {
    return undefined;
  }
  let total = 0;
  let unit: string | undefined;
  for (const state of states) {
    const value = state === undefined || isUnavailable(state) ? undefined : numberOf(state.state);
    const stateUnit = state?.attributes["unit_of_measurement"];
    if (value === undefined || typeof stateUnit !== "string" || (unit !== undefined && unit !== stateUnit)) {
      return undefined;
    }
    unit = stateUnit;
    total += value;
  }
  return unit === undefined ? undefined : { value: total, unit };
}

/** The power of the home on a gauge against its maximum, in the color of a warning above it; the margin; the total energy. */
export class HousePowerWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override readEntities(): readonly string[] {
    const thermostats = thermostatsOf(this.hass);
    const sensorId = housePowerOf(this.hass, thermostats)?.sensorId;
    return [
      ...thermostats.map((thermostat) => thermostat.climateId),
      ...thermostats.flatMap((thermostat) => (thermostat.energyId === undefined ? [] : [thermostat.energyId])),
      ...(sensorId === undefined ? [] : [sensorId]),
    ];
  }

  protected override render(): TemplateResult {
    const thermostats = thermostatsOf(this.hass);
    const power = housePowerOf(this.hass, thermostats);
    const unit = centralPowerUnit(this.hass, this.central, power?.sensorId);
    const number = (value: number) => formatNumber(this.hass, value, 2);
    const current = power?.current;
    const max = power?.max;
    const over = current !== undefined && max !== undefined && current > max;
    const display = current === undefined ? "" : max === undefined ? withUnit(number(current), unit) : `${number(current)} / ${withUnit(number(max), unit)}`;
    const energy = totalEnergyOf(this.hass, thermostats);
    const calculated = this.text("widget.house_power.calculated");
    return html`<vtherm-widget-card .heading=${this.text("widget.house_power.title")} .status=${power === undefined ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-gauge
          .hass=${this.hass}
          .value=${current}
          .min=${0}
          .max=${Math.max(max ?? 0, current ?? 0, 1)}
          .display=${display}
          .tone=${over ? "warning" : "active"}
          .label=${this.text("widget.house_power.power")}
          .unit=${unit}
          .text=${this.text}
        ></vtherm-gauge>
        ${current === undefined || max === undefined
          ? undefined
          : html`<vtherm-state-icon
              class="margin ${over ? "over" : ""}"
              .icon=${over ? "mdi:flash-alert" : "mdi:gauge"}
              .label=${over
                ? this.text("widget.house_power.overrun", { value: withUnit(number(current - max), unit) })
                : this.text("widget.house_power.margin", { value: withUnit(number(max - current), unit) })}
              .tooltip=${calculated}
              tone=${over ? "warning" : "normal"}
            ></vtherm-state-icon>`}
        ${energy === undefined
          ? undefined
          : html`<vtherm-state-icon
              class="energy"
              .icon=${"mdi:lightning-bolt"}
              .label=${this.text("widget.house_power.energy", { value: withUnit(number(energy.value), energy.unit) })}
              .tooltip=${calculated}
            ></vtherm-state-icon>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_power` and give its contribution, after the power asked of the boiler. It is shown when a thermostat
 * publishes the power of the home: the power management is on.
 *
 * @param translations - The translations of the plugin `core_power`.
 */
export function powerWidgets(translations: AnyTranslations): Contribution<"global_widget">[] {
  defineWidget("core-power-widget-house-power", HousePowerWidget, translations);
  return [
    {
      id: GLOBAL_WIDGET_IDS.housePower,
      component: "core-power-widget-house-power",
      placement: { after: GLOBAL_WIDGET_IDS.boilerPower },
      visible: ({ hass }: VisibilityContext<"global_widget">) => housePowerOf(hass, thermostatsOf(hass)) !== undefined,
    },
  ];
}

/** The icon, the text and the color of each state of the load shedding. */
const OVERPOWERING: Readonly<Record<FeatureState, { readonly icon: string; readonly key: string; readonly tone: string }>> = {
  on: { icon: "mdi:flash-alert", key: "widget.overpowering.active", tone: "warning" },
  off: { icon: "mdi:check-circle-outline", key: "widget.overpowering.inactive", tone: "success" },
  unknown: { icon: "mdi:help-circle-outline", key: "widget.overpowering.unknown", tone: "normal" },
};

/** The load shedding of a thermostat: active, in the color of a warning, or not. */
export class OverpoweringWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const runtime = this.runtime;
    const { climate } = runtime;
    const sensorId = runtime.entities.byKey["overpowering_state"];
    const state = featureAttributes.overpowering(climate) ?? featureStateOf(sensorId === undefined ? undefined : this.hass?.states[sensorId]?.state);
    const shown = OVERPOWERING[state];
    return html`<vtherm-widget-card .heading=${this.text("widget.overpowering.title")} .status=${climate === undefined || isUnavailable(climate) ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon class="overpowering ${state}" .icon=${shown.icon} .label=${this.text(shown.key)} tone=${shown.tone}></vtherm-state-icon>
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_power` in the overview of a thermostat and give its contribution, after the motion. It is shown when the
 * power management is on for the thermostat and its binary sensor of the load shedding exists.
 *
 * @param translations - The translations of the plugin `core_power`.
 */
export function overpoweringWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-power-widget-overpowering", OverpoweringWidget, translations);
  return [
    {
      id: FEATURE_WIDGET_IDS.overpowering,
      component: "core-power-widget-overpowering",
      placement: { after: FEATURE_WIDGET_IDS.motion },
      visible: (context) =>
        existingThermostat(context) && sectionApplies("core_power", context.values) && runtimeOf(context.hass, context.thermostatId).entities.byKey["overpowering_state"] !== undefined,
    },
  ];
}
