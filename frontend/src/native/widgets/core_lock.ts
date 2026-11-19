/**
 * The widget of the plugin `core_lock` in the overview of a thermostat: whether the thermostat is locked. It draws no button, and no time
 * of the automatic relock: Versatile Thermostat does not publish when it locked.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { FEATURE_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { featureAttributes, isUnavailable, runtimeOf } from "./runtime.ts";

/** The lock: a closed padlock and "Locked", or an open one and "Unlocked". */
export class LockWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const locked = featureAttributes.isLocked(climate);
    const unavailable = climate === undefined || isUnavailable(climate) || locked === undefined;
    return html`<vtherm-widget-card .heading=${this.text("widget.lock.title")} .status=${unavailable ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon
          class="lock ${locked === true ? "locked" : "unlocked"}"
          .icon=${locked === true ? "mdi:lock" : "mdi:lock-open-variant"}
          .label=${this.text(locked === true ? "widget.lock.locked" : "widget.lock.unlocked")}
          tone=${locked === true ? "active" : "normal"}
        ></vtherm-state-icon>
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_lock` and give its contribution, after the auto start and stop. It is shown when the lock of the thermostat
 * is configured: it blocks the users or the automations.
 *
 * @param translations - The translations of the plugin `core_lock`.
 */
export function lockWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-lock-widget-lock", LockWidget, translations);
  return [
    {
      id: FEATURE_WIDGET_IDS.lock,
      component: "core-lock-widget-lock",
      placement: { after: FEATURE_WIDGET_IDS.autoStartStop },
      visible: (context) => existingThermostat(context) && featureAttributes.isLockConfigured(runtimeOf(context.hass, context.thermostatId).climate),
    },
  ];
}
