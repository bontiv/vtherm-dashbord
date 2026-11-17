import { selectorOf } from "@vtherm/dashboard-sdk";
import type { AnyTranslations, ConfigErrors, ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import type { PresetData, ThermostatList } from "../config/api.ts";
import { PRESET_PREFIX } from "../config/draft.ts";
import { translateErrorCode } from "../i18n.ts";
import { shell, t } from "../shell-translations.ts";
import { autoTpiDefaults, definitionOf, entityChoices, formatInput, parseInput, shownValue, valueForSelector, valueFromSelector } from "./fields.ts";
import type { FieldSpec } from "./schemas.ts";
import { fieldsOf } from "./schemas.ts";
import { CENTRAL_REQUIRED_OPTIONS, THERMOSTAT_TYPES } from "./tab-definitions.ts";
import type { ConfigKind, TabDefinition, TabLayout } from "./tab-definitions.ts";
import { commandsByUnderlying, formatBoilerService, formatCommand, needsCommands, parseBoilerService, parseCommand, storedCommands } from "./commands.ts";
import { renderCardActions } from "../components/card-actions.ts";
import type { CardDraft } from "../components/card-actions.ts";
import { haState, isDefined, renderAlert, renderProgress, showMoreInfo } from "../components/ha.ts";
import { narrowStyles } from "../components/narrow-styles.ts";

/** Translate a key that is built at run time. The catalogs of the native plugins have every key of their fields. */
type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** The commands of the underlyings of a thermostat on switch, one for each underlying. */
const COMMAND_FIELDS = new Set(["vswitch_on_command", "vswitch_off_command"]);

/** The services of the central boiler: an entity, a service and an attribute. */
const BOILER_SERVICE_FIELDS = new Set(["central_boiler_activation_service", "central_boiler_deactivation_service"]);

/** The value of the event `value-changed` of a component of Home Assistant. */
type ValueChanged = CustomEvent<{ value: unknown }>;

/** The services of Home Assistant, which the dashboard reads to know whether the service picker offers a service. */
type HassWithServices = Hass & { readonly services?: Readonly<Record<string, Readonly<Record<string, unknown>>>> };

/** The base class of the native tabs: it shows the forms of one tab of the flow of Versatile Thermostat and proposes the changes to the draft. */
export class NativeTabElement extends LitElement {
  static override properties = {
    hass: { attribute: false },
    thermostatId: { type: String },
    values: { attribute: false },
    centralValues: { attribute: false },
    errors: { attribute: false },
    proposeChanges: { attribute: false },
    draft: { attribute: false },
    creating: { type: Boolean },
    language: { type: String },
    narrow: { type: Boolean },
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
      ha-card {
        display: block;
        max-width: 760px;
      }
      .card-content {
        padding: 0 16px 16px;
      }
      /* fallback: the card of the tab when ha-card is not defined. */
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
      fieldset.type {
        margin: 12px 0;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
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
      ha-selector,
      ha-service-picker {
        display: block;
      }
      ha-expansion-panel {
        margin: 12px 0;
      }
      .commands .row {
        display: grid;
        gap: 8px;
        padding: 8px 0;
        border-top: 1px solid var(--divider-color);
      }
      .commands .entity {
        font-weight: 500;
      }
      .commands .requirement {
        color: var(--secondary-text-color);
      }
      .entity-link {
        padding: 0;
        font: inherit;
        color: var(--primary-color);
        background: none;
        border: 0;
        cursor: pointer;
        text-align: inherit;
      }
      .progress {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--secondary-text-color);
      }
      /* fallback: the controls and the messages of the fallback, when the components of Home Assistant are not defined. */
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
      .error,
      .alert.error {
        color: var(--error-color);
      }
      .alert {
        margin: 0 0 12px;
        padding: 8px 12px;
        border: 1px solid currentColor;
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
      button.fallback {
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
  /** The state of the draft and its commands: the save actions at the foot of the card. None when the configuration cannot be saved. */
  declare draft: CardDraft | undefined;
  /** Whether the section belongs to the creation of a thermostat: the section Type then starts with the choice of the type. */
  declare creating: boolean;
  declare language: string;
  declare narrow: boolean;
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
    this.draft = undefined;
    this.creating = false;
    this.language = "";
    this.narrow = false;
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
  /**
   * Whether a field is an option that needs the central configuration while there is none: Versatile Thermostat refuses it, so it is
   * disabled and shown off.
   */
  private needsMissingCentral(field: FieldSpec, layout: TabLayout): boolean {
    return !this.hasCentral && (field.key === layout.inherit || CENTRAL_REQUIRED_OPTIONS.has(field.key));
  }

  private inherits(layout: TabLayout): boolean {
    return layout.inherit !== undefined && this.hasCentral && this.values[layout.inherit] !== false;
  }

  private propose(changes: ConfigValues): void {
    this.proposeChanges(changes);
  }

  /** Propose the new value of a field. */
  private applyChange(field: FieldSpec, value: unknown): void {
    const changes: Record<string, unknown> = { [field.key]: value };
    // Versatile Thermostat gives new values to Auto TPI when the type of learning changes.
    if (field.key === "auto_tpi_learning_type" && value !== this.values[field.key]) {
      Object.assign(changes, autoTpiDefaults(value));
    }
    this.propose(changes);
  }

  /** The user changed a control of the fallback. */
  private onFieldChange(field: FieldSpec, input: string | boolean): void {
    this.applyChange(field, parseInput(field, input));
  }

  /** The user changed a control of Home Assistant. */
  private onSelectorChange(field: FieldSpec, event: ValueChanged): void {
    event.stopPropagation();
    this.applyChange(field, valueFromSelector(field, event.detail.value));
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

  private helpText(field: FieldSpec): string | undefined {
    const key = `help.${field.key}`;
    return key in this.statics.translations.english ? this.text(key) : undefined;
  }

  private help(field: FieldSpec): TemplateResult | undefined {
    const text = this.helpText(field);
    return text === undefined ? undefined : html`<div class="help" id="help-${field.key}">${text}</div>`;
  }

  private optionLabel(field: FieldSpec, option: string): string {
    const key = `option.${field.translation_key ?? field.key}.${option}`;
    return key in this.statics.translations.english ? this.text(key) : option;
  }

  /** The name of an entity, as Home Assistant shows it, and its identifier when it has none. */
  private entityName(entityId: string): string {
    const name = (this.hass?.states[entityId]?.attributes["friendly_name"] as string | undefined) ?? "";
    return name === "" ? entityId : `${name} (${entityId})`;
  }

  /** An entity shown outside a picker: a click opens its card in Home Assistant. */
  private renderEntity(entityId: string): TemplateResult | string {
    if (this.hass?.states[entityId] === undefined) {
      return entityId;
    }
    // fallback: a link button rather than ha-button, which would be too heavy inside a line of text.
    return html`<button class="entity-link" @click=${(event: Event) => showMoreInfo(event.currentTarget as EventTarget, entityId, this.hass?.states)}>${this.entityName(entityId)}</button>`;
  }

  /** Show a value of the central configuration, read-only. */
  private readOnlyValue(field: FieldSpec, value: unknown): TemplateResult | string {
    if (value === undefined || value === null || value === "") {
      return t("config.none");
    }
    if (field.kind === "boolean") {
      return value === true ? t("config.yes") : t("config.no");
    }
    if (field.kind === "select") {
      return this.optionLabel(field, String(value));
    }
    if (field.kind === "entity") {
      const entities = Array.isArray(value) ? value.map(String) : [String(value)];
      return html`${entities.map((entity, index) => html`${index === 0 ? "" : ", "}${this.renderEntity(entity)}`)}`;
    }
    return Array.isArray(value) ? value.join(", ") : String(value);
  }

  /** A button of Home Assistant, or a plain button when `ha-button` is not defined. */
  private renderButton(label: string, onClick: () => void): TemplateResult {
    if (isDefined("ha-button")) {
      return html`<ha-button appearance="plain" size="small" @click=${onClick}>${label}</ha-button>`;
    }
    // fallback: ha-button is not defined.
    return html`<button class="fallback" @click=${onClick}>${label}</button>`;
  }

  /** The choice of the type of the new thermostat: the selector of Home Assistant as a list of choices, or radio buttons as the fallback. */
  private renderTypeChoice(ha: boolean): TemplateResult {
    const current = String(this.values["thermostat_type"] ?? THERMOSTAT_TYPES[0]);
    const label = (type: string) => (t as (key: string) => string)(`shell.thermostats.type.${type.replace("thermostat_", "")}`);
    const choose = (type: unknown) => {
      if (THERMOSTAT_TYPES.includes(type as (typeof THERMOSTAT_TYPES)[number]) && type !== current) {
        this.propose({ thermostat_type: type });
      }
    };
    if (ha) {
      return html`<div class="field" data-key="thermostat_type">
        <ha-selector
          class="type"
          .hass=${this.hass}
          .selector=${{ select: { options: THERMOSTAT_TYPES.map((type) => ({ value: type, label: label(type) })), mode: "list" } }}
          .value=${current}
          .label=${t("creation.type")}
          .required=${true}
          @value-changed=${(event: ValueChanged) => {
            event.stopPropagation();
            choose(event.detail.value);
          }}
        ></ha-selector>
      </div>`;
    }
    // fallback: radio buttons, when ha-selector is not defined. The label is the touch target of its button.
    return html`<fieldset class="type">
      <legend>${t("creation.type")}</legend>
      ${THERMOSTAT_TYPES.map(
        (type) => html`<label><input type="radio" name="thermostat_type" .value=${type} .checked=${type === current} @change=${() => choose(type)} /> ${label(type)}</label>`,
      )}
    </fieldset>`;
  }

  private renderSuggestion(field: FieldSpec): TemplateResult | undefined {
    if (field.key !== "humidity_sensor_entity_id" || typeof this.suggestion !== "string") {
      return undefined;
    }
    const entity = this.suggestion;
    return html`<div class="note">
      ${t("config.suggested", { entity: "" })}${this.renderEntity(entity)}
      ${this.renderButton(t("config.use_suggestion"), () => this.propose({ humidity_sensor_entity_id: entity }))}
    </div>`;
  }

  private renderField(field: FieldSpec, layout: TabLayout, ha: boolean): TemplateResult | undefined {
    // The sensor of humidity is only asked for when the feature is on.
    if (field.key === "humidity_sensor_entity_id" && this.values["use_humidity_feature"] !== true) {
      return undefined;
    }
    if (COMMAND_FIELDS.has(field.key)) {
      return this.renderCommands(field, ha);
    }
    if (ha && BOILER_SERVICE_FIELDS.has(field.key)) {
      return this.renderBoilerService(field);
    }
    return ha ? this.renderSelector(field, layout) : this.renderFallbackField(field, layout);
  }

  /** A field drawn with the `ha-selector` of Home Assistant. */
  private renderSelector(field: FieldSpec, layout: TabLayout): TemplateResult {
    const error = this.fieldError(field.key);
    const value = shownValue(field, this.values, this.unit);
    const disabled = this.needsMissingCentral(field, layout);
    // An option that a thermostat plugin added is kept.
    const extra = field.kind === "select" && typeof value === "string" && value !== "" && !(field.options ?? []).includes(value) ? [value] : [];
    const selector = selectorOf(definitionOf(field, (option) => this.optionLabel(field, option), extra));
    return html`<div class="field" data-key=${field.key}>
      <ha-selector
        .hass=${this.hass}
        .selector=${selector}
        .value=${disabled ? false : valueForSelector(field, value)}
        .label=${this.label(field)}
        .helper=${this.helpText(field)}
        .required=${field.required}
        .disabled=${disabled}
        @value-changed=${(event: ValueChanged) => this.onSelectorChange(field, event)}
      ></ha-selector>
      ${disabled ? html`<div class="note">${t("config.no_central")}</div>` : undefined} ${this.renderSuggestion(field)}
      ${error === undefined ? undefined : renderAlert("error", error, "field-error")}
    </div>`;
  }

  /** Whether Home Assistant has a service, so that its picker can show it. */
  private hasService(domain: string, service: string): boolean {
    const services = (this.hass as HassWithServices | undefined)?.services;
    // Without the list of the services, the picker is trusted.
    return services === undefined || services[domain]?.[service] !== undefined;
  }

  /** A text field of Home Assistant, used for a command that the picker cannot show. */
  private renderTextSelector(label: string, value: string, onChange: (value: string) => void): TemplateResult {
    return html`<ha-selector
      .hass=${this.hass}
      .selector=${{ text: {} }}
      .value=${value}
      .label=${label}
      .required=${false}
      @value-changed=${(event: ValueChanged) => {
        event.stopPropagation();
        onChange(String(event.detail.value ?? "").trim());
      }}
    ></ha-selector>`;
  }

  /**
   * The service and the attribute of a command, with the service picker of Home Assistant. A command that the picker cannot show (a
   * text with another format, a service that Home Assistant does not list, or no picker) is shown as it is in a text field.
   */
  private renderCommandControls(domain: string, text: string, onChange: (text: string) => void): TemplateResult {
    const parsed = text === "" ? { service: "", attribute: "" } : parseCommand(text);
    if (parsed === undefined || !isDefined("ha-service-picker") || (parsed.service !== "" && !this.hasService(domain, parsed.service))) {
      return this.renderTextSelector(t("config.command.raw"), text, onChange);
    }
    return html`<ha-service-picker
        .hass=${this.hass}
        .value=${parsed.service === "" ? "" : `${domain}.${parsed.service}`}
        .label=${t("config.command.service")}
        @value-changed=${(event: ValueChanged) => {
          event.stopPropagation();
          const picked = String(event.detail.value ?? "");
          // The configuration stores the name of the service without its domain: the domain is the one of the entity.
          onChange(formatCommand({ service: picked.includes(".") ? picked.slice(picked.indexOf(".") + 1) : picked, attribute: parsed.attribute }));
        }}
      ></ha-service-picker>
      ${this.renderTextSelector(t("config.command.attribute"), parsed.attribute, (attribute) => onChange(formatCommand({ service: parsed.service, attribute })))}`;
  }

  /** The commands of a thermostat on switch: one for each underlying, in front of it. */
  private renderCommands(field: FieldSpec, ha: boolean): TemplateResult {
    const underlyings = Array.isArray(this.values["underlying_entity_ids"]) ? (this.values["underlying_entity_ids"] as unknown[]).map(String) : [];
    const commands = commandsByUnderlying(this.values[field.key], underlyings.length);
    const error = this.fieldError(field.key);
    const set = (index: number, text: string) => {
      const next = [...commands];
      next[index] = text;
      this.applyChange(field, storedCommands(next));
    };
    const id = (index: number) => (index === 0 ? `field-${field.key}` : `field-${field.key}-${index}`);
    const rows = commands.map((text, index) => {
      const entity = underlyings[index];
      const requirement = entity === undefined ? "" : needsCommands(entity) ? t("config.command.required") : t("config.command.optional");
      const control = ha
        ? this.renderCommandControls(entity?.split(".")[0] ?? "", text, (value) => set(index, value))
        : // fallback: one plain text field for each underlying, when ha-selector is not defined.
          html`<input type="text" id=${id(index)} .value=${text} @change=${(event: Event) => set(index, (event.target as HTMLInputElement).value.trim())} />`;
      return html`<div class="row" data-index=${index}>
        <div><span class="entity">${entity === undefined ? "" : this.renderEntity(entity)}</span> <span class="requirement">${requirement}</span></div>
        ${control}
      </div>`;
    });
    return html`<div class="field commands" data-key=${field.key}>
      ${ha ? html`<div class="label"><strong>${this.label(field)}</strong></div>` : html`<label for=${id(0)}>${this.label(field)}</label>`} ${this.help(field)}
      ${underlyings.length === 0 && commands.length === 0 ? html`<div class="note">${t("config.command.no_underlying")}</div>` : rows}
      ${error === undefined ? undefined : renderAlert("error", error, "field-error")}
    </div>`;
  }

  /** A service of the central boiler: the entity, the service and the attribute, stored as `entity_id/service[/attribute:value]`. */
  private renderBoilerService(field: FieldSpec): TemplateResult {
    const text = typeof this.values[field.key] === "string" ? (this.values[field.key] as string) : "";
    const parsed = text === "" ? { entity: "", service: "", attribute: "" } : parseBoilerService(text);
    const error = this.fieldError(field.key);
    const store = (value: string) => this.applyChange(field, value === "" ? null : value);
    const controls =
      parsed === undefined
        ? this.renderTextSelector(this.label(field), text, store)
        : html`<ha-selector
              .hass=${this.hass}
              .selector=${{ entity: {} }}
              .value=${parsed.entity === "" ? undefined : parsed.entity}
              .label=${t("config.boiler.entity")}
              .required=${false}
              @value-changed=${(event: ValueChanged) => {
                event.stopPropagation();
                store(formatBoilerService({ ...parsed, entity: String(event.detail.value ?? "") }));
              }}
            ></ha-selector>
            ${parsed.entity === ""
              ? undefined
              : this.renderCommandControls(parsed.entity.split(".")[0] ?? "", formatCommand(parsed), (command) => {
                  const next = command === "" ? { service: "", attribute: "" } : (parseCommand(command) ?? { service: command, attribute: "" });
                  store(formatBoilerService({ entity: parsed.entity, ...next }));
                })}`;
    return html`<div class="field boiler-service" data-key=${field.key}>
      ${parsed === undefined ? undefined : html`<div class="label"><strong>${this.label(field)}</strong></div>`} ${this.help(field)} ${controls}
      ${error === undefined ? undefined : renderAlert("error", error, "field-error")}
    </div>`;
  }

  /** A field drawn with the plain HTML controls, when the components of Home Assistant are not defined. */
  private renderFallbackField(field: FieldSpec, layout: TabLayout): TemplateResult {
    const id = `field-${field.key}`;
    const error = this.fieldError(field.key);
    const value = shownValue(field, this.values, this.unit);
    const disabled = this.needsMissingCentral(field, layout);
    const describedBy = [`help-${field.key}`, error === undefined ? "" : `error-${field.key}`].filter(Boolean).join(" ");
    const errorLine = error === undefined ? undefined : html`<div class="error" id="error-${field.key}" role="alert">${error}</div>`;
    // fallback: the controls below replace ha-selector when it is not defined (an old version of Home Assistant, or out of it).
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
      // fallback: one entity per line, when the entity selector of Home Assistant is not defined.
      control = html`<textarea id=${id} placeholder=${t("config.list_hint")} aria-describedby=${describedBy} aria-invalid=${error === undefined ? "false" : "true"} .value=${formatInput(field, value)} @change=${onInput}></textarea>`;
    } else {
      const numeric = field.kind === "number" || field.kind === "integer";
      const listId = field.kind === "entity" ? `${id}-choices` : undefined;
      // fallback: a plain input with the entities offered in a datalist, when ha-selector is not defined.
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
    return html`<div class="field">
      <label for=${id}>${this.label(field)}</label>
      ${control} ${this.help(field)} ${this.renderSuggestion(field)} ${errorLine}
    </div>`;
  }

  private renderInherited(fields: readonly FieldSpec[]): TemplateResult {
    return html`<h3>${t("config.central_values")}</h3>
      <dl>
        ${fields.map((field) => html`<dt>${this.label(field)}</dt><dd>${this.readOnlyValue(field, this.centralValues[field.key])}</dd>`)}
      </dl>`;
  }

  /** The temperature of a preset, with the selector `number` of Home Assistant, or a plain input as the fallback. */
  private renderPresetControl(preset: PresetData, shown: unknown, error: string | undefined, label: string, ha: boolean): TemplateResult {
    const key = `${PRESET_PREFIX}${preset.preset}`;
    if (ha) {
      const selector = { number: { ...(preset.min === null ? {} : { min: preset.min }), ...(preset.max === null ? {} : { max: preset.max }), step: preset.step ?? "any", mode: "box", ...(preset.unit === null ? {} : { unit_of_measurement: preset.unit }) } };
      return html`<ha-selector
        .hass=${this.hass}
        .selector=${selector}
        .value=${shown === null || shown === undefined ? undefined : shown}
        .label=${label}
        .required=${false}
        @value-changed=${(event: ValueChanged) => {
          event.stopPropagation();
          const value = Number(event.detail.value);
          if (event.detail.value !== undefined && event.detail.value !== "" && Number.isFinite(value)) {
            this.propose({ [key]: value });
          }
        }}
      ></ha-selector>`;
    }
    // fallback: a plain number input, when ha-selector is not defined.
    return html`<label for="preset-${preset.preset}">${label}${preset.unit === null ? "" : ` (${preset.unit})`}</label>
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
      />`;
  }

  private renderPresets(layout: TabLayout, ha: boolean): TemplateResult {
    const inherited = this.statics.kind === "thermostat" && this.inherits(layout);
    const data = inherited ? this.centralPresetData : this.presetData;
    if (data === undefined) {
      return renderProgress(t("config.loading"));
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
      return html`<div class="field" data-key=${key}>
        ${this.renderPresetControl(preset, shown, error, nameOf(preset.preset), ha)}
        ${error === undefined ? undefined : renderAlert("error", error, "field-error")}
      </div>`;
    })}`;
  }

  protected override updated(): void {
    // The options of a list exist once the list is drawn, so its value is set after: an attribute selected is not enough everywhere.
    for (const select of this.renderRoot.querySelectorAll<HTMLSelectElement>("select[data-value]")) {
      select.value = select.dataset["value"] ?? "";
    }
  }

  /** The fields of a long group: in a panel of Home Assistant that opens, open when one of its fields is refused. */
  private renderGroup(fields: readonly FieldSpec[], layout: TabLayout, ha: boolean): TemplateResult | TemplateResult[] {
    const drawn = fields.map((field) => this.renderField(field, layout, ha)).filter((item): item is TemplateResult => item !== undefined);
    if (!ha || fields.length === 0 || !isDefined("ha-expansion-panel")) {
      return drawn;
    }
    const refused = fields.some((field) => this.errors[field.key] !== undefined);
    return html`<ha-expansion-panel outlined .header=${t("config.more_settings")} .expanded=${refused}>${drawn}</ha-expansion-panel>`;
  }

  protected override render(): TemplateResult {
    const state = haState(this);
    if (state === "waiting") {
      return renderProgress(t("config.waiting"));
    }
    const ha = state === "ready";
    const { definition } = this.statics;
    const layout = this.layout();
    const inherited = this.inherits(layout);
    const base = layout.base.flatMap((name) => fieldsOf(name));
    const specific = (layout.specific ?? []).flatMap((name) => fieldsOf(name));
    const extra = inherited ? [] : (layout.extra ?? []).flatMap((name) => fieldsOf(name));
    const descriptionKey = `description.${definition.tab}`;
    const baseError = this.fieldError("base");
    const method = this.values["auto_tpi_calculation_method"];
    const title = this.text(`title.${definition.tab}`);
    const content = html`${this.creating && definition.tab === "type" ? this.renderTypeChoice(ha) : undefined}
    ${descriptionKey in this.statics.translations.english ? html`<p class="description">${this.text(descriptionKey)}</p>` : undefined}
    ${baseError === undefined ? undefined : renderAlert("error", baseError, "base-error")} ${base.map((field) => this.renderField(field, layout, ha))}
    ${specific.length === 0 ? undefined : inherited ? this.renderInherited(specific) : specific.map((field) => this.renderField(field, layout, ha))}
    ${this.renderGroup(extra, layout, ha)}
    ${extra.some((field) => field.key === "auto_tpi_learning_type") && typeof method === "string"
      ? html`<p class="note">${t("config.calculation_method", { method: t(method === "ema" ? "config.method.ema" : "config.method.average") })}</p>`
      : undefined}
    ${layout.presets === true ? this.renderPresets(layout, ha) : undefined}`;
    const actions = renderCardActions(this.draft, this.language);
    if (ha && isDefined("ha-card")) {
      return html`<ha-card .header=${title}><div class="card-content">${content}</div>${actions}</ha-card>`;
    }
    // fallback: a plain card, when ha-card is not defined.
    return html`<div class="card"><h2>${title}</h2>${content}${actions}</div>`;
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
