import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { NavSection, ThermostatInfo } from "../navigation.ts";
import { t } from "../shell-translations.ts";
import { followLink } from "./events.ts";
import { renderIcon } from "./icon.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";

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
    selected: { type: String },
    label: { type: String },
  };

  static override styles = [
    narrowStyles,
    css`
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
  `,
  ];

  /** The sections of the menu. */
  declare sections: readonly NavSection[];

  /** The thermostats to choose from. The selector is shown when there is a list and `selected` is set. */
  declare thermostats: readonly ThermostatInfo[];

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
    this.selected = "";
    this.label = "";
  }

  private renderSelector(): TemplateResult | undefined {
    if (this.selected === "" || this.thermostats.length === 0) {
      return undefined;
    }
    return html`<select
      aria-label=${t("shell.thermostats.select")}
      @change=${(event: Event) => this.dispatchEvent(new CustomEvent<string>(THERMOSTAT_SELECTED_EVENT, { detail: (event.target as HTMLSelectElement).value, bubbles: true, composed: true }))}
    >
      ${this.thermostats.map((thermostat) => html`<option value=${thermostat.id} ?selected=${thermostat.id === this.selected}>${thermostat.name}</option>`)}
    </select>`;
  }

  protected override render(): TemplateResult {
    return html`<nav aria-label=${this.label}>
      ${this.renderSelector()}
      ${this.sections.map(
        (section) => html`${section.heading === undefined ? undefined : html`<h2>${section.heading}</h2>`}
          <ul>
            ${section.items.map(
              (item) => html`<li>
                <a href=${item.path} aria-current=${item.active ? "page" : "false"} @click=${(event: MouseEvent) => followLink(this, event, item.path)}>${renderIcon(item.icon)}${item.title}</a>
              </li>`,
            )}
          </ul>`,
      )}
    </nav>`;
  }
}

defineElement("vtherm-side-menu", VThermSideMenu);
