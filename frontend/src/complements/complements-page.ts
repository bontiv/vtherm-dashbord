/** The pages of the add-ons: the list of the catalog, the list of the installed add-ons, and the page of an add-on. */
import type { Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html, nothing, unsafeCSS } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { followLink, openHomeAssistantPage, setPageTitle } from "../components/events.ts";
import { createFormatters, resolveLocalizedFieldWithLanguage, userLanguage } from "../i18n.ts";
import { buildPath } from "../router.ts";
import { en as english } from "./catalogs.ts";
import { displayName, isEnglishFallback } from "./display.ts";
import { HACS_DOCUMENTATION, MIN_HACS_VERSION, hacsLink } from "./hacs-client.ts";
import { complementsModel } from "./model.ts";
import { plainText, sanitizeDescription } from "./sanitize.ts";
import { configFlowPath } from "./states.ts";
import { text } from "./translations.ts";
import { COMPLEMENT_STATES } from "./types.ts";
import type { Complement, ComplementState, ListCriteria } from "./types.ts";
import { NARROW_QUERY, narrowStyles } from "../components/narrow-styles.ts";
import { haState, isDefined, renderAlert, renderButton, renderDialog, renderProgress } from "../components/ha.ts";

/** The value of the choice "all" of a filter in the selector of Home Assistant, which reads an empty value as no choice. */
const ALL = "__all__";

/** The value of the filter of state that keeps the add-ons that wait for the user. */
const TO_HANDLE = "to_handle";

/** The identifiers of the contributions of the plugin. */
export const COMPLEMENTS_TOP_TAB = "core_complements.top.complements";
export const CATALOG_PAGE = "core_complements.page.catalog";
export const INSTALLED_PAGE = "core_complements.page.installed";

type Filters = ListCriteria;

const EMPTY_FILTERS: Filters = { query: "", type: "", family: "", certification: "", state: "", sort: "certification" };

/** The names of the criteria in the address. The sort is left out when it is the default. */
const URL_KEYS: readonly (readonly [keyof Filters, string])[] = [
  ["query", "q"],
  ["type", "type"],
  ["family", "family"],
  ["certification", "certification"],
  ["state", "state"],
  ["sort", "sort"],
];

const SORTS = ["certification", "name", "state"] as const;
const CERTIFICATION_ORDER = ["official", "recommended", "community"];
const INSTALLED_STATES: readonly ComplementState[] = ["installed", "restart_required", "to_configure", "configured"];

/** The icon of each state, and of the update. */
const ICONS: Readonly<Record<string, string>> = {
  not_installed: "mdi:download-outline",
  installed: "mdi:check-circle-outline",
  restart_required: "mdi:restart",
  to_configure: "mdi:cog-outline",
  configured: "mdi:check-circle-outline",
  link_only: "mdi:link-variant",
  update: "mdi:arrow-up-circle-outline",
  reading: "mdi:progress-clock",
};

type Dialog = { readonly kind: "install" } | { readonly kind: "restart" };

const typeKey = (complement: Complement): string => (complement.known_type ? `type.${complement.type}` : "type.unknown");

const hostOf = (link: string): string => {
  try {
    return new URL(link).host;
  } catch {
    return link;
  }
};

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
    compact: { state: true },
    filtersOpen: { state: true },
    copied: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
      container-type: inline-size;
    }
    a {
      color: var(--primary-color);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 500;
    }
    h3 {
      margin: 16px 0 8px;
      font-size: 16px;
      font-weight: 500;
    }
    .toolbar,
    .filters,
    .actions,
    .meta,
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
    }
    .toolbar {
      margin-bottom: 12px;
    }
    .bar {
      margin-bottom: 12px;
      color: var(--secondary-text-color);
    }
    .filters {
      margin-bottom: 8px;
      /* The fields align on their top: ha-input keeps 8 px under its field for a hint, which ha-select does not. */
      align-items: flex-start;
    }
    .filters > * {
      min-width: 160px;
    }
    .filters .search {
      flex: 1 1 220px;
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
    .summary {
      display: block;
      margin-bottom: 12px;
    }
    .group-title {
      margin: 16px 0 8px;
    }
    ul.cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li.item {
      display: block;
    }
    ha-card.card {
      display: block;
      height: 100%;
    }
    ha-card .card-content {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      box-sizing: border-box;
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
    li.card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card:hover,
    .card:has(a.name:focus-visible) {
      box-shadow: var(--ha-card-box-shadow);
      border-color: var(--primary-color);
    }
    .card:has(a.name:focus-visible) {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .card a.name {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
      text-decoration: none;
    }
    /* One link covers the whole card; the buttons are above it. */
    .card a.name::after {
      content: "";
      position: absolute;
      inset: 0;
    }
    a.name:focus-visible {
      outline: none;
    }
    .card .actions {
      position: relative;
      z-index: 1;
    }
    .card .author {
      margin-top: auto;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .excerpt {
      margin: 0;
      color: var(--secondary-text-color);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px 2px 6px;
      font-size: 13px;
      color: var(--primary-text-color);
      background-color: var(--secondary-background-color);
      border-radius: 12px;
    }
    .status ha-icon {
      --mdc-icon-size: 16px;
    }
    .status.state-configured,
    .status.state-installed {
      background-color: color-mix(in srgb, var(--success-color) 18%, transparent);
    }
    .status.state-restart_required,
    .status.state-to_configure,
    .status.update {
      background-color: color-mix(in srgb, var(--warning-color) 18%, transparent);
    }
    .status.state-not_installed,
    .status.state-link_only,
    .status.reading {
      background-color: color-mix(in srgb, var(--divider-color) 60%, transparent);
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .facts > * + *::before {
      content: "·";
      margin-right: 8px;
    }
    .experimental {
      padding: 1px 8px;
      font-size: 12px;
      color: var(--primary-text-color);
      border: 1px solid var(--warning-color);
      border-radius: 12px;
    }
    .versions {
      color: var(--secondary-text-color);
      font-size: 13px;
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
      margin: 8px 0;
    }
    .description p,
    .description li {
      white-space: pre-line;
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
    /* The page of an add-on: header, action card, documentation. */
    .detail {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1fr);
    }
    .detail .head {
      min-width: 0;
    }
    .detail .head h2 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .detail .action-card,
    .detail .doc-card {
      min-width: 0;
      box-sizing: border-box;
    }
    .detail .action-card > .card-content,
    .detail .doc-card > .card-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }
    .doc-card .doc {
      max-width: 70ch;
    }
    .doc-card .doc-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 12px;
    }
    .doc-card .doc-head h3 {
      margin: 0;
    }
    .doc img {
      max-width: 100%;
    }
    @container (min-width: 900px) {
      .detail {
        grid-template-columns: minmax(0, 1fr) 320px;
        grid-template-areas:
          "head action"
          "doc action";
        align-items: start;
      }
      .detail .head {
        grid-area: head;
      }
      .detail .doc-card {
        grid-area: doc;
      }
      .detail .action-card {
        grid-area: action;
        position: sticky;
        top: 16px;
      }
    }
    @media ${unsafeCSS(NARROW_QUERY)} {
      .filters > * {
        min-width: 0;
        flex: 1 1 100%;
      }
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
  /** The screen is narrow: the filters are folded behind a button. */
  declare compact: boolean;
  declare filtersOpen: boolean;
  /** The address of the manual install was just copied. */
  declare copied: boolean;

  /** The identifier of the menu entry that shows this page. */
  protected pageId = CATALOG_PAGE;
  /** Whether the list holds only the installed add-ons. */
  protected installedOnly = false;

  private stop: (() => void) | undefined;
  private titled: string | undefined;
  private query: MediaQueryList | undefined;
  private readonly onQuery = (): void => {
    this.compact = this.query?.matches === true;
  };
  /** Whether the criteria of the list were read from the address or the memory since the list was shown. */
  private criteriaRead = false;
  /** The title of the browser tab before the page of an add-on changed it, and the one the page set. */
  private savedTitle: string | undefined;
  private ownTitle: string | undefined;
  private observer: MutationObserver | undefined;
  private observed: Element | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.subpath = [];
    this.language = "";
    this.narrow = false;
    this.filters = EMPTY_FILTERS;
    this.dialog = undefined;
    this.revision = 0;
    this.compact = false;
    this.filtersOpen = false;
    this.copied = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.stop = complementsModel.subscribe(() => {
      this.revision += 1;
    });
    if (typeof window.matchMedia === "function") {
      this.query = window.matchMedia(NARROW_QUERY);
      this.compact = this.query.matches;
      this.query.addEventListener?.("change", this.onQuery);
    }
    complementsModel.attach(this.hass);
    if (complementsModel.response === undefined && !complementsModel.loading) {
      void complementsModel.load();
    }
  }

  override disconnectedCallback(): void {
    this.stop?.();
    this.query?.removeEventListener?.("change", this.onQuery);
    this.observer?.disconnect();
    this.observer = undefined;
    this.observed = undefined;
    this.restoreTitle();
    this.criteriaRead = false;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("hass")) {
      complementsModel.attach(this.hass);
      if (changed.get("hass") === undefined && complementsModel.response === undefined && !complementsModel.loading) {
        void complementsModel.load();
      }
    }
    if (this.subpath.length > 0) {
      this.criteriaRead = false;
    } else if (!this.criteriaRead && complementsModel.response !== undefined) {
      this.readCriteria();
    }
  }

  protected override updated(): void {
    const [id] = this.subpath;
    const complement = id === undefined ? undefined : complementsModel.response?.complements.find((candidate) => candidate.id === id);
    this.syncTitle(complement === undefined ? undefined : displayName(complement.name).name);
    this.hardenLinks();
  }

  // --- the title of the tab of the browser

  private syncTitle(name: string | undefined): void {
    if (name === undefined) {
      this.restoreTitle();
      return;
    }
    if (this.ownTitle === undefined || document.title !== this.ownTitle) {
      if (this.ownTitle === undefined) {
        this.savedTitle = document.title;
      } else if (document.title !== this.ownTitle) {
        // Home Assistant wrote a new title meanwhile: it becomes the one to restore.
        this.savedTitle = document.title;
      }
    }
    this.ownTitle = `${name} – ${this.savedTitle ?? ""}`;
    document.title = this.ownTitle;
  }

  private restoreTitle(): void {
    if (this.ownTitle !== undefined && document.title === this.ownTitle) {
      document.title = this.savedTitle ?? "";
    }
    this.ownTitle = undefined;
    this.savedTitle = undefined;
  }

  // --- the criteria of the list, in the address and in memory

  private readCriteria(): void {
    this.criteriaRead = true;
    const params = new URLSearchParams(window.location.search);
    const fromAddress: Filters = { ...EMPTY_FILTERS };
    let any = false;
    for (const [field, key] of URL_KEYS) {
      const value = params.get(key);
      if (value !== null && value !== "" && this.acceptable(field, value)) {
        fromAddress[field] = value;
        any = true;
      }
    }
    const remembered = complementsModel.criteria.get(this.pageId);
    const next = any ? fromAddress : remembered !== undefined ? { ...remembered } : this.filters;
    if (JSON.stringify(next) !== JSON.stringify(this.filters)) {
      this.filters = next;
    }
    this.writeCriteria(next);
  }

  /** Whether a value of the address is one that the list knows. An unknown one is ignored. */
  private acceptable(field: keyof Filters, value: string): boolean {
    const all = this.pageComplements();
    switch (field) {
      case "query":
        return true;
      case "type":
        return all.some((complement) => complement.type === value);
      case "family":
        return all.some((complement) => complement.family === value);
      case "certification":
        return all.some((complement) => complement.certification === value);
      case "state":
        return value === TO_HANDLE || (COMPLEMENT_STATES as readonly string[]).includes(value);
      case "sort":
        return (SORTS as readonly string[]).includes(value);
    }
  }

  /** Remember the criteria and write them in the address, without a new entry in the history. */
  private writeCriteria(criteria: Filters): void {
    complementsModel.criteria.set(this.pageId, { ...criteria });
    const params = new URLSearchParams();
    for (const [field, key] of URL_KEYS) {
      const value = criteria[field];
      if (value !== "" && !(field === "sort" && value === EMPTY_FILTERS.sort)) {
        params.set(key, value);
      }
    }
    const query = params.toString();
    const target = `${window.location.pathname}${query === "" ? "" : `?${query}`}${window.location.hash}`;
    if (target !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", target);
    }
  }

  private get languageTag(): string {
    return this.hass === undefined ? "en" : userLanguage(this.hass);
  }

  /** The description of the catalog in the language of the user, and whether it is the English one by fallback. */
  private descriptionOf(complement: Complement): { readonly text: string; readonly english: boolean } {
    const found = resolveLocalizedFieldWithLanguage(complement as unknown as Record<string, unknown>, "description", this.languageTag);
    return found === undefined ? { text: "", english: false } : { text: found.text, english: isEnglishFallback(found.language, this.languageTag) };
  }

  private date(seconds: number): string {
    return this.hass === undefined ? new Date(seconds * 1000).toISOString() : createFormatters(this.hass).dateTime(new Date(seconds * 1000));
  }

  /** The add-ons of this page, before the criteria. */
  private pageComplements(): Complement[] {
    const all = complementsModel.response?.complements ?? [];
    return this.installedOnly ? all.filter((complement) => INSTALLED_STATES.includes(complementsModel.stateOf(complement))) : [...all];
  }

  private visible(): Complement[] {
    const { query, type, family, certification, state } = this.filters;
    const needle = query.trim().toLowerCase();
    const model = complementsModel;
    const matching = this.pageComplements().filter((complement) => {
      const current = model.stateOf(complement);
      if (type !== "" && complement.type !== type) {
        return false;
      }
      if ((family !== "" && complement.family !== family) || (certification !== "" && complement.certification !== certification)) {
        return false;
      }
      if (state === TO_HANDLE ? !this.toHandle(complement) : state !== "" && current !== state) {
        return false;
      }
      return needle === "" || complement.name.toLowerCase().includes(needle) || plainText(this.descriptionOf(complement).text).toLowerCase().includes(needle);
    });
    return this.sorted(matching);
  }

  /** Whether the add-on waits for the user. The states that HACS decides are not known while HACS is read. */
  private toHandle(complement: Complement): boolean {
    return !complementsModel.hacsLoading && complementsModel.needsAction(complement);
  }

  private sorted(list: Complement[]): Complement[] {
    const collator = new Intl.Collator(this.languageTag);
    const byName = (a: Complement, b: Complement): number => collator.compare(displayName(a.name).name, displayName(b.name).name);
    const model = complementsModel;
    if (this.filters.sort === "name") {
      return list.sort(byName);
    }
    if (this.filters.sort === "state") {
      const rank = (complement: Complement): number => {
        if (this.toHandle(complement)) {
          return 0;
        }
        return ["configured", "installed", "not_installed", "link_only"].indexOf(model.stateOf(complement)) + 1 || 5;
      };
      return list.sort((a, b) => rank(a) - rank(b) || byName(a, b));
    }
    const rank = (complement: Complement): number => {
      const index = CERTIFICATION_ORDER.indexOf(complement.certification);
      return index === -1 ? CERTIFICATION_ORDER.length : index;
    };
    return list.sort((a, b) => rank(a) - rank(b) || (rank(a) === CERTIFICATION_ORDER.length ? a.certification.localeCompare(b.certification) : 0) || byName(a, b));
  }

  private setFilter(name: keyof Filters, value: string): void {
    this.filters = { ...this.filters, [name]: value };
    this.writeCriteria(this.filters);
  }

  private clearFilters(): void {
    this.filters = { ...EMPTY_FILTERS, sort: this.filters.sort };
    this.writeCriteria(this.filters);
  }

  /** The number of criteria other than the search and the sort. */
  private activeFilters(): number {
    const { type, family, certification, state } = this.filters;
    return [type, family, certification, state].filter((value) => value !== "").length;
  }

  private isFiltered(): boolean {
    return this.activeFilters() > 0 || this.filters.query.trim() !== "";
  }

  /** Whether the components of Home Assistant are drawn, rather than the fallback. */
  private ha = false;

  private pathOf(complement?: Complement, page: string = this.pageId): string {
    return buildPath({ tab: COMPLEMENTS_TOP_TAB, entry: page, rest: complement === undefined ? [] : [complement.id] });
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
    const { hacs, hacsFailure, hacsLoading } = complementsModel;
    if (hacsLoading || (hacs.kind === "ready" && hacsFailure === undefined)) {
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

  /** The translation of a value of the catalog, or the value itself when the catalog has a new one. */
  private known(prefix: string, value: string): string {
    const key = `${prefix}.${value}`;
    return key in english ? text(key) : value;
  }

  // --- the filters

  private select(name: keyof Filters, label: string, values: readonly [string, string][]): TemplateResult {
    const current = this.filters[name];
    // The choice in force stays in the options, even when no add-on has it any more.
    const options = current !== "" && !values.some(([value]) => value === current) ? [...values, [current, current] as [string, string]] : values;
    if (this.ha) {
      // The selector reads an empty value as no choice: "all" has its own value, so that it is shown, and it cannot be cleared.
      const items = [{ value: ALL, label: text("filter.all") }, ...options.map(([value, title]) => ({ value, label: title }))];
      return html`<ha-selector
        class="filter"
        data-name=${name}
        .hass=${this.hass}
        .selector=${{ select: { options: items, mode: "dropdown" } }}
        .value=${current === "" ? ALL : current}
        .label=${label}
        .required=${true}
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
      <select name=${name} .value=${current} @change=${(event: Event) => this.setFilter(name, (event.target as HTMLSelectElement).value)}>
        <option value="">${text("filter.all")}</option>
        ${options.map(([value, title]) => html`<option value=${value} ?selected=${current === value}>${title}</option>`)}
      </select></label
    >`;
  }

  private renderSearch(): TemplateResult {
    if (this.ha) {
      return html`<ha-selector
        class="filter search"
        data-name="query"
        .hass=${this.hass}
        .selector=${{ text: { type: "search" } }}
        .value=${this.filters.query}
        .label=${text("search.label")}
        .placeholder=${text("search.placeholder")}
        .required=${false}
        @value-changed=${(event: CustomEvent<{ value: unknown }>) => {
          event.stopPropagation();
          this.setFilter("query", String(event.detail.value ?? ""));
        }}
      ></ha-selector>`;
    }
    // fallback: a plain search field, when ha-selector is not defined.
    return html`<label class="search"
      >${text("search.label")}
      <input type="search" name="query" placeholder=${text("search.placeholder")} .value=${this.filters.query} @input=${(event: Event) => this.setFilter("query", (event.target as HTMLInputElement).value)} />
    </label>`;
  }

  private renderCriteria(): TemplateResult {
    const model = complementsModel;
    const all = this.pageComplements();
    const distinct = (pick: (complement: Complement) => string): string[] => [...new Set(all.map(pick))].sort();
    const present = new Set(all.map((complement) => model.stateOf(complement)));
    const states: [string, string][] = COMPLEMENT_STATES.filter((state) => present.has(state)).map((state) => [state, text(`state.${state}`)]);
    if (all.some((complement) => this.toHandle(complement))) {
      states.unshift([TO_HANDLE, text("filter.to_handle")]);
    }
    const sorts: [string, string][] = SORTS.map((sort) => [sort, text(`sort.${sort}`)]);
    const sort = this.sortSelect(sorts);
    return html`${this.select("type", text("filter.type"), distinct((complement) => complement.type).map((type) => [type, text(all.find((complement) => complement.type === type)?.known_type === true ? `type.${type}` : "type.unknown")]))}
      ${this.select("family", text("filter.family"), distinct((complement) => complement.family).map((family) => [family, this.known("family", family)]))}
      ${this.select("certification", text("filter.certification"), distinct((complement) => complement.certification).map((certification) => [certification, this.known("certification", certification)]))}
      ${this.select("state", text("filter.state"), states)} ${sort}`;
  }

  /** The choice of the sort. It has no "all": the sort always has a value. */
  private sortSelect(options: readonly [string, string][]): TemplateResult {
    const current = this.filters.sort;
    if (this.ha) {
      return html`<ha-selector
        class="filter"
        data-name="sort"
        .hass=${this.hass}
        .selector=${{ select: { options: options.map(([value, label]) => ({ value, label })), mode: "dropdown" } }}
        .value=${current}
        .label=${text("sort.label")}
        .required=${true}
        @value-changed=${(event: CustomEvent<{ value: unknown }>) => {
          event.stopPropagation();
          this.setFilter("sort", String(event.detail.value ?? EMPTY_FILTERS.sort));
        }}
      ></ha-selector>`;
    }
    return html`<label
      >${text("sort.label")}
      <select name="sort" .value=${current} @change=${(event: Event) => this.setFilter("sort", (event.target as HTMLSelectElement).value)}>
        ${options.map(([value, title]) => html`<option value=${value} ?selected=${current === value}>${title}</option>`)}
      </select></label
    >`;
  }

  private renderFilters(): TemplateResult {
    if (!this.compact) {
      return html`<div class="filters">${this.renderSearch()} ${this.renderCriteria()}</div>`;
    }
    const active = this.activeFilters();
    return html`<div class="filters">${this.renderSearch()}</div>
      <div class="actions">
        ${renderButton(active === 0 ? text("filter.toggle") : text("filter.toggle_count", { count: active }), () => (this.filtersOpen = !this.filtersOpen), { className: "filters-toggle", plain: true, expanded: this.filtersOpen })}
      </div>
      ${this.filtersOpen ? html`<div class="filters panel-filters">${this.renderCriteria()}</div>` : nothing}`;
  }

  // --- the status

  private status(complement: Complement): TemplateResult {
    const model = complementsModel;
    const icon = (name: string) => (isDefined("ha-icon") ? html`<ha-icon icon=${ICONS[name] ?? ICONS["installed"]}></ha-icon>` : nothing);
    if (model.hacsLoading && complement.hacs_category !== null) {
      return html`<span class="status reading">${icon("reading")}${text("state.reading")}</span>`;
    }
    const state = model.stateOf(complement);
    const update = model.updateOf(complement);
    return html`<span class="status state-${state}">${icon(state)}${text(`state.${state}`)}</span>${update === undefined
      ? nothing
      : html` <span class="status update">${icon("update")}${text("update.available")}</span>`}`;
  }

  private facts(complement: Complement): TemplateResult {
    return html`<div class="facts">
      <span>${text(typeKey(complement))}</span><span>${this.known("family", complement.family)}</span><span>${this.known("certification", complement.certification)}</span>
    </div>`;
  }

  private versions(complement: Complement): TemplateResult | typeof nothing {
    const update = complementsModel.updateOf(complement);
    if (update !== undefined) {
      return html`<div class="versions">${text("update.versions", { installed: update.installed, available: update.available })}</div>`;
    }
    const version = complementsModel.hacsLoading ? undefined : complementsModel.repositoryOf(complement)?.installed_version;
    return version === undefined || version === null || version === "" || !complementsModel.repositoryOf(complement)?.installed ? nothing : html`<div class="versions">${text("update.installed_version", { version })}</div>`;
  }

  // --- the list

  private summary(): TemplateResult | typeof nothing {
    const model = complementsModel;
    if (model.hacsLoading) {
      return nothing;
    }
    const count = (model.response?.complements ?? []).filter((complement) => model.needsAction(complement)).length;
    if (count === 0) {
      return nothing;
    }
    const target = this.pathOf(undefined, INSTALLED_PAGE);
    return renderAlert(
      "info",
      html`${text("summary.to_handle", { count })}
        <a
          class="summary-link"
          href=${`${target}?state=${TO_HANDLE}`}
          @click=${(event: MouseEvent) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
              return;
            }
            model.criteria.set(INSTALLED_PAGE, { ...EMPTY_FILTERS, state: TO_HANDLE });
            if (this.pageId === INSTALLED_PAGE) {
              event.preventDefault();
              this.filters = { ...EMPTY_FILTERS, state: TO_HANDLE };
              this.writeCriteria(this.filters);
              return;
            }
            followLink(this, event, target);
          }}
          >${text("summary.link")}</a
        >`,
      "summary",
    );
  }

  private renderCardActions(complement: Complement): TemplateResult | typeof nothing {
    const model = complementsModel;
    if (model.hacsLoading) {
      return nothing;
    }
    const state = model.stateOf(complement);
    const repository = model.repositoryOf(complement);
    const buttons = [
      state === "to_configure" && complement.ha_domain !== null && complement.ha.config_flow
        ? renderButton(text("action.configure"), () => openHomeAssistantPage(configFlowPath(complement.ha_domain as string)), { className: "card-action configure", plain: true })
        : nothing,
      state === "restart_required" ? renderButton(text("action.restart"), () => (this.dialog = { kind: "restart" }), { className: "card-action restart", disabled: model.restart === "restarting", plain: true }) : nothing,
      model.updateOf(complement) !== undefined ? renderButton(text("action.open_hacs"), () => openHomeAssistantPage(hacsLink(repository)), { className: "card-action open-hacs", plain: true }) : nothing,
    ];
    return buttons.every((button) => button === nothing) ? nothing : html`<div class="actions">${buttons}</div>`;
  }

  private renderCard(complement: Complement): TemplateResult {
    const path = this.pathOf(complement);
    const { name, experimental } = displayName(complement.name);
    const description = this.descriptionOf(complement);
    const excerpt = plainText(description.text);
    const content = html`<a class="name touch-target" href=${path} @click=${(event: MouseEvent) => followLink(this, event, path)}>${name}</a>
      <div class="meta">${this.status(complement)} ${experimental ? html`<span class="experimental">${text("badge.experimental")}</span>` : nothing}</div>
      ${this.versions(complement)} ${this.facts(complement)}
      <p class="excerpt" lang=${description.english ? "en" : nothing}>${excerpt}${description.english ? html` <span lang="en">${text("lang.fallback")}</span>` : nothing}</p>
      ${this.renderCardActions(complement)}
      ${complement.author === null ? nothing : html`<div class="author">${text("detail.author_value", { author: complement.author })}</div>`}`;
    // fallback: the plain card of the list, when ha-card is not defined.
    return isDefined("ha-card") ? html`<li class="item"><ha-card class="card"><div class="card-content">${content}</div></ha-card></li>` : html`<li class="card">${content}</li>`;
  }

  private renderGroups(visible: Complement[]): TemplateResult {
    if (this.filters.sort !== "certification") {
      return html`<ul class="cards">${visible.map((complement) => this.renderCard(complement))}</ul>`;
    }
    const groups = new Map<string, Complement[]>();
    for (const complement of visible) {
      groups.set(complement.certification, [...(groups.get(complement.certification) ?? []), complement]);
    }
    return html`${[...groups].map(
      ([certification, members]) => html`<h3 class="group-title">${this.known("certification", certification)}</h3>
        <ul class="cards" data-group=${certification}>
          ${members.map((complement) => this.renderCard(complement))}
        </ul>`,
    )}`;
  }

  private clearButton(): TemplateResult {
    return renderButton(text("filter.clear"), () => this.clearFilters(), { className: "clear-filters", plain: true });
  }

  private renderList(): TemplateResult {
    const visible = this.visible();
    const model = complementsModel;
    const refresh = text(model.loading ? "refreshing" : "refresh");
    return html`<div class="toolbar">
        <h2>${text(this.installedOnly ? "page.installed" : "page.catalog")}</h2>
        ${isDefined("ha-icon-button")
          ? html`<ha-icon-button class="refresh" .label=${refresh} ?disabled=${model.loading} @click=${() => void model.load(true)}><ha-icon icon="mdi:refresh"></ha-icon></ha-icon-button>`
          : renderButton(refresh, () => void model.load(true), { className: "refresh", disabled: model.loading, plain: true })}
        ${model.response === undefined ? nothing : html`<span class="meta">${text("fetched", { date: this.date(model.response.fetched_at) })}</span>`}
      </div>
      ${this.banners()} ${this.hacsNotice()} ${this.summary()} ${this.renderFilters()}
      <div class="bar">
        <span class="count" role="status">${text("count", { count: visible.length })}</span>
        ${this.isFiltered() ? this.clearButton() : nothing}
      </div>
      ${visible.length === 0
        ? html`${renderAlert("info", text(this.installedOnly && !this.isFiltered() ? "empty.installed" : "empty.catalog"), "message")}${this.isFiltered() ? this.clearButton() : nothing}`
        : this.renderGroups(visible)}`;
  }

  // --- the page of an add-on

  private card(className: string, content: unknown): TemplateResult {
    // fallback: the plain panel, when ha-card is not defined.
    return isDefined("ha-card") ? html`<ha-card class=${className}><div class="card-content">${content}</div></ha-card>` : html`<div class="panel ${className}">${content}</div>`;
  }

  private sourceLink(complement: Complement): TemplateResult | typeof nothing {
    if (complement.link === null) {
      return nothing;
    }
    const host = hostOf(complement.link);
    const label = complement.repository !== null && host === "github.com" ? complement.repository : host;
    return html`<a class="breakable touch-target" href=${complement.link} target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  private hasComponent(name: string): boolean {
    const components = (this.hass as { config?: { components?: readonly string[] } } | undefined)?.config?.components;
    return components?.includes(name) === true;
  }

  private async copy(address: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(address);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 3000);
    } catch {
      this.copied = false;
    }
  }

  /** The address with a button to copy it, for the case where the links of My Home Assistant do not exist. */
  private renderAddress(address: string, linkLabel: string, linkPath: string): TemplateResult {
    return html`<div class="manual-address">
      <label
        >${text("manual.address")}
        <input class="address" type="text" readonly .value=${address} />
      </label>
      <div class="actions">
        ${renderButton(text("manual.copy"), () => void this.copy(address), { className: "copy", plain: true })}
        ${this.copied ? html`<span class="copied" role="status">${text("manual.copied")}</span>` : nothing}
      </div>
      <a class="touch-target" href=${linkPath} @click=${(event: MouseEvent) => this.openHomeAssistantLink(event, linkPath)}>${linkLabel}</a>
    </div>`;
  }

  private openHomeAssistantLink(event: MouseEvent, path: string): void {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      openHomeAssistantPage(path);
    }
  }

  /** What to do for an add-on that the dashboard does not install: a blueprint, an add-on of Home Assistant, or another type. */
  private renderManual(complement: Complement): TemplateResult {
    const my = this.hasComponent("my");
    const source = complement.link === null ? nothing : html`<a class="touch-target source-link" href=${complement.link} target="_blank" rel="noopener noreferrer">${text("manual.open_source")}</a>`;
    if (complement.type === "blueprint" && complement.url !== null) {
      const address = complement.url;
      return my
        ? html`${renderAlert("info", text("manual.blueprint_help"), "banner")}<div class="actions">
              ${renderButton(text("manual.import_blueprint"), () => openHomeAssistantPage(`/_my_redirect/blueprint_import?blueprint_url=${encodeURIComponent(address)}`), { className: "primary import-blueprint" })}
            </div>`
        : html`${renderAlert("info", text("manual.no_my"), "banner")}${this.renderAddress(address, text("manual.open_blueprints"), "/config/blueprint/dashboard")}`;
    }
    if (complement.type === "addon") {
      if (!this.hasComponent("hassio")) {
        return html`${renderAlert("warning", text("manual.supervisor_required"), "banner warning supervisor")}${source}`;
      }
      const address = complement.repository === null ? (complement.link ?? "") : `https://github.com/${complement.repository}`;
      return my
        ? html`${renderAlert("info", text("manual.addon_help"), "banner")}<div class="actions">
              ${renderButton(text("manual.add_repository"), () => openHomeAssistantPage(`/_my_redirect/supervisor_add_addon_repository?repository_url=${encodeURIComponent(address)}`), { className: "primary add-repository" })}
            </div>`
        : html`${renderAlert("info", text("manual.no_my"), "banner")}${this.renderAddress(address, text("manual.open_addon_store"), "/hassio/store")}`;
    }
    return html`${renderAlert("info", text("manual.unknown_type"), "banner")}${source}`;
  }

  private openHacs(event: MouseEvent, repository: { id: string } | undefined): void {
    this.openHomeAssistantLink(event, hacsLink(repository));
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
        html`${text("install.restart", { name: displayName(complement.name).name })}
          <div class="actions">
            ${renderButton(text("action.restart"), () => (this.dialog = { kind: "restart" }), { className: "primary restart", disabled: model.restart === "restarting" })}
            ${renderButton(text("action.restart_later"), () => model.dismissOutcome(complement), { className: "later", plain: true })}
          </div>`,
        "panel done",
      );
    }
    return renderAlert("success", text(reloadPage ? "install.reload" : "install.done", { name: displayName(complement.name).name }), "panel done");
  }

  /** Make the links of the README open in a new tab, once `ha-markdown` has drawn them. */
  private hardenLinks(): void {
    const markdown = this.renderRoot.querySelector("ha-markdown");
    if (markdown === null) {
      this.observer?.disconnect();
      this.observed = undefined;
      return;
    }
    const harden = (): void => {
      const roots: (Element | ShadowRoot)[] = [markdown];
      const inner = markdown.shadowRoot;
      if (inner !== null) {
        roots.push(inner);
      }
      for (const root of roots) {
        for (const anchor of Array.from(root.querySelectorAll("a[href]"))) {
          const href = anchor.getAttribute("href") ?? "";
          if (/^https?:/i.test(href)) {
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute("rel", "noopener noreferrer");
          }
        }
      }
    };
    harden();
    if (this.observed !== markdown && typeof MutationObserver === "function") {
      this.observer?.disconnect();
      this.observer = new MutationObserver(harden);
      this.observer.observe(markdown, { childList: true, subtree: true });
      if (markdown.shadowRoot !== null) {
        this.observer.observe(markdown.shadowRoot, { childList: true, subtree: true });
      }
      this.observed = markdown;
    }
  }

  private renderDocumentation(complement: Complement): TemplateResult {
    const model = complementsModel;
    const readme = isDefined("ha-markdown") ? model.readmeOf(complement, this.languageTag) : ({ status: "none" } as const);
    const description = this.descriptionOf(complement);
    const fallback = html`<div class="description" lang=${description.english ? "en" : nothing}>
      ${description.text === "" ? nothing : unsafeHTML(sanitizeDescription(description.text))}${description.english ? html` <span lang="en">${text("lang.fallback")}</span>` : nothing}
    </div>`;
    if (readme.status === "ready") {
      const english = isEnglishFallback(readme.readme.language, this.languageTag);
      return this.card(
        "doc-card",
        html`<div class="doc-head">
            <h3>${text("detail.documentation")}</h3>
            ${english ? html`<span lang="en" class="fallback-mark">${text("lang.fallback")}</span>` : nothing}
            <a class="touch-target source-link" href=${readme.readme.source_url} target="_blank" rel="noopener noreferrer">${text("detail.view_on_github")}</a>
          </div>
          <div class="doc" lang=${english ? "en" : nothing}><ha-markdown .content=${readme.readme.markdown} lazy-images></ha-markdown></div>`,
      );
    }
    return this.card(
      "doc-card",
      html`<div class="doc-head">
          <h3>${text("detail.documentation")}</h3>
          ${complement.link === null ? nothing : html`<a class="touch-target source-link" href=${complement.link} target="_blank" rel="noopener noreferrer">${text("detail.view_on_github")}</a>`}
        </div>
        ${readme.status === "loading" ? renderProgress(text("readme.loading")) : nothing} ${readme.status === "error" ? renderAlert("warning", text("readme.error"), "banner warning") : nothing}
        <div class="doc">${fallback}</div>`,
    );
  }

  private renderDetail(id: string): TemplateResult {
    const complement = complementsModel.response?.complements.find((candidate) => candidate.id === id);
    if (complement === undefined) {
      return html`${renderAlert("info", text("detail.not_found"), "message")}
        <a class="touch-target" href=${this.pathOf()} @click=${(event: MouseEvent) => followLink(this, event, this.pathOf())}>${text("detail.back")}</a>`;
    }
    const { name, experimental } = displayName(complement.name);
    if (this.titled !== name) {
      this.titled = name;
      queueMicrotask(() => setPageTitle(this, name));
    }
    const model = complementsModel;
    const state = model.stateOf(complement);
    const progress = model.progressOf(complement);
    const repository = model.repositoryOf(complement);
    const description = this.descriptionOf(complement);
    const installFailure = progress.error === undefined ? undefined : this.installFailure(progress.error.code, progress.error.message);
    const outcome = progress.outcome;
    const reading = model.hacsLoading && complement.hacs_category !== null;
    const manual = complement.hacs_category === null;
    const update = model.updateOf(complement);
    const manage = !reading && ["installed", "restart_required", "to_configure", "configured"].includes(state) && repository !== undefined;
    return html`${this.banners()} ${this.hacsNotice()}
      <div class="detail">
        <header class="head">
          <h2>${name}${experimental ? html`<span class="experimental">${text("badge.experimental")}</span>` : nothing}</h2>
          ${description.text === ""
            ? nothing
            : html`<div class="description lead" lang=${description.english ? "en" : nothing}>
                ${unsafeHTML(sanitizeDescription(description.text))}${description.english ? html` <span lang="en">${text("lang.fallback")}</span>` : nothing}
              </div>`}
        </header>
        ${this.card(
          "action-card",
          html`<div class="meta">${this.status(complement)}</div>
            ${this.versions(complement)}
            ${experimental ? renderAlert("warning", text("experimental.warning"), "banner warning experimental-warning") : nothing}
            ${manual ? this.renderManual(complement) : nothing}
            ${progress.running || progress.step !== undefined
              ? html`<div class="panel steps">${progress.running ? renderProgress(progress.step === undefined ? text("loading") : text(`step.${progress.step}`)) : progress.step === undefined ? nothing : text(`step.${progress.step}`)}</div>`
              : nothing}
            ${installFailure === undefined
              ? nothing
              : renderAlert("error", html`${installFailure}<br /><a href=${hacsLink(repository)} @click=${(event: MouseEvent) => this.openHacs(event, repository)}>${text("hacs.open")}</a>`, "banner error")}
            ${outcome === undefined ? nothing : this.renderOutcome(complement, outcome.restartRequired, outcome.reloadPage)}
            <div class="actions">
              ${!reading && model.canInstall(complement) && !progress.running
                ? renderButton(text(progress.error === undefined ? "action.install" : "install.retry"), () => (this.dialog = { kind: "install" }), { className: "primary install" })
                : nothing}
              ${!reading && state === "restart_required" && outcome === undefined
                ? renderButton(text("action.restart"), () => (this.dialog = { kind: "restart" }), { className: "primary restart", disabled: model.restart === "restarting" })
                : nothing}
              ${!reading && state === "to_configure" && complement.ha_domain !== null && complement.ha.config_flow
                ? renderButton(text("action.configure"), () => openHomeAssistantPage(configFlowPath(complement.ha_domain as string)), { className: "primary configure" })
                : nothing}
              ${!reading && update !== undefined ? renderButton(text("action.open_hacs"), () => openHomeAssistantPage(hacsLink(repository)), { className: "primary update-hacs" }) : nothing}
            </div>
            <dl>
              ${complement.link === null ? nothing : html`<dt>${text("detail.source")}</dt><dd>${this.sourceLink(complement)}</dd>`}
              ${complement.author === null ? nothing : html`<dt>${text("detail.author")}</dt><dd>${complement.author}</dd>`}
              <dt>${text("filter.type")}</dt><dd>${text(typeKey(complement))}</dd>
              <dt>${text("filter.family")}</dt><dd>${this.known("family", complement.family)}</dd>
              <dt>${text("filter.certification")}</dt><dd>${this.known("certification", complement.certification)}</dd>
            </dl>
            ${manage ? html`<p>${text("hacs.manage")} <a href=${hacsLink(repository)} @click=${(event: MouseEvent) => this.openHacs(event, repository)}>${text("action.open_hacs")}</a></p>` : nothing}`,
        )}
        ${this.renderDocumentation(complement)}
      </div>
      ${this.dialog === undefined ? nothing : this.renderDialog(complement, this.dialog)}`;
  }

  private renderDialog(complement: Complement | undefined, dialog: Dialog): TemplateResult | typeof nothing {
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
    if (complement === undefined) {
      return nothing;
    }
    const name = displayName(complement.name).name;
    return renderDialog({
      title: text("confirm.title", { name }),
      body: html`<dl>
          <dt>${text("confirm.repository")}</dt><dd class="breakable">${complement.repository === null ? "" : html`<a href=${`https://github.com/${complement.repository}`} target="_blank" rel="noopener noreferrer">${complement.repository}</a>`}</dd>
          <dt>${text("confirm.category")}</dt><dd>${complement.hacs_category === null ? "" : this.known("hacs_category", complement.hacs_category)}</dd>
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
    return id === undefined ? html`${this.renderList()}${this.dialog === undefined ? nothing : this.renderDialog(undefined, this.dialog)}` : this.renderDetail(id);
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
