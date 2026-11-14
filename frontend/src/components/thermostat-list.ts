import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { buildPath } from "../router.ts";
import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { ThermostatInfo } from "../navigation.ts";
import { t } from "../shell-translations.ts";
import { followLink } from "./events.ts";

/** The list of the thermostats, shown in full width in the Thermostats tab, with a message when there is none. */
export class VThermThermostatList extends LitElement {
  static override properties = {
    language: { type: String },
    thermostats: { attribute: false },
  };

  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
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
    .empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
  `;

  /** The thermostats. */
  declare thermostats: readonly ThermostatInfo[];

  /** The language of the user. It only changes to make the component draw its texts again. */
  declare language: string;

  constructor() {
    super();
    this.language = "";
    this.thermostats = [];
  }

  protected override render(): TemplateResult {
    if (this.thermostats.length === 0) {
      return html`<div class="empty" role="status">${t("shell.thermostats.empty")}</div>`;
    }
    return html`<ul>
      ${this.thermostats.map((thermostat) => {
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
}

customElements.define("vtherm-thermostat-list", VThermThermostatList);
