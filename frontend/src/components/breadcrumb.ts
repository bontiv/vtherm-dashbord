import { LitElement, css, html, unsafeCSS } from "lit";
import type { TemplateResult } from "lit";

import type { Crumb } from "../navigation.ts";
import { followLink } from "./events.ts";
import { defineElement } from "./define.ts";
import { NARROW_QUERY, TOUCH_TARGET, narrowStyles } from "./narrow-styles.ts";

/** The number of segments that the breadcrumb keeps on a narrow screen. */
export const NARROW_SEGMENTS = 2;

/** The breadcrumb: the tab, the thermostat and the page. Every segment but the last is a link. On a narrow screen it keeps its last two segments. */
// Exception to the rule "a component of Home Assistant first": Home Assistant has no public component for a breadcrumb, so it is
// drawn with plain links.
export class VThermBreadcrumb extends LitElement {
  static override properties = {
    crumbs: { attribute: false },
    narrow: { type: Boolean },
    label: { type: String },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: block;
      /* The breadcrumb is a flex item of the toolbar: without this, a long segment would widen it past the screen. */
      min-width: 0;
      padding: 8px 16px;
      color: var(--secondary-text-color);
      background-color: var(--primary-background-color);
      border-bottom: 1px solid var(--divider-color);
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
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
    @media ${unsafeCSS(NARROW_QUERY)} {
      /* The segments hold on one row: a link keeps its width up to half of the row, the last segment takes the rest and ends with an
         ellipsis. The full name stays in the title of the page. */
      ol {
        flex-wrap: nowrap;
      }
      li {
        flex: 0 0 auto;
        min-width: 0;
        max-width: 50%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* The segment of a link is a flex box and the link a block in it: the text of the link ends with the ellipsis, and the link keeps
         the height of a touch target. */
      li:has(> a) {
        display: flex;
        align-items: center;
      }
      li > a.touch-target {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: ${unsafeCSS(TOUCH_TARGET)}px;
      }
      li[aria-current="page"] {
        flex: 0 1 auto;
        max-width: none;
      }
    }
  `,
  ];

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
            : html`<li><a class="touch-target" href=${crumb.path} @click=${(event: MouseEvent) => followLink(this, event, crumb.path as string)}>${crumb.label}</a></li>`,
        )}
      </ol>
    </nav>`;
  }
}

defineElement("vtherm-breadcrumb", VThermBreadcrumb);
