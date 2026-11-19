import { getEntryEntities } from "@vtherm/dashboard-sdk";
import type { ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";
import { t } from "./translations";

/** The section that the plugin adds to the configuration of a thermostat. The dashboard sets its properties. */
export class SampleTab extends LitElement {
  // Use the variables of the theme of Home Assistant, never a color of your own.
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
  `;
  static override properties = { hass: { attribute: false }, thermostatId: { type: String }, values: { attribute: false }, language: { type: String } };
  declare hass: Hass | undefined;
  declare thermostatId: string;
  declare values: ConfigValues;
  /** Changes with the language of the user, so that the texts are drawn again. */
  declare language: string;

  constructor() {
    super();
    this.thermostatId = "";
    this.values = {};
    this.language = "";
  }

  protected override render(): TemplateResult {
    const name = String(this.values["name"] ?? this.thermostatId);
    const cycle = this.values["cycle_min"];
    return html`<p>${cycle === undefined ? t("tab.no_cycle", { name }) : t("tab.cycle", { name, minutes: Number(cycle) })}</p>`;
  }
}

/** The section that takes the place of the native one. */
export class SampleSyncTab extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
  `;
  static override properties = { language: { type: String } };
  declare language: string;

  constructor() {
    super();
    this.language = "";
  }

  protected override render(): TemplateResult {
    return html`<h2>${t("sync.title")}</h2>
      <p>${t("sync.text")}</p>`;
  }
}

/** A widget of the overview of a thermostat. */
export class SampleStatusWidget extends LitElement {
  static override properties = { hass: { attribute: false }, thermostatId: { type: String }, language: { type: String } };
  declare hass: Hass | undefined;
  declare thermostatId: string;
  declare language: string;

  constructor() {
    super();
    this.thermostatId = "";
    this.language = "";
  }

  protected override render(): TemplateResult {
    // thermostatId is the configuration entry of the thermostat, not its climate entity: find the entity in the registries of hass.
    const climate = this.hass === undefined ? undefined : getEntryEntities(this.hass, this.thermostatId).climate;
    const state = climate === undefined ? undefined : this.hass?.states[climate]?.state;
    return html`<p>${t("widget.state", { name: climate ?? this.thermostatId, state: state ?? t("widget.unknown") })}</p>`;
  }
}

/** The widget that the other plugin of the sample offers, and that the sample removes. */
export class SamplePromoWidget extends LitElement {
  protected override render(): TemplateResult {
    return html`<p>${t("promo.text")}</p>`;
  }
}

/** Define an element once. A plugin can be imported again in a test or after a hot update. */
export function define(tag: string, element: CustomElementConstructor): void {
  if (customElements.get(tag) === undefined) {
    customElements.define(tag, element);
  }
}
