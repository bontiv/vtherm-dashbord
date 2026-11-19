/**
 * The widget of the plugin `core_presets`: the preset of the thermostat, a preset with a timer and its remaining time, and a manual
 * override. The total duration of a timed preset is not published, so no bar shows its progress. It draws no selector of preset.
 */

import type { AnyTranslations, Contribution } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { localeOf } from "../../components/overview/format.ts";
import { WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, existingThermostat, widgetStyles } from "./native-widget.ts";
import { climateAttributes as read, isUnavailable } from "./runtime.ts";

/** The icon of each preset, as Versatile Thermostat gives them to its temperatures. */
const PRESET_ICONS: Readonly<Record<string, string>> = {
  none: "mdi:circle-off-outline",
  frost: "mdi:snowflake-thermometer",
  eco: "mdi:leaf",
  comfort: "mdi:sofa",
  boost: "mdi:rocket-launch",
  safety: "mdi:shield-alert",
  power: "mdi:flash-alert",
  activity: "mdi:motion-sensor",
};

/** The preset with its icon, a timed preset with its remaining time and its end, and a manual override with the preset that resumes. */
export class PresetWidget extends NativeWidget {
  static override styles = widgetStyles;

  /** The name of a preset, or the preset itself when the catalog does not know it. */
  private presetName(preset: string): string {
    return this.knows(`widget.preset.name.${preset}`) ? this.text(`widget.preset.name.${preset}`) : preset;
  }

  /** The time of a date, in the language of the user. */
  private timeOf(date: string | undefined): string | undefined {
    const time = date === undefined ? Number.NaN : Date.parse(date);
    return Number.isFinite(time) ? new Intl.DateTimeFormat(localeOf(this.hass), { hour: "2-digit", minute: "2-digit" }).format(new Date(time)) : undefined;
  }

  protected override render(): TemplateResult {
    const { climate } = this.runtime;
    const unavailable = climate === undefined || isUnavailable(climate);
    const preset = read.presetMode(climate) ?? "none";
    const timed = read.timedPreset(climate);
    const end = this.timeOf(timed?.endTime);
    return html`<vtherm-widget-card .heading=${this.text("widget.preset.title")} .status=${unavailable ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon class="preset" .icon=${PRESET_ICONS[preset] ?? "mdi:help-circle-outline"} .label=${this.presetName(preset)} tone=${preset === "none" ? "normal" : "active"}></vtherm-state-icon>
        ${timed?.active === true
          ? html`<vtherm-state-icon
                class="timed"
                .icon=${"mdi:timer-outline"}
                .label=${this.text("widget.preset.timed", { preset: this.presetName(timed.preset ?? preset) })}
              ></vtherm-state-icon>
              <p class="note remaining">
                ${this.text("widget.preset.remaining", { minutes: Math.round(timed.remainingMin ?? 0) })}${end === undefined ? undefined : html` · ${this.text("widget.preset.ends", { time: end })}`}
              </p>`
          : undefined}
        ${timed?.manualOverride === true
          ? html`<vtherm-state-icon class="override" .icon=${"mdi:hand-back-right"} .label=${this.text("widget.preset.manual_override")}></vtherm-state-icon>
              ${timed.resumePreset === undefined
                ? undefined
                : html`<p class="note resume">
                    ${this.text("widget.preset.resume", { preset: this.presetName(timed.resumePreset) })}${this.timeOf(timed.resumeEndTime) === undefined
                      ? undefined
                      : html` · ${this.text("widget.preset.ends", { time: this.timeOf(timed.resumeEndTime) as string })}`}
                  </p>`}`
          : undefined}
      </div>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_presets` and give its contribution, after the heating: the valve, loaded later, comes in between. It is
 * shown for every thermostat that exists: the preset is a standard attribute of the `climate` entity.
 *
 * @param translations - The translations of the plugin `core_presets`.
 */
export function presetWidgets(translations: AnyTranslations): Contribution<"thermostat_widget">[] {
  defineWidget("core-presets-widget-preset", PresetWidget, translations);
  return [{ id: WIDGET_IDS.preset, component: "core-presets-widget-preset", placement: { after: WIDGET_IDS.heating }, visible: existingThermostat }];
}
