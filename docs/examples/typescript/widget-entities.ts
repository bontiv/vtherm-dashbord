import { defineTranslations, getEntryEntities } from "@vtherm/dashboard-sdk";
import type { CentralContext, Hass, HassState, UiPluginDefinition } from "@vtherm/dashboard-sdk";

/** Whether a state has no value to show. */
const missing = (state: HassState | undefined): state is undefined => state === undefined || state.state === "unavailable" || state.state === "unknown";

/**
 * The share of heating of a thermostat, as its widget shows it. `thermostatId` is the configuration entry of the thermostat, not an
 * entity: the sensor is found on the device of the entry by its translation key.
 */
export function heatingShare(hass: Hass, thermostatId: string): string {
  const sensor = getEntryEntities(hass, thermostatId).byKey["power_percent"];
  const state = sensor === undefined ? undefined : hass.states[sensor];
  if (missing(state)) {
    return "—";
  }
  // Home Assistant formats the value with its unit and its precision. Without its formatter (in a test), format it yourself.
  return hass.formatEntityState?.(state) ?? `${new Intl.NumberFormat(hass.locale?.language ?? hass.language).format(Number(state.state))} %`;
}

/** The central mode, for a widget of the Overview page: the only `select` of the central device that has no translation key. */
export function centralMode(hass: Hass, central: CentralContext | undefined): string | undefined {
  if (central === undefined) {
    return undefined;
  }
  const select = getEntryEntities(hass, central.entryId).entities.find((entity) => entity.domain === "select" && entity.translationKey === undefined);
  const state = select === undefined ? undefined : hass.states[select.entityId];
  return missing(state) ? undefined : state.state;
}

export const definition: UiPluginDefinition = {
  id: "my_share",
  translations: defineTranslations({ "widget.share.title": "Heating share", "widget.central_mode.title": "Central mode" }),
  contributions: {
    // Hidden, not empty, when the thermostat has no sensor of the share.
    thermostat_widget: [{ id: "my_share.widget.share", component: "my-share-widget", visible: ({ hass, thermostatId }) => getEntryEntities(hass, thermostatId).byKey["power_percent"] !== undefined }],
    // Hidden without a central configuration.
    global_widget: [{ id: "my_share.widget.central_mode", component: "my-central-mode-widget", visible: ({ central }) => central !== undefined }],
  },
};
