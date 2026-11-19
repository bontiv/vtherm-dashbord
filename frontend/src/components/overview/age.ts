import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../define.ts";
import { MISSING, formatAge } from "./format.ts";

/** How often an age is written again. */
const REFRESH_MS = 30_000;

/**
 * The age of a date, such as the last measure of a sensor: "3 minutes ago", with the full date in its tooltip. It is written again every
 * 30 s while it is in the page. It can be reached with the keyboard, so that its tooltip can be read.
 */
export class VThermAge extends LitElement {
  static override properties = {
    hass: { attribute: false },
    date: { attribute: false },
    now: { attribute: false },
  };

  static override styles = css`
    :host {
      display: inline;
      min-width: 0;
    }
    time {
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
  `;

  /** The state of Home Assistant, for the language. */
  declare hass: Hass | undefined;

  /** The date: an ISO 8601 text, milliseconds since the epoch, or a date. */
  declare date: string | number | Date | undefined;

  /** The clock, replaced in the tests. */
  declare now: () => number;

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.date = undefined;
    this.now = Date.now;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.timer = setInterval(() => this.requestUpdate(), REFRESH_MS);
  }

  override disconnectedCallback(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    super.disconnectedCallback();
  }

  protected override render(): TemplateResult {
    const age = formatAge(this.hass, this.date, this.now());
    if (age === undefined) {
      return html`<span>${MISSING}</span>`;
    }
    return html`<time datetime=${age.iso} title=${age.title} aria-label=${`${age.text}, ${age.title}`} tabindex="0">${age.text}</time>`;
  }
}

defineElement("vtherm-age", VThermAge);
