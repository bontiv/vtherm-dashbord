/**
 * The widgets of the plugin `core` on the Overview page: the central mode, the summary of the thermostats and the outdoor temperature.
 * They read the central configuration and the `climate` entities of the thermostats; they draw no command.
 */

import type { AnyTranslations, Contribution, VisibilityContext } from "@vtherm/dashboard-sdk";
import { css, html } from "lit";
import type { TemplateResult } from "lit";

import { followLink } from "../../components/events.ts";
import { renderIcon } from "../../components/icon.ts";
import type { BarSegment, SegmentTone } from "../../components/overview/bar.ts";
import { MISSING, formatEntityValue, localeOf, temperatureUnit } from "../../components/overview/format.ts";
import "./history-curve.ts";
import { GLOBAL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, widgetStyles } from "./native-widget.ts";
import { activityOf, alertOf, centralEntities, centralModeEntity, configuredEntity, nameOf, thermostatPath, thermostatsOf } from "./home.ts";
import type { ThermostatActivity, ThermostatAlert } from "./home.ts";
import { isUnavailable } from "./runtime.ts";

/** The icon of each central mode of Versatile Thermostat (`const.py`, `CENTRAL_MODES`). */
const CENTRAL_MODE_ICONS: Readonly<Record<string, string>> = {
  Auto: "mdi:thermostat-auto",
  Stopped: "mdi:power",
  "Heat only": "mdi:fire",
  "Cool only": "mdi:snowflake",
  "Frost protection": "mdi:snowflake-thermometer",
};
const GENERIC_ICON = "mdi:help-circle-outline";

/** The key of the central configuration that names its outdoor sensor. */
const OUTDOOR_SENSOR = "external_temperature_sensor_entity_id";

/** The central mode: an icon and the translated name of the option, or the option as it is when the dashboard does not know it. */
export class CentralModeWidget extends NativeWidget {
  static override styles = widgetStyles;

  private get entityId(): string | undefined {
    return centralModeEntity(centralEntities(this.hass, this.central));
  }

  protected override readEntities(): readonly string[] {
    const entityId = this.entityId;
    return entityId === undefined ? [] : [entityId];
  }

  protected override render(): TemplateResult {
    const entityId = this.entityId;
    const state = entityId === undefined ? undefined : this.hass?.states[entityId];
    const mode = state === undefined || isUnavailable(state) ? undefined : state.state;
    const key = `widget.mode.central_mode.${mode ?? ""}`;
    return html`<vtherm-widget-card .heading=${this.text("widget.central_mode.title")} .status=${mode === undefined ? "unavailable" : "ready"} .text=${this.text}>
      ${mode === undefined
        ? undefined
        : html`<vtherm-state-icon
            class="central-mode"
            .icon=${CENTRAL_MODE_ICONS[mode] ?? GENERIC_ICON}
            .label=${this.knows(key) ? this.text(key) : mode}
            tone=${mode === "Stopped" ? "normal" : "active"}
          ></vtherm-state-icon>`}
    </vtherm-widget-card>`;
  }
}

/** The order of the parts of the bar of the summary, with their color: the text of each part says what it is. */
const ACTIVITIES: readonly { readonly activity: ThermostatActivity; readonly tone: SegmentTone; readonly always: boolean }[] = [
  { activity: "heating", tone: "warning", always: true },
  // A thermostat that cools is shown only when there is one: most homes only heat.
  { activity: "cooling", tone: "active", always: false },
  { activity: "idle", tone: "success", always: true },
  { activity: "off", tone: "inactive", always: true },
  { activity: "unavailable", tone: "error", always: true },
];

/**
 * The summary of the thermostats: how many heat, are idle, are off or are unavailable, on a segmented bar, and the thermostats in alert
 * with a link to their overview. It draws no chart, and draws again only when the `climate` entity of a thermostat changes.
 */
export class SummaryWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      ul {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 24px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      li .icon {
        flex: none;
        color: var(--warning-color);
      }
      a {
        color: var(--primary-color);
      }
    `,
  ];

  protected override readEntities(): readonly string[] {
    return thermostatsOf(this.hass).map((thermostat) => thermostat.climateId);
  }

  /** Why a thermostat is in alert, in words. */
  private reasons(alert: ThermostatAlert): string {
    const parts = alert.messages.map((code) => (this.knows(`widget.alerts.message.${code}`) ? this.text(`widget.alerts.message.${code}`) : code));
    if (alert.heatingFailure) {
      parts.push(this.text("widget.summary.heating_failure"));
    }
    if (alert.coolingFailure) {
      parts.push(this.text("widget.summary.cooling_failure"));
    }
    if (alert.unavailableEquipment.length > 0 && !alert.messages.includes("underlying_unavailable")) {
      parts.push(this.text("widget.alerts.message.underlying_unavailable"));
    }
    return parts.join(" · ");
  }

  protected override render(): TemplateResult {
    const thermostats = thermostatsOf(this.hass);
    const counts: Record<ThermostatActivity, number> = { heating: 0, cooling: 0, idle: 0, off: 0, unavailable: 0 };
    const alerts: { readonly name: string; readonly path: string; readonly reasons: string }[] = [];
    for (const thermostat of thermostats) {
      const state = this.hass?.states[thermostat.climateId];
      counts[activityOf(state)] += 1;
      const alert = alertOf(state);
      if (alert !== undefined) {
        alerts.push({ name: nameOf(this.hass, thermostat.climateId), path: thermostatPath(thermostat.entryId), reasons: this.reasons(alert) });
      }
    }
    const segments: BarSegment[] = ACTIVITIES.filter((part) => part.always || counts[part.activity] > 0).map((part) => ({
      label: this.text(`widget.summary.${part.activity}`),
      value: counts[part.activity],
      display: String(counts[part.activity]),
      tone: part.tone,
    }));
    return html`<vtherm-widget-card .heading=${this.text("widget.summary.title")} .text=${this.text}>
      <div class="lines">
        <vtherm-bar class="activities" .hass=${this.hass} .label=${this.text("widget.summary.count", { count: thermostats.length })} .segments=${segments} .text=${this.text}></vtherm-bar>
        ${alerts.length === 0
          ? html`<vtherm-state-icon class="none" .icon=${"mdi:check-circle-outline"} .label=${this.text("widget.alerts.none")} tone="success"></vtherm-state-icon>`
          : html`<ul class="alerts" aria-label=${this.text("widget.summary.alerts")}>
              ${alerts.map(
                (alert) =>
                  html`<li class="alert">
                    <span class="icon" role="img" aria-label=${this.text("widget.summary.in_alert")}>${renderIcon("mdi:alert")}</span>
                    <a href=${alert.path} title=${alert.reasons} @click=${(event: MouseEvent) => followLink(this, event, alert.path)}>${alert.name}</a>
                    <span class="note">${alert.reasons}</span>
                  </li>`,
              )}
            </ul>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/** The outdoor temperature of the central configuration: its value with the unit of its entity, and its curve over 24 hours. */
export class OutdoorWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      .current {
        margin: 0;
        font-size: 1.5rem;
      }
    `,
  ];

  private get entityId(): string | undefined {
    return configuredEntity(this.hass, this.central, OUTDOOR_SENSOR);
  }

  protected override readEntities(): readonly string[] {
    const entityId = this.entityId;
    return entityId === undefined ? [] : [entityId];
  }

  protected override render(): TemplateResult {
    const entityId = this.entityId;
    const value = formatEntityValue(this.hass, entityId);
    const unit = entityId === undefined ? undefined : this.hass?.states[entityId]?.attributes["unit_of_measurement"];
    return html`<vtherm-widget-card .heading=${this.text("widget.outdoor.title")} .text=${this.text}>
      <div class="lines">
        <p class="current">
          ${value.available ? value.text : html`<span aria-hidden="true">${MISSING}</span> <span class="note">${this.text("widget.unavailable")}</span>`}
        </p>
        <vtherm-history-curve
          .hass=${this.hass}
          .entityId=${entityId ?? ""}
          .active=${this.visible}
          .label=${this.text("widget.outdoor.curve")}
          .unit=${typeof unit === "string" ? unit : temperatureUnit(this.hass)}
          .language=${localeOf(this.hass)}
          .text=${this.text}
        ></vtherm-history-curve>
      </div>
    </vtherm-widget-card>`;
  }
}

type GlobalContext = VisibilityContext<"global_widget">;

/**
 * Define the widgets of `core` on the Overview page and give their contributions: the central mode first, then the summary, then the
 * outdoor temperature. The presence, loaded later, is placed between the central mode and the summary; the boiler, its power and the
 * power of the home between the summary and the outdoor temperature. Each one takes one column, except the outdoor temperature.
 *
 * @param translations - The translations of the plugin `core`.
 */
export function coreGlobalWidgets(translations: AnyTranslations): Contribution<"global_widget">[] {
  defineWidget("core-widget-central-mode", CentralModeWidget, translations);
  defineWidget("core-widget-summary", SummaryWidget, translations);
  defineWidget("core-widget-outdoor", OutdoorWidget, translations);
  return [
    {
      id: GLOBAL_WIDGET_IDS.centralMode,
      component: "core-widget-central-mode",
      placement: { first: true },
      visible: ({ hass, central }: GlobalContext) => centralModeEntity(centralEntities(hass, central)) !== undefined,
    },
    {
      id: GLOBAL_WIDGET_IDS.summary,
      component: "core-widget-summary",
      placement: { after: GLOBAL_WIDGET_IDS.centralMode },
      visible: ({ hass }: GlobalContext) => thermostatsOf(hass).length > 0,
    },
    {
      id: GLOBAL_WIDGET_IDS.outdoor,
      component: "core-widget-outdoor",
      placement: { after: GLOBAL_WIDGET_IDS.summary },
      size: { columns: 2, rows: 2 },
      visible: ({ hass, central }: GlobalContext) => configuredEntity(hass, central, OUTDOOR_SENSOR) !== undefined,
    },
  ];
}
