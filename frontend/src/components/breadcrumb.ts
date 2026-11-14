import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { Crumb } from "../navigation.ts";
import { followLink } from "./events.ts";

/** The number of segments that the breadcrumb keeps on a narrow screen. */
export const NARROW_SEGMENTS = 2;

/** The breadcrumb: the tab, the thermostat and the page. Every segment but the last is a link. On a narrow screen it keeps its last two segments. */
export class VThermBreadcrumb extends LitElement {
  static override properties = {
    crumbs: { attribute: false },
    narrow: { type: Boolean },
    label: { type: String },
  };

  static override styles = css`
    :host {
      display: block;
      padding: 8px 16px;
      color: var(--secondary-text-color);
      background-color: var(--primary-background-color);
      border-bottom: 1px solid var(--divider-color);
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li + li::before {
      content: ">";
      margin-right: 6px;
    }
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    [aria-current="page"] {
      color: var(--primary-text-color);
    }
  `;

  /** The segments. */
  declare crumbs: readonly Crumb[];

  /** Whether the screen is narrow. */
  declare narrow: boolean;

  /** The accessible name of the breadcrumb. */
  declare label: string;

  constructor() {
    super();
    this.crumbs = [];
    this.narrow = false;
    this.label = "";
  }

  protected override render(): TemplateResult {
    const shown = this.narrow ? this.crumbs.slice(-NARROW_SEGMENTS) : this.crumbs;
    return html`<nav aria-label=${this.label}>
      <ol>
        ${shown.map((crumb) =>
          crumb.path === undefined
            ? html`<li aria-current="page">${crumb.label}</li>`
            : html`<li><a href=${crumb.path} @click=${(event: MouseEvent) => followLink(this, event, crumb.path as string)}>${crumb.label}</a></li>`,
        )}
      </ol>
    </nav>`;
  }
}

customElements.define("vtherm-breadcrumb", VThermBreadcrumb);
