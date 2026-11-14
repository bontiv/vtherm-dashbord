import { LitElement, html } from "lit";
import type { TemplateResult } from "lit";

import type { ConfigValues, Hass, ThermostatType } from "@vtherm/dashboard-sdk";

import type { DashboardRegistry } from "../registry.ts";
import "./widgets.ts";

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
  };

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

  constructor() {
    super();
    this.hook = "global_widget";
    this.hass = undefined;
    this.thermostatId = "";
    this.thermostatType = "over_switch";
    this.values = {};
    this.centralValues = {};
  }

  protected override render(): TemplateResult {
    const registry = installedRegistry();
    if (registry === undefined || this.hass === undefined) {
      return html``;
    }
    const context = { hass: this.hass, thermostatId: this.thermostatId, thermostatType: this.thermostatType, values: this.values, centralValues: this.centralValues };
    const entries = registry.engine.visible(registry.engine.widgets(this.hook), () => (this.hook === "global_widget" ? { hass: this.hass as Hass } : context));
    return html`<vtherm-widgets .entries=${entries} .hass=${this.hass} .thermostatId=${this.hook === "thermostat_widget" ? this.thermostatId : ""}></vtherm-widgets>`;
  }
}

customElements.define("vtherm-widgets-page", VThermWidgetsPage);
