import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { NavTab } from "../navigation.ts";
import { renderIcon } from "./icon.ts";
import { followLink } from "./events.ts";
import { defineElement } from "./define.ts";

/**
 * The tabs of the top bar.
 *
 * The tabs of the zone `start` scroll sideways when they do not fit. The tabs of the zone `end`, which is the configuration
 * gear alone, stay visible. A tab of the zone `end` that has an icon shows the icon only, with its title as accessible name and tooltip.
 */
export class VThermTopBar extends LitElement {
  static override properties = {
    tabs: { attribute: false },
    heading: { type: String },
  };

  static override styles = css`
    :host {
      display: flex;
      align-items: stretch;
      background-color: var(--app-header-background-color);
      color: var(--app-header-text-color);
      min-height: 48px;
    }
    .heading {
      display: flex;
      align-items: center;
      padding: 0 16px;
      font-size: 20px;
      font-weight: 500;
      white-space: nowrap;
    }
    nav {
      display: flex;
      align-items: stretch;
    }
    nav.start {
      flex: 1 1 auto;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    nav.end {
      flex: 0 0 auto;
    }
    a {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 16px;
      color: inherit;
      text-decoration: none;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      opacity: 0.8;
    }
    a:hover {
      opacity: 1;
    }
    a[aria-selected="true"] {
      opacity: 1;
      border-bottom-color: var(--app-header-text-color);
    }
    a:focus-visible {
      outline: 2px solid var(--app-header-text-color);
      outline-offset: -4px;
    }
  `;

  /** The tabs, from the navigation. */
  declare tabs: readonly NavTab[];

  /** The title of the dashboard, shown on the left. */
  declare heading: string;

  constructor() {
    super();
    this.tabs = [];
    this.heading = "";
  }

  private renderTab(tab: NavTab): TemplateResult {
    const iconOnly = tab.zone === "end" && tab.icon !== undefined;
    return html`<a
      role="tab"
      href=${tab.path}
      aria-selected=${tab.active ? "true" : "false"}
      aria-current=${tab.active ? "page" : "false"}
      aria-label=${iconOnly ? tab.title : ""}
      title=${iconOnly ? tab.title : ""}
      @click=${(event: MouseEvent) => followLink(this, event, tab.path)}
      >${renderIcon(tab.icon)}${iconOnly ? undefined : tab.title}</a
    >`;
  }

  protected override render(): TemplateResult {
    return html`<div class="heading">${this.heading}</div>
      <nav class="start" role="tablist">${this.tabs.filter((tab) => tab.zone === "start").map((tab) => this.renderTab(tab))}</nav>
      <nav class="end" role="tablist">${this.tabs.filter((tab) => tab.zone === "end").map((tab) => this.renderTab(tab))}</nav>`;
  }
}

defineElement("vtherm-top-bar", VThermTopBar);
