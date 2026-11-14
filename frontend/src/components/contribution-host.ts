import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";

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
  };

  static override styles = css`
    :host {
      display: block;
    }
    .error {
      padding: 16px;
      color: var(--error-color);
    }
  `;

  /** The tag name of the custom element to show. */
  declare tag: string;

  /** The identifier of the contribution, for the message when it cannot be shown. */
  declare contributionId: string;

  /** The properties to set on the element. */
  declare props: Readonly<Record<string, unknown>>;

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
  }

  protected override render(): TemplateResult {
    return this.failure === undefined
      ? html`<div id="mount"></div>`
      : html`<div class="error" role="alert">${t("shell.page.error", { id: this.contributionId, message: this.failure })}</div>`;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("tag") || changed.has("contributionId")) {
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
