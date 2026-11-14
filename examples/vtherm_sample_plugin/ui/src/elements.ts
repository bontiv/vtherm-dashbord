import type { ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, html } from "lit";
import type { TemplateResult } from "lit";
import { t } from "./translations";

/** The section that the plugin adds to the configuration of a thermostat. The dashboard sets its properties. */
export class SampleTab extends LitElement {
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
    const state = this.hass?.states[this.thermostatId]?.state ?? t("widget.unknown");
    return html`<p>${t("widget.state", { name: this.thermostatId, state })}</p>`;
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
