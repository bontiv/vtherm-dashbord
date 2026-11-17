/**
 * The save actions at the foot of the card of a configuration section, as the configuration pages of Home Assistant draw them
 * (`ha-config-entity-id-format`): the messages of the draft, then **Discard** on the left, a plain `ha-button` with the restore icon,
 * and **Save** on the right, a `ha-progress-button` that shows its indicator while saving, then green with a check mark or red with an
 * alert icon for two seconds.
 *
 * The native tabs and the card that the dashboard draws under a component without `save_actions: "component"` use it.
 */
import type { DraftControls, SaveResult } from "@vtherm/dashboard-sdk";
import { LitElement, css, html, unsafeCSS } from "lit";
import type { TemplateResult } from "lit";

import { t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";
import { isDefined, renderAlert } from "./ha.ts";
import { NARROW_QUERY, TOUCH_TARGET, narrowStyles } from "./narrow-styles.ts";

/** The icon of Home Assistant for "discard" (mdiRestore), copied to avoid a dependency on @mdi/js. */
export const RESTORE_ICON =
  "M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z";

/** How long the result of a save stays shown, as `ha-progress-button` does. */
export const RESULT_DURATION = 2000;

/** The progress button of Home Assistant, as the actions use it. */
type ProgressButton = HTMLElement & { progress: boolean; actionSuccess(): void; actionError(): void };

/** The save actions of a configuration section. */
export class VThermCardActions extends LitElement {
  static override properties = {
    draft: { attribute: false },
    language: { type: String },
    result: { state: true },
    announcement: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        display: block;
      }
      .messages {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0 16px 8px;
        overflow-wrap: anywhere;
      }
      .unsaved {
        color: var(--secondary-text-color);
      }
      .card-actions {
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 8px 16px 16px;
        border-top: 1px solid var(--divider-color);
      }
      /* On a phone, the two actions stay on one line, Discard on the left and Save on the right, with touch targets of 44 px. */
      @media ${unsafeCSS(NARROW_QUERY)} {
        .card-actions ha-button,
        .card-actions ha-progress-button {
          display: inline-flex;
          align-items: center;
          min-height: ${TOUCH_TARGET}px;
        }
      }
      /* fallback: plain buttons, when the buttons of Home Assistant are not defined. */
      button {
        padding: 6px 16px;
        font: inherit;
        border-radius: 4px;
        cursor: pointer;
      }
      button.save {
        color: var(--text-primary-color);
        background-color: var(--primary-color);
        border: 0;
      }
      button.discard {
        color: var(--primary-color);
        background: none;
        border: 1px solid var(--primary-color);
      }
      button[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ];

  /** The state of the draft and its commands. Without it, nothing is drawn: the configuration cannot be saved. */
  declare draft: DraftControls | undefined;
  /** The language, to draw again when it changes. */
  declare language: string;
  /** The result of the last save, shown as a text when the progress button of Home Assistant is not defined. */
  declare result: SaveResult | undefined;
  /** What the screen readers are told after a save. */
  declare announcement: string;

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.draft = undefined;
    this.language = "";
    this.result = undefined;
    this.announcement = "";
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.timer);
  }

  private get disabled(): boolean {
    return this.draft === undefined || !this.draft.dirty || this.draft.saving;
  }

  /** Save, as the save button of Home Assistant does: one save at a time, then the result on the button. */
  private async save(event: Event): Promise<void> {
    const draft = this.draft;
    if (draft === undefined) {
      return;
    }
    const button = event.currentTarget as Partial<ProgressButton> | null;
    const progress = button !== null && typeof button.actionSuccess === "function" ? (button as ProgressButton) : undefined;
    if (progress?.progress === true || draft.saving) {
      return;
    }
    this.announcement = "";
    if (progress !== undefined) {
      progress.progress = true;
    }
    const result = await draft.save();
    if (progress !== undefined) {
      if (result === "success") {
        progress.actionSuccess();
      } else {
        progress.actionError();
      }
      progress.progress = false;
    } else {
      // fallback: without ha-progress-button, the result is a text above the actions for two seconds.
      this.result = result;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.result = undefined), RESULT_DURATION);
    }
    // The button only shows the result: the screen readers are told the success.
    this.announcement = result === "success" ? t("draft.saved") : "";
  }

  private renderMessages(draft: DraftControls): TemplateResult | undefined {
    const result = this.result === undefined ? undefined : renderAlert(this.result === "success" ? "success" : "error", t(this.result === "success" ? "draft.saved" : "draft.not_saved"), "result");
    if (draft.messages.length === 0 && result === undefined) {
      return undefined;
    }
    return html`<div class="messages">
      ${draft.messages.map((message) => (message.type === "info" ? html`<div class="unsaved">${message.text}</div>` : renderAlert(message.type, message.text, "message")))} ${result}
    </div>`;
  }

  private renderDiscard(draft: DraftControls): TemplateResult {
    const discard = () => draft.discard();
    if (isDefined("ha-button")) {
      const icon = isDefined("ha-svg-icon") ? html`<ha-svg-icon slot="start" .path=${RESTORE_ICON}></ha-svg-icon>` : undefined;
      return html`<ha-button class="discard" appearance="plain" .disabled=${this.disabled} @click=${discard}>${icon}${t("draft.discard")}</ha-button>`;
    }
    // fallback: ha-button is not defined.
    return html`<button class="discard" ?disabled=${this.disabled} @click=${discard}>${t("draft.discard")}</button>`;
  }

  private renderSave(draft: DraftControls): TemplateResult {
    const save = (event: Event) => void this.save(event);
    if (isDefined("ha-progress-button")) {
      return html`<ha-progress-button class="save" appearance="filled" .disabled=${this.disabled} @click=${save}>${t("draft.save")}</ha-progress-button>`;
    }
    // fallback: ha-progress-button is not defined, the label tells that the save is in progress.
    const label = t(draft.saving ? "draft.saving" : "draft.save");
    if (isDefined("ha-button")) {
      return html`<ha-button class="save" appearance="filled" .disabled=${this.disabled} @click=${save}>${label}</ha-button>`;
    }
    return html`<button class="save" ?disabled=${this.disabled} @click=${save}>${label}</button>`;
  }

  protected override render(): TemplateResult | undefined {
    const draft = this.draft;
    if (draft === undefined) {
      return undefined;
    }
    return html`${this.renderMessages(draft)}
      <div class="card-actions">${this.renderDiscard(draft)} ${this.renderSave(draft)}</div>
      <span class="visually-hidden" role="status">${this.announcement}</span>`;
  }
}

defineElement("vtherm-card-actions", VThermCardActions);

/**
 * Draw the save actions of a configuration section at the foot of its card, or nothing when the configuration cannot be saved.
 *
 * @param draft - The state of the draft and its commands, from the properties of the section.
 * @param language - The language, so that the actions are drawn again when it changes.
 */
export function renderCardActions(draft: DraftControls | undefined, language = ""): TemplateResult | undefined {
  return draft === undefined ? undefined : html`<vtherm-card-actions .draft=${draft} .language=${language}></vtherm-card-actions>`;
}
