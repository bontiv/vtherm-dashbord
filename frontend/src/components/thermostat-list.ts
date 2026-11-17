import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { NEW_THERMOSTAT, buildPath } from "../router.ts";
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { Hass } from "@vtherm/dashboard-sdk";
import type { ThermostatInfo } from "../navigation.ts";
import { t } from "../shell-translations.ts";
import { groupByArea, hasNoArea } from "../thermostat-areas.ts";
import type { AreaGroup, HassAreas } from "../thermostat-areas.ts";
import { followLink } from "./events.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";
import { isDefined, renderAlert } from "./ha.ts";
import { renderIcon } from "./icon.ts";

/** How the list orders the thermostats: grouped by area of Home Assistant, or by name. */
export type Grouping = "area" | "name";

/** The key of the browser storage that keeps the grouping chosen by the user. */
export const GROUPING_STORAGE_KEY = "vtherm_dashboard.thermostat_list.grouping";

/** The icon of an area that has none, as in Home Assistant. */
const AREA_ICON = "mdi:texture-box";

/** The icon of the group of the thermostats without area. */
const NO_AREA_ICON = "mdi:home-outline";

/** The icon of each type of thermostat, on its tile. */
const TYPE_ICONS: Readonly<Record<ThermostatInfo["type"], string>> = {
  over_switch: "mdi:toggle-switch-variant",
  over_climate: "mdi:thermostat",
  over_valve: "mdi:valve",
};

/** The actions of a climate entity that a tile names, and the presets of Versatile Thermostat that it translates. */
const ACTIONS = ["heating", "cooling", "idle", "off"] as const;
const PRESETS = ["none", "frost", "eco", "comfort", "boost", "activity", "safety", "power"] as const;

/** What a tile shows of the climate entity of a thermostat. */
export interface TileState {
  readonly current: number | undefined;
  readonly target: number | undefined;
  /** `heating`, `cooling`, `idle` or `off`. */
  readonly action: (typeof ACTIONS)[number] | undefined;
  readonly preset: string | undefined;
}

/** The states of Home Assistant, as far as a tile reads them. */
type States = Readonly<Record<string, { readonly state: string; readonly attributes: Readonly<Record<string, unknown>> }>>;

const numberOf = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/**
 * Read the state of the climate entity of a thermostat for its tile, or undefined when the entity is unavailable or unknown.
 *
 * @param states - The states of Home Assistant.
 * @param entityId - The climate entity of the thermostat.
 */
export function tileState(states: States | undefined, entityId: string | null | undefined): TileState | undefined {
  const entity = entityId === null || entityId === undefined ? undefined : states?.[entityId];
  if (entity === undefined || entity.state === "unavailable" || entity.state === "unknown") {
    return undefined;
  }
  const attributes = entity.attributes;
  const reported = attributes["hvac_action"];
  // An entity that is off is off, whatever its last action.
  const action = entity.state === "off" ? "off" : ACTIONS.find((candidate) => candidate === reported);
  const preset = typeof attributes["preset_mode"] === "string" && attributes["preset_mode"] !== "" ? attributes["preset_mode"] : undefined;
  return { current: numberOf(attributes["current_temperature"]), target: numberOf(attributes["temperature"]), action, preset };
}

/** The grouping kept in the browser, or the grouping by area when there is none or when the browser refuses the storage. */
function readGrouping(): Grouping {
  try {
    return window.localStorage.getItem(GROUPING_STORAGE_KEY) === "name" ? "name" : "area";
  } catch {
    // fallback: a private window can refuse the storage; the list is then grouped by area.
    return "area";
  }
}

function keepGrouping(grouping: Grouping): void {
  try {
    window.localStorage.setItem(GROUPING_STORAGE_KEY, grouping);
  } catch {
    // fallback: the choice lasts as long as the page when the browser refuses the storage.
  }
}

/**
 * The list of the thermostats, shown in full width in the Thermostats tab, with a message when there is none.
 *
 * The thermostats are grouped by area of Home Assistant, ordered by floor then by name of area, with the thermostats without area at
 * the end; the user can order them by name instead. The names of the areas come from `hass`, so they change live.
 */
export class VThermThermostatList extends LitElement {
  static override properties = {
    language: { type: String },
    thermostats: { attribute: false },
    hass: { attribute: false },
    grouping: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: block;
      padding: 16px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 16px;
      margin-bottom: 8px;
    }
    .toolbar p {
      margin: 0;
    }
    .grouping {
      display: inline-flex;
      gap: 4px;
    }
    /* fallback: the buttons of the choice when ha-button is not defined. */
    .grouping button {
      padding: 6px 12px;
      font: inherit;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      cursor: pointer;
    }
    .grouping button[aria-checked="true"] {
      color: var(--text-primary-color);
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }
    section + section {
      margin-top: 16px;
    }
    h3 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      margin: 16px 0 8px;
      font-size: 16px;
      font-weight: 500;
    }
    h3 ha-icon {
      color: var(--secondary-text-color);
    }
    h3 .floor {
      font-size: 14px;
      font-weight: 400;
      color: var(--secondary-text-color);
    }
    ul.tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* The link keeps the address of the thermostat; the card of Home Assistant inside it is the tile. */
    a.tile {
      display: block;
      height: 100%;
      color: var(--primary-text-color);
      text-decoration: none;
      border-radius: var(--ha-card-border-radius, 12px);
    }
    a.tile:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .tile-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
    }
    a.tile:hover .tile-card {
      border-color: var(--primary-color);
    }
    /* fallback: the card of a tile when ha-card is not defined. */
    div.tile-card {
      background-color: var(--card-background-color);
      border-radius: var(--ha-card-border-radius, 12px);
      border: 1px solid var(--divider-color);
    }
    .head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .head ha-icon {
      flex: 0 0 auto;
      color: var(--secondary-text-color);
    }
    .name {
      min-width: 0;
      font-size: 16px;
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .type,
    .preset,
    .unavailable {
      color: var(--secondary-text-color);
    }
    .temperatures {
      font-size: 20px;
    }
    .action {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      flex: 0 0 auto;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--state-climate-idle-color, var(--secondary-text-color));
    }
    .dot.heating {
      background-color: var(--state-climate-heat-color, var(--warning-color));
    }
    .dot.cooling {
      background-color: var(--state-climate-cool-color, var(--primary-color));
    }
    .dot.off {
      background-color: var(--divider-color);
    }
    a.tile.new .tile-card {
      align-items: center;
      justify-content: center;
      color: var(--primary-color);
      border-style: dashed;
    }
    .new-section {
      margin-top: 16px;
    }
    .empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
  `,
  ];

  /** The thermostats. */
  declare thermostats: readonly ThermostatInfo[];

  /** The state of Home Assistant, whose registries give the names of the areas and of the floors. */
  declare hass: Hass | undefined;

  /** The language of the user. It only changes to make the component draw its texts again. */
  declare language: string;

  /** How the list orders the thermostats. */
  declare grouping: Grouping;

  constructor() {
    super();
    this.language = "";
    this.thermostats = [];
    this.hass = undefined;
    this.grouping = readGrouping();
  }

  private choose(grouping: Grouping): void {
    this.grouping = grouping;
    keepGrouping(grouping);
  }

  /** The language of Home Assistant, for the alphabetical order. */
  private get locale(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? "";
  }

  /** The choice between the list by area and the list by name: a group of two buttons, the chosen one filled. */
  private renderGrouping(): TemplateResult {
    const options: readonly Grouping[] = ["area", "name"];
    const label = (grouping: Grouping): string => t(grouping === "area" ? "shell.thermostats.grouping.area" : "shell.thermostats.grouping.name");
    return html`<div class="grouping" role="radiogroup" aria-label=${t("shell.thermostats.grouping")}>
      ${options.map((grouping) =>
        isDefined("ha-button")
          ? html`<ha-button
              role="radio"
              aria-checked=${grouping === this.grouping ? "true" : "false"}
              appearance=${grouping === this.grouping ? "filled" : "plain"}
              size="small"
              data-grouping=${grouping}
              @click=${() => this.choose(grouping)}
              >${label(grouping)}</ha-button
            >`
          : // fallback: plain buttons, when ha-button is not defined.
            html`<button role="radio" aria-checked=${grouping === this.grouping ? "true" : "false"} data-grouping=${grouping} @click=${() => this.choose(grouping)}>${label(grouping)}</button>`,
      )}
    </div>`;
  }

  /** Write a temperature as Home Assistant does: the number in the language of the user, and the unit of the temperatures. */
  private temperature(value: number | undefined): string {
    if (value === undefined) {
      return "—";
    }
    const unit = this.hass?.config?.unit_system?.temperature ?? "°C";
    return `${new Intl.NumberFormat(this.locale === "" ? undefined : this.locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
  }

  private renderState(state: TileState | undefined): TemplateResult {
    if (state === undefined) {
      return html`<div class="unavailable">${t("shell.thermostats.unavailable")}</div>`;
    }
    const known = state.preset !== undefined && (PRESETS as readonly string[]).includes(state.preset);
    const preset = state.preset === undefined ? undefined : known ? t(`shell.thermostats.preset.${state.preset as (typeof PRESETS)[number]}`) : state.preset;
    return html`<div class="temperatures">${this.temperature(state.current)} → ${this.temperature(state.target)}</div>
      ${state.action === undefined
        ? undefined
        : html`<div class="action"><span class="dot ${state.action}" aria-hidden="true"></span>${t(`shell.thermostats.action.${state.action}`)}</div>`}
      ${preset === undefined ? undefined : html`<div class="preset">${preset}</div>`}`;
  }

  /** The card of a tile: `ha-card`, or a plain card when it is not defined. */
  private card(content: TemplateResult): TemplateResult {
    return isDefined("ha-card") ? html`<ha-card class="tile-card">${content}</ha-card>` : html`<div class="tile-card">${content}</div>`;
  }

  /** A tile per thermostat: its type, the temperature of the room and the setpoint, the action and the preset, read live in `hass`. */
  private renderTiles(thermostats: readonly ThermostatInfo[], withNew: boolean): TemplateResult {
    const states = (this.hass as { states?: States } | undefined)?.states;
    const newPath = buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: NEW_THERMOSTAT, rest: [] });
    return html`<ul class="tiles">
      ${thermostats.map((thermostat) => {
        const path = buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: thermostat.id, rest: [] });
        return html`<li>
          <a class="tile" href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>
            ${this.card(html`<div class="head">${renderIcon(TYPE_ICONS[thermostat.type])}<span class="name">${thermostat.name}</span></div>
              <div class="type">${t(`shell.thermostats.type.${thermostat.type}`)}</div>
              ${this.renderState(tileState(states, thermostat.climateEntityId))}`)}
          </a>
        </li>`;
      })}
      ${withNew
        ? html`<li>
            <a class="tile new" href=${newPath} @click=${(event: MouseEvent) => followLink(this, event, newPath)}>${this.card(html`${renderIcon("mdi:plus")}<span>${t("shell.thermostats.new")}</span>`)}</a>
          </li>`
        : undefined}
    </ul>`;
  }

  private renderGroup(group: AreaGroup): TemplateResult {
    const homeless = group.areaId === null;
    return html`<section aria-labelledby="area-${group.areaId ?? "none"}">
      <h3 id="area-${group.areaId ?? "none"}">
        <ha-icon .icon=${homeless ? NO_AREA_ICON : (group.icon ?? AREA_ICON)}></ha-icon>
        <span class="area breakable">${homeless ? t("shell.thermostats.no_area") : group.name}</span>
        ${group.floorName === undefined ? undefined : html`<span class="floor breakable">${group.floorName}</span>`}
      </h3>
      ${this.renderTiles(group.thermostats, false)}
    </section>`;
  }

  protected override render(): TemplateResult {
    if (this.thermostats.length === 0) {
      return html`${renderAlert("info", t("shell.thermostats.empty"), "empty")}${this.renderTiles([], true)}`;
    }
    const groups = groupByArea(this.thermostats, this.hass as HassAreas | undefined, this.locale);
    const flat = hasNoArea(groups);
    const toolbar = flat ? undefined : html`<div class="toolbar">${this.renderGrouping()}</div>`;
    if (flat || this.grouping === "name") {
      const byName = groups.flatMap((group) => group.thermostats);
      const sorted = flat ? byName : [...byName].sort((left, right) => left.name.localeCompare(right.name, this.locale === "" ? undefined : this.locale, { sensitivity: "base", numeric: true }));
      return html`${toolbar}${this.renderTiles(sorted, true)}`;
    }
    // The tile "New thermostat" ends the list, after the last area.
    return html`${toolbar}${groups.map((group) => this.renderGroup(group))}
      <section class="new-section">${this.renderTiles([], true)}</section>`;
  }
}

defineElement("vtherm-thermostat-list", VThermThermostatList);
