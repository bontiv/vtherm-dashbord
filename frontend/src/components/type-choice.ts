import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { THERMOSTAT_TYPES } from "../native/tab-definitions.ts";
import { t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";
import { isDefined, renderButton } from "./ha.ts";
import { narrowStyles } from "./narrow-styles.ts";

/** The value of the event `value-changed` of a component of Home Assistant. */
type ValueChanged = CustomEvent<{ value: unknown }>;

/**
 * The choice of the type of a new thermostat, shown before its page of configuration: the selector of Home Assistant as a list of
 * choices, or radio buttons as the fallback, then a button to go on to the first section.
 */
export class VThermTypeChoice extends LitElement {
  static override properties = {
    hass: { attribute: false },
    value: { type: String },
    choose: { attribute: false },
    next: { attribute: false },
    cancel: { attribute: false },
    language: { type: String },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: block;
        padding: 16px;
        max-width: 760px;
      }
      fieldset.type {
        margin: 12px 0;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }
    `,
  ];

  declare hass: Hass | undefined;
  /** The type of the draft, as the flow names it. */
  declare value: string;
  /** The user chose a type. */
  declare choose: (type: string) => void;
  /** The user goes on to the page of configuration. */
  declare next: () => void;
  /** The user abandons the creation. */
  declare cancel: () => void;
  declare language: string;

  constructor() {
    super();
    this.value = THERMOSTAT_TYPES[0];
    this.choose = () => undefined;
    this.next = () => undefined;
    this.cancel = () => undefined;
    this.language = "";
  }

  private label(type: string): string {
    return (t as (key: string) => string)(`shell.thermostats.type.${type.replace("thermostat_", "")}`);
  }

  private pick(type: unknown): void {
    if (THERMOSTAT_TYPES.includes(type as (typeof THERMOSTAT_TYPES)[number]) && type !== this.value) {
      this.choose(type as string);
    }
  }

  protected override render(): TemplateResult {
    const choice = isDefined("ha-selector")
      ? html`<ha-selector
          class="type"
          .hass=${this.hass}
          .selector=${{ select: { options: THERMOSTAT_TYPES.map((type) => ({ value: type, label: this.label(type) })), mode: "list" } }}
          .value=${this.value}
          .label=${t("creation.type")}
          .required=${true}
          @value-changed=${(event: ValueChanged) => {
            event.stopPropagation();
            this.pick(event.detail.value);
          }}
        ></ha-selector>`
      : // fallback: radio buttons, when ha-selector is not defined. The label is the touch target of its button.
        html`<fieldset class="type">
          <legend>${t("creation.type")}</legend>
          ${THERMOSTAT_TYPES.map(
            (type) => html`<label><input type="radio" name="thermostat_type" .value=${type} .checked=${type === this.value} @change=${() => this.pick(type)} /> ${this.label(type)}</label>`,
          )}
        </fieldset>`;
    return html`${choice}
      <div class="actions">
        ${renderButton(t("creation.continue"), () => this.next(), { className: "continue" })}
        ${renderButton(t("creation.cancel"), () => this.cancel(), { className: "cancel", plain: true })}
      </div>`;
  }
}

defineElement("vtherm-type-choice", VThermTypeChoice);
