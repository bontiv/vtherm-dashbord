/**
 * The help of a field: the hint, the button (i) and the panel with the diagram and the explanation.
 *
 * The SDK gives the contract of the element (`FIELD_HELP_ELEMENT`, `FieldHelpProps`); the dashboard defines it, for its native tabs
 * and for the plugins. The panel opens in the flow of the page, under the field, and stays open while the field is changed.
 */

import { FIELD_HELP_ELEMENT } from "@vtherm/dashboard-sdk";
import type { DiagramId } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { t } from "../shell-translations.ts";
import { diagramStyles, renderDiagram } from "./diagrams/index.ts";
import { diagramTexts } from "./diagrams/texts.ts";
import { defineElement } from "./define.ts";
import { isDefined } from "./ha.ts";
import { TOUCH_TARGET, narrowStyles } from "./narrow-styles.ts";

/** The icon of Home Assistant for the help (mdiInformationOutline), copied to avoid a dependency on @mdi/js. */
export const INFORMATION_ICON =
  "M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z";

let lastId = 0;

/**
 * Format a number of a diagram in the language of the user.
 *
 * @param value - The number.
 * @param options - The options of `Intl.NumberFormat`.
 */
export function diagramFormat(value: number, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(diagramTexts.language, options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * The element of the help of a field.
 *
 * With the attribute `in-field`, it takes no box of its own (`display: contents`): its button goes at the right of the control and its
 * panel under it, in the grid of the field (see the styles of the native tabs). Without it, it lays out its hint, its button and its panel
 * by itself, for a plugin that puts it next to its field.
 */
export class VThermFieldHelp extends LitElement {
  static override properties = {
    label: { type: String },
    hint: { type: String },
    info: { type: String },
    diagram: { type: String },
    values: { attribute: false },
    highlight: { type: String },
    open: { state: true },
    slotted: { state: true },
  };

  static override styles = [
    narrowStyles,
    diagramStyles,
    css`
      :host {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        column-gap: 8px;
        color: var(--primary-text-color);
      }
      :host([in-field]) {
        display: contents;
      }
      .hint {
        grid-column: 1;
        color: var(--secondary-text-color);
      }
      :host([in-field]) .hint {
        grid-column: 1 / -1;
      }
      /* The button (i): a button of the dashboard with the icon of Home Assistant, with the look of a button of icon of the theme. It is not
         ha-icon-button, which gives neither the state of the panel nor the panel it controls to its own button. */
      .toggle {
        /* The last column: the second of a field, the third of a fallback boolean (checkbox, label, button). */
        grid-column: -2;
        grid-row: 1;
        justify-self: end;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        color: var(--secondary-text-color);
        background: none;
        border: 0;
        border-radius: 50%;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }
      .toggle:hover,
      .toggle[aria-expanded="true"] {
        color: var(--primary-color);
        background-color: var(--secondary-background-color);
      }
      .toggle:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .panel {
        grid-column: 1 / -1;
        display: grid;
        gap: 8px;
        min-width: 0;
        margin-top: 4px;
        padding: 12px;
        color: var(--primary-text-color);
        background-color: var(--secondary-background-color);
        border-radius: var(--ha-card-border-radius, 12px);
      }
      .panel[hidden] {
        display: none;
      }
      .info {
        margin: 0;
        white-space: pre-line;
      }
      @media (pointer: coarse) {
        .toggle {
          width: ${TOUCH_TARGET}px;
          height: ${TOUCH_TARGET}px;
        }
      }
    `,
  ];

  declare label: string;
  declare hint: string | undefined;
  declare info: string | undefined;
  declare diagram: DiagramId | undefined;
  declare values: Readonly<Record<string, unknown>> | undefined;
  declare highlight: string | undefined;
  declare open: boolean;
  /** Whether a plugin gave its own diagram in the slot `diagram`. */
  declare slotted: boolean;

  private readonly panelId = `field-help-${(lastId += 1)}`;
  private readonly onParentKeydown = (event: KeyboardEvent): void => this.closeOnEscape(event);
  private parentWithListener: HTMLElement | null = null;

  constructor() {
    super();
    this.label = "";
    this.hint = undefined;
    this.info = undefined;
    this.diagram = undefined;
    this.values = undefined;
    this.highlight = undefined;
    this.open = false;
    this.slotted = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.slotted = this.querySelector(':scope > [slot="diagram"]') !== null;
    // Escape closes the panel also when the focus is in the field, out of this element.
    this.parentWithListener = this.parentElement;
    this.parentWithListener?.addEventListener("keydown", this.onParentKeydown);
  }

  override disconnectedCallback(): void {
    this.parentWithListener?.removeEventListener("keydown", this.onParentKeydown);
    this.parentWithListener = null;
    super.disconnectedCallback();
  }

  /** Whether the button (i) is shown: there is an explanation or a diagram. */
  get hasPanel(): boolean {
    return (this.info !== undefined && this.info !== "") || this.diagram !== undefined || this.slotted;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("diagram") || changed.has("info")) {
      this.open = this.open && this.hasPanel;
    }
  }

  private toggle(): void {
    this.open = !this.open;
  }

  private closeOnEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.open) {
      return;
    }
    event.stopPropagation();
    this.open = false;
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLButtonElement>(".toggle")?.focus());
  }

  private renderIcon(): TemplateResult | string {
    // fallback: the letter i, when ha-svg-icon is not defined.
    return isDefined("ha-svg-icon") ? html`<ha-svg-icon .path=${INFORMATION_ICON} aria-hidden="true"></ha-svg-icon>` : "i";
  }

  private renderDiagram(): TemplateResult | undefined {
    if (this.slotted) {
      return html`<slot name="diagram"></slot>`;
    }
    if (this.diagram === undefined) {
      return undefined;
    }
    return renderDiagram(this.diagram, { values: this.values ?? {}, ...(this.highlight === undefined ? {} : { focus: this.highlight }), format: diagramFormat });
  }

  protected override render(): TemplateResult {
    const hint = this.hint === undefined || this.hint === "" ? undefined : html`<span class="hint">${this.hint}</span>`;
    if (!this.hasPanel) {
      return html`${hint}`;
    }
    const name = t("field_help.button", { field: this.label });
    return html`${hint}
      <button
        class="toggle"
        type="button"
        aria-label=${name}
        title=${name}
        aria-expanded=${this.open ? "true" : "false"}
        aria-controls=${this.panelId}
        @click=${() => this.toggle()}
        @keydown=${(event: KeyboardEvent) => this.closeOnEscape(event)}
      >
        ${this.renderIcon()}
      </button>
      <div class="panel" id=${this.panelId} role="region" aria-label=${name} ?hidden=${!this.open} @keydown=${(event: KeyboardEvent) => this.closeOnEscape(event)}>
        ${this.open ? this.renderDiagram() : undefined} ${this.open && this.info !== undefined && this.info !== "" ? html`<p class="info">${this.info}</p>` : undefined}
      </div>`;
  }
}

// The plugins find the element by the name that the SDK exports, once the dashboard has loaded.
defineElement(FIELD_HELP_ELEMENT, VThermFieldHelp);
