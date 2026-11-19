/**
 * The widget of the plugin `core_heating_failure` in the overview of a thermostat: a failure of the heating or of the cooling with its
 * probable cause, the checks in progress, and a detection paused by its template. It stays shown while the detection is on, with "No
 * failure" when there is nothing to report. It draws no command; the link of the cause opens the information of Home Assistant.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { css, html } from "lit";
import type { TemplateResult } from "lit";

import { showMoreInfo } from "../../components/ha.ts";
import { formatNumber } from "../../components/overview/format.ts";
import { FEATURE_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, sectionApplies, widgetStyles } from "./native-widget.ts";
import { usesValveRegulation } from "../tab-definitions.ts";
import { featureAttributes, isUnavailable, runtimeOf } from "./runtime.ts";
import type { FailureTracking } from "./runtime.ts";

/** The failures, their probable cause, the checks in progress, and the detection paused by the template. */
export class FailureWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      .cause {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        min-width: 0;
      }
      button.more-info {
        padding: 0;
        font: inherit;
        color: var(--primary-color);
        background: none;
        border: 0;
        text-decoration: underline;
        cursor: pointer;
      }
    `,
  ];

  /** The name of a probable cause, or the code itself when the catalog does not know it. */
  private causeText(cause: string): string {
    return this.knows(`widget.failure.cause.${cause}`) ? this.text(`widget.failure.cause.${cause}`) : cause;
  }

  /** A check in progress: a bar of the time elapsed on the whole time, and the minutes in text. */
  private renderTracking(kind: "heating" | "cooling", tracking: FailureTracking): TemplateResult {
    const total = tracking.elapsedMin + tracking.remainingMin;
    const percent = total > 0 ? Math.round((tracking.elapsedMin / total) * 100) : 0;
    const minutes = (value: number) => formatNumber(this.hass, value, 0);
    return html`<div class="tracking ${kind}">
      <vtherm-bar .hass=${this.hass} .label=${this.text(`widget.failure.tracking.${kind}`)} .value=${percent} .max=${100} .unit=${"%"} .text=${this.text}></vtherm-bar>
      <p class="note">${this.text("widget.failure.progress", { elapsed: minutes(tracking.elapsedMin), remaining: minutes(tracking.remainingMin) })}</p>
    </div>`;
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const failure = featureAttributes.failure(climate);
    if (failure === undefined || climate === undefined || isUnavailable(climate)) {
      return html`<vtherm-widget-card .heading=${this.text("widget.failure.title")} .status=${"unavailable"} .text=${this.text}></vtherm-widget-card>`;
    }
    const failing = failure.heating === "on" || failure.cooling === "on";
    const entityId = failure.rootCauseEntityId;
    const quiet = !failing && failure.heatingTracking === undefined && failure.coolingTracking === undefined;
    return html`<vtherm-widget-card .heading=${this.text("widget.failure.title")} .text=${this.text}>
      <div class="lines">
        ${failure.heating === "on" ? html`<vtherm-state-icon class="heating" .icon=${"mdi:radiator-off"} .label=${this.text("widget.failure.heating")} tone="warning"></vtherm-state-icon>` : undefined}
        ${failure.cooling === "on" ? html`<vtherm-state-icon class="cooling" .icon=${"mdi:snowflake-alert"} .label=${this.text("widget.failure.cooling")} tone="warning"></vtherm-state-icon>` : undefined}
        ${failing && failure.rootCause !== undefined
          ? html`<div class="cause">
              <span class="note">${this.text("widget.failure.cause", { cause: this.causeText(failure.rootCause) })}</span>
              ${entityId === undefined
                ? undefined
                : html`<button class="more-info" type="button" @click=${() => showMoreInfo(this, entityId, this.hass?.states)}>${this.text("widget.failure.more_info")}</button>`}
            </div>`
          : undefined}
        ${failure.heatingTracking === undefined ? undefined : this.renderTracking("heating", failure.heatingTracking)}
        ${failure.coolingTracking === undefined ? undefined : this.renderTracking("cooling", failure.coolingTracking)}
        ${quiet ? html`<vtherm-state-icon class="none" .icon=${"mdi:check-circle-outline"} .label=${this.text("widget.failure.none")} tone="success"></vtherm-state-icon>` : undefined}
        ${failure.hasTemplate && !failure.enabledByTemplate
          ? html`<vtherm-state-icon class="paused" .icon=${"mdi:pause-octagon-outline"} .label=${this.text("widget.failure.paused")}></vtherm-state-icon>`
          : undefined}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_heating_failure` and give its contribution, after the lock. It is shown while the detection is on for the
 * thermostat and its binary sensor exists, except for a thermostat over a climate without a regulation by valve.
 *
 * @param translations - The translations of the plugin `core_heating_failure`.
 */
export function failureWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-heating-failure-widget-failure", FailureWidget, translations);
  return [
    {
      id: FEATURE_WIDGET_IDS.failure,
      component: "core-heating-failure-widget-failure",
      placement: { after: FEATURE_WIDGET_IDS.lock },
      visible: (context) =>
        existingThermostat(context) &&
        !(context.thermostatType === "over_climate" && !usesValveRegulation(context.values)) &&
        sectionApplies("core_heating_failure", context.values) &&
        runtimeOf(context.hass, context.thermostatId).entities.byKey["heating_failure_state"] !== undefined,
    },
  ];
}
