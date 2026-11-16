import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import type { Hass } from "@vtherm/dashboard-sdk";

import type { NavTab } from "../navigation.ts";
import { renderIcon } from "./icon.ts";
import { followLink } from "./events.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";

/** The event that opens the side menu of Home Assistant. Its own menu button sends it. */
export const TOGGLE_HA_MENU_EVENT = "hass-toggle-menu";

/**
 * The tabs of the top bar.
 *
 * The tabs of the zone `start` scroll sideways when they do not fit, with a shade on the side where tabs are hidden, and the active
 * tab is brought into view. The tabs of the zone `end`, which is the configuration gear alone, stay visible. A tab of the zone `end`
 * that has an icon shows the icon only, with its title as accessible name and tooltip.
 *
 * On a narrow screen (`compact`), the title is hidden but stays for screen readers, so that the tabs have the whole width. When Home
 * Assistant hides its side menu (`haMenu`), the bar starts with the button that opens it: the `ha-menu-button` of Home Assistant when
 * the page has it, else a button that sends the same event.
 */
export class VThermTopBar extends LitElement {
  static override properties = {
    tabs: { attribute: false },
    heading: { type: String },
    compact: { type: Boolean, reflect: true },
    haMenu: { type: Boolean, attribute: "ha-menu" },
    haMenuLabel: { type: String, attribute: false },
    hass: { attribute: false },
    moreStart: { state: true },
    moreEnd: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: flex;
        align-items: stretch;
        background-color: var(--app-header-background-color);
        color: var(--app-header-text-color);
        min-height: 48px;
        padding-left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
        padding-right: var(--safe-area-inset-right, env(safe-area-inset-right, 0px));
      }
      .heading {
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-size: 20px;
        font-weight: 500;
        white-space: nowrap;
      }
      .ha-menu {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
      }
      .ha-menu button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        cursor: pointer;
      }
      .scroller {
        position: relative;
        display: flex;
        flex: 1 1 auto;
        min-width: 0;
      }
      .scroller::before,
      .scroller::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        width: 24px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .scroller::before {
        left: 0;
        background: linear-gradient(to right, var(--app-header-background-color), transparent);
      }
      .scroller::after {
        right: 0;
        background: linear-gradient(to left, var(--app-header-background-color), transparent);
      }
      .scroller.more-start::before,
      .scroller.more-end::after {
        opacity: 1;
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
      a:focus-visible,
      .ha-menu button:focus-visible {
        outline: 2px solid var(--app-header-text-color);
        outline-offset: -4px;
      }
      :host([compact]) .heading {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
        border: 0;
      }
      :host([compact]) a {
        padding: 0 12px;
      }
    `,
  ];

  /** The tabs, from the navigation. */
  declare tabs: readonly NavTab[];

  /** The title of the dashboard, shown on the left, and only read by screen readers on a narrow screen. */
  declare heading: string;

  /** Whether the screen is narrow. */
  declare compact: boolean;

  /** Whether Home Assistant hides its side menu, so that the bar must offer the button that opens it. */
  declare haMenu: boolean;

  /** The accessible name of the button that opens the side menu of Home Assistant, when the bar draws its own. */
  declare haMenuLabel: string;

  /** The state of Home Assistant, which its `ha-menu-button` needs. */
  declare hass: Hass | undefined;

  /** Whether tabs are hidden on the left of the zone `start`. */
  declare moreStart: boolean;

  /** Whether tabs are hidden on the right of the zone `start`. */
  declare moreEnd: boolean;

  private resizeObserver: ResizeObserver | undefined;
  private activeTabId: string | undefined;
  /** The active tab must be brought into view again when the tabs change size, until the user scrolls the bar. */
  private revealPending = false;

  constructor() {
    super();
    this.tabs = [];
    this.heading = "";
    this.compact = false;
    this.haMenu = false;
    this.haMenuLabel = "";
    this.hass = undefined;
    this.moreStart = false;
    this.moreEnd = false;
  }

  override disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    super.disconnectedCallback();
  }

  private get startNav(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>("nav.start");
  }

  /** Bring the active tab of the zone `start` into view. */
  private revealActiveTab(): void {
    this.startNav?.querySelector<HTMLElement>('a[aria-selected="true"]')?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }

  /** The tabs changed size, for example when the icons of Home Assistant loaded: reveal the active tab again, and update the shades. */
  private readonly onResize = (): void => {
    if (this.revealPending) {
      this.revealActiveTab();
    }
    this.updateScrollHints();
  };

  /** The user scrolls the tabs: the bar no longer moves them by itself. */
  private readonly onUserScroll = (): void => {
    this.revealPending = false;
  };

  /** Show a shade on each side of the zone `start` where tabs are out of view. */
  readonly updateScrollHints = (): void => {
    const nav = this.startNav;
    if (nav === null) {
      return;
    }
    this.moreStart = nav.scrollLeft > 1;
    this.moreEnd = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1;
  };

  private readonly openHaMenu = (): void => {
    this.dispatchEvent(new CustomEvent(TOGGLE_HA_MENU_EVENT, { bubbles: true, composed: true }));
  };

  protected override firstUpdated(): void {
    const nav = this.startNav;
    if (nav !== null && typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(nav);
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const active = this.tabs.find((tab) => tab.active && tab.zone === "start")?.id;
    // The size of each tab is watched, since a tab grows when its icon loads.
    this.startNav?.querySelectorAll("a").forEach((tab) => this.resizeObserver?.observe(tab));
    if (active !== this.activeTabId) {
      this.activeTabId = active;
      // A direct link can open a tab that is out of view on a narrow screen: bring it in.
      this.revealPending = true;
      this.revealActiveTab();
    }
    this.updateScrollHints();
  }

  private renderHaMenu(): TemplateResult | undefined {
    if (!this.haMenu) {
      return undefined;
    }
    if (customElements.get("ha-menu-button") !== undefined) {
      return html`<div class="ha-menu"><ha-menu-button .hass=${this.hass} .narrow=${true}></ha-menu-button></div>`;
    }
    return html`<div class="ha-menu">
      <button aria-label=${this.haMenuLabel} title=${this.haMenuLabel} @click=${this.openHaMenu}>${renderIcon("mdi:menu")}</button>
    </div>`;
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
    const hints = `scroller${this.moreStart ? " more-start" : ""}${this.moreEnd ? " more-end" : ""}`;
    return html`${this.renderHaMenu()}<div class="heading">${this.heading}</div>
      <div class=${hints}>
        <nav
          class="start"
          role="tablist"
          @scroll=${this.updateScrollHints}
          @pointerdown=${this.onUserScroll}
          @wheel=${this.onUserScroll}
          @touchstart=${this.onUserScroll}
        >${this.tabs.filter((tab) => tab.zone === "start").map((tab) => this.renderTab(tab))}</nav>
      </div>
      <nav class="end" role="tablist">${this.tabs.filter((tab) => tab.zone === "end").map((tab) => this.renderTab(tab))}</nav>`;
  }
}

defineElement("vtherm-top-bar", VThermTopBar);
