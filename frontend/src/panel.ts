import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { Hass } from "@vtherm/dashboard-sdk";

import { DASHBOARD_VERSION } from "./version.ts";

/** The tag name of the panel. The integration registers the panel with this name. */
export const PANEL_ELEMENT = "vtherm-dashboard-panel";

/** The panel "Home confort", which Home Assistant shows in its side menu. */
export class VThermDashboardPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
  };

  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
      background-color: var(--primary-background-color);
    }
  `;

  /** The state of Home Assistant, set by Home Assistant. */
  declare hass: Hass;

  /** Whether the screen is narrow, set by Home Assistant. */
  declare narrow: boolean;

  protected override render(): TemplateResult {
    return html`<h1>Home confort</h1>
      <p>v${DASHBOARD_VERSION}</p>`;
  }
}

customElements.define(PANEL_ELEMENT, VThermDashboardPanel);
