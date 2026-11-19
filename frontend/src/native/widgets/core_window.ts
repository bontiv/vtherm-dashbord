/**
 * The widget of the plugin `core_window` in the overview of a thermostat: the window sensor, the automatic detection, the bypass, and what
 * an open window does to the thermostat now. It draws no button, and no remaining delay: Versatile Thermostat does not publish when a
 * window opened.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { FEATURE_WIDGET_IDS, WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, sectionApplies, widgetStyles } from "./native-widget.ts";
import { featureAttributes, featureStateOf, isUnavailable, runtimeOf, windowEffectOf } from "./runtime.ts";
import type { FeatureState } from "./runtime.ts";

/** The icons of the window sensor, as Versatile Thermostat gives them to its binary sensor. */
const WINDOW_ICONS: Readonly<Record<FeatureState, string>> = { on: "mdi:window-open-variant", off: "mdi:window-closed-variant", unknown: "mdi:help-circle-outline" };

/** The window: its sensor and its automatic detection, the bypass, and the effect of an open window (off, eco, frost, fan, none). */
export class WindowWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const runtime = this.runtime;
    const { climate } = runtime;
    const window = featureAttributes.window(climate);
    const sensorId = runtime.entities.byKey["window_state"];
    // Without its manager, the state of the binary sensor of the window.
    const sensor = window === undefined ? featureStateOf(sensorId === undefined ? undefined : this.hass?.states[sensorId]?.state) : window.sensor;
    const bypassId = runtime.entities.byKey["window_bypass_state"];
    const bypass = window?.bypass ?? (bypassId !== undefined && this.hass?.states[bypassId]?.state === "on");
    const effect = windowEffectOf(climate, bypass);
    return html`<vtherm-widget-card .heading=${this.text("widget.window.title")} .status=${climate === undefined || isUnavailable(climate) ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        ${sensor === undefined
          ? undefined
          : html`<vtherm-state-icon
              class="sensor ${sensor}"
              .icon=${WINDOW_ICONS[sensor]}
              .label=${this.text(`widget.window.${sensor === "on" ? "open" : sensor === "off" ? "closed" : "unknown"}`)}
              tone=${sensor === "on" ? "active" : "normal"}
            ></vtherm-state-icon>`}
        ${window?.auto === undefined
          ? undefined
          : html`<vtherm-state-icon
              class="auto ${window.auto}"
              .icon=${window.auto === "on" ? "mdi:window-open" : "mdi:thermometer-chevron-down"}
              .label=${this.text(`widget.window.auto_${window.auto === "on" ? "open" : window.auto === "off" ? "closed" : "unknown"}`)}
              tone=${window.auto === "on" ? "active" : "normal"}
            ></vtherm-state-icon>`}
        ${bypass ? html`<vtherm-state-icon class="bypass" .icon=${"mdi:window-shutter-cog"} .label=${this.text("widget.window.bypass")}></vtherm-state-icon>` : undefined}
        <vtherm-value-row class="effect ${effect}" .label=${this.text("widget.window.effect")} .value=${{ text: this.text(`widget.window.effect.${effect}`), available: true }} .text=${this.text}></vtherm-value-row>
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_window` and give its contribution, after the preset. It is shown when the window detection is on for the
 * thermostat and its binary sensor exists.
 *
 * @param translations - The translations of the plugin `core_window`.
 */
export function windowWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-window-widget-window", WindowWidget, translations);
  return [
    {
      id: FEATURE_WIDGET_IDS.window,
      component: "core-window-widget-window",
      placement: { after: WIDGET_IDS.preset },
      visible: (context) => existingThermostat(context) && sectionApplies("core_window", context.values) && runtimeOf(context.hass, context.thermostatId).entities.byKey["window_state"] !== undefined,
    },
  ];
}
