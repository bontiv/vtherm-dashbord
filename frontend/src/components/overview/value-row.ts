import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../define.ts";
import { MISSING } from "./format.ts";
import type { FormattedValue, WidgetText } from "./format.ts";

/**
 * A row of a value: its label and its value, formatted with its unit. A value that cannot be read shows "—", and a screen reader hears
 * "<label>: unavailable".
 */
export class VThermValueRow extends LitElement {
  static override properties = {
    label: { type: String },
    value: { attribute: false },
    text: { attribute: false },
  };

  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
    }
    .label {
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
    .value {
      color: var(--primary-text-color);
      text-align: end;
      overflow-wrap: anywhere;
    }
    .missing {
      color: var(--secondary-text-color);
    }
  `;

  /** What the value is, translated. */
  declare label: string;

  /** The value, formatted by the functions of `format.ts`. */
  declare value: FormattedValue | undefined;

  /** The translations of the plugin of the widget. */
  declare text: WidgetText;

  constructor() {
    super();
    this.label = "";
    this.value = undefined;
    this.text = (key) => key;
  }

  protected override render(): TemplateResult {
    const available = this.value?.available === true;
    const name = available ? `${this.label}: ${this.value?.text ?? ""}` : this.text("widget.value_unavailable", { label: this.label });
    return html`<div class="row" role="group" aria-label=${name}>
      <span class="label" aria-hidden="true">${this.label}</span>
      <span class="value ${available ? "" : "missing"}" aria-hidden="true">${available ? this.value?.text : MISSING}</span>
    </div>`;
  }
}

defineElement("vtherm-value-row", VThermValueRow);
