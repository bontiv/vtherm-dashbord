/**
 * The widgets of the plugin `core` in the overview of a thermostat: the temperature, the mode and the action, and the alerts. They read
 * the `climate` entity of the thermostat; they show "—" for a value that is missing, and they never change anything.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { css, html } from "lit";
import type { TemplateResult } from "lit";

import { MISSING, formatNumber, temperatureUnit, withUnit } from "../../components/overview/format.ts";
import type { StateTone } from "../../components/overview/state-icon.ts";
import type { WidgetCardStatus } from "../../components/overview/widget-card.ts";
import { WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, isUnavailable, sensorOf } from "./runtime.ts";


/** The status of the card of a widget that reads the `climate` entity. */
function statusOf(climate: unknown): WidgetCardStatus {
  return climate === undefined || isUnavailable(climate as never) ? "unavailable" : "ready";
}

/** The temperature of the room and its setpoint on a gauge, the outdoor temperature, and the setpoints that a feature changed. */
export class TemperatureWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override render(): TemplateResult {
    const { climate, ...runtime } = this.runtime;
    const unit = temperatureUnit(this.hass);
    const temperature = (value: number | undefined) => ({ text: value === undefined ? MISSING : withUnit(formatNumber(this.hass, value), unit), available: value !== undefined });
    const requested = read.requestedTarget(climate);
    const applied = read.appliedTarget(climate);
    const regulated = sensorOf(this.hass, { climate, ...runtime }, "regulated_temperature");
    // An unavailable thermostat keeps its gauge, which shows "—" and says that the temperature is unavailable.
    return html`<vtherm-widget-card .heading=${this.text("widget.temperature.title")} .text=${this.text}>
      <div class="lines">
        <vtherm-gauge
          .hass=${this.hass}
          .value=${read.currentTemperature(climate)}
          .min=${read.minTemperature(climate) ?? 7}
          .max=${read.maxTemperature(climate) ?? 35}
          .marker=${read.targetTemperature(climate)}
          .markerLabel=${this.text("widget.temperature.setpoint")}
          .label=${this.text("widget.temperature.room")}
          .unit=${unit}
          .text=${this.text}
        ></vtherm-gauge>
        <vtherm-value-row .label=${this.text("widget.temperature.outdoor")} .value=${temperature(read.extTemperature(climate))} .text=${this.text}></vtherm-value-row>
        ${requested !== undefined && applied !== undefined && requested !== applied
          ? html`<vtherm-value-row
              class="requested"
              .label=${this.text("widget.temperature.requested")}
              .value=${{ text: `${formatNumber(this.hass, requested)} → ${withUnit(formatNumber(this.hass, applied), unit)}`, available: true }}
              .text=${this.text}
            ></vtherm-value-row>`
          : undefined}
        ${regulated.entityId === undefined
          ? undefined
          : html`<vtherm-value-row
              class="regulated"
              .label=${this.text("widget.temperature.regulated")}
              .value=${temperature(isUnavailable(regulated.state) ? undefined : Number(regulated.state?.state))}
              .text=${this.text}
            ></vtherm-value-row>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/** The icons of the HVAC modes and actions of Home Assistant. */
const MODE_ICONS: Readonly<Record<string, string>> = {
  heat: "mdi:fire",
  cool: "mdi:snowflake",
  off: "mdi:power",
  auto: "mdi:thermostat-auto",
  heat_cool: "mdi:sun-snowflake-variant",
  dry: "mdi:water-percent",
  fan_only: "mdi:fan",
};
const ACTION_ICONS: Readonly<Record<string, string>> = {
  heating: "mdi:fire",
  preheating: "mdi:radiator",
  cooling: "mdi:snowflake",
  drying: "mdi:water-percent",
  fan: "mdi:fan",
  idle: "mdi:pause-circle-outline",
  off: "mdi:power",
};
/** The icons of the reasons of Versatile Thermostat. A reason that is not here has the generic icon. */
const REASON_ICONS: Readonly<Record<string, string>> = {
  hvac_off_manual: "mdi:account-cancel",
  hvac_off_auto_start_stop: "mdi:timer-play-outline",
  hvac_off_window_detection: "mdi:window-open-variant",
  hvac_off_sleep_mode: "mdi:sleep",
  hvac_off_safety_detection: "mdi:shield-alert",
  hvac_off_central_mode: "mdi:home-thermometer",
  hvac_off_inhibition: "mdi:hand-back-left-off",
  hvac_fan_only_auto_start_stop: "mdi:fan",
  hvac_dry_auto_start_stop: "mdi:water-percent",
};
const GENERIC_ICON = "mdi:information-outline";

/** The HVAC mode and action, why the thermostat is in this mode, the sleep mode and the central mode. It draws no command. */
export class ModeWidget extends NativeWidget {
  static override styles = widgetStyles;

  /** The translated text of a code of a list, or the code itself when the catalog does not know it. */
  private codeText(prefix: string, code: string): string {
    return this.knows(`${prefix}.${code}`) ? this.text(`${prefix}.${code}`) : code;
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const mode = read.hvacMode(climate);
    const action = read.hvacAction(climate);
    const reason = read.offReason(climate) ?? read.modeReason(climate);
    const central = read.lastCentralMode(climate);
    return html`<vtherm-widget-card .heading=${this.text("widget.mode.title")} .status=${statusOf(climate)} .text=${this.text}>
      <div class="lines">
        ${mode === undefined ? undefined : html`<vtherm-state-icon class="mode" .icon=${MODE_ICONS[mode] ?? GENERIC_ICON} .label=${this.codeText("widget.mode.hvac", mode)} tone=${mode === "off" ? "normal" : "active"}></vtherm-state-icon>`}
        ${action === undefined ? undefined : html`<vtherm-state-icon class="action" .icon=${ACTION_ICONS[action] ?? GENERIC_ICON} .label=${this.codeText("widget.mode.action", action)}></vtherm-state-icon>`}
        ${reason === undefined ? undefined : html`<vtherm-state-icon class="reason" .icon=${REASON_ICONS[reason] ?? GENERIC_ICON} .label=${this.codeText("widget.reason", reason)}></vtherm-state-icon>`}
        ${read.isSleeping(climate) === true ? html`<vtherm-state-icon class="sleeping" .icon=${"mdi:sleep"} .label=${this.text("widget.mode.sleeping")}></vtherm-state-icon>` : undefined}
        ${central === undefined
          ? undefined
          : html`<vtherm-state-icon class="central" .icon=${"mdi:home-thermometer"} .label=${this.text("widget.mode.central", { mode: this.codeText("widget.mode.central_mode", central) })}></vtherm-state-icon>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/** The messages that are alerts: drawn with the color of a warning. The others inform. */
const WARNING_MESSAGES = new Set(["overpowering_detected", "safety_detected", "not_initialized", "underlying_unavailable", "hvac_off_safety_detection", "hvac_off_inhibition"]);
const MESSAGE_ICONS: Readonly<Record<string, string>> = {
  overpowering_detected: "mdi:flash-alert",
  safety_detected: "mdi:shield-alert",
  target_temp_window_eco: "mdi:window-open-variant",
  target_temp_window_frost: "mdi:window-open-variant",
  target_temp_power: "mdi:flash-alert",
  target_temp_central_mode: "mdi:home-thermometer",
  target_temp_activity_detected: "mdi:motion-sensor",
  target_temp_activity_not_detected: "mdi:motion-sensor-off",
  target_temp_absence_detected: "mdi:account-off",
  target_temp_timed_preset: "mdi:timer-outline",
  not_initialized: "mdi:progress-alert",
  underlying_unavailable: "mdi:power-plug-off",
  ...REASON_ICONS,
};

/**
 * The messages of the thermostat, whether it is ready, its equipment that is unavailable, the age of its measures and the inhibition.
 * Without anything to say, "No alert" with a check mark.
 */
export class AlertsWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      .measure {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 4px 8px;
        min-width: 0;
      }
      .measure.old vtherm-age {
        --secondary-text-color: var(--warning-color);
      }
    `,
  ];

  /** Clock of the ages, replaced in the tests. */
  now: () => number = Date.now;

  private messageText(code: string): string {
    if (this.knows(`widget.alerts.message.${code}`)) {
      return this.text(`widget.alerts.message.${code}`);
    }
    return this.knows(`widget.reason.${code}`) ? this.text(`widget.reason.${code}`) : code;
  }

  /** A measure and its age, with a warning when it is older than the safety delay of the thermostat. */
  private renderMeasure(kind: "room" | "outdoor", date: string | undefined, delayMin: number | undefined): TemplateResult {
    const time = date === undefined ? Number.NaN : Date.parse(date);
    const old = delayMin !== undefined && Number.isFinite(time) && this.now() - time > delayMin * 60_000;
    const label = this.text(`widget.alerts.${kind}_measure`);
    return html`<div class="measure ${kind} ${old ? "old" : ""}">
      ${old ? html`<vtherm-state-icon .icon=${"mdi:clock-alert-outline"} .label=${this.text("widget.alerts.old_measure", { label })} tone="warning"></vtherm-state-icon>` : html`<span class="note">${label}</span>`}
      <vtherm-age .hass=${this.hass} .date=${date} .now=${this.now}></vtherm-age>
    </div>`;
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const messages = read.messages(climate);
    const notInitialized = read.notInitialized(climate);
    const unavailable = read.unavailableUnderlyings(climate);
    const inhibition = read.inhibition(climate);
    const tooltipOf = (code: string) => (code === "not_initialized" ? notInitialized.join(", ") : code === "underlying_unavailable" ? unavailable.join(", ") : "");
    const alerts: { readonly code: string; readonly icon: string; readonly label: string; readonly tooltip: string; readonly tone: StateTone }[] = messages.map((code) => ({
      code,
      icon: MESSAGE_ICONS[code] ?? GENERIC_ICON,
      label: this.messageText(code),
      tooltip: tooltipOf(code),
      tone: WARNING_MESSAGES.has(code) ? "warning" : "normal",
    }));
    // The lists of the equipment are shown even when Versatile Thermostat gives no message for them.
    if (read.isReady(climate) === false && !messages.includes("not_initialized")) {
      alerts.push({ code: "not_ready", icon: "mdi:progress-alert", label: this.text("widget.alerts.not_ready"), tooltip: notInitialized.join(", "), tone: "warning" });
    }
    if (unavailable.length > 0 && !messages.includes("underlying_unavailable")) {
      alerts.push({ code: "underlying_unavailable", icon: MESSAGE_ICONS["underlying_unavailable"] as string, label: this.messageText("underlying_unavailable"), tooltip: unavailable.join(", "), tone: "warning" });
    }
    if (inhibition?.inhibited === true) {
      alerts.push({ code: "inhibition", icon: "mdi:hand-back-left-off", label: this.text("widget.alerts.inhibited"), tooltip: [inhibition.commandGate, inhibition.lastErrorCode].filter((part) => part !== undefined).join(" · "), tone: "warning" });
    }
    const delay = read.safetyDelayMin(climate);
    return html`<vtherm-widget-card .heading=${this.text("widget.alerts.title")} .status=${statusOf(climate)} .text=${this.text}>
      <div class="lines">
        ${alerts.length === 0
          ? html`<vtherm-state-icon class="none" .icon=${"mdi:check-circle-outline"} .label=${this.text("widget.alerts.none")} tone="success"></vtherm-state-icon>`
          : alerts.map((alert) => html`<vtherm-state-icon class="alert" data-code=${alert.code} .icon=${alert.icon} .label=${alert.label} .tooltip=${alert.tooltip} tone=${alert.tone}></vtherm-state-icon>`)}
        ${this.renderMeasure("room", read.lastTemperatureDate(climate), delay)} ${this.renderMeasure("outdoor", read.lastExtTemperatureDate(climate), delay)}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widgets of `core` and give their contributions: first the temperature, then the mode, then the alerts. They are shown for
 * every thermostat that exists: it always has its `climate` entity, and the card says "unavailable" while it is missing.
 *
 * @param translations - The translations of the plugin `core`.
 */
export function coreWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-widget-temperature", TemperatureWidget, translations);
  defineWidget("core-widget-mode", ModeWidget, translations);
  defineWidget("core-widget-alerts", AlertsWidget, translations);
  return [
    { id: WIDGET_IDS.temperature, component: "core-widget-temperature", placement: { first: true }, visible: existingThermostat },
    { id: WIDGET_IDS.mode, component: "core-widget-mode", placement: { after: WIDGET_IDS.temperature }, visible: existingThermostat },
    { id: WIDGET_IDS.alerts, component: "core-widget-alerts", placement: { after: WIDGET_IDS.mode }, visible: existingThermostat },
  ];
}
