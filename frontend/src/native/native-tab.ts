import type { AnyTranslations, ConfigErrors, ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import type { PresetData, ThermostatList } from "../config/api.ts";
import { PRESET_PREFIX } from "../config/draft.ts";
import { translateErrorCode } from "../i18n.ts";
import { shell, t } from "../shell-translations.ts";
import { autoTpiDefaults, entityChoices, formatInput, parseInput, shownValue } from "./fields.ts";
import type { FieldSpec } from "./schemas.ts";
import { fieldsOf } from "./schemas.ts";
import type { ConfigKind, TabDefinition, TabLayout } from "./tab-definitions.ts";
import { narrowStyles } from "../components/narrow-styles.ts";

/** Translate a key that is built at run time. The catalogs of the native plugins have every key of their fields. */
type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** The base class of the native tabs: it shows the forms of one tab of the flow of Versatile Thermostat and proposes the changes to the draft. */
export class NativeTabElement extends LitElement {
  static override properties = {
    hass: { attribute: false },
    thermostatId: { type: String },
    values: { attribute: false },
    centralValues: { attribute: false },
    errors: { attribute: false },
    proposeChanges: { attribute: false },
    language: { type: String },
    presetData: { state: true },
    centralPresetData: { state: true },
    suggestion: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
    .card {
      max-width: 760px;
      padding: 16px;
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 500;
    }
    h3 {
      margin: 16px 0 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    .description,
    .help,
    .note {
      color: var(--secondary-text-color);
    }
    .description {
      margin: 0 0 16px;
    }
    .field {
      display: grid;
      gap: 4px;
      margin: 12px 0;
    }
    .field.boolean {
      grid-template-columns: auto 1fr;
      align-items: start;
      column-gap: 8px;
    }
    .field.boolean .help,
    .field.boolean .note,
    .field.boolean .error {
      grid-column: 2;
    }
    label {
      font-weight: 500;
    }
    input[type="text"],
    input[type="number"],
    select,
    textarea {
      box-sizing: border-box;
      width: 100%;
      padding: 8px;
      font: inherit;
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
    }
    textarea {
      min-height: 64px;
      resize: vertical;
    }
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 1px;
    }
    [aria-invalid="true"] {
      border-color: var(--error-color);
    }
    .error {
      color: var(--error-color);
    }
    .base-error {
      margin: 0 0 12px;
      padding: 8px 12px;
      color: var(--error-color);
      border: 1px solid var(--error-color);
      border-radius: 4px;
    }
    dl {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 16px;
      margin: 0;
    }
    dt {
      color: var(--secondary-text-color);
    }
    dd {
      margin: 0;
      text-align: right;
    }
    button {
      padding: 4px 8px;
      font: inherit;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      cursor: pointer;
    }
  `,
  ];

  /** The tab that the element shows. Set by the class that `defineNativeTab` creates. */
  static definition: TabDefinition;

  /** The kind of configuration that the element edits. */
  static kind: ConfigKind;

  /** The translations of the native plugin of the tab. */
  static translations: AnyTranslations;

  declare hass: Hass | undefined;
  declare thermostatId: string;
  declare values: ConfigValues;
  declare centralValues: ConfigValues;
  declare errors: ConfigErrors;
  declare proposeChanges: (changes: ConfigValues) => void;
  declare language: string;
  declare presetData: readonly PresetData[] | undefined;
  declare centralPresetData: readonly PresetData[] | undefined;
  declare suggestion: string | null | undefined;

  private loadedFor = "";

  constructor() {
    super();
    this.hass = undefined;
    this.thermostatId = "";
    this.values = {};
    this.centralValues = {};
    this.errors = {};
    this.proposeChanges = () => undefined;
    this.language = "";
    this.presetData = undefined;
    this.centralPresetData = undefined;
    this.suggestion = undefined;
  }

  private get statics(): typeof NativeTabElement {
    return this.constructor as typeof NativeTabElement;
  }

  /** Translate a key of the catalog of the plugin. */
  protected text: Translate = (key, params) => (this.statics.translations.t as Translate)(key, params);

  private get unit(): string | undefined {
    return this.hass?.config?.unit_system?.temperature;
  }

  /** Whether a central configuration exists, which the inherited values come from. */
  private get hasCentral(): boolean {
    return this.statics.kind === "central" || Object.keys(this.centralValues).length > 0;
  }

  /** The layout of the tab for the values of the draft. */
  protected layout(): TabLayout {
    const { definition, kind } = this.statics;
    const layoutOf = kind === "thermostat" ? definition.thermostat : definition.central;
    return layoutOf === undefined ? { base: [] } : layoutOf(this.values);
  }

  /** Whether the tab uses the values of the central configuration. */
  private inherits(layout: TabLayout): boolean {
    return layout.inherit !== undefined && this.hasCentral && this.values[layout.inherit] !== false;
  }

  private propose(changes: ConfigValues): void {
    this.proposeChanges(changes);
  }

  private onFieldChange(field: FieldSpec, input: string | boolean): void {
    const value = parseInput(field, input);
    const changes: Record<string, unknown> = { [field.key]: value };
    // Versatile Thermostat gives new values to Auto TPI when the type of learning changes.
    if (field.key === "auto_tpi_learning_type" && value !== this.values[field.key]) {
      Object.assign(changes, autoTpiDefaults(value));
    }
    this.propose(changes);
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (this.hass === undefined) {
      return;
    }
    const layout = this.layout();
    const key = `${this.thermostatId}|${this.statics.kind}`;
    if (layout.presets === true && this.loadedFor !== key) {
      this.loadedFor = key;
      void this.loadPresets();
    }
    if (this.statics.definition.tab === "humidity" && (changed.has("values") || this.suggestion === undefined)) {
      void this.loadSuggestion();
    }
  }

  private async loadPresets(): Promise<void> {
    const hass = this.hass as Hass;
    try {
      const list = await hass.callWS<ThermostatList>({ type: "vtherm_dashboard/get_thermostats" });
      const central = list.central_config_id;
      const own = this.statics.kind === "thermostat" ? this.thermostatId : central;
      const read = async (entryId: string | null) =>
        entryId === null || entryId === "" ? [] : (await hass.callWS<{ presets: PresetData[] }>({ type: "vtherm_dashboard/get_presets", entry_id: entryId })).presets;
      this.presetData = await read(own);
      this.centralPresetData = this.statics.kind === "thermostat" ? await read(central) : [];
    } catch {
      this.presetData = [];
      this.centralPresetData = [];
    }
  }

  private async loadSuggestion(): Promise<void> {
    const sensor = this.values["temperature_sensor_entity_id"];
    if (this.hass === undefined || typeof sensor !== "string" || this.values["humidity_sensor_entity_id"]) {
      this.suggestion = null;
      return;
    }
    try {
      this.suggestion = (await this.hass.callWS<{ entity_id: string | null }>({ type: "vtherm_dashboard/get_humidity_suggestion", temperature_sensor: sensor })).entity_id;
    } catch {
      this.suggestion = null;
    }
  }

  private fieldError(key: string): string | undefined {
    const code = this.errors[key];
    return code === undefined ? undefined : translateErrorCode(shell, code);
  }

  private label(field: FieldSpec): string {
    return this.text(`field.${field.key}`);
  }

  private help(field: FieldSpec): TemplateResult | undefined {
    const key = `help.${field.key}`;
    return key in this.statics.translations.english ? html`<div class="help" id="help-${field.key}">${this.text(key)}</div>` : undefined;
  }

  private optionLabel(field: FieldSpec, option: string): string {
    const key = `option.${field.translation_key ?? field.key}.${option}`;
    return key in this.statics.translations.english ? this.text(key) : option;
  }

  /** Show a value of the central configuration, read-only. */
  private readOnlyValue(field: FieldSpec, value: unknown): string {
    if (value === undefined || value === null || value === "") {
      return t("config.none");
    }
    if (field.kind === "boolean") {
      return value === true ? t("config.yes") : t("config.no");
    }
    if (field.kind === "select") {
      return this.optionLabel(field, String(value));
    }
    return Array.isArray(value) ? value.join(", ") : String(value);
  }

  private renderField(field: FieldSpec, layout: TabLayout): TemplateResult | undefined {
    // The sensor of humidity is only asked for when the feature is on.
    if (field.key === "humidity_sensor_entity_id" && this.values["use_humidity_feature"] !== true) {
      return undefined;
    }
    const id = `field-${field.key}`;
    const error = this.fieldError(field.key);
    const value = shownValue(field, this.values, this.unit);
    const isInherit = field.key === layout.inherit;
    const disabled = isInherit && !this.hasCentral;
    const describedBy = [`help-${field.key}`, error === undefined ? "" : `error-${field.key}`].filter(Boolean).join(" ");
    const errorLine = error === undefined ? undefined : html`<div class="error" id="error-${field.key}" role="alert">${error}</div>`;
    if (field.kind === "boolean") {
      return html`<div class="field boolean">
        <input
          type="checkbox"
          id=${id}
          .checked=${disabled ? false : value === true}
          ?disabled=${disabled}
          aria-describedby=${describedBy}
          aria-invalid=${error === undefined ? "false" : "true"}
          @change=${(event: Event) => this.onFieldChange(field, (event.target as HTMLInputElement).checked)}
        />
        <label class="touch-target" for=${id}>${this.label(field)}</label>
        ${this.help(field)} ${disabled ? html`<div class="note">${t("config.no_central")}</div>` : undefined} ${errorLine}
      </div>`;
    }
    let control: TemplateResult;
    const onInput = (event: Event) => this.onFieldChange(field, (event.target as HTMLInputElement).value);
    if (field.kind === "select") {
      const options = [...(field.options ?? [])];
      if (typeof value === "string" && value !== "" && !options.includes(value)) {
        // An algorithm that a thermostat plugin added is kept.
        options.push(value);
      }
      control = html`<select id=${id} data-value=${value === null || value === undefined ? "" : String(value)} aria-describedby=${describedBy} aria-invalid=${error === undefined ? "false" : "true"} @change=${onInput}>
        ${field.required ? undefined : html`<option value="" ?selected=${value === null || value === undefined || value === ""}>${t("config.none")}</option>`}
        ${options.map((option) => html`<option value=${option} ?selected=${option === value}>${this.optionLabel(field, option)}</option>`)}
      </select>`;
    } else if (field.multiple === true) {
      control = html`<textarea id=${id} placeholder=${t("config.list_hint")} aria-describedby=${describedBy} aria-invalid=${error === undefined ? "false" : "true"} .value=${formatInput(field, value)} @change=${onInput}></textarea>`;
    } else {
      const numeric = field.kind === "number" || field.kind === "integer";
      const listId = field.kind === "entity" ? `${id}-choices` : undefined;
      control = html`<input
          type=${numeric ? "number" : "text"}
          id=${id}
          list=${listId ?? ""}
          min=${field.min ?? ""}
          max=${field.max ?? ""}
          step=${numeric ? String(field.step ?? (field.kind === "integer" ? 1 : "any")) : ""}
          aria-describedby=${describedBy}
          aria-invalid=${error === undefined ? "false" : "true"}
          .value=${formatInput(field, value)}
          @change=${onInput}
        />
        ${listId === undefined ? undefined : html`<datalist id=${listId}>${entityChoices(field, Object.keys(this.hass?.states ?? {})).map((entity) => html`<option value=${entity}></option>`)}</datalist>`}`;
    }
    const suggestion =
      field.key === "humidity_sensor_entity_id" && typeof this.suggestion === "string"
        ? html`<div class="note">${t("config.suggested", { entity: this.suggestion })} <button @click=${() => this.propose({ humidity_sensor_entity_id: this.suggestion })}>${t("config.use_suggestion")}</button></div>`
        : undefined;
    return html`<div class="field">
      <label for=${id}>${this.label(field)}</label>
      ${control} ${this.help(field)} ${suggestion} ${errorLine}
    </div>`;
  }

  private renderInherited(fields: readonly FieldSpec[]): TemplateResult {
    return html`<h3>${t("config.central_values")}</h3>
      <dl>
        ${fields.map((field) => html`<dt>${this.label(field)}</dt><dd>${this.readOnlyValue(field, this.centralValues[field.key])}</dd>`)}
      </dl>`;
  }

  private renderPresets(layout: TabLayout): TemplateResult {
    const inherited = this.statics.kind === "thermostat" && this.inherits(layout);
    const data = inherited ? this.centralPresetData : this.presetData;
    if (data === undefined) {
      return html`<p class="note" role="status">${t("config.loading")}</p>`;
    }
    if (!inherited && data.length === 0) {
      return html`<p class="note">${t("config.presets_after_save")}</p>`;
    }
    const nameOf = (preset: string) => (`preset.${preset}` in this.statics.translations.english ? this.text(`preset.${preset}`) : preset);
    if (inherited) {
      return html`<h3>${t("config.central_values")}</h3>
        <dl>${data.map((preset) => html`<dt>${nameOf(preset.preset)}</dt><dd>${preset.value ?? t("config.none")} ${preset.unit ?? ""}</dd>`)}</dl>`;
    }
    return html`${data.map((preset) => {
      const key = `${PRESET_PREFIX}${preset.preset}`;
      const shown = this.values[key] ?? preset.value;
      const error = this.fieldError(preset.preset);
      return html`<div class="field">
        <label for="preset-${preset.preset}">${nameOf(preset.preset)}${preset.unit === null ? "" : ` (${preset.unit})`}</label>
        <input
          type="number"
          id="preset-${preset.preset}"
          min=${preset.min ?? ""}
          max=${preset.max ?? ""}
          step=${preset.step ?? "any"}
          aria-invalid=${error === undefined ? "false" : "true"}
          .value=${shown === null || shown === undefined ? "" : String(shown)}
          @change=${(event: Event) => {
            const text = (event.target as HTMLInputElement).value;
            const value = Number(text.replace(",", "."));
            if (text.trim() !== "" && Number.isFinite(value)) {
              this.propose({ [key]: value });
            }
          }}
        />
        ${error === undefined ? undefined : html`<div class="error" role="alert">${error}</div>`}
      </div>`;
    })}`;
  }

  protected override updated(): void {
    // The options of a list exist once the list is drawn, so its value is set after: an attribute selected is not enough everywhere.
    for (const select of this.renderRoot.querySelectorAll<HTMLSelectElement>("select[data-value]")) {
      select.value = select.dataset["value"] ?? "";
    }
  }

  protected override render(): TemplateResult {
    const { definition } = this.statics;
    const layout = this.layout();
    const inherited = this.inherits(layout);
    const base = layout.base.flatMap((name) => fieldsOf(name));
    const specific = (layout.specific ?? []).flatMap((name) => fieldsOf(name));
    const extra = inherited ? [] : (layout.extra ?? []).flatMap((name) => fieldsOf(name));
    const descriptionKey = `description.${definition.tab}`;
    const baseError = this.fieldError("base");
    const method = this.values["auto_tpi_calculation_method"];
    return html`<div class="card">
      <h2>${this.text(`title.${definition.tab}`)}</h2>
      ${descriptionKey in this.statics.translations.english ? html`<p class="description">${this.text(descriptionKey)}</p>` : undefined}
      ${baseError === undefined ? undefined : html`<div class="base-error" role="alert">${baseError}</div>`}
      ${base.map((field) => this.renderField(field, layout))}
      ${specific.length === 0 ? undefined : inherited ? this.renderInherited(specific) : specific.map((field) => this.renderField(field, layout))}
      ${extra.map((field) => this.renderField(field, layout))}
      ${extra.some((field) => field.key === "auto_tpi_learning_type") && typeof method === "string"
        ? html`<p class="note">${t("config.calculation_method", { method: t(method === "ema" ? "config.method.ema" : "config.method.average") })}</p>`
        : undefined}
      ${layout.presets === true ? this.renderPresets(layout) : undefined}
    </div>`;
  }
}

/**
 * Define the element of a native tab.
 *
 * @param tag - The tag name of the element.
 * @param definition - The tab.
 * @param kind - The kind of configuration that the element edits.
 * @param translations - The translations of the native plugin.
 */
export function defineNativeTab(tag: string, definition: TabDefinition, kind: ConfigKind, translations: AnyTranslations): void {
  if (customElements.get(tag) !== undefined) {
    return;
  }
  customElements.define(
    tag,
    class extends NativeTabElement {
      static override definition = definition;
      static override kind = kind;
      static override translations = translations;
    },
  );
}
