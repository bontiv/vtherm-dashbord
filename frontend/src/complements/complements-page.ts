/** The pages of the add-ons: the list of the catalog, the list of the installed add-ons, and the page of an add-on. */
import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html, nothing } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { followLink, openHomeAssistantPage, setPageTitle } from "../components/events.ts";
import { createFormatters, resolveLocalizedField, userLanguage } from "../i18n.ts";
import { buildPath } from "../router.ts";
import { en as english } from "./catalogs.ts";
import { HACS_DOCUMENTATION, MIN_HACS_VERSION, hacsLink } from "./hacs-client.ts";
import { complementsModel } from "./model.ts";
import { plainText, sanitizeDescription } from "./sanitize.ts";
import { configFlowPath } from "./states.ts";
import { text } from "./translations.ts";
import { COMPLEMENT_STATES } from "./types.ts";
import type { Complement, ComplementState } from "./types.ts";
import { narrowStyles } from "../components/narrow-styles.ts";
import { haState, isDefined, renderAlert, renderButton, renderDialog, renderProgress } from "../components/ha.ts";

/** The value of the choice "all" of a filter in the selector of Home Assistant, which reads an empty value as no choice. */
const ALL = "__all__";

/** The identifiers of the contributions of the plugin. */
export const COMPLEMENTS_TOP_TAB = "core_complements.top.complements";
export const CATALOG_PAGE = "core_complements.page.catalog";
export const INSTALLED_PAGE = "core_complements.page.installed";

/** The criteria of the list. An empty value means all. */
interface Filters {
  query: string;
  type: string;
  family: string;
  certification: string;
  state: string;
}

const EMPTY_FILTERS: Filters = { query: "", type: "", family: "", certification: "", state: "" };

type Dialog = { readonly kind: "install" } | { readonly kind: "restart" };

const typeKey = (complement: Complement): string => (complement.known_type ? `type.${complement.type}` : "type.unknown");

/** The base of the two pages. The menu entry decides which add-ons the list holds. */
class ComplementsPageBase extends LitElement {
  static override properties = {
    hass: { attribute: false },
    subpath: { attribute: false },
    language: { type: String },
    narrow: { type: Boolean },
    filters: { state: true },
    dialog: { state: true },
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
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 500;
    }
    .toolbar,
    .filters,
    .actions,
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
    }
    .toolbar {
      margin-bottom: 12px;
    }
    .filters {
      margin-bottom: 16px;
    }
    label {
      display: grid;
      gap: 2px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    input,
    select,
    button {
      font: inherit;
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      padding: 6px 8px;
    }
    button {
      cursor: pointer;
    }
    button.primary {
      color: var(--text-primary-color);
      background-color: var(--primary-color);
      border: 0;
      padding: 8px 16px;
    }
    button[disabled] {
      opacity: 0.5;
      cursor: default;
    }
    ul.cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    ha-card.card {
      display: block;
      height: 100%;
    }
    ha-card .card-content {
      padding: 12px 16px;
    }
    /* fallback: the card and the panels drawn without ha-card and ha-alert. */
    li.card,
    div.panel {
      padding: 12px 16px;
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .card a.name {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
      text-decoration: none;
    }
    .excerpt {
      margin: 8px 0;
      color: var(--secondary-text-color);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .badge {
      padding: 2px 8px;
      font-size: 12px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
    }
    .badge.state-configured,
    .badge.state-installed {
      color: var(--success-color, var(--primary-color));
    }
    .badge.state-restart_required,
    .badge.state-to_configure {
      color: var(--warning-color);
    }
    .banner {
      margin: 0 0 12px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
    }
    .banner.warning {
      border-color: var(--warning-color);
    }
    .banner.error {
      border-color: var(--error-color);
      color: var(--error-color);
    }
    .message {
      padding: 24px 0;
      color: var(--secondary-text-color);
    }
    .description {
      margin: 16px 0;
    }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--divider-color);
    }
    .dialog {
      max-width: 480px;
      padding: 16px 24px;
      background-color: var(--card-background-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    dl {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 4px 16px;
    }
    dt {
      color: var(--secondary-text-color);
    }
    dd {
      margin: 0;
    }
  `,
  ];

  declare hass: Hass | undefined;
  /** The segments after the page in the address: the identifier of an add-on opens its page. */
  declare subpath: readonly string[];
  /** Changes with the language, so that the page draws its texts again. */
  declare language: string;
  declare narrow: boolean;
  declare filters: Filters;
  declare dialog: Dialog | undefined;
  declare revision: number;

  /** The identifier of the menu entry that shows this page. */
  protected pageId = CATALOG_PAGE;
  /** Whether the list holds only the installed add-ons. */
  protected installedOnly = false;

  private stop: (() => void) | undefined;
  private titled: string | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.subpath = [];
    this.language = "";
    this.narrow = false;
    this.filters = EMPTY_FILTERS;
    this.dialog = undefined;
    this.revision = 0;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.stop = complementsModel.subscribe(() => {
      this.revision += 1;
    });
    complementsModel.attach(this.hass);
    if (complementsModel.response === undefined && !complementsModel.loading) {
      void complementsModel.load();
    }
  }

  override disconnectedCallback(): void {
    this.stop?.();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("hass")) {
      complementsModel.attach(this.hass);
      if (changed.get("hass") === undefined && complementsModel.response === undefined && !complementsModel.loading) {
        void complementsModel.load();
      }
    }
  }

  private get languageTag(): string {
    return this.hass === undefined ? "en" : userLanguage(this.hass);
  }

  private descriptionOf(complement: Complement): string {
    return resolveLocalizedField(complement as unknown as Record<string, unknown>, "description", this.languageTag) ?? "";
  }

  private date(seconds: number): string {
    return this.hass === undefined ? new Date(seconds * 1000).toISOString() : createFormatters(this.hass).dateTime(new Date(seconds * 1000));
  }

  private visible(): Complement[] {
    const { query, type, family, certification, state } = this.filters;
    const needle = query.trim().toLowerCase();
    return (complementsModel.response?.complements ?? []).filter((complement) => {
      const current = complementsModel.stateOf(complement);
      if (this.installedOnly && !["installed", "restart_required", "to_configure", "configured"].includes(current)) {
        return false;
      }
      if ((type !== "" && complement.type !== type) || (family !== "" && complement.family !== family) || (certification !== "" && complement.certification !== certification) || (state !== "" && current !== state)) {
        return false;
      }
      return needle === "" || complement.name.toLowerCase().includes(needle) || plainText(this.descriptionOf(complement)).toLowerCase().includes(needle);
    });
  }

  private setFilter(name: keyof Filters, value: string): void {
    this.filters = { ...this.filters, [name]: value };
  }

  /** Whether the components of Home Assistant are drawn, rather than the fallback. */
  private ha = false;

  private pathOf(complement?: Complement): string {
    return buildPath({ tab: COMPLEMENTS_TOP_TAB, entry: this.pageId, rest: complement === undefined ? [] : [complement.id] });
  }

  private banners(): TemplateResult | typeof nothing {
    const model = complementsModel;
    const response = model.response;
    return html`${model.restart === "restarting" ? renderAlert("warning", text("restart.reconnecting"), "banner warning") : nothing}
    ${model.restart === "timeout" ? renderAlert("error", text("restart.timeout"), "banner error") : nothing}
    ${response?.stale === true ? renderAlert("warning", text("stale", { date: this.date(response.fetched_at) }), "banner warning") : nothing}
    ${response !== undefined && response.warnings.some((warning) => warning.startsWith("entry ")) ? renderAlert("info", text("warnings"), "banner") : nothing}`;
  }

  private hacsNotice(): TemplateResult | typeof nothing {
    const { hacs, hacsFailure } = complementsModel;
    if (hacs.kind === "ready" && hacsFailure === undefined) {
      return nothing;
    }
    const message =
      hacs.kind === "absent"
        ? text("hacs.absent")
        : hacs.kind === "disabled"
          ? text("hacs.disabled", { reason: hacs.reason })
          : hacs.kind === "unsupported"
            ? text("hacs.unsupported", { version: hacs.version, minimum: MIN_HACS_VERSION })
            : text("hacs.broken", { message: hacs.kind === "broken" ? hacs.message : (hacsFailure?.message ?? "") });
    return renderAlert("warning", html`${message} <a href=${HACS_DOCUMENTATION} target="_blank" rel="noopener noreferrer">${text("hacs.docs")}</a>`, "banner warning");
  }

  private select(name: keyof Filters, label: string, values: readonly [string, string][]): TemplateResult {
    if (this.ha) {
      // The selector reads an empty value as no choice: "all" has its own value, so that it is shown.
      const options = [{ value: ALL, label: text("filter.all") }, ...values.map(([value, title]) => ({ value, label: title }))];
      return html`<ha-selector
        class="filter"
        data-name=${name}
        .hass=${this.hass}
        .selector=${{ select: { options, mode: "dropdown" } }}
        .value=${this.filters[name] === "" ? ALL : this.filters[name]}
        .label=${label}
        .required=${false}
        @value-changed=${(event: CustomEvent<{ value: unknown }>) => {
          event.stopPropagation();
          const value = String(event.detail.value ?? "");
          this.setFilter(name, value === ALL ? "" : value);
        }}
      ></ha-selector>`;
    }
    // fallback: a plain list, when ha-selector is not defined.
    return html`<label
      >${label}
      <select name=${name} .value=${this.filters[name]} @change=${(event: Event) => this.setFilter(name, (event.target as HTMLSelectElement).value)}>
        <option value="">${text("filter.all")}</option>
        ${values.map(([value, title]) => html`<option value=${value} ?selected=${this.filters[name] === value}>${title}</option>`)}
      </select></label
    >`;
  }

  private renderFilters(): TemplateResult {
    const all = complementsModel.response?.complements ?? [];
    const distinct = (pick: (complement: Complement) => string): string[] => [...new Set(all.map(pick))].sort();
    const search = this.ha
      ? html`<ha-selector
          class="filter"
          data-name="query"
          .hass=${this.hass}
          .selector=${{ text: { type: "search" } }}
          .value=${this.filters.query}
          .label=${text("search.label")}
          .helper=${text("search.placeholder")}
          .required=${false}
          @value-changed=${(event: CustomEvent<{ value: unknown }>) => {
            event.stopPropagation();
            this.setFilter("query", String(event.detail.value ?? ""));
          }}
        ></ha-selector>`
      : undefined;
    return html`<div class="filters">
      ${search ??
      // fallback: a plain search field, when ha-selector is not defined.
      html`<label
        >${text("search.label")}
        <input type="search" name="query" placeholder=${text("search.placeholder")} .value=${this.filters.query} @input=${(event: Event) => this.setFilter("query", (event.target as HTMLInputElement).value)} />
      </label>`}
      ${this.select("type", text("filter.type"), distinct((complement) => complement.type).map((type) => [type, text(all.find((complement) => complement.type === type)?.known_type === true ? `type.${type}` : "type.unknown")]))}
      ${this.select("family", text("filter.family"), distinct((complement) => complement.family).map((family) => [family, this.known("family", family)]))}
      ${this.select("certification", text("filter.certification"), distinct((complement) => complement.certification).map((certification) => [certification, this.known("certification", certification)]))}
      ${this.select("state", text("filter.state"), COMPLEMENT_STATES.map((state) => [state, text(`state.${state}`)]))}
    </div>`;
  }

  /** The translation of a value of the catalog, or the value itself when the catalog has a new one. */
  private known(prefix: string, value: string): string {
    const key = `${prefix}.${value}`;
    return key in english ? text(key) : value;
  }

  private badge(state: ComplementState): TemplateResult {
    return html`<span class="badge state-${state}">${text(`state.${state}`)}</span>`;
  }

  private renderList(): TemplateResult {
    const visible = this.visible();
    return html`<div class="toolbar">
        <h2>${text(this.installedOnly ? "page.installed" : "page.catalog")}</h2>
        ${renderButton(text(complementsModel.loading ? "refreshing" : "refresh"), () => void complementsModel.load(true), { className: "refresh", disabled: complementsModel.loading, plain: true })}
        ${complementsModel.response === undefined ? nothing : html`<span class="meta">${text("fetched", { date: this.date(complementsModel.response.fetched_at) })}</span>`}
      </div>
      ${this.banners()} ${this.hacsNotice()} ${this.renderFilters()}
      ${visible.length === 0
        ? renderAlert("info", text(this.installedOnly ? "empty.installed" : "empty.catalog"), "message")
        : html`<ul class="cards">
            ${visible.map((complement) => {
              const path = this.pathOf(complement);
              const content = html`<a class="name touch-target" href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>${complement.name}</a>
                <div class="meta">
                  <span class="badge">${text(typeKey(complement))}</span>
                  <span class="badge">${this.known("family", complement.family)}</span>
                  <span class="badge">${this.known("certification", complement.certification)}</span>
                  ${this.badge(complementsModel.stateOf(complement))}
                </div>
                <div class="excerpt">${plainText(this.descriptionOf(complement))}</div>
                ${complement.author === null ? nothing : html`<div class="meta">${text("detail.author")}: ${complement.author}</div>`}`;
              // fallback: the plain card of the list, when ha-card is not defined.
              return isDefined("ha-card") ? html`<li class="item"><ha-card class="card"><div class="card-content">${content}</div></ha-card></li>` : html`<li class="card">${content}</li>`;
            })}
          </ul>`}`;
  }

  private renderDetail(id: string): TemplateResult {
    const complement = complementsModel.response?.complements.find((candidate) => candidate.id === id);
    if (complement === undefined) {
      return html`${renderAlert("info", text("detail.not_found"), "message")}
        <a class="touch-target" href=${this.pathOf()} @click=${(event: MouseEvent) => followLink(this, event, this.pathOf())}>${text("detail.back")}</a>`;
    }
    if (this.titled !== complement.name) {
      this.titled = complement.name;
      queueMicrotask(() => setPageTitle(this, complement.name));
    }
    const model = complementsModel;
    const state = model.stateOf(complement);
    const progress = model.progressOf(complement);
    const repository = model.repositoryOf(complement);
    const description = this.descriptionOf(complement);
    const installFailure = progress.error === undefined ? undefined : this.installFailure(progress.error.code, progress.error.message);
    const outcome = progress.outcome;
    return html`<a class="touch-target" href=${this.pathOf()} @click=${(event: MouseEvent) => followLink(this, event, this.pathOf())}>${text("detail.back")}</a>
      <h2>${complement.name}</h2>
      <div class="meta">
        <span class="badge">${text(typeKey(complement))}</span>
        <span class="badge">${this.known("family", complement.family)}</span>
        <span class="badge">${this.known("certification", complement.certification)}</span>
        ${this.badge(state)}
      </div>
      ${this.banners()} ${this.hacsNotice()}
      <div class="description">${description === "" ? nothing : unsafeHTML(sanitizeDescription(description))}</div>
      <dl>
        ${complement.author === null ? nothing : html`<dt>${text("detail.author")}</dt><dd>${complement.author}</dd>`}
        ${complement.link === null ? nothing : html`<dt>${text("detail.source")}</dt><dd><a class="breakable touch-target" href=${complement.link} target="_blank" rel="noopener noreferrer">${complement.link}</a></dd>`}
      </dl>
      ${state === "link_only" ? html`<p>${text("detail.link_only")}</p>` : nothing}
      ${progress.running || progress.step !== undefined
        ? html`<div class="panel steps">${progress.running ? renderProgress(progress.step === undefined ? text("loading") : text(`step.${progress.step}`)) : progress.step === undefined ? nothing : text(`step.${progress.step}`)}</div>`
        : nothing}
      ${installFailure === undefined
        ? nothing
        : renderAlert("error", html`${installFailure}<br /><a href=${hacsLink(repository)} @click=${(event: MouseEvent) => this.openHacs(event, repository)}>${text("hacs.open")}</a>`, "banner error")}
      ${outcome === undefined ? nothing : this.renderOutcome(complement, outcome.restartRequired, outcome.reloadPage)}
      <div class="actions">
        ${model.canInstall(complement) && !progress.running
          ? renderButton(text(progress.error === undefined ? "action.install" : "install.retry"), () => (this.dialog = { kind: "install" }), { className: "primary install" })
          : nothing}
        ${state === "restart_required" && outcome === undefined
          ? renderButton(text("action.restart"), () => (this.dialog = { kind: "restart" }), { className: "primary restart", disabled: model.restart === "restarting" })
          : nothing}
        ${state === "to_configure" && complement.ha_domain !== null && complement.ha.config_flow
          ? renderButton(text("action.configure"), () => openHomeAssistantPage(configFlowPath(complement.ha_domain as string)), { className: "primary configure" })
          : nothing}
      </div>
      ${["installed", "restart_required", "to_configure", "configured"].includes(state) && repository !== undefined
        ? html`<p>${text("hacs.manage")} <a href=${hacsLink(repository)} @click=${(event: MouseEvent) => this.openHacs(event, repository)}>${text("action.open_hacs")}</a></p>`
        : nothing}
      ${this.dialog === undefined ? nothing : this.renderDialog(complement, this.dialog)}`;
  }

  private openHacs(event: MouseEvent, repository: { id: string } | undefined): void {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      openHomeAssistantPage(hacsLink(repository));
    }
  }

  private installFailure(code: string, message: string): string {
    const key = `install.${code}`;
    return key in english ? text(key) : text("install.failed", { message });
  }

  private renderOutcome(complement: Complement, restartRequired: boolean, reloadPage: boolean): TemplateResult {
    const model = complementsModel;
    if (restartRequired) {
      return renderAlert(
        "info",
        html`${text("install.restart", { name: complement.name })}
          <div class="actions">
            ${renderButton(text("action.restart"), () => (this.dialog = { kind: "restart" }), { className: "primary restart", disabled: model.restart === "restarting" })}
            ${renderButton(text("action.restart_later"), () => model.dismissOutcome(complement), { className: "later", plain: true })}
          </div>`,
        "panel done",
      );
    }
    return renderAlert("success", text(reloadPage ? "install.reload" : "install.done", { name: complement.name }), "panel done");
  }

  private renderDialog(complement: Complement, dialog: Dialog): TemplateResult {
    const close = (): void => {
      this.dialog = undefined;
    };
    const cancel = { label: text("confirm.cancel"), className: "cancel", onClick: close };
    if (dialog.kind === "restart") {
      return renderDialog({
        title: text("action.restart"),
        body: html`<p>${text("restart.confirm")}</p>`,
        confirm: {
          label: text("action.restart"),
          className: "confirm-restart",
          onClick: () => {
            close();
            void complementsModel.restartHomeAssistant();
          },
        },
        cancel,
      });
    }
    return renderDialog({
      title: text("confirm.title", { name: complement.name }),
      body: html`<dl>
          <dt>${text("confirm.repository")}</dt><dd class="breakable">${complement.repository ?? ""}</dd>
          <dt>${text("confirm.category")}</dt><dd>${complement.hacs_category ?? ""}</dd>
          <dt>${text("confirm.certification")}</dt><dd>${this.known("certification", complement.certification)}</dd>
          <dt>${text("confirm.author")}</dt><dd>${complement.author ?? text("confirm.unknown_author")}</dd>
        </dl>
        ${complement.certification === "community" ? renderAlert("warning", text("confirm.community_warning"), "warning") : nothing}`,
      confirm: {
        label: text("confirm.install"),
        className: "confirm-install",
        onClick: () => {
          close();
          void complementsModel.install(complement);
        },
      },
      cancel,
    });
  }

  protected override render(): TemplateResult {
    const model = complementsModel;
    if (model.response === undefined) {
      if (model.loadError !== undefined) {
        const key = `error.${model.loadError}`;
        return html`${renderAlert("error", key in english ? text(key) : text("error.unknown", { code: model.loadError }), "banner error")}
        ${renderButton(text("retry"), () => void model.load(true), { className: "retry" })}`;
      }
      return html`<div class="message">${renderProgress(text("loading"))}</div>`;
    }
    const state = haState(this);
    if (state === "waiting") {
      return renderProgress(text("loading"));
    }
    this.ha = state === "ready";
    const [id] = this.subpath;
    return id === undefined ? this.renderList() : this.renderDetail(id);
  }
}


/** The page "Catalog". */
export class ComplementsCatalogPage extends ComplementsPageBase {
  protected override pageId = CATALOG_PAGE;
  protected override installedOnly = false;
}

/** The page "Installed". */
export class ComplementsInstalledPage extends ComplementsPageBase {
  protected override pageId = INSTALLED_PAGE;
  protected override installedOnly = true;
}
