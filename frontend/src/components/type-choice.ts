import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { THERMOSTAT_TYPES } from "../native/tab-definitions.ts";
import { t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";
import { isDefined, renderButton } from "./ha.ts";
import { renderIcon } from "./icon.ts";
import { narrowStyles } from "./narrow-styles.ts";

/** The icon of each type of thermostat. */
const TYPE_ICONS: Readonly<Record<(typeof THERMOSTAT_TYPES)[number], string>> = {
  thermostat_over_switch: "mdi:toggle-switch-outline",
  thermostat_over_climate: "mdi:thermostat",
  thermostat_over_valve: "mdi:pipe-valve",
};

/**
 * The choice of the type of a new thermostat, shown before its page of configuration: one card per type, with what it controls and
 * examples of devices. Choosing a card, by click, touch or keyboard, chooses the type and goes on to the first section.
 */
export class VThermTypeChoice extends LitElement {
  static override properties = {
    hass: { attribute: false },
    value: { type: String },
    select: { attribute: false },
    cancel: { attribute: false },
    language: { type: String },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: block;
        padding: 16px;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 20px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .type-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-sizing: border-box;
        min-height: 44px;
        padding: 16px;
        color: var(--primary-text-color);
        background-color: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 12px);
        cursor: pointer;
        text-align: start;
      }
      .type-card.selected {
        border: 2px solid var(--primary-color);
        padding: 15px;
      }
      .type-card:hover {
        background-color: var(--secondary-background-color);
      }
      .type-card:active {
        background-color: var(--divider-color);
      }
      .type-card:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      ha-icon {
        --mdc-icon-size: 48px;
        color: var(--primary-color);
      }
      .title {
        font-size: 18px;
        font-weight: 700;
        color: var(--primary-color);
      }
      p {
        margin: 0;
      }
      .examples {
        font-size: 0.875em;
        color: var(--secondary-text-color);
      }
      .actions {
        margin-top: 16px;
      }
    `,
  ];

  declare hass: Hass | undefined;
  /** The type of the draft, as the flow names it: its card is shown as selected. */
  declare value: string;
  /** The user chose a type: it goes on to the page of configuration. */
  declare select: (type: string) => void;
  /** The user abandons the creation. */
  declare cancel: () => void;
  declare language: string;

  constructor() {
    super();
    this.value = THERMOSTAT_TYPES[0];
    this.select = () => undefined;
    this.cancel = () => undefined;
    this.language = "";
  }

  private text(type: string, part: "title" | "text" | "examples"): string {
    return (t as (key: string) => string)(`creation.type.${type.replace("thermostat_", "")}.${part}`);
  }

  private onKeyDown(event: KeyboardEvent, type: string): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.select(type);
    }
  }

  private renderCard(type: (typeof THERMOSTAT_TYPES)[number]): TemplateResult {
    const key = type.replace("thermostat_", "");
    const inner = html`${renderIcon(TYPE_ICONS[type])}
      <div class="title" id="title-${key}">${this.text(type, "title")}</div>
      <p id="text-${key}">${this.text(type, "text")}</p>
      <p class="examples" id="examples-${key}">${this.text(type, "examples")}</p>`;
    const classes = `type-card ${type === this.value ? "selected" : ""}`;
    // The card of Home Assistant when it is defined, otherwise a plain block with the same look.
    return isDefined("ha-card")
      ? html`<ha-card
          class=${classes}
          data-type=${type}
          role="button"
          tabindex="0"
          aria-pressed=${type === this.value ? "true" : "false"}
          aria-labelledby="title-${key}"
          aria-describedby="text-${key} examples-${key}"
          @click=${() => this.select(type)}
          @keydown=${(event: KeyboardEvent) => this.onKeyDown(event, type)}
          >${inner}</ha-card
        >`
      : // fallback: ha-card is not defined.
        html`<div
          class=${classes}
          data-type=${type}
          role="button"
          tabindex="0"
          aria-pressed=${type === this.value ? "true" : "false"}
          aria-labelledby="title-${key}"
          aria-describedby="text-${key} examples-${key}"
          @click=${() => this.select(type)}
          @keydown=${(event: KeyboardEvent) => this.onKeyDown(event, type)}
        >
          ${inner}
        </div>`;
  }

  protected override render(): TemplateResult {
    return html`<h2>${t("creation.type_title")}</h2>
      <div class="cards">${THERMOSTAT_TYPES.map((type) => this.renderCard(type))}</div>
      <div class="actions">${renderButton(t("creation.cancel"), () => this.cancel(), { className: "cancel", plain: true })}</div>`;
  }
}

defineElement("vtherm-type-choice", VThermTypeChoice);
