import { LitElement, html } from "lit";
import type { TemplateResult } from "lit";

import type { TranslationWarning } from "@vtherm/dashboard-sdk";
import { STATE_CHANGED_EVENT, currentState } from "../state.ts";
import type { DashboardState } from "../state.ts";
import "./plugin-status.ts";
import { defineElement } from "./define.ts";

/** The translation warnings of the plugins in development, copied so that the status draws again when they grow. */
function warningsOf(state: DashboardState): ReadonlyMap<string, readonly TranslationWarning[]> {
  const read = state.translationWarnings ?? (() => []);
  return new Map(state.statuses.filter((status) => status.source === "development").map((status) => [status.id, [...read(status.id)]] as const));
}

/** The plugin status page: it reads the state that the panel published and draws again when it changes. The native page "Plugins" is made with it. */
export class VThermPluginStatusPage extends LitElement {
  static override properties = {
    language: { type: String },
  };

  /** The language of the user. It only changes to make the page draw its texts again. */
  declare language: string;

  constructor() {
    super();
    this.language = "";
  }

  private readonly refresh = (): void => this.requestUpdate();

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(STATE_CHANGED_EVENT, this.refresh);
  }

  override disconnectedCallback(): void {
    window.removeEventListener(STATE_CHANGED_EVENT, this.refresh);
    super.disconnectedCallback();
  }

  protected override render(): TemplateResult {
    const state = currentState();
    return html`<vtherm-plugin-status .statuses=${state.statuses} .issues=${state.issues} .translationWarnings=${warningsOf(state)} .dashboardVersion=${state.dashboardVersion} .language=${this.language}></vtherm-plugin-status>`;
  }
}

defineElement("vtherm-plugin-status-page", VThermPluginStatusPage);
