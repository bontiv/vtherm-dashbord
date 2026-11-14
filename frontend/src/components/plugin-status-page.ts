import { LitElement, html } from "lit";
import type { TemplateResult } from "lit";

import { STATE_CHANGED_EVENT, currentState } from "../state.ts";
import "./plugin-status.ts";
import { defineElement } from "./define.ts";

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
    return html`<vtherm-plugin-status .statuses=${state.statuses} .issues=${state.issues} .dashboardVersion=${state.dashboardVersion} .language=${this.language}></vtherm-plugin-status>`;
  }
}

defineElement("vtherm-plugin-status-page", VThermPluginStatusPage);
