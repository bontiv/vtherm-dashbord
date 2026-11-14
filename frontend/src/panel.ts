import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { Hass, HookName, PlacedEntry, VisibilityContext } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { bootstrap } from "./bootstrap.ts";
import type { BootstrapResult } from "./bootstrap.ts";
import "./components/breadcrumb.ts";
import "./components/contribution-host.ts";
import { NAVIGATE_EVENT } from "./components/events.ts";
import type { NavigateDetail } from "./components/events.ts";
import "./components/side-menu.ts";
import { THERMOSTAT_SELECTED_EVENT } from "./components/side-menu.ts";
import "./components/thermostat-list.ts";
import "./components/top-bar.ts";
import { createLanguageController } from "./i18n.ts";
import type { LanguageController } from "./i18n.ts";
import type { DevelopmentEntry } from "./plugin-list.ts";
import type { PluginStatus } from "./loader.ts";
import { resolveNavigation, routeForThermostat } from "./navigation.ts";
import type { NavigationInput, NavigationModel, ThermostatInfo } from "./navigation.ts";
import { PANEL_PATH, parseRoute } from "./router.ts";
import { publishState } from "./state.ts";
import type { Route } from "./router.ts";
import { shell, t } from "./shell-translations.ts";
import { DASHBOARD_VERSION } from "./version.ts";

/** The tag name of the panel. The integration registers the panel with this name. */
export const PANEL_ELEMENT = "vtherm-dashboard-panel";

/** The width under which the screen is narrow: the menu becomes a drawer. */
export const NARROW_QUERY = "(max-width: 700px)";

/** Gives the thermostats of Versatile Thermostat. */
export type ThermostatProvider = (hass: Hass) => Promise<readonly ThermostatInfo[]>;

/** The panel "Home confort", which Home Assistant shows in its side menu. */
export class VThermDashboardPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    thermostatProvider: { attribute: false },
    developmentEntries: { attribute: false },
    importModule: { attribute: false },
    phase: { state: true },
    route: { state: true },
    compact: { state: true },
    drawerOpen: { state: true },
    noticeDismissed: { state: true },
    thermostats: { state: true },
    failure: { state: true },
    languageVersion: { state: true },
  };

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      color: var(--primary-text-color);
      background-color: var(--primary-background-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
    }
    .toolbar {
      display: flex;
      align-items: center;
      background-color: var(--primary-background-color);
    }
    .toolbar vtherm-breadcrumb {
      flex: 1 1 auto;
    }
    .menu-button {
      margin: 0 0 0 8px;
      padding: 6px 12px;
      font: inherit;
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 4px);
      cursor: pointer;
    }
    .notice {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 16px;
      color: var(--text-primary-color);
      background-color: var(--warning-color);
    }
    .notice button {
      font: inherit;
      color: inherit;
      background: none;
      border: 1px solid currentcolor;
      border-radius: var(--ha-card-border-radius, 4px);
      cursor: pointer;
    }
    .body {
      position: relative;
      display: flex;
      flex: 1 1 auto;
      min-height: 0;
    }
    aside {
      flex: 0 0 auto;
      min-height: 0;
    }
    main {
      flex: 1 1 auto;
      min-width: 0;
      overflow: auto;
    }
    .drawer {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
    }
    .drawer vtherm-side-menu {
      box-shadow: var(--ha-card-box-shadow, 0 2px 8px var(--divider-color));
    }
    .drawer .scrim {
      flex: 1 1 auto;
      background-color: var(--divider-color);
      opacity: 0.6;
      border: 0;
    }
    .message {
      padding: 32px 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .message.error {
      color: var(--error-color);
    }
  `;

  /** The state of Home Assistant, set by Home Assistant. */
  declare hass: Hass | undefined;

  /** Whether Home Assistant says that the screen is narrow. The panel also reads its own width. */
  declare narrow: boolean;

  /** How to read the thermostats. */
  declare thermostatProvider: ThermostatProvider;

  /** The active development entries of the browser, sent to the server with the plugin request. */
  declare developmentEntries: readonly DevelopmentEntry[];

  /** How to import a module. The default is the dynamic `import()` of the browser. */
  declare importModule: ((url: string) => Promise<unknown>) | undefined;

  /** What the panel is doing: `loading` the plugins, `ready`, or `error`. */
  declare phase: "loading" | "ready" | "error";

  /** The route that the address designates. */
  declare route: Route;

  /** Whether the screen is narrow. */
  declare compact: boolean;

  /** Whether the drawer of the menu is open. */
  declare drawerOpen: boolean;

  /** Whether the user closed the notice of an unknown route. */
  declare noticeDismissed: boolean;

  /** The thermostats. */
  declare thermostats: readonly ThermostatInfo[];

  /** Why the plugins could not be loaded. */
  declare failure: string;

  /** Changes each time the language was applied, so that every component draws its texts again. */
  declare languageVersion: number;

  /** The `hass` given to the pages. It is a new object after a change of language, so that the components of the plugins draw again. */
  private pluginHass: Hass | undefined;

  /** The registry and the status of the plugins, once loaded. */
  loaded: BootstrapResult | undefined;

  /** The status of every plugin, updated while they load. */
  statuses: readonly PluginStatus[] = [];

  private readonly language: LanguageController;
  private started = false;
  private query: MediaQueryList | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.narrow = false;
    this.thermostatProvider = async () => [];
    this.developmentEntries = [];
    this.importModule = undefined;
    this.phase = "loading";
    this.route = parseRoute(window.location.pathname, CORE_TOP_TABS.thermostats);
    this.compact = false;
    this.drawerOpen = false;
    this.noticeDismissed = false;
    this.thermostats = [];
    this.failure = "";
    this.languageVersion = 0;
    this.language = createLanguageController(
      () => [shell, ...(this.loaded?.registry.translations() ?? [])],
      () => {
        this.languageVersion += 1;
        // Once the pages are shown, a new object makes the components of the plugins draw their texts again.
        if (this.phase === "ready") {
          this.pluginHass = this.hass === undefined ? undefined : { ...this.hass };
        }
      },
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.dataset["version"] = DASHBOARD_VERSION;
    window.addEventListener("popstate", this.readLocation);
    window.addEventListener("location-changed", this.readLocation);
    this.addEventListener(NAVIGATE_EVENT, this.onNavigate as EventListener);
    this.addEventListener(THERMOSTAT_SELECTED_EVENT, this.onThermostatSelected as EventListener);
    this.query = window.matchMedia(NARROW_QUERY);
    this.compact = this.query.matches;
    this.query.addEventListener("change", this.onWidthChange);
    this.readLocation();
  }

  override disconnectedCallback(): void {
    window.removeEventListener("popstate", this.readLocation);
    window.removeEventListener("location-changed", this.readLocation);
    this.query?.removeEventListener("change", this.onWidthChange);
    super.disconnectedCallback();
  }

  /** Show the page of the address again. */
  private readonly readLocation = (): void => {
    const route = parseRoute(window.location.pathname, CORE_TOP_TABS.thermostats);
    if (route !== this.route) {
      this.route = route;
      this.noticeDismissed = false;
      this.drawerOpen = false;
    }
  };

  private readonly onWidthChange = (event: MediaQueryListEvent): void => {
    this.compact = event.matches;
    this.drawerOpen = false;
  };

  private readonly onNavigate = (event: CustomEvent<NavigateDetail>): void => {
    event.stopPropagation();
    window.history.pushState(null, "", event.detail.path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    this.readLocation();
  };

  private readonly onThermostatSelected = (event: CustomEvent<string>): void => {
    event.stopPropagation();
    if (this.hass === undefined) {
      return;
    }
    const model = this.navigationModel(this.route);
    if (model.activeTab === undefined) {
      return;
    }
    const target = routeForThermostat(this.navigationInput(this.route), event.detail);
    this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: this.pathOf(target) } }));
  };

  private pathOf(route: Route): string {
    return [PANEL_PATH, ...[route.tab, route.thermostat, route.entry, ...route.rest].filter((segment): segment is string => segment !== undefined).map(encodeURIComponent)].join("/");
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass !== undefined) {
      this.pluginHass = this.hass;
      if (!this.started) {
        this.started = true;
        void this.start(this.hass);
      } else if (this.loaded !== undefined) {
        void this.language.update(this.hass);
      }
    }
  }

  /** Ask the server for the plugins, import them, read the thermostats and give the language to everything. */
  private async start(hass: Hass): Promise<void> {
    try {
      await this.language.update(hass);
      this.loaded = await bootstrap(hass, {
        developmentEntries: this.developmentEntries,
        ...(this.importModule === undefined ? {} : { importModule: this.importModule }),
        onStatus: (statuses) => {
          this.statuses = statuses;
          this.requestUpdate();
        },
      });
      this.statuses = this.loaded.statuses;
      publishState({ statuses: this.statuses, issues: this.loaded.registry.issues(), dashboardVersion: this.loaded.list.dashboard_version });
      if (this.loaded.list.dashboard_version !== DASHBOARD_VERSION) {
        // After an update, the browser can keep the previous bundle in its cache.
        console.warn(`The dashboard frontend is ${DASHBOARD_VERSION} but the server is ${this.loaded.list.dashboard_version}. Reload the page without cache.`);
      }
      this.thermostats = await this.thermostatProvider(hass);
      await this.language.update(hass);
      this.phase = "ready";
    } catch (error) {
      this.failure = error instanceof Error ? error.message : String(error);
      this.phase = "error";
    }
  }

  private contextOf = (entry: PlacedEntry, thermostat: ThermostatInfo | undefined): VisibilityContext<HookName> => {
    const hass = this.hass as Hass;
    if (entry.hook === "thermostat_config" || entry.hook === "thermostat_widget") {
      return { hass, thermostatId: thermostat?.id ?? "", thermostatType: thermostat?.type ?? "over_switch", values: {}, centralValues: {} };
    }
    return entry.hook === "general_config" ? { hass, values: {} } : { hass };
  };

  private navigationInput(route: Route): NavigationInput {
    const registry = (this.loaded as BootstrapResult).registry;
    return {
      engine: registry.engine,
      route,
      thermostats: this.thermostats,
      translate: (entry, key) => registry.translate(entry.pluginId, key),
      contextOf: this.contextOf,
    };
  }

  private navigationModel(route: Route): NavigationModel {
    return resolveNavigation(this.navigationInput(route));
  }

  /** The properties that the dashboard gives to the component of a page. */
  private propsOf(entry: PlacedEntry, thermostat: ThermostatInfo | undefined): Readonly<Record<string, unknown>> {
    const hass = this.pluginHass ?? this.hass;
    if (entry.hook === "thermostat_config") {
      return { hass, thermostatId: thermostat?.id, values: {}, centralValues: {}, errors: {}, proposeChanges: () => undefined };
    }
    if (entry.hook === "general_config") {
      return { hass, values: {}, errors: {}, proposeChanges: () => undefined };
    }
    return { hass, narrow: this.compact };
  }

  private renderBody(model: NavigationModel): TemplateResult {
    if (model.mode === "list") {
      return html`<vtherm-thermostat-list .thermostats=${this.thermostats} .language=${String(this.languageVersion)}></vtherm-thermostat-list>`;
    }
    if (model.current === undefined) {
      return html`<div class="message" role="status">${t("shell.page.empty")}</div>`;
    }
    const entry = model.current.entry;
    return html`<vtherm-contribution
      .tag=${(entry.contribution as { component: string }).component}
      .contributionId=${entry.id}
      .props=${this.propsOf(entry, model.thermostat)}
      .language=${String(this.languageVersion)}
    ></vtherm-contribution>`;
  }

  private renderMenu(model: NavigationModel): TemplateResult {
    const selecting = model.thermostat !== undefined;
    return html`<vtherm-side-menu
      .sections=${model.sections}
      .thermostats=${selecting ? this.thermostats : []}
      .selected=${model.thermostat?.id ?? ""}
      .label=${t("shell.menu.label")}
      .language=${String(this.languageVersion)}
    ></vtherm-side-menu>`;
  }

  protected override render(): TemplateResult {
    if (this.phase === "loading") {
      return html`<div class="message" role="status">${t("shell.loading")}</div>`;
    }
    if (this.phase === "error") {
      return html`<div class="message error" role="alert">${t("shell.plugins_error", { message: this.failure })}</div>`;
    }
    const model = this.navigationModel(this.route);
    const hasMenu = model.mode === "page" && (model.sections.length > 0 || model.thermostat !== undefined);
    return html`<vtherm-top-bar .tabs=${model.tabs} .heading=${t("shell.title")}></vtherm-top-bar>
      <div class="toolbar">
        ${this.compact && hasMenu
          ? html`<button class="menu-button" aria-expanded=${this.drawerOpen ? "true" : "false"} @click=${() => (this.drawerOpen = !this.drawerOpen)}>${t("shell.menu.toggle")}</button>`
          : undefined}
        <vtherm-breadcrumb .crumbs=${model.breadcrumb} .narrow=${this.compact} .label=${t("shell.breadcrumb.label")}></vtherm-breadcrumb>
      </div>
      ${model.notice !== undefined && !this.noticeDismissed
        ? html`<div class="notice" role="status">
            <span>${t("shell.notice.route_unknown")}</span>
            <button @click=${() => (this.noticeDismissed = true)}>${t("shell.notice.dismiss")}</button>
          </div>`
        : undefined}
      <div class="body">
        ${!this.compact && hasMenu ? html`<aside>${this.renderMenu(model)}</aside>` : undefined}
        <main>${this.renderBody(model)}</main>
        ${this.compact && hasMenu && this.drawerOpen
          ? html`<div class="drawer">
              ${this.renderMenu(model)}
              <button class="scrim" aria-label=${t("shell.notice.dismiss")} @click=${() => (this.drawerOpen = false)}></button>
            </div>`
          : undefined}
      </div>`;
  }
}

customElements.define(PANEL_ELEMENT, VThermDashboardPanel);
