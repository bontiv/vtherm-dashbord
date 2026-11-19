/**
 * The widget of the plugin `core_sync_temp` in the overview of a thermostat over a climate: the temperature sent to each equipment, the
 * values of the synchronised entities, and an alert when the tracking of the setpoint is suspended, with the gaps in a tooltip. It reads
 * `vtherm_over_climate` (`thermostat_climate.py`); it draws no command.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { MISSING, formatNumber, temperatureUnit, withUnit } from "../../components/overview/format.ts";
import { DETAIL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { detailAttributes, isUnavailable, runtimeOf } from "./runtime.ts";
import type { TrackedUnderlying } from "./runtime.ts";

/** The temperature sent to each equipment, the synchronised entities, and the tracking of the setpoint. */
export class SyncWidget extends NativeWidget {
  static override styles = widgetStyles;

  /** A reason of the tracking, or the code itself when the catalog does not know it. */
  private reasonText(reason: string): string {
    return this.knows(`widget.sync.reason.${reason}`) ? this.text(`widget.sync.reason.${reason}`) : reason;
  }

  /** The gaps between the temperature sent and the one that each equipment reports, for the tooltip of the alert. */
  private gaps(underlyings: readonly TrackedUnderlying[]): string {
    const unit = temperatureUnit(this.hass);
    const value = (temperature: number | undefined) => (temperature === undefined ? MISSING : withUnit(formatNumber(this.hass, temperature), unit));
    return underlyings
      .map((under) => this.text("widget.sync.gap", { entity: under.entityId, sent: value(under.lastSent), observed: value(under.observed), status: under.status ?? MISSING }))
      .join(" · ");
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const tracking = detailAttributes.tracking(climate);
    const synchronised = detailAttributes.synchronised(climate) ?? [];
    const unit = temperatureUnit(this.hass);
    const temperature = (value: number | undefined) => (value === undefined ? MISSING : withUnit(formatNumber(this.hass, value), unit));
    return html`<vtherm-widget-card .heading=${this.text("widget.sync.title")} .status=${climate === undefined || isUnavailable(climate) ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        ${tracking?.suspended === true
          ? html`<vtherm-state-icon
              class="suspended"
              .icon=${"mdi:sync-alert"}
              .label=${this.text("widget.sync.suspended", { reason: this.reasonText(tracking.reason ?? MISSING), attempts: tracking.attempts ?? 0 })}
              .tooltip=${this.gaps(tracking.underlyings)}
              tone="warning"
            ></vtherm-state-icon>`
          : undefined}
        ${(tracking?.underlyings ?? []).map((under) => html`<p class="note sent" data-entity=${under.entityId}>${this.text("widget.sync.sent", { entity: under.entityId, value: temperature(under.lastSent) })}</p>`)}
        ${synchronised.map((entity) => {
          const unitOf = this.hass?.states[entity.entityId]?.attributes["unit_of_measurement"];
          const value = entity.value === undefined ? MISSING : withUnit(formatNumber(this.hass, entity.value), typeof unitOf === "string" ? unitOf : undefined);
          return html`<p class="note synchronised" data-entity=${entity.entityId}>${this.text("widget.sync.synchronised", { entity: entity.entityId, value })}</p>`;
        })}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_sync_temp` and give its contribution, after the energy: the humidity, loaded later, comes in between. It is
 * shown for a thermostat over a climate that publishes the tracking of its setpoint or a synchronisation.
 *
 * @param translations - The translations of the plugin `core_sync_temp`.
 */
export function syncWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-sync-temp-widget-sync", SyncWidget, translations);
  return [
    {
      id: DETAIL_WIDGET_IDS.sync,
      component: "core-sync-temp-widget-sync",
      placement: { after: DETAIL_WIDGET_IDS.energy },
      visible: (context) => {
        const climate = runtimeOf(context.hass, context.thermostatId).climate;
        return existingThermostat(context) && context.thermostatType === "over_climate" && (detailAttributes.tracking(climate) !== undefined || detailAttributes.synchronised(climate) !== undefined);
      },
    },
  ];
}
