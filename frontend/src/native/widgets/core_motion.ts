/**
 * The widget of the plugin `core_motion` in the overview of a thermostat: the motion that its sensor detects, and the preset of activity
 * when Versatile Thermostat applies it. It draws no command.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { FEATURE_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, sectionApplies, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, featureAttributes, featureStateOf, isUnavailable, runtimeOf } from "./runtime.ts";
import type { FeatureState } from "./runtime.ts";

/** The icons of the motion, as Versatile Thermostat gives them to its binary sensor. */
const MOTION_ICONS: Readonly<Record<FeatureState, string>> = { on: "mdi:motion-sensor", off: "mdi:motion-sensor-off", unknown: "mdi:help-circle-outline" };

/** The motion, and the label of the preset of activity while it is in force. */
export class MotionWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const runtime = this.runtime;
    const { climate } = runtime;
    const sensorId = runtime.entities.byKey["motion_state"];
    const motion = featureAttributes.motion(climate) ?? featureStateOf(sensorId === undefined ? undefined : this.hass?.states[sensorId]?.state);
    const activity = read.messages(climate).includes("target_temp_activity_detected");
    return html`<vtherm-widget-card .heading=${this.text("widget.motion.title")} .status=${climate === undefined || isUnavailable(climate) ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon
          class="motion ${motion}"
          .icon=${MOTION_ICONS[motion]}
          .label=${this.text(`widget.motion.${motion === "on" ? "detected" : motion === "off" ? "none" : "unknown"}`)}
          tone=${motion === "on" ? "active" : "normal"}
        ></vtherm-state-icon>
        ${activity ? html`<vtherm-state-icon class="activity" .icon=${"mdi:account-check"} .label=${this.text("widget.motion.activity")} tone="active"></vtherm-state-icon>` : undefined}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_motion` and give its contribution, after the window. It is shown when the motion detection is on for the
 * thermostat and its binary sensor exists.
 *
 * @param translations - The translations of the plugin `core_motion`.
 */
export function motionWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-motion-widget-motion", MotionWidget, translations);
  return [
    {
      id: FEATURE_WIDGET_IDS.motion,
      component: "core-motion-widget-motion",
      placement: { after: FEATURE_WIDGET_IDS.window },
      visible: (context) => existingThermostat(context) && sectionApplies("core_motion", context.values) && runtimeOf(context.hass, context.thermostatId).entities.byKey["motion_state"] !== undefined,
    },
  ];
}
