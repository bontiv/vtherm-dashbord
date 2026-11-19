/**
 * The widget of the plugin `core_auto_start_stop` in the overview of a thermostat over a climate: the automatic stop, whether the feature
 * is enabled, the accumulated error against its threshold, and the age of the last switch. It draws no switch, and no next action:
 * Versatile Thermostat does not publish one.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { FEATURE_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, sectionApplies, widgetStyles } from "./native-widget.ts";
import { featureAttributes, runtimeOf } from "./runtime.ts";

/** The automatic stop, the feature enabled or not, the accumulated error on a gauge from − to + its threshold, and the last switch. */
export class AutoStartStopWidget extends NativeWidget {
  static override styles = widgetStyles;

  /** Clock of the age, replaced in the tests. */
  now: () => number = Date.now;

  protected override render(): TemplateResult {
    const auto = featureAttributes.autoStartStop(this.runtime.climate);
    if (auto === undefined) {
      return html`<vtherm-widget-card .heading=${this.text("widget.auto_start_stop.title")} .status=${"unavailable"} .text=${this.text}></vtherm-widget-card>`;
    }
    const threshold = auto.threshold;
    return html`<vtherm-widget-card .heading=${this.text("widget.auto_start_stop.title")} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon
          class="stop ${auto.stopDetected ? "detected" : ""}"
          .icon=${auto.stopDetected ? "mdi:stop-circle-outline" : "mdi:play-circle-outline"}
          .label=${this.text(auto.stopDetected ? "widget.auto_start_stop.stopped" : "widget.auto_start_stop.running")}
          tone=${auto.stopDetected ? "active" : "normal"}
        ></vtherm-state-icon>
        <vtherm-state-icon
          class="enable"
          .icon=${auto.enabled ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline"}
          .label=${this.text(auto.enabled ? "widget.auto_start_stop.enabled" : "widget.auto_start_stop.disabled")}
        ></vtherm-state-icon>
        <vtherm-gauge
          .hass=${this.hass}
          .value=${auto.error}
          .min=${-(threshold ?? 1)}
          .max=${threshold ?? 1}
          .marker=${threshold}
          .markerLabel=${this.text("widget.auto_start_stop.threshold")}
          .label=${this.text("widget.auto_start_stop.error")}
          .text=${this.text}
        ></vtherm-gauge>
        ${auto.lastSwitch === undefined
          ? undefined
          : html`<div class="last-switch">
              <span class="note">${this.text("widget.auto_start_stop.last_switch")}</span>
              <vtherm-age .hass=${this.hass} .date=${auto.lastSwitch} .now=${this.now}></vtherm-age>
            </div>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_auto_start_stop` and give its contribution, after the load shedding. It is shown for a thermostat over a
 * climate without a regulation by valve that has the feature, once Versatile Thermostat publishes its manager.
 *
 * @param translations - The translations of the plugin `core_auto_start_stop`.
 */
export function autoStartStopWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-auto-start-stop-widget-auto-start-stop", AutoStartStopWidget, translations);
  return [
    {
      id: FEATURE_WIDGET_IDS.autoStartStop,
      component: "core-auto-start-stop-widget-auto-start-stop",
      placement: { after: FEATURE_WIDGET_IDS.overpowering },
      visible: (context) =>
        existingThermostat(context) &&
        context.thermostatType === "over_climate" &&
        sectionApplies("core_auto_start_stop", context.values) &&
        featureAttributes.autoStartStop(runtimeOf(context.hass, context.thermostatId).climate) !== undefined,
    },
  ];
}
