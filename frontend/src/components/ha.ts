/**
 * The components of Home Assistant in the pages of the dashboard: whether they can be drawn, and the fallback when they cannot.
 *
 * In Home Assistant, the components are defined once its interface has loaded, which can come after the first drawing of a page
 * opened directly: the page waits (`waiting`) and draws again when `ensureHaControls` is done. Out of Home Assistant, as in the tests,
 * and on a version of Home Assistant without them, the page draws its plain HTML controls (`fallback`).
 */
import { ensureHaControls, haControlsStatus } from "@vtherm/dashboard-sdk";
import { html } from "lit";
import type { TemplateResult } from "lit";

/** What a page can draw now. */
export type HaState = "ready" | "waiting" | "fallback";

/** The elements that exist as soon as the interface of Home Assistant runs. */
const HOME_ASSISTANT = ["home-assistant", "home-assistant-main", "partial-panel-resolver"];

let finished = false;
let warned = false;

/** Whether the page is the one of Home Assistant. */
const inHomeAssistant = (): boolean => HOME_ASSISTANT.some((tag) => customElements.get(tag) !== undefined);

/**
 * Tell what a page can draw now, without waiting: the components of Home Assistant, a waiting state, or the fallback.
 *
 * @param host - Drawn again when the components are ready, if they are not yet.
 */
export function haState(host?: { requestUpdate(): void }): HaState {
  if (haControlsStatus().loaded) {
    return "ready";
  }
  if (!inHomeAssistant() || finished) {
    return "fallback";
  }
  void ensureHaControls().then((result) => {
    finished = true;
    if (!result.loaded && !warned) {
      warned = true;
      console.warn("The components of Home Assistant (ha-selector) are not defined: the dashboard draws plain HTML controls instead.");
    }
    host?.requestUpdate();
  });
  return "waiting";
}

/** Whether a component of Home Assistant is defined now. */
export const isDefined = (tag: string): boolean => customElements.get(tag) !== undefined;

/** The types of the messages of `ha-alert`. */
export type AlertType = "error" | "warning" | "info" | "success";

/**
 * Show a message with `ha-alert`, or a `div` with the same role when it is not defined.
 *
 * @param type - The type of the message. An error is announced at once (`alert`), the others politely (`status`).
 * @param content - The message.
 * @param className - A class for the fallback and for the alert, to place it.
 */
export function renderAlert(type: AlertType, content: unknown, className = ""): TemplateResult {
  if (isDefined("ha-alert")) {
    return html`<ha-alert class=${className} alert-type=${type}>${content}</ha-alert>`;
  }
  // fallback: ha-alert is not defined in this version of Home Assistant, or out of Home Assistant.
  return html`<div class="alert ${type} ${className}" role=${type === "error" ? "alert" : "status"}>${content}</div>`;
}

/**
 * Show an indicator of progress with its text: `ha-spinner`, `ha-circular-progress` on older versions, or the text alone.
 *
 * @param label - The text, which also names the indicator for screen readers.
 */
export function renderProgress(label: string): TemplateResult {
  const spinner = isDefined("ha-spinner") ? html`<ha-spinner size="small" aria-label=${label}></ha-spinner>` : isDefined("ha-circular-progress") ? html`<ha-circular-progress indeterminate size="small" aria-label=${label}></ha-circular-progress>` : undefined;
  return html`<div class="progress" role="status">${spinner}<span>${label}</span></div>`;
}

/**
 * Ask Home Assistant to show the card of an entity, as a click on an entity does in its own pages. An identifier that matches no
 * entity sends nothing.
 *
 * @param from - The element that sends the event, inside the panel.
 * @param entityId - The entity.
 * @param states - The states of Home Assistant, to check that the entity exists.
 */
export function showMoreInfo(from: EventTarget, entityId: string, states: Readonly<Record<string, unknown>> | undefined): void {
  if (states?.[entityId] === undefined) {
    return;
  }
  from.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
}

/** What `renderButton` draws. */
export interface ButtonOptions {
  /** The classes of the button, kept by the fallback. */
  readonly className?: string;
  readonly disabled?: boolean;
  /** A secondary action: a plain button of Home Assistant. */
  readonly plain?: boolean;
}

/**
 * Show a button of Home Assistant, or a plain button when `ha-button` is not defined.
 *
 * @param label - The text of the button.
 * @param onClick - What the button does.
 * @param options - Its classes, whether it is disabled, and whether it is a secondary action.
 */
export function renderButton(label: unknown, onClick: () => void, options: ButtonOptions = {}): TemplateResult {
  if (isDefined("ha-button")) {
    return html`<ha-button class=${options.className ?? ""} appearance=${options.plain === true ? "plain" : "accent"} .disabled=${options.disabled === true} @click=${onClick}>${label}</ha-button>`;
  }
  // fallback: ha-button is not defined.
  return html`<button class=${options.className ?? ""} ?disabled=${options.disabled === true} @click=${onClick}>${label}</button>`;
}

/** An action of a dialog. */
export interface DialogAction {
  readonly label: string;
  /** The classes of its button. */
  readonly className: string;
  readonly onClick: () => void;
}

/** What `renderDialog` draws. */
export interface DialogOptions {
  readonly title: string;
  readonly body: unknown;
  /** The action that confirms. It is the only way to do it: closing the dialog cancels. */
  readonly confirm: DialogAction;
  readonly cancel: DialogAction;
}

/**
 * Show a dialog of confirmation of Home Assistant (`ha-dialog`), or a dialog of the page when it is not defined.
 *
 * The action only happens when the user confirms; closing the dialog any other way (scrim, Escape) cancels.
 */
export function renderDialog(options: DialogOptions): TemplateResult {
  const { title, body, confirm, cancel } = options;
  if (isDefined("ha-dialog")) {
    const buttons = html`<ha-button slot="secondaryAction" appearance="plain" class=${cancel.className} @click=${cancel.onClick}>${cancel.label}</ha-button>
      <ha-button slot="primaryAction" class=${confirm.className} @click=${confirm.onClick}>${confirm.label}</ha-button>`;
    // Home Assistant 2026 puts the actions in ha-dialog-footer; older versions take them directly in the dialog.
    return html`<ha-dialog .open=${true} header-title=${title} .heading=${title} @closed=${cancel.onClick}>
      ${body} ${isDefined("ha-dialog-footer") ? html`<ha-dialog-footer slot="footer">${buttons}</ha-dialog-footer>` : buttons}
    </ha-dialog>`;
  }
  // fallback: ha-dialog is not defined.
  return html`<div class="overlay">
    <div class="dialog" role="dialog" aria-modal="true" aria-label=${title}>
      <h2>${title}</h2>
      ${body}
      <div class="actions">
        <button class="primary ${confirm.className}" @click=${confirm.onClick}>${confirm.label}</button>
        <button class=${cancel.className} @click=${cancel.onClick}>${cancel.label}</button>
      </div>
    </div>
  </div>`;
}
