import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { Hass, PlacedEntry } from "@vtherm/dashboard-sdk";

import "./contribution-host.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";

/** A grid of widgets: the contributions of the hook `global_widget` or `thermostat_widget`, each shown with its properties. */
export class VThermWidgets extends LitElement {
  static override properties = {
    entries: { attribute: false },
    hass: { attribute: false },
    thermostatId: { type: String },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    .widget {
      overflow: hidden;
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
  `,
  ];

  /** The widgets to show, in order. */
  declare entries: readonly PlacedEntry[];

  /** The state of Home Assistant, given to every widget. */
  declare hass: Hass | undefined;

  /** The thermostat of a thermostat widget. */
  declare thermostatId: string;

  constructor() {
    super();
    this.entries = [];
    this.hass = undefined;
    this.thermostatId = "";
  }

  protected override render(): TemplateResult {
    const props = { hass: this.hass, ...(this.thermostatId === "" ? {} : { thermostatId: this.thermostatId }) };
    return html`${this.entries.map(
      (entry) =>
        html`<div class="widget"><vtherm-contribution .tag=${(entry.contribution as { component: string }).component} .contributionId=${entry.id} .props=${props}></vtherm-contribution></div>`,
    )}`;
  }
}

defineElement("vtherm-widgets", VThermWidgets);
