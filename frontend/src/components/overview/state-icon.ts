import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../define.ts";
import { renderIcon } from "../icon.ts";

/** The tone of a state: the color of the theme of its icon. The icon and the text always say the state too. */
export type StateTone = "normal" | "active" | "warning" | "error" | "success";

/**
 * The icon of a state with its text, for example "Window open". It can be reached with the keyboard, and its tooltip shows on the focus
 * as on the pointer. A state of `warning` or `error` is an alert: a screen reader announces it.
 */
export class VThermStateIcon extends LitElement {
  static override properties = {
    icon: { type: String },
    label: { type: String },
    tooltip: { type: String },
    tone: { type: String },
  };

  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
      min-width: 0;
      max-width: 100%;
    }
    .state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      overflow-wrap: anywhere;
      color: var(--primary-text-color);
      border-radius: 4px;
    }
    .state:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .icon {
      flex: none;
      color: var(--secondary-text-color);
    }
    .active .icon {
      color: var(--primary-color);
    }
    .warning .icon {
      color: var(--warning-color);
    }
    .error .icon {
      color: var(--error-color);
    }
    .success .icon {
      color: var(--success-color);
    }
    .tooltip {
      display: none;
      position: absolute;
      z-index: 1;
      top: 100%;
      left: 0;
      max-width: min(280px, 80vw);
      margin-top: 4px;
      padding: 4px 8px;
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      overflow-wrap: anywhere;
    }
    .state:hover + .tooltip,
    .state:focus + .tooltip {
      display: block;
    }
  `;

  /** The icon, for example `mdi:window-open`. */
  declare icon: string;

  /** The state, translated: the text shown next to the icon, and its accessible name. */
  declare label: string;

  /** More about the state, translated, shown in the tooltip. */
  declare tooltip: string;

  /** The color of the icon. */
  declare tone: StateTone;

  constructor() {
    super();
    this.icon = "";
    this.label = "";
    this.tooltip = "";
    this.tone = "normal";
  }

  protected override render(): TemplateResult {
    const alert = this.tone === "warning" || this.tone === "error";
    const described = this.tooltip === "" ? undefined : "tooltip";
    return html`<span
        class="state ${this.tone}"
        role=${alert ? "alert" : "status"}
        tabindex=${described === undefined ? "-1" : "0"}
        aria-describedby=${described ?? ""}
      >
        <span class="icon">${renderIcon(this.icon === "" ? undefined : this.icon)}</span><span class="label">${this.label}</span>
      </span>
      ${described === undefined ? undefined : html`<span id="tooltip" class="tooltip" role="tooltip">${this.tooltip}</span>`}`;
  }
}

defineElement("vtherm-state-icon", VThermStateIcon);
