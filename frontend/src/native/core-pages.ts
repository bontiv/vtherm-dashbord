import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import "../components/plugin-status-page.ts";
import "../components/widgets-page.ts";
import { navigate } from "../components/events.ts";
import { buildPath } from "../router.ts";
import { t } from "../shell-translations.ts";

/** The address of the assistant that creates a thermostat or the central configuration. */
export const NEW_THERMOSTAT = "new";

/** The page Overview of the Dashboard tab: the widgets of the plugins. */
export class CoreOverviewPage extends LitElement {
  static override properties = { hass: { attribute: false } };
  declare hass: Hass | undefined;
  protected override render(): TemplateResult {
    return html`<vtherm-widgets-page .hook=${"global_widget"} .hass=${this.hass}></vtherm-widgets-page>`;
  }
}

/** The overview of a thermostat: its type, then the widgets of the plugins for the thermostat. */
export class CoreThermostatOverviewPage extends LitElement {
  static override properties = { hass: { attribute: false }, thermostatId: { type: String }, values: { attribute: false }, language: { type: String } };
  static override styles = css`
    :host {
      display: block;
    }
    .summary {
      padding: 16px 16px 0;
      color: var(--secondary-text-color);
    }
  `;
  declare hass: Hass | undefined;
  declare thermostatId: string;
  declare values: ConfigValues;
  declare language: string;
  constructor() {
    super();
    this.thermostatId = "";
    this.values = {};
    this.language = "";
  }
  protected override render(): TemplateResult {
    const type = String(this.values["thermostat_type"] ?? "").replace("thermostat_", "");
    return html`${type === "" ? undefined : html`<div class="summary">${t("overview.type", { type: (t as (key: string) => string)(`shell.thermostats.type.${type}`) })}</div>`}
      <vtherm-widgets-page
        .hook=${"thermostat_widget"}
        .hass=${this.hass}
        .thermostatId=${this.thermostatId}
        .thermostatType=${type}
        .values=${this.values}
      ></vtherm-widgets-page>`;
  }
}

/** The page "Plugins" of the configuration: the status of the plugins. */
export class CorePluginsPage extends LitElement {
  static override properties = { language: { type: String } };
  declare language: string;
  constructor() {
    super();
    this.language = "";
  }
  protected override render(): TemplateResult {
    return html`<vtherm-plugin-status-page .language=${this.language}></vtherm-plugin-status-page>`;
  }
}

/** The page "Development" of the configuration. The management of the plugins in development comes with the development mode. */
export class CoreDevPluginsPage extends LitElement {
  static override properties = { language: { type: String } };
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `;
  declare language: string;
  constructor() {
    super();
    this.language = "";
  }
  protected override render(): TemplateResult {
    return html`<p>${t("dev.placeholder")}</p>`;
  }
}

/** The section of the general configuration shown while there is no central configuration: it offers to create it. */
export class CoreCreateCentralPage extends LitElement {
  static override properties = { language: { type: String } };
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    p {
      color: var(--secondary-text-color);
    }
    button {
      padding: 8px 16px;
      font: inherit;
      color: var(--text-primary-color);
      background-color: var(--primary-color);
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
  declare language: string;
  constructor() {
    super();
    this.language = "";
  }
  protected override render(): TemplateResult {
    return html`<p>${t("config.create_central")}</p>
      <button @click=${() => navigate(this, buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: NEW_THERMOSTAT, entry: "central", rest: [] }))}>${t("wizard.create_central")}</button>`;
  }
}

/** Define the elements of the pages of the core plugin, once. */
export function defineCorePages(): void {
  const pages: [string, CustomElementConstructor][] = [
    ["core-overview-page", CoreOverviewPage],
    ["core-thermostat-overview-page", CoreThermostatOverviewPage],
    ["core-plugins-page", CorePluginsPage],
    ["core-dev-plugins-page", CoreDevPluginsPage],
    ["core-create-central-page", CoreCreateCentralPage],
  ];
  for (const [tag, element] of pages) {
    if (customElements.get(tag) === undefined) {
      customElements.define(tag, element);
    }
  }
}
