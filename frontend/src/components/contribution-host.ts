import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";
import { isDefined, renderAlert } from "./ha.ts";
import { narrowStyles } from "./narrow-styles.ts";

/** The feature of a configuration section, and the switch that turns it on, which the dashboard draws above the section. */
export interface FeatureControl {
  /** The title of the section. */
  readonly title: string;
  /** The explanation of the feature, from the catalog of the plugin. */
  readonly intro: string;
  /** Whether the feature is on in the draft. */
  readonly on: boolean;
  /** Turn the feature on or off in the draft. */
  toggle(on: boolean): void;
  /**
   * The save actions of the section, drawn at the foot of the card of the switch while the feature is off: the component, which draws
   * them at the foot of its own card, is not shown then.
   */
  readonly actions?: TemplateResult | undefined;
}

/**
 * Shows the custom element of a contribution and gives it its properties.
 *
 * The element is created by its tag name, and its properties are set before it is added to the page, so its first render
 * already has them. The properties are set again when they change. A contribution that cannot be shown is replaced by a message,
 * so one plugin cannot break the page.
 */
export class VThermContributionHost extends LitElement {
  static override properties = {
    language: { type: String },
    tag: { type: String },
    contributionId: { type: String },
    props: { attribute: false },
    feature: { attribute: false },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: block;
      }
      .error {
        padding: 16px;
        color: var(--error-color);
      }
      /* As wide as the card of a native section below it. */
      .feature {
        display: block;
        max-width: 1240px;
        margin: 16px 16px 0;
      }
      .feature-content {
        padding: 16px;
      }
      .feature h2 {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 500;
      }
      .intro {
        margin: 0 0 16px;
        color: var(--secondary-text-color);
      }
      .switch {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      /* fallback: the card of the feature when ha-card is not defined. */
      div.feature {
        background-color: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 12px);
      }
    `,
  ];

  /** The tag name of the custom element to show. */
  declare tag: string;

  /** The identifier of the contribution, for the message when it cannot be shown. */
  declare contributionId: string;

  /** The properties to set on the element. */
  declare props: Readonly<Record<string, unknown>>;

  /** The feature of the section, when it declares one: while it is off, the element is not shown. */
  declare feature: FeatureControl | undefined;

  /** The element that is shown, if any. */
  element: HTMLElement | undefined;

  private failure: string | undefined;

  /** The language of the user. It only changes to make the component draw its texts again. */
  declare language: string;

  constructor() {
    super();
    this.language = "";
    this.tag = "";
    this.contributionId = "";
    this.props = {};
    this.feature = undefined;
  }

  /** Whether the element of the contribution is shown: always, unless its feature is off. */
  private get shown(): boolean {
    return this.feature === undefined || this.feature.on;
  }

  private renderSwitch(feature: FeatureControl): TemplateResult {
    const label = t("feature.switch", { title: feature.title });
    const toggle = (event: Event) => feature.toggle((event.target as HTMLInputElement).checked);
    if (isDefined("ha-switch")) {
      return html`<label class="switch touch-target"><span>${label}</span><ha-switch .checked=${feature.on} aria-label=${label} @change=${toggle}></ha-switch></label>`;
    }
    // fallback: a checkbox, when ha-switch is not defined.
    return html`<label class="switch touch-target"><span>${label}</span><input type="checkbox" .checked=${feature.on} @change=${toggle} /></label>`;
  }

  /**
   * The switch of the feature: alone in a card with the explanation and the save actions while the feature is off, above the section
   * while it is on.
   */
  private renderFeature(feature: FeatureControl): TemplateResult {
    const content = feature.on
      ? this.renderSwitch(feature)
      : html`<h2>${feature.title}</h2>
          <p class="intro">${feature.intro}</p>
          ${this.renderSwitch(feature)}`;
    const actions = feature.on ? undefined : feature.actions;
    return isDefined("ha-card")
      ? html`<ha-card class="feature"><div class="feature-content">${content}</div>${actions}</ha-card>`
      : html`<div class="feature"><div class="feature-content">${content}</div>${actions}</div>`;
  }

  protected override render(): TemplateResult {
    const feature = this.feature === undefined ? undefined : this.renderFeature(this.feature);
    if (this.failure !== undefined) {
      return html`${feature}${renderAlert("error", t("shell.page.error", { id: this.contributionId, message: this.failure }), "error")}`;
    }
    return html`${feature}${this.shown ? html`<div id="mount"></div>` : undefined}`;
  }

  protected override updated(changed: PropertyValues): void {
    if (!this.shown) {
      // The section of a feature that is off is not shown: its element is created again once the feature is on.
      this.element?.remove();
      this.element = undefined;
      return;
    }
    if (changed.has("tag") || changed.has("contributionId") || (this.element === undefined && this.failure === undefined)) {
      this.element?.remove();
      this.element = undefined;
      this.failure = undefined;
      try {
        if (customElements.get(this.tag) === undefined) {
          throw new Error(`The custom element <${this.tag}> is not defined. The plugin must define it before it registers.`);
        }
        const element = document.createElement(this.tag);
        Object.assign(element, this.props);
        this.element = element;
        this.renderRoot.querySelector("#mount")?.append(element);
      } catch (error) {
        this.failure = error instanceof Error ? error.message : String(error);
        this.requestUpdate();
      }
      return;
    }
    if (changed.has("props") && this.element !== undefined) {
      Object.assign(this.element, this.props);
    }
  }
}

defineElement("vtherm-contribution", VThermContributionHost);
