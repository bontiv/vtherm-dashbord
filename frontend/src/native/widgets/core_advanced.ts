/** The widget of the plugin `core_advanced`: whether the safety mode is on, and the heating share that it imposes. */

import type { AnyTranslations, ConfigValues, Contribution, Hass } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, sectionValues, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, isUnavailable, runtimeOf, sensorOf } from "./runtime.ts";

/**
 * Whether the safety mode is configured: what Versatile Thermostat says, else whether a delay of the safety mode applies to the
 * thermostat, its own or the central one.
 */
function safetyConfigured(hass: Hass | undefined, thermostatId: string, values: ConfigValues, centralValues: ConfigValues): boolean {
  const runtime = runtimeOf(hass, thermostatId);
  if (sensorOf(hass, runtime, "safety_state").entityId === undefined) {
    return false;
  }
  const said = read.isSafetyConfigured(runtime.climate);
  if (said !== undefined) {
    return said;
  }
  const delay = sectionValues(values, centralValues, "use_advanced_central_config")["safety_delay_min"];
  return delay !== undefined && delay !== null && delay !== "";
}

/** An icon and a text that say whether the safety mode is on, and the imposed heating share while it is on. */
export class SafetyWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const runtime = this.runtime;
    const { state } = sensorOf(this.hass, runtime, "safety_state");
    if (isUnavailable(state)) {
      return html`<vtherm-widget-card .heading=${this.text("widget.safety.title")} .status=${"unavailable"} .text=${this.text}></vtherm-widget-card>`;
    }
    const active = state?.state === "on";
    const share = active ? read.powerPercent(runtime.climate) : undefined;
    return html`<vtherm-widget-card .heading=${this.text("widget.safety.title")} .text=${this.text}>
      <div class="lines">
        ${active
          ? html`<vtherm-state-icon class="state" .icon=${"mdi:shield-alert"} .label=${this.text("widget.safety.active")} tone="warning"></vtherm-state-icon>`
          : html`<vtherm-state-icon class="state" .icon=${"mdi:shield-check"} .label=${this.text("widget.safety.normal")} tone="success"></vtherm-state-icon>`}
        ${share === undefined
          ? undefined
          : html`<vtherm-bar class="share" .hass=${this.hass} .label=${this.text("widget.safety.imposed")} .value=${share} .max=${100} .unit=${"%"} tone="warning" .text=${this.text}></vtherm-bar>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_advanced` and give its contribution, after the preset. It is shown when the thermostat has the sensor of the
 * safety mode and the safety mode is configured, by its own values or by the central configuration.
 *
 * @param translations - The translations of the plugin `core_advanced`.
 */
export function advancedWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-advanced-widget-safety", SafetyWidget, translations);
  return [
    {
      id: WIDGET_IDS.safety,
      component: "core-advanced-widget-safety",
      placement: { after: WIDGET_IDS.preset },
      visible: ({ hass, thermostatId, values, centralValues }) => safetyConfigured(hass, thermostatId, values, centralValues),
    },
  ];
}
