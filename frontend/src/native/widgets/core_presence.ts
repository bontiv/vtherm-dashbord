/**
 * The widget of the plugin `core_presence` on the Overview page: the presence at home, read on the presence sensor of the central
 * configuration as Versatile Thermostat reads it. It draws no button.
 */

import type { AnyTranslations, Contribution, VisibilityContext } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

import { GLOBAL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, widgetStyles } from "./native-widget.ts";
import { configuredEntity, nameOf, presenceOf } from "./home.ts";
import type { Presence } from "./home.ts";

/** The key of the central configuration that names its presence sensor. */
const PRESENCE_SENSOR = "presence_sensor_entity_id";

/** The icons of the presence, as Versatile Thermostat gives them to its presence sensors. */
const PRESENCE_ICONS: Readonly<Record<Presence, string>> = { present: "mdi:home-account", absent: "mdi:nature-people", unknown: "mdi:help-circle-outline" };

/** The presence at home: present, absent or unknown, with its icon. */
export class PresenceWidget extends NativeWidget {
  static override styles = widgetStyles;

  private get entityId(): string | undefined {
    return configuredEntity(this.hass, this.central, PRESENCE_SENSOR);
  }

  protected override readEntities(): readonly string[] {
    const entityId = this.entityId;
    return entityId === undefined ? [] : [entityId];
  }

  protected override render(): TemplateResult {
    const entityId = this.entityId;
    const presence = presenceOf(entityId === undefined ? undefined : this.hass?.states[entityId]);
    return html`<vtherm-widget-card .heading=${this.text("widget.presence.title")} .text=${this.text}>
      <vtherm-state-icon
        class="presence ${presence}"
        .icon=${PRESENCE_ICONS[presence]}
        .label=${this.text(`widget.presence.${presence}`)}
        .tooltip=${entityId === undefined ? "" : nameOf(this.hass, entityId)}
        tone=${presence === "present" ? "active" : "normal"}
      ></vtherm-state-icon>
    </vtherm-widget-card>`;
  }
}

/**
 * Define the widget of `core_presence` and give its contribution, right after the central mode, before the summary of the thermostats.
 * It is shown when the central configuration has a presence sensor that exists.
 *
 * @param translations - The translations of the plugin `core_presence`.
 */
export function presenceWidgets(translations: AnyTranslations): Contribution<"global_widget">[] {
  defineWidget("core-presence-widget-presence", PresenceWidget, translations);
  return [
    {
      id: GLOBAL_WIDGET_IDS.presence,
      component: "core-presence-widget-presence",
      placement: { after: GLOBAL_WIDGET_IDS.centralMode },
      visible: ({ hass, central }: VisibilityContext<"global_widget">) => configuredEntity(hass, central, PRESENCE_SENSOR) !== undefined,
    },
  ];
}
