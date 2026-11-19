/**
 * The widgets of the plugin `core_central_boiler` on the Overview page: the central boiler with the thermostats that call it, and the power
 * that they ask of it with its curve over 24 hours. They read the entities of the central device; they draw no command.
 */

import type { AnyTranslations, Contribution, EntryEntities, Hass, HassState, VisibilityContext } from "@vtherm/dashboard-sdk";
import { css, html } from "lit";
import type { TemplateResult } from "lit";

import { followLink } from "../../components/events.ts";
import { formatNumber, localeOf, withUnit } from "../../components/overview/format.ts";
import "./history-curve.ts";
import { GLOBAL_WIDGET_IDS } from "./ids.ts";
import { NativeWidget, defineWidget, widgetStyles } from "./native-widget.ts";
import { activeDevicesOf, boilerStateOf, centralEntities, nameOf, thermostatPath, thermostatsOf, thresholdNumber } from "./home.ts";
import { detailAttributes, isUnavailable, numberOf } from "./runtime.ts";

/** The translation keys of the entities of the central boiler (`binary_sensor.py`, `sensor.py`). */
const BOILER_STATE = "central_boiler_state";
const ACTIVE_DEVICES = "nb_device_active_boiler";
const ACTIVE_POWER = "total_power_active_boiler";

/** The entities of the central device that a widget of the boiler reads: its sensors and the `number` entities of its thresholds. */
function boilerEntities(entities: EntryEntities, keys: readonly string[]): string[] {
  const sensors = keys.map((key) => entities.byKey[key]).filter((entityId): entityId is string => entityId !== undefined);
  const thresholds = entities.entities.filter((entity) => entity.domain === "number" && entity.translationKey === undefined).map((entity) => entity.entityId);
  return [...sensors, ...thresholds];
}

/** The value of a sensor, or undefined when it is missing or unavailable. */
function valueOf(state: HassState | undefined): number | undefined {
  return state === undefined || isUnavailable(state) ? undefined : numberOf(state.state);
}

/** The upper bound of a gauge whose marker is a threshold: twice the threshold, or the value when it is above. */
function gaugeMax(value: number | undefined, threshold: number | undefined): number {
  return Math.max(1, value ?? 0, 2 * (threshold ?? 0));
}

/** A thermostat or an equipment that calls the boiler: a thermostat has a link to its overview. */
interface Requester {
  readonly name: string;
  readonly path: string | undefined;
}

/**
 * The thermostats that call the boiler. Versatile Thermostat gives the active equipment (`active_device_ids`); each thermostat gives its
 * own (`specific_states.device_actives`). An equipment that no thermostat claims is shown by its name, without a link.
 */
function requestersOf(hass: Hass | undefined, deviceIds: readonly string[]): Requester[] {
  const thermostats = thermostatsOf(hass);
  const requesters: Requester[] = [];
  const seen = new Set<string>();
  for (const deviceId of deviceIds) {
    const claiming = thermostats.filter((thermostat) => activeDevicesOf(hass?.states[thermostat.climateId]).includes(deviceId));
    // An equipment can be shared: only a thermostat used by the boiler calls it, as Versatile Thermostat counts them. When the same
    // equipment is listed twice, it is the one of two thermostats.
    const used = claiming.filter((thermostat) => detailAttributes.usedByCentralBoiler(hass?.states[thermostat.climateId]) !== false);
    const candidates = used.length > 0 ? used : claiming;
    const owner = candidates.find((thermostat) => !seen.has(thermostat.entryId)) ?? candidates[0];
    const key = owner?.entryId ?? deviceId;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    requesters.push(owner === undefined ? { name: nameOf(hass, deviceId), path: undefined } : { name: nameOf(hass, owner.climateId), path: thermostatPath(owner.entryId) });
  }
  return requesters;
}

/**
 * The central boiler: whether it is called, the number of active equipment on a gauge whose marker is the threshold, the thermostats that
 * call it, an hourglass while its activation is delayed, and an alert when it is not ready.
 */
export class BoilerWidget extends NativeWidget {
  static override styles = [
    widgetStyles,
    css`
      ul {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      li {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      a {
        color: var(--primary-color);
      }
    `,
  ];

  protected override readEntities(): readonly string[] {
    // The thermostats give the equipment that they activate and their names.
    return [...boilerEntities(centralEntities(this.hass, this.central), [BOILER_STATE, ACTIVE_DEVICES]), ...thermostatsOf(this.hass).map((thermostat) => thermostat.climateId)];
  }

  protected override render(): TemplateResult {
    const entities = centralEntities(this.hass, this.central);
    const stateId = entities.byKey[BOILER_STATE];
    const state = stateId === undefined ? undefined : this.hass?.states[stateId];
    const unavailable = state === undefined || isUnavailable(state);
    const boiler = boilerStateOf(state);
    const countState = entities.byKey[ACTIVE_DEVICES] === undefined ? undefined : this.hass?.states[entities.byKey[ACTIVE_DEVICES] as string];
    const count = valueOf(countState);
    const threshold = boiler.countThreshold ?? thresholdNumber(this.hass, entities, "count");
    const devices = countState?.attributes["active_device_ids"];
    const requesters = requestersOf(this.hass, Array.isArray(devices) ? devices.filter((device): device is string => typeof device === "string") : []);
    const on = state?.state === "on";
    return html`<vtherm-widget-card .heading=${this.text("widget.boiler.title")} .status=${unavailable ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-state-icon
          class="boiler"
          .icon=${on ? "mdi:water-boiler" : "mdi:water-boiler-off"}
          .label=${this.text(on ? "widget.boiler.on" : "widget.boiler.off")}
          tone=${on ? "active" : "normal"}
        ></vtherm-state-icon>
        ${boiler.ready === false
          ? html`<vtherm-state-icon class="not-ready" .icon=${"mdi:water-boiler-alert"} .label=${this.text("widget.boiler.not_ready")} tone="warning"></vtherm-state-icon>`
          : undefined}
        ${boiler.scheduled
          ? html`<vtherm-state-icon class="scheduled" .icon=${"mdi:timer-sand"} .label=${this.text("widget.boiler.scheduled", { seconds: formatNumber(this.hass, boiler.delaySec ?? 0, 0) })}></vtherm-state-icon>`
          : undefined}
        <vtherm-gauge
          .hass=${this.hass}
          .value=${count}
          .min=${0}
          .max=${gaugeMax(count, threshold)}
          .marker=${threshold}
          .markerLabel=${this.text("widget.boiler.threshold")}
          .label=${this.text("widget.boiler.devices")}
          .text=${this.text}
        ></vtherm-gauge>
        ${requesters.length === 0
          ? html`<p class="note">${this.text("widget.boiler.no_requester")}</p>`
          : html`<ul class="requesters" aria-label=${this.text("widget.boiler.requesters")}>
              ${requesters.map(
                (requester) =>
                  html`<li>
                    ${requester.path === undefined
                      ? requester.name
                      : html`<a href=${requester.path} @click=${(event: MouseEvent) => followLink(this, event, requester.path as string)}>${requester.name}</a>`}
                  </li>`,
              )}
            </ul>`}
      </div>
    </vtherm-widget-card>`;
  }
}

/** The power that the active thermostats ask of the boiler, on a gauge whose marker is the threshold of power, and its curve over 24 hours. */
export class BoilerPowerWidget extends NativeWidget {
  static override styles = widgetStyles;

  protected override readEntities(): readonly string[] {
    return boilerEntities(centralEntities(this.hass, this.central), [ACTIVE_POWER, BOILER_STATE]);
  }

  protected override render(): TemplateResult {
    const entities = centralEntities(this.hass, this.central);
    const powerId = entities.byKey[ACTIVE_POWER];
    const state = powerId === undefined ? undefined : this.hass?.states[powerId];
    const value = valueOf(state);
    const unitAttribute = state?.attributes["unit_of_measurement"];
    const unit = typeof unitAttribute === "string" ? unitAttribute : "W";
    // The `number` gives the exact threshold; the manager of the boiler publishes it as a whole number.
    const boilerState = entities.byKey[BOILER_STATE] === undefined ? undefined : this.hass?.states[entities.byKey[BOILER_STATE] as string];
    const threshold = thresholdNumber(this.hass, entities, "power") ?? boilerStateOf(boilerState).powerThreshold;
    const thresholdLabel = this.text("widget.boiler_power.threshold");
    return html`<vtherm-widget-card .heading=${this.text("widget.boiler_power.title")} .status=${state === undefined ? "unavailable" : "ready"} .text=${this.text}>
      <div class="lines">
        <vtherm-gauge
          .hass=${this.hass}
          .value=${value}
          .min=${0}
          .max=${gaugeMax(value, threshold)}
          .marker=${threshold}
          .markerLabel=${thresholdLabel}
          .label=${this.text("widget.boiler_power.power")}
          .unit=${unit}
          .text=${this.text}
        ></vtherm-gauge>
        <vtherm-history-curve
          .hass=${this.hass}
          .entityId=${powerId ?? ""}
          .active=${this.visible}
          .label=${this.text("widget.boiler_power.power")}
          .unit=${unit}
          .rules=${threshold === undefined ? [] : [{ value: threshold, axis: "left", label: `${thresholdLabel} ${withUnit(formatNumber(this.hass, threshold), unit)}`, tone: "warning" }]}
          .language=${localeOf(this.hass)}
          .text=${this.text}
        ></vtherm-history-curve>
      </div>
    </vtherm-widget-card>`;
  }
}

type GlobalContext = VisibilityContext<"global_widget">;

/**
 * Whether the central boiler is on in the central configuration and its entity exists. When the boiler is turned off, Versatile
 * Thermostat leaves its entities in the registry, unavailable: the entity alone does not say that the feature is on.
 */
const boilerOn = ({ hass, central }: GlobalContext, key: string): boolean =>
  central?.values["use_central_boiler_feature"] === true && centralEntities(hass, central).byKey[key] !== undefined;

/**
 * Define the widgets of `core_central_boiler` and give their contributions: the boiler after the summary of the thermostats, then the
 * power asked of it. Each one is shown when the central boiler is on in the central configuration and its entity exists.
 *
 * @param translations - The translations of the plugin `core_central_boiler`.
 */
export function boilerWidgets(translations: AnyTranslations): Contribution<"global_widget">[] {
  defineWidget("core-central-boiler-widget-boiler", BoilerWidget, translations);
  defineWidget("core-central-boiler-widget-boiler-power", BoilerPowerWidget, translations);
  return [
    {
      id: GLOBAL_WIDGET_IDS.boiler,
      component: "core-central-boiler-widget-boiler",
      placement: { after: GLOBAL_WIDGET_IDS.summary },
      size: { columns: 1, rows: 2 },
      visible: (context: GlobalContext) => boilerOn(context, BOILER_STATE),
    },
    {
      id: GLOBAL_WIDGET_IDS.boilerPower,
      component: "core-central-boiler-widget-boiler-power",
      placement: { after: GLOBAL_WIDGET_IDS.boiler },
      size: { columns: 2, rows: 2 },
      visible: (context: GlobalContext) => boilerOn(context, ACTIVE_POWER),
    },
  ];
}
