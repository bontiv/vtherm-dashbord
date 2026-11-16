import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import type { ConfigApi, TabChanges } from "../config/api.ts";
import { ConfigDraft } from "../config/draft.ts";
import { translateErrorCode } from "../i18n.ts";
import type { DashboardRegistry } from "../registry.ts";
import { missingRequired } from "../native/fields.ts";
import { tagOf } from "../native/native-plugin.ts";
import { fieldsOf } from "../native/schemas.ts";
import { TAB_DEFINITIONS } from "../native/tab-definitions.ts";
import type { ConfigKind, TabDefinition } from "../native/tab-definitions.ts";
import { shell, t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";
import { narrowStyles } from "./narrow-styles.ts";
import { haState, isDefined, renderAlert, renderProgress } from "./ha.ts";

/** The event sent when the assistant created a configuration. Its detail is the identifier of the new entry. */
export const CREATED_EVENT = "vtherm-config-created";

/** The event sent when the user leaves the assistant without creating anything. */
export const CANCELLED_EVENT = "vtherm-config-cancelled";

/** The types of thermostat, as the flow names them. */
export const THERMOSTAT_TYPES = ["thermostat_over_switch", "thermostat_over_climate", "thermostat_over_valve"] as const;

const CENTRAL_TYPE = "thermostat_central_config";

/** The tabs of the assistant: what a new configuration needs before it can be created. */
const WIZARD_TABS: Readonly<Record<ConfigKind, readonly string[]>> = { thermostat: ["main", "type"], central: ["main"] };

/**
 * The tabs that the creation sends. The central configuration also sends its TPI and advanced tabs, with their defaults: without them the
 * thermostats that use the central values do not start.
 */
const CREATED_TABS: Readonly<Record<ConfigKind, readonly string[]>> = { thermostat: ["main", "type"], central: ["main", "tpi", "advanced"] };

/** The assistant that creates a thermostat, or the central configuration, with the flow of Versatile Thermostat. */
export class VThermCreateWizard extends LitElement {
  static override properties = {
    hass: { attribute: false },
    api: { attribute: false },
    central: { type: Boolean },
    hasCentral: { type: Boolean },
    centralValues: { attribute: false },
    language: { type: String },
    thermostatType: { state: true },
    busy: { state: true },
    revision: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
    h1 {
      margin: 0 0 16px;
      font-size: 22px;
      font-weight: 500;
    }
    fieldset {
      max-width: 760px;
      margin: 0 0 16px;
      padding: 16px;
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    legend {
      font-weight: 500;
    }
    label {
      display: block;
      margin: 4px 0;
    }
    .missing,
    .error {
      max-width: 760px;
      margin: 0 0 12px;
    }
    .missing {
      color: var(--secondary-text-color);
    }
    .error {
      color: var(--error-color);
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      padding: 8px 16px;
      font: inherit;
      border-radius: 4px;
      cursor: pointer;
    }
    button.primary {
      color: var(--text-primary-color);
      background-color: var(--primary-color);
      border: 0;
    }
    button.primary[disabled] {
      opacity: 0.5;
      cursor: default;
    }
    button.secondary {
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--primary-color);
    }
  `,
  ];

  declare hass: Hass | undefined;
  declare api: ConfigApi | undefined;
  /** True to create the central configuration, false to create a thermostat. */
  declare central: boolean;
  /** Whether a central configuration exists, which a new thermostat can use. */
  declare hasCentral: boolean;
  /** The values of the central configuration, shown read-only where a new thermostat uses them. */
  declare centralValues: Readonly<Record<string, unknown>>;
  declare language: string;
  declare thermostatType: string;
  declare busy: boolean;
  declare revision: number;

  private draft: ConfigDraft;
  private stop: () => void = () => undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.api = undefined;
    this.central = false;
    this.hasCentral = false;
    this.centralValues = {};
    this.language = "";
    this.thermostatType = THERMOSTAT_TYPES[0];
    this.busy = false;
    this.revision = 0;
    this.draft = this.newDraft();
  }

  /** The element of each form of the assistant, by tag, kept from one render to the next. */
  private readonly tabElements = new Map<string, HTMLElement>();

  private get kind(): ConfigKind {
    return this.central ? "central" : "thermostat";
  }

  private newDraft(): ConfigDraft {
    this.stop();
    const type = this.central ? CENTRAL_TYPE : this.thermostatType;
    // A new thermostat uses the central configuration when there is one, as the flow proposes.
    const draft = new ConfigDraft("new", { thermostat_type: type, ...(this.central ? {} : { use_main_central_config: this.hasCentral }) });
    this.stop = draft.subscribe(() => {
      this.revision += 1;
    });
    return draft;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("central") || changed.has("hasCentral") || changed.has("thermostatType")) {
      this.draft = this.newDraft();
    }
  }

  private definitions(): TabDefinition[] {
    return WIZARD_TABS[this.kind].map((tab) => TAB_DEFINITIONS.find((definition) => definition.tab === tab) as TabDefinition);
  }

  /** The required fields that the configuration still misses, in the forms of the assistant. */
  private missing(): string[] {
    const values = this.draft.values();
    const fields = this.definitions().flatMap((definition) => {
      const layoutOf = this.kind === "thermostat" ? definition.thermostat : definition.central;
      if (layoutOf === undefined) {
        return [];
      }
      const layout = layoutOf(values);
      const inherited = layout.inherit !== undefined && this.hasCentral && values[layout.inherit] !== false;
      return [...layout.base, ...(inherited ? [] : (layout.specific ?? []))].flatMap((name) => fieldsOf(name));
    });
    return missingRequired(fields, values).map((field) => field.key);
  }

  private async create(): Promise<void> {
    if (this.api === undefined) {
      return;
    }
    this.busy = true;
    const changes: Record<string, Record<string, unknown>> = { ...(this.draft.tabChanges() as Record<string, Record<string, unknown>>) };
    for (const tab of CREATED_TABS[this.kind]) {
      changes[tab] = { ...(changes[tab] ?? {}) };
    }
    if (!this.central) {
      // The value that the draft started from is not a change, but the flow needs it.
      changes["main"] = { use_main_central_config: this.hasCentral, ...changes["main"] };
    }
    try {
      const response = await this.api.create(this.central ? CENTRAL_TYPE : this.thermostatType, changes as TabChanges);
      if (response.ok && response.entry_id !== null) {
        this.dispatchEvent(new CustomEvent<string>(CREATED_EVENT, { detail: response.entry_id, bubbles: true, composed: true }));
      } else {
        this.draft.setErrors(response.errors);
      }
    } finally {
      this.busy = false;
    }
  }

  private renderTab(definition: TabDefinition): TemplateResult {
    const tag = tagOf(definition, this.kind);
    if (customElements.get(tag) === undefined) {
      return html``;
    }
    // The same element is kept from one render to the next: a new one would lose the focus of the field being typed in, since the
    // fields of Home Assistant change the draft at each key.
    let element = this.tabElements.get(tag);
    if (element === undefined) {
      element = document.createElement(tag);
      this.tabElements.set(tag, element);
    }
    Object.assign(element, {
      hass: this.hass,
      thermostatId: "",
      values: this.draft.values(),
      centralValues: this.central ? {} : this.centralValues,
      errors: this.draft.errorsOf(definition.tab),
      proposeChanges: (changes: Record<string, unknown>) => this.draft.propose(definition.tab, changes),
      language: this.language,
    });
    return html`${element}`;
  }

  /** The type of the thermostat: the selector of Home Assistant as a list of choices, or radio buttons as the fallback. */
  private renderType(ha: boolean): TemplateResult {
    const label = (type: string) => (t as (key: string) => string)(`shell.thermostats.type.${type.replace("thermostat_", "")}`);
    if (ha) {
      return html`<ha-selector
        class="type"
        .hass=${this.hass}
        .selector=${{ select: { options: THERMOSTAT_TYPES.map((type) => ({ value: type, label: label(type) })), mode: "list" } }}
        .value=${this.thermostatType}
        .label=${t("wizard.type")}
        .required=${true}
        @value-changed=${(event: CustomEvent<{ value: unknown }>) => {
          event.stopPropagation();
          if (THERMOSTAT_TYPES.includes(event.detail.value as (typeof THERMOSTAT_TYPES)[number])) {
            this.thermostatType = event.detail.value as (typeof THERMOSTAT_TYPES)[number];
          }
        }}
      ></ha-selector>`;
    }
    // fallback: radio buttons, when ha-selector is not defined.
    return html`<fieldset>
      <legend>${t("wizard.type")}</legend>
      ${THERMOSTAT_TYPES.map(
        (type) =>
          html`<label><input type="radio" name="type" .value=${type} .checked=${type === this.thermostatType} @change=${() => (this.thermostatType = type)} /> ${label(type)}</label>`,
      )}
    </fieldset>`;
  }

  private renderActions(missing: readonly string[]): TemplateResult {
    const create = () => void this.create();
    const cancel = () => this.dispatchEvent(new CustomEvent(CANCELLED_EVENT, { bubbles: true, composed: true }));
    const createLabel = t(this.busy ? "wizard.creating" : "wizard.create");
    if (isDefined("ha-button")) {
      return html`<div class="actions">
        <ha-button class="primary" .disabled=${this.busy || missing.length > 0} @click=${create}>${createLabel}</ha-button>
        <ha-button class="secondary" appearance="plain" @click=${cancel}>${t("wizard.cancel")}</ha-button>
      </div>`;
    }
    // fallback: plain buttons, when ha-button is not defined.
    return html`<div class="actions">
      <button class="primary" ?disabled=${this.busy || missing.length > 0} @click=${create}>${createLabel}</button>
      <button class="secondary" @click=${cancel}>${t("wizard.cancel")}</button>
    </div>`;
  }

  protected override render(): TemplateResult {
    const state = haState(this);
    if (state === "waiting") {
      return renderProgress(t("config.waiting"));
    }
    const missing = this.missing();
    const general = this.draft.generalErrors();
    // The fields of the assistant belong to the native plugin of their tab, whose catalog the registry translates.
    const registry = (globalThis as { VThermUiPluginRegistry?: Partial<DashboardRegistry> }).VThermUiPluginRegistry;
    const labelOf = (key: string): string => registry?.translate?.(this.definitions()[0]?.plugin ?? "core", `field.${key}`) ?? key;
    return html`<h1>${t(this.central ? "wizard.title_central" : "wizard.title")}</h1>
      ${this.central ? undefined : this.renderType(state === "ready")} ${this.definitions().map((definition) => this.renderTab(definition))}
      ${missing.length === 0 ? undefined : renderAlert("info", t("wizard.missing", { fields: missing.map(labelOf).join(", ") }), "missing")}
      ${general.length === 0 ? undefined : renderAlert("error", `${t("wizard.refused")} ${general.map((error) => translateErrorCode(shell, error.code)).join(" ")}`, "error")}
      ${this.renderActions(missing)}`;
  }
}

defineElement("vtherm-create-wizard", VThermCreateWizard);
