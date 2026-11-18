import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { Hass } from "@vtherm/dashboard-sdk";

import type { MenuStatus, NavItem, NavSection, ThermostatInfo } from "../navigation.ts";
import { t } from "../shell-translations.ts";
import { selectorOptions } from "../thermostat-areas.ts";
import type { HassAreas } from "../thermostat-areas.ts";
import { followLink } from "./events.ts";
import { renderIcon } from "./icon.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";
import { isDefined } from "./ha.ts";

/** How a status is shown: a short text (a check mark for `complete`), its tone, and what a screen reader says. */
interface StatusView {
  readonly text: string | undefined;
  readonly tone: "success" | "secondary" | "warning" | "error";
  readonly spoken: string;
}

/** Show a status of the menu. The colors are not the only clue: each status has an icon or a text. */
export function statusView(status: MenuStatus): StatusView {
  switch (status.kind) {
    case "complete":
      return { text: undefined, tone: "success", spoken: t("status.spoken.complete") };
    case "inherited":
      return status.off === true
        ? { text: t("status.inherited_off"), tone: "secondary", spoken: t("status.spoken.inherited_off") }
        : { text: t("status.inherited"), tone: "secondary", spoken: t("status.spoken.inherited") };
    case "off":
      return { text: t("status.off"), tone: "secondary", spoken: t("status.spoken.off") };
    case "incomplete":
      return { text: t("status.incomplete", { count: status.missing }), tone: "warning", spoken: t("status.spoken.incomplete", { count: status.missing }) };
    case "refused":
      return { text: t("status.refused"), tone: "error", spoken: t("status.spoken.refused") };
  }
}

/** Whether a status turns the section off, by its own values or by the central values it uses: its entry is in retreat. */
const isOff = (status: MenuStatus | undefined): boolean => status?.kind === "off" || (status?.kind === "inherited" && status.off === true);

/** The event sent when the user chooses another thermostat in the selector. Its detail is the identifier of the thermostat. */
export const THERMOSTAT_SELECTED_EVENT = "vtherm-thermostat-selected";

/**
 * The left menu of a tab.
 *
 * It scrolls on its own when it is longer than the screen, without moving the rest of the page. The current entry is highlighted.
 * In the Thermostats tab, a selector of thermostat comes first.
 */
export class VThermSideMenu extends LitElement {
  static override properties = {
    language: { type: String },
    sections: { attribute: false },
    thermostats: { attribute: false },
    hass: { attribute: false },
    selected: { type: String },
    label: { type: String },
  };

  static override styles = [
    narrowStyles,
    css`
    ha-selector.thermostat {
      display: block;
      margin: 12px;
    }
    ha-md-list-item.active {
      --md-list-item-label-text-color: var(--primary-color);
      --md-list-item-leading-icon-color: var(--primary-color);
      background-color: var(--secondary-background-color);
    }
    :host {
      display: block;
      box-sizing: border-box;
      overflow-y: auto;
      height: 100%;
      min-width: 220px;
      background-color: var(--card-background-color);
      border-right: 1px solid var(--divider-color);
    }
    select {
      box-sizing: border-box;
      width: calc(100% - 24px);
      margin: 12px;
      padding: 8px;
      font: inherit;
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 4px);
    }
    h2 {
      margin: 16px 16px 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      color: var(--primary-text-color);
      text-decoration: none;
      border-left: 3px solid transparent;
    }
    a:hover {
      background-color: var(--secondary-background-color);
    }
    a[aria-current="page"] {
      color: var(--primary-color);
      border-left-color: var(--primary-color);
      font-weight: 500;
    }
    a:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }
    /* The status of a configuration section, at the right of its title. */
    .status {
      flex: 0 0 auto;
      font-size: 12px;
      white-space: nowrap;
    }
    a .status {
      margin-left: auto;
    }
    .status.success {
      color: var(--success-color);
      --mdc-icon-size: 18px;
    }
    .status.secondary {
      color: var(--secondary-text-color);
    }
    .status.warning {
      color: var(--warning-color);
    }
    .status.error {
      color: var(--error-color);
    }
    .title {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    /* A section whose feature is off is in retreat, with its title in the secondary color. */
    ha-md-list-item.off {
      --md-list-item-label-text-color: var(--secondary-text-color);
      --md-list-item-leading-icon-color: var(--secondary-text-color);
      padding-inline-start: 16px;
    }
    a.off {
      padding-left: 32px;
      color: var(--secondary-text-color);
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
  ];

  /** The sections of the menu. */
  declare sections: readonly NavSection[];

  /** The thermostats to choose from. The selector is shown when there is a list and `selected` is set. */
  declare thermostats: readonly ThermostatInfo[];

  /** The state of Home Assistant, whose registries give the areas that order the thermostats of the selector. */
  declare hass: Hass | undefined;

  /** The identifier of the selected thermostat. */
  declare selected: string;

  /** The accessible name of the menu. */
  declare label: string;

  /** The language of the user. It only changes to make the component draw its texts again. */
  declare language: string;

  constructor() {
    super();
    this.language = "";
    this.sections = [];
    this.thermostats = [];
    this.hass = undefined;
    this.selected = "";
    this.label = "";
  }

  private select(thermostatId: string): void {
    this.dispatchEvent(new CustomEvent<string>(THERMOSTAT_SELECTED_EVENT, { detail: thermostatId, bubbles: true, composed: true }));
  }

  private renderSelector(): TemplateResult | undefined {
    if (this.selected === "" || this.thermostats.length === 0) {
      return undefined;
    }
    // The thermostats are ordered by area, as in the list, and named "area · name".
    const options = selectorOptions(this.thermostats, this.hass as HassAreas | undefined, this.hass?.locale?.language ?? this.hass?.language ?? "");
    if (isDefined("ha-selector")) {
      return html`<ha-selector
        class="thermostat"
        .selector=${{ select: { options: options.map((option) => ({ value: option.thermostat.id, label: option.label })), mode: "dropdown" } }}
        .value=${this.selected}
        .label=${t("shell.thermostats.select")}
        .required=${true}
        @value-changed=${(event: CustomEvent<{ value: unknown }>) => {
          event.stopPropagation();
          const value = String(event.detail.value ?? "");
          if (value !== "" && value !== this.selected) {
            this.select(value);
          }
        }}
      ></ha-selector>`;
    }
    // fallback: a plain list, when ha-selector is not defined.
    return html`<select
      aria-label=${t("shell.thermostats.select")}
      @change=${(event: Event) => this.select((event.target as HTMLSelectElement).value)}
    >
      ${options.map((option) => html`<option value=${option.thermostat.id} ?selected=${option.thermostat.id === this.selected}>${option.label}</option>`)}
    </select>`;
  }

  /** The status at the right of the title, and the words that a screen reader says after the title. */
  private renderStatus(item: NavItem, slot: string | undefined): { status: TemplateResult | undefined; spoken: TemplateResult | undefined } {
    if (item.status === undefined) {
      return { status: undefined, spoken: undefined };
    }
    const view = statusView(item.status);
    const content = view.text === undefined ? html`<ha-icon .icon=${"mdi:check"}></ha-icon>` : view.text;
    return {
      status: html`<span slot=${slot ?? ""} class="status ${view.tone}" aria-hidden="true">${content}</span>`,
      spoken: html`<span class="visually-hidden">, ${view.spoken}</span>`,
    };
  }

  private itemClass(item: NavItem): string {
    return [item.active ? "active" : "", isOff(item.status) ? "off" : ""].filter(Boolean).join(" ");
  }

  protected override render(): TemplateResult {
    return html`<nav aria-label=${this.label}>
      ${this.renderSelector()}
      ${this.sections.map(
        (section) => html`${section.heading === undefined ? undefined : html`<h2>${section.heading}</h2>`}
          ${isDefined("ha-md-list-item")
            ? html`<div class="list" role="list">
                ${section.items.map(
                  (item) => {
                    const { status, spoken } = this.renderStatus(item, "end");
                    return html`<ha-md-list-item
                      type="link"
                      href=${item.path}
                      class=${this.itemClass(item)}
                      aria-current=${item.active ? "page" : "false"}
                      @click=${(event: MouseEvent) => followLink(this, event, item.path)}
                      >${item.icon === undefined ? undefined : html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`}<span slot="headline">${item.title}${spoken}</span>${status}</ha-md-list-item
                    >`;
                  },
                )}
              </div>`
            : // fallback: plain links, when ha-md-list-item is not defined.
              html`<ul>
                ${section.items.map(
                  (item) => {
                    const { status, spoken } = this.renderStatus(item, undefined);
                    return html`<li>
                      <a href=${item.path} class=${this.itemClass(item)} aria-current=${item.active ? "page" : "false"} @click=${(event: MouseEvent) => followLink(this, event, item.path)}
                        >${renderIcon(item.icon)}<span class="title">${item.title}${spoken}</span>${status}</a
                      >
                    </li>`;
                  },
                )}
              </ul>`}`,
      )}
    </nav>`;
  }
}

defineElement("vtherm-side-menu", VThermSideMenu);
