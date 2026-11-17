import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { buildPath } from "../router.ts";
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { Hass } from "@vtherm/dashboard-sdk";
import type { ThermostatInfo } from "../navigation.ts";
import { t } from "../shell-translations.ts";
import { groupByArea, hasNoArea } from "../thermostat-areas.ts";
import type { AreaGroup, HassAreas } from "../thermostat-areas.ts";
import { followLink, openHomeAssistantPage } from "./events.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";
import { isDefined, renderAlert } from "./ha.ts";

/** How the list orders the thermostats: grouped by area of Home Assistant, or by name. */
export type Grouping = "area" | "name";

/** The key of the browser storage that keeps the grouping chosen by the user. */
export const GROUPING_STORAGE_KEY = "vtherm_dashboard.thermostat_list.grouping";

/** The icon of an area that has none, as in Home Assistant. */
const AREA_ICON = "mdi:texture-box";

/** The icon of the group of the thermostats without area. */
const NO_AREA_ICON = "mdi:home-outline";

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
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
      text-decoration: none;
      background-color: var(--card-background-color);
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(--ha-card-box-shadow, none);
      border: 1px solid var(--divider-color);
    }
    a:hover,
    a:focus-visible {
      border-color: var(--primary-color);
    }
    .name {
      font-size: 16px;
      font-weight: 500;
    }
    .type {
      margin-top: 4px;
      color: var(--secondary-text-color);
    }
    a.create {
      display: inline-block;
      padding: 8px 16px;
      color: var(--text-primary-color);
      background-color: var(--primary-color);
      border: 0;
    }
    a.assign {
      display: inline;
      padding: 0;
      color: var(--primary-color);
      background: none;
      border: 0;
      font-size: 14px;
    }
    .assign-row {
      padding: 0 16px 8px;
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

  private renderCreate(): TemplateResult {
    const path = buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: "new", rest: [] });
    if (isDefined("ha-button")) {
      return html`<p><ha-button class="create" href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>${t("wizard.create_thermostat")}</ha-button></p>`;
    }
    // fallback: a plain link, when ha-button is not defined.
    return html`<p><a class="create" href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>${t("wizard.create_thermostat")}</a></p>`;
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

  private renderItems(thermostats: readonly ThermostatInfo[]): TemplateResult {
    if (isDefined("ha-md-list-item")) {
      return html`<div class="list" role="list">
        ${thermostats.map((thermostat) => {
          const path = buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: thermostat.id, rest: [] });
          return html`<ha-md-list-item type="link" href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>
            <span slot="headline">${thermostat.name}</span>
            <span slot="supporting-text">${t(`shell.thermostats.type.${thermostat.type}`)}</span>
          </ha-md-list-item>`;
        })}
      </div>`;
    }
    // fallback: plain links, when ha-md-list-item is not defined.
    return html`<ul>
      ${thermostats.map((thermostat) => {
        const path = buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: thermostat.id, rest: [] });
        return html`<li>
          <a href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>
            <div class="name">${thermostat.name}</div>
            <div class="type">${t(`shell.thermostats.type.${thermostat.type}`)}</div>
          </a>
        </li>`;
      })}
    </ul>`;
  }

  /** The links that open the device of each thermostat without area in Home Assistant, to give it one. */
  private renderAssign(thermostats: readonly ThermostatInfo[]): TemplateResult[] {
    return thermostats
      .filter((thermostat) => typeof thermostat.deviceId === "string" && thermostat.deviceId !== "")
      .map((thermostat) => {
        const path = `/config/devices/device/${encodeURIComponent(String(thermostat.deviceId))}`;
        const open = (event: MouseEvent): void => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          openHomeAssistantPage(path);
        };
        return html`<div class="assign-row"><a class="assign touch-target" href=${path} @click=${open}>${t("shell.thermostats.assign_area", { name: thermostat.name })}</a></div>`;
      });
  }

  private renderGroup(group: AreaGroup): TemplateResult {
    const homeless = group.areaId === null;
    return html`<section aria-labelledby="area-${group.areaId ?? "none"}">
      <h3 id="area-${group.areaId ?? "none"}">
        <ha-icon .icon=${homeless ? NO_AREA_ICON : (group.icon ?? AREA_ICON)}></ha-icon>
        <span class="area breakable">${homeless ? t("shell.thermostats.no_area") : group.name}</span>
        ${group.floorName === undefined ? undefined : html`<span class="floor breakable">${group.floorName}</span>`}
      </h3>
      ${this.renderItems(group.thermostats)} ${homeless ? this.renderAssign(group.thermostats) : undefined}
    </section>`;
  }

  protected override render(): TemplateResult {
    if (this.thermostats.length === 0) {
      return html`${this.renderCreate()}${renderAlert("info", t("shell.thermostats.empty"), "empty")}`;
    }
    const groups = groupByArea(this.thermostats, this.hass as HassAreas | undefined, this.locale);
    const flat = hasNoArea(groups);
    const toolbar = html`<div class="toolbar">${this.renderCreate()}${flat ? undefined : this.renderGrouping()}</div>`;
    if (flat || this.grouping === "name") {
      const byName = groups.flatMap((group) => group.thermostats);
      const sorted = flat ? byName : [...byName].sort((left, right) => left.name.localeCompare(right.name, this.locale === "" ? undefined : this.locale, { sensitivity: "base", numeric: true }));
      return html`${toolbar}${this.renderItems(sorted)}`;
    }
    return html`${toolbar}${groups.map((group) => this.renderGroup(group))}`;
  }
}

defineElement("vtherm-thermostat-list", VThermThermostatList);
