import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { CentralContext, ConfigValues, Hass, ThermostatType } from "@vtherm/dashboard-sdk";

import type { DashboardRegistry } from "../registry.ts";
import "./widgets.ts";
import { defineElement } from "./define.ts";

/** The registry that the dashboard put in the page, or undefined before the plugins are loaded. */
function installedRegistry(): DashboardRegistry | undefined {
  return (globalThis as { VThermUiPluginRegistry?: DashboardRegistry }).VThermUiPluginRegistry;
}

/**
 * A page made of the widgets of a hook: the Overview page shows `global_widget`, and the overview of a thermostat shows `thermostat_widget`.
 *
 * The native pages are made with it, so the widgets of the plugins appear in them in the order that their placements gave.
 * A widget whose visibility condition is false is not shown.
 */
export class VThermWidgetsPage extends LitElement {
  static override properties = {
    hook: { type: String },
    hass: { attribute: false },
    thermostatId: { type: String },
    thermostatType: { type: String },
    values: { attribute: false },
    centralValues: { attribute: false },
    central: { attribute: false },
    narrow: { type: Boolean },
    language: { type: String },
    emptyMessage: { type: String },
  };

  static override styles = css`
    :host {
      display: block;
    }
    .empty {
      margin: 0;
      padding: 16px;
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
  `;

  /** The hook whose widgets are shown. */
  declare hook: "global_widget" | "thermostat_widget";

  /** The state of Home Assistant. */
  declare hass: Hass | undefined;

  /** The thermostat of the page, for `thermostat_widget`. */
  declare thermostatId: string;

  /** The type of the thermostat, read by the visibility conditions. */
  declare thermostatType: ThermostatType;

  /** The values of the configuration of the thermostat, read by the visibility conditions. */
  declare values: ConfigValues;

  /** The values of the central configuration, read by the visibility conditions. */
  declare centralValues: ConfigValues;

  /** The central configuration, given to the widgets of the Overview page and to their visibility conditions. Undefined when there is none. */
  declare central: CentralContext | undefined;

  /** Whether the screen is narrow, given to the grid and to every widget. */
  declare narrow: boolean;

  /** Changes with the language of the user, given to every widget so that it draws its texts again. */
  declare language: string;

  /** The message shown instead of a blank page when no widget is visible. Without it, nothing is shown. */
  declare emptyMessage: string;

  constructor() {
    super();
    this.hook = "global_widget";
    this.hass = undefined;
    this.thermostatId = "";
    this.thermostatType = "over_switch";
    this.values = {};
    this.centralValues = {};
    this.central = undefined;
    this.narrow = false;
    this.language = "";
    this.emptyMessage = "";
  }

  protected override render(): TemplateResult {
    const registry = installedRegistry();
    if (registry === undefined || this.hass === undefined) {
      return html``;
    }
    const global = this.hook === "global_widget";
    const central = global && this.central !== undefined ? { central: this.central } : {};
    const context = global
      ? { hass: this.hass, ...central }
      : { hass: this.hass, thermostatId: this.thermostatId, thermostatType: this.thermostatType, values: this.values, centralValues: this.centralValues };
    const entries = registry.engine.visible(registry.engine.widgets(this.hook), () => context);
    if (entries.length === 0 && this.emptyMessage !== "") {
      return html`<p class="empty" role="status">${this.emptyMessage}</p>`;
    }
    return html`<vtherm-widgets .entries=${entries} .hass=${this.hass} .thermostatId=${global ? "" : this.thermostatId} .central=${global ? this.central : undefined} .values=${global ? undefined : this.values} .centralValues=${global ? undefined : this.centralValues} .narrow=${this.narrow} .language=${this.language}></vtherm-widgets>`;
  }
}

defineElement("vtherm-widgets-page", VThermWidgetsPage);
