import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../define.ts";
import { renderProgress } from "../ha.ts";
import { narrowStyles } from "../narrow-styles.ts";
import { MISSING } from "./format.ts";
import type { WidgetText } from "./format.ts";

/** The states of a card: its values are shown, it waits for them, it has none, or its source is unavailable. */
export type WidgetCardStatus = "ready" | "loading" | "empty" | "unavailable";

/**
 * The card of a native widget: its title, then its body. The grid of the widgets draws the border around it, so the card draws none.
 *
 * - `ready`: the content of the card, in its slot.
 * - `loading`: the title and an indicator of progress, without a value.
 * - `empty`: the title and a message that says why there is nothing, `message` or "No data".
 * - `unavailable`: the title and "—", said "unavailable" to a screen reader.
 */
export class VThermWidgetCard extends LitElement {
  static override properties = {
    heading: { type: String },
    status: { type: String },
    message: { type: String },
    text: { attribute: false },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        height: 100%;
        color: var(--primary-text-color);
      }
      section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-sizing: border-box;
        min-width: 0;
        height: 100%;
        padding: 16px;
      }
      h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
        overflow-wrap: anywhere;
      }
      .state {
        color: var(--secondary-text-color);
        overflow-wrap: anywhere;
      }
      .missing {
        font-size: 1.5rem;
        color: var(--secondary-text-color);
      }
    `,
  ];

  /** The translated title of the widget, from the key `widget.<name>.title` of its plugin. */
  declare heading: string;

  /** The state of the card. */
  declare status: WidgetCardStatus;

  /** Why the card is empty. Without it, "No data". */
  declare message: string;

  /** The translations of the plugin of the widget, for the texts of the states. */
  declare text: WidgetText;

  constructor() {
    super();
    this.heading = "";
    this.status = "ready";
    this.message = "";
    this.text = (key) => key;
  }

  private renderBody(): TemplateResult {
    switch (this.status) {
      case "loading":
        return html`<div class="state" aria-live="polite">${renderProgress(this.text("widget.loading"))}</div>`;
      case "empty":
        return html`<p class="state">${this.message === "" ? this.text("widget.no_data") : this.message}</p>`;
      case "unavailable":
        return html`<p class="state"><span class="missing" aria-hidden="true">${MISSING}</span> <span>${this.text("widget.unavailable")}</span></p>`;
      default:
        return html`<slot></slot>`;
    }
  }

  protected override render(): TemplateResult {
    return html`<section aria-busy=${this.status === "loading" ? "true" : "false"}>
      ${this.heading === "" ? undefined : html`<h3>${this.heading}</h3>`} ${this.renderBody()}
    </section>`;
  }
}

defineElement("vtherm-widget-card", VThermWidgetCard);
