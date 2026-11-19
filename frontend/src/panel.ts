import { CORE_TOP_TABS } from "@vtherm/dashboard-sdk";
import type { CentralContext, DraftMessage, Hass, HookName, PlacedEntry, SaveResult, ThermostatType, VisibilityContext } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { PropertyValues, TemplateResult } from "lit";

import { bootstrap } from "./bootstrap.ts";
import { createConfigApi } from "./config/api.ts";
import { ConfigSession, creationKey, isCreationKey } from "./config/config-session.ts";
import type { OpenConfig } from "./config/config-session.ts";
import { PRESET_PREFIX } from "./config/draft.ts";
import { fieldLabelKey } from "./native/fields.ts";
import { CORE_OVERVIEW_ID, THERMOSTAT_OVERVIEW_ID } from "./native/native-plugin.ts";
import { creationContributionIds, creationMissing, creationValues, definitionOfContribution, featureStepOf } from "./native/tab-definitions.ts";
import type { ConfigKind } from "./native/tab-definitions.ts";
import type { BootstrapResult } from "./bootstrap.ts";
import "./components/breadcrumb.ts";
import "./components/contribution-host.ts";
import "./components/field-help.ts";
import { diagramTexts } from "./components/diagrams/texts.ts";
import { renderCardActions } from "./components/card-actions.ts";
import type { FeatureControl } from "./components/contribution-host.ts";
import type { CardDraft } from "./components/card-actions.ts";
import { CREATE_CENTRAL_EVENT, NAVIGATE_EVENT, PAGE_TITLE_EVENT } from "./components/events.ts";
import type { NavigateDetail } from "./components/events.ts";
import "./components/side-menu.ts";
import { THERMOSTAT_SELECTED_EVENT } from "./components/side-menu.ts";
import "./components/thermostat-list.ts";
import "./components/type-choice.ts";
import { renderIcon } from "./components/icon.ts";
import { isDefined, renderAlert, renderButton, renderDialog, renderProgress } from "./components/ha.ts";
import "./components/top-bar.ts";
import { createLanguageController } from "./i18n.ts";
import type { LanguageController } from "./i18n.ts";
import type { PluginStatus } from "./loader.ts";
import { resolveNavigation, routeForThermostat } from "./navigation.ts";
import type { CreationInput, NavigationInput, NavigationModel, ThermostatInfo } from "./navigation.ts";
import { NEW_THERMOSTAT, PANEL_PATH, buildPath, parseRoute } from "./router.ts";
import { toThermostatInfo } from "./thermostat-areas.ts";
import type { HassRegistries } from "./thermostat-areas.ts";
import { publishState } from "./state.ts";
import type { Route } from "./router.ts";
import { shell, t } from "./shell-translations.ts";
import { translateErrorCode } from "./i18n.ts";
import { DASHBOARD_VERSION } from "./version.ts";
import { defineElement } from "./components/define.ts";
import { DevStore } from "./dev/dev-store.ts";
import { NARROW_QUERY, narrowStyles } from "./components/narrow-styles.ts";
import type { DevelopmentEntry } from "./plugin-list.ts";

/** The tag name of the panel. The integration registers the panel with this name. */
export const PANEL_ELEMENT = "vtherm-dashboard-panel";

/** The width under which the screen is narrow: the menu becomes a drawer. Defined with the styles of the narrow screen. */
export { NARROW_QUERY } from "./components/narrow-styles.ts";

/** Gives the thermostats of Versatile Thermostat. */
export type ThermostatProvider = (hass: Hass) => Promise<readonly ThermostatInfo[]>;

/** The panel "Versatile Thermostat", which Home Assistant shows in its side menu. */
export class VThermDashboardPanel extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    thermostatProvider: { attribute: false },
    developmentEntries: { attribute: false },
    importModule: { attribute: false },
    phase: { state: true },
    currentRoute: { state: true },
    compact: { state: true },
    drawerOpen: { state: true },
    leaving: { state: true },
    noticeDismissed: { state: true },
    thermostats: { state: true },
    failure: { state: true },
    languageVersion: { state: true },
    saving: { state: true },
    pageTitle: { state: true },
    developmentPlugins: { state: true },
    saveNotice: { state: true },
    configRevision: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: flex;
      flex-direction: column;
      /* Home Assistant gives no definite height to the element around a custom panel: 100% would be the height of the content. The
         panel takes the height of the window, so that its page scrolls inside it and the drawer and the save bar reach the bottom. */
      height: 100vh;
      height: 100dvh;
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
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      margin: 0 0 0 8px;
      padding: 0 10px;
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
    .devbanner {
      padding: 6px 16px;
      color: var(--text-primary-color);
      background-color: var(--warning-color);
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
      /* The actions at the foot of the last card can be brought above the navigation bar of the system on a phone. */
      padding-bottom: max(16px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
      box-sizing: border-box;
    }
    .drawer {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
    }
    .drawer vtherm-side-menu {
      flex: 0 0 auto;
      max-width: 85%;
      height: 100%;
      overflow-y: auto;
      overscroll-behavior: contain;
      box-shadow: var(--ha-card-box-shadow, 0 2px 8px var(--divider-color));
    }
    .drawer .scrim {
      flex: 1 1 auto;
      padding: 0;
      border: 0;
      background-color: var(--divider-color);
      opacity: 0.6;
      cursor: pointer;
    }
    @supports (background-color: color-mix(in srgb, red 50%, transparent)) {
      .drawer .scrim {
        background-color: color-mix(in srgb, var(--primary-text-color) 40%, transparent);
        opacity: 1;
      }
    }
    .message {
      padding: 32px 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .message.error {
      color: var(--error-color);
    }
    .actions-card {
      display: block;
      max-width: 760px;
      margin: 0 16px 16px;
    }
    /* fallback: the card of the actions when ha-card is not defined. */
    div.actions-card {
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .readonly,
    .missing {
      margin: 16px 16px 0;
    }
    /* fallback: ha-alert draws its own background and bar, so only the div of the fallback needs a border. */
    div.readonly,
    div.missing {
      padding: 8px 12px;
      border: 1px solid var(--warning-color);
      border-radius: 4px;
    }
  `,
  ];

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

  /**
   * The route that the address designates.
   *
   * It is not named `route`: Home Assistant sets a property `route` (`{ prefix, path }`) on every custom panel at each navigation, which
   * would replace this one. The panel reads the address itself, with the `location-changed` and `popstate` events.
   */
  declare currentRoute: Route;

  /** Whether the screen is narrow. */
  declare compact: boolean;

  /** Whether the drawer of the menu is open. */
  declare drawerOpen: boolean;

  /** The page that the user wants to go to, while the dialog asks whether to leave the draft. */
  declare leaving: Route | undefined;

  /** Whether the user closed the notice of an unknown route. */
  declare noticeDismissed: boolean;

  /** The thermostats. */
  declare thermostats: readonly ThermostatInfo[];

  /** Why the plugins could not be loaded. */
  declare failure: string;

  /** Changes each time the language was applied, so that every component draws its texts again. */
  declare languageVersion: number;

  /** The identifiers of the plugins in development that were sent with the request. They make the banner. */
  declare developmentPlugins: readonly string[];

  /** The last segment of the breadcrumb, given by the page that is shown. It is dropped when the route changes. */
  declare pageTitle: string;

  /** Whether a save is running. */
  declare saving: boolean;

  /** A message of the last save that the draft does not hold: a partial save, or a save that failed. */
  declare saveNotice: { readonly entryId: string; readonly message: DraftMessage } | undefined;

  /** Changes each time a configuration or a draft changes, so that the panel draws again. */
  declare configRevision: number;

  /** The configurations and their drafts, once the panel started. */
  session: ConfigSession | undefined;

  /** The `hass` given to the pages. It is a new object after a change of language, so that the components of the plugins draw again. */
  private pluginHass: Hass | undefined;

  /** The registry and the status of the plugins, once loaded. */
  loaded: BootstrapResult | undefined;

  /** The status of every plugin, updated while they load. */
  statuses: readonly PluginStatus[] = [];

  private readonly language: LanguageController;
  private started = false;
  /** The draft of creation whose type the user chose, so that a card is shown as selected only on the way back, not by default. */
  private typeChosenFor: object | undefined;
  private query: MediaQueryList | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.narrow = false;
    this.thermostatProvider = async () => ((await this.session?.refreshList())?.thermostats ?? []).map(toThermostatInfo);
    this.developmentEntries = [];
    this.importModule = undefined;
    this.phase = "loading";
    this.currentRoute = parseRoute(window.location.pathname, CORE_TOP_TABS.thermostats);
    this.compact = false;
    this.drawerOpen = false;
    this.leaving = undefined;
    this.noticeDismissed = false;
    this.thermostats = [];
    this.failure = "";
    this.languageVersion = 0;
    this.pageTitle = "";
    this.developmentPlugins = [];
    this.saving = false;
    this.saveNotice = undefined;
    this.configRevision = 0;
    this.language = createLanguageController(
      () => [shell, diagramTexts, ...(this.loaded?.registry.translations() ?? [])],
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
    this.addEventListener(PAGE_TITLE_EVENT, this.onPageTitle as EventListener);
    this.addEventListener(CREATE_CENTRAL_EVENT, this.onCreateCentral);
    this.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("beforeunload", this.onBeforeUnload);
    this.query = window.matchMedia(NARROW_QUERY);
    this.compact = this.query.matches;
    this.query.addEventListener("change", this.onWidthChange);
    this.readLocation();
  }

  override disconnectedCallback(): void {
    window.removeEventListener("popstate", this.readLocation);
    window.removeEventListener("location-changed", this.readLocation);
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    this.query?.removeEventListener("change", this.onWidthChange);
    super.disconnectedCallback();
  }

  /** Show the page of the address again. */
  private readonly readLocation = (): void => {
    const route = parseRoute(window.location.pathname, CORE_TOP_TABS.thermostats);
    if (!this.confirmLeave(route)) {
      // The user stays: the address of the page that is shown comes back.
      window.history.pushState(null, "", buildPath(this.currentRoute));
      return;
    }
    if (route !== this.currentRoute) {
      this.currentRoute = route;
      this.pageTitle = "";
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
    if (!this.confirmLeave(parseRoute(event.detail.path, CORE_TOP_TABS.thermostats))) {
      return;
    }
    window.history.pushState(null, "", event.detail.path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    this.readLocation();
  };

  private readonly onThermostatSelected = (event: CustomEvent<string>): void => {
    event.stopPropagation();
    if (this.hass === undefined) {
      return;
    }
    const model = this.navigationModel(this.currentRoute);
    if (model.activeTab === undefined) {
      return;
    }
    const target = routeForThermostat(this.navigationInput(this.currentRoute), event.detail);
    this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: this.pathOf(target) } }));
  };

  /**
   * What a route creates: a thermostat on the page of a new thermostat, or the central configuration in the Configuration tab while its
   * draft of creation is open.
   */
  private creationKind(route: Route): ConfigKind | undefined {
    if (route.tab === CORE_TOP_TABS.thermostats && route.thermostat === NEW_THERMOSTAT) {
      return "thermostat";
    }
    return route.tab === CORE_TOP_TABS.configuration && this.session?.creation("central") !== undefined ? "central" : undefined;
  }

  /** The key of the configuration of a thermostat of the navigation: the draft of the creation for a new thermostat. */
  private thermostatKey(thermostat: ThermostatInfo | undefined): string | null {
    return thermostat?.id === NEW_THERMOSTAT ? creationKey("thermostat") : (thermostat?.id ?? null);
  }

  /** The key of the central configuration that the Configuration tab edits: the draft of its creation when one is open. */
  private centralKey(): string | null {
    return this.session?.creation("central") === undefined ? (this.session?.centralId ?? null) : creationKey("central");
  }

  /** The configuration that a route edits: the thermostat of the Thermostats tab, or the central configuration of the Configuration tab. */
  private entryOf(route: Route): string | null {
    const creating = this.creationKind(route);
    if (creating !== undefined) {
      return creationKey(creating);
    }
    if (route.tab === CORE_TOP_TABS.thermostats && route.thermostat !== undefined) {
      return route.thermostat;
    }
    return route.tab === CORE_TOP_TABS.configuration ? this.centralKey() : null;
  }

  /**
   * Ask before leaving a configuration whose draft has changes. Going from a section to another of the same configuration does not ask.
   *
   * @returns Whether the panel can go to the route. When the user leaves, the draft is dropped.
   */
  private confirmLeave(target: Route): boolean {
    const current = this.entryOf(this.currentRoute);
    const draft = this.session?.get(current)?.draft;
    if (current === null || draft === undefined || this.entryOf(target) === current) {
      return true;
    }
    if (!draft.dirty) {
      // A creation that was not started has nothing to keep: leaving it drops the draft, so that it starts again from the defaults.
      if (isCreationKey(current)) {
        this.session?.close(current);
      }
      return true;
    }
    if (isDefined("ha-dialog")) {
      // The dialog of Home Assistant does not block: the panel stays on its page and goes on once the user confirms.
      this.leaving = target;
      return false;
    }
    // fallback: the confirmation of the browser, when ha-dialog is not defined.
    if (!window.confirm(t("draft.leave"))) {
      return false;
    }
    this.session?.close(current);
    return true;
  }

  /** The dialog that asks whether to leave a draft that is not saved. */
  private renderLeaveDialog(): TemplateResult | undefined {
    const target = this.leaving;
    if (target === undefined) {
      return undefined;
    }
    return renderDialog({
      title: t("draft.leave_title"),
      body: html`<p>${t("draft.leave")}</p>`,
      confirm: {
        label: t("draft.leave_confirm"),
        className: "confirm-leave",
        onClick: () => {
          this.leaving = undefined;
          const current = this.entryOf(this.currentRoute);
          if (current !== null) {
            this.session?.close(current);
          }
          window.history.pushState(null, "", buildPath(target));
          window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
          this.readLocation();
        },
      },
      cancel: {
        label: t("draft.stay"),
        className: "cancel-leave",
        onClick: () => {
          this.leaving = undefined;
        },
      },
    });
  }

  private readonly onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if ((this.session?.dirtyDrafts().length ?? 0) > 0) {
      event.preventDefault();
    }
  };

  private readonly onPageTitle = (event: CustomEvent<string>): void => {
    event.stopPropagation();
    this.pageTitle = event.detail;
  };

  /** The user wants to create the central configuration: its draft opens and the Configuration tab shows its sections. */
  private readonly onCreateCentral = (event: Event): void => {
    event.stopPropagation();
    this.session?.startCreation("central");
    this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: buildPath({ tab: CORE_TOP_TABS.configuration, rest: [] }) } }));
  };

  /** The configuration of an entry, read when it is needed. */
  private config(entryId: string | null): OpenConfig | undefined {
    if (entryId === null || this.session === undefined) {
      return undefined;
    }
    const opened = this.session.get(entryId);
    // The draft of a creation is opened by the panel: there is nothing to read.
    if (opened === undefined && !isCreationKey(entryId)) {
      this.session.load(entryId).catch((error: unknown) => {
        this.failure = error instanceof Error ? error.message : String(error);
      });
    }
    return opened;
  }

  /**
   * Save the draft of a configuration. It never rejects: a failure of the connection is an `error`, with its message above the actions.
   *
   * @returns `success` when everything was written, `partial` when the configuration was written but not every preset temperature.
   */
  private async save(entryId: string): Promise<SaveResult> {
    if (this.session === undefined || this.saving) {
      return "error";
    }
    this.saving = true;
    this.saveNotice = undefined;
    try {
      const outcome = await this.session.save(entryId);
      this.thermostats = (this.session.list?.thermostats ?? []).map(toThermostatInfo);
      if (outcome.ok) {
        return "success";
      }
      if (outcome.configSaved) {
        this.saveNotice = { entryId, message: { type: "warning", text: t("draft.config_saved_presets_failed") } };
        return "partial";
      }
      return "error";
    } catch (error) {
      this.saveNotice = { entryId, message: { type: "error", text: t("draft.save_failed", { message: error instanceof Error ? error.message : String(error) }) } };
      return "error";
    } finally {
      this.saving = false;
    }
  }

  /**
   * Create the configuration of a draft of creation, then open it. It never rejects: a failure of the connection is an `error`, with its
   * message above the actions.
   *
   * @returns `success` when the configuration was created.
   */
  private async create(kind: ConfigKind): Promise<SaveResult> {
    if (this.session === undefined || this.saving) {
      return "error";
    }
    this.saving = true;
    this.saveNotice = undefined;
    try {
      const outcome = await this.session.create(kind);
      this.thermostats = (this.session.list?.thermostats ?? []).map(toThermostatInfo);
      if (!outcome.ok) {
        return "error";
      }
      const route: Route = kind === "central" ? { tab: CORE_TOP_TABS.configuration, rest: [] } : { tab: CORE_TOP_TABS.thermostats, thermostat: outcome.entryId ?? "", rest: [] };
      this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: buildPath(route) } }));
      return "success";
    } catch (error) {
      this.saveNotice = { entryId: creationKey(kind), message: { type: "error", text: t("creation.failed", { message: error instanceof Error ? error.message : String(error) }) } };
      return "error";
    } finally {
      this.saving = false;
    }
  }

  /** Abandon a creation, without confirmation, and go back to the list of the thermostats, or to the page of the central configuration. */
  private abandon(kind: ConfigKind): void {
    this.session?.close(creationKey(kind));
    this.saveNotice = undefined;
    const route: Route = kind === "central" ? { tab: CORE_TOP_TABS.configuration, rest: [] } : { tab: CORE_TOP_TABS.thermostats, rest: [] };
    this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: buildPath(route) } }));
  }

  /** The required fields that a creation misses, by section, as a text: the section, then its fields. */
  private missingText(kind: ConfigKind, draft: { values(): Readonly<Record<string, unknown>> }): string {
    const registry = (this.loaded as BootstrapResult).registry;
    return creationMissing(kind, draft.values(), this.session?.centralId !== null)
      .map(({ definition, fields }) => {
        // The fields are named as their tile names them: the short name of the dashboard when the name of Versatile Thermostat is too long.
        const english = (registry.definitions().find((candidate) => candidate.id === definition.plugin)?.translations.english ?? {}) as Readonly<Record<string, unknown>>;
        return `${registry.translate(definition.plugin, `title.${definition.tab}`)}: ${fields.map((field) => registry.translate(definition.plugin, fieldLabelKey(field.key, english))).join(", ")}`;
      })
      .join("; ");
  }

  /**
   * The state of the draft of a configuration and its commands, for the save actions. A new object at each drawing, so that the
   * components draw again. Undefined when the configuration is not read yet or is read-only: it cannot be saved.
   */
  private draftControls(entryId: string | null): CardDraft | undefined {
    const opened = this.session?.get(entryId);
    if (entryId === null || opened === undefined || opened.data.read_only === true) {
      return undefined;
    }
    const draft = opened.draft;
    const creating = (["thermostat", "central"] as const).find((kind) => creationKey(kind) === entryId);
    if (creating !== undefined) {
      return this.creationControls(creating, draft);
    }
    const messages: DraftMessage[] = [
      ...(draft.dirty ? [{ type: "info" as const, text: t("draft.unsaved") }] : []),
      ...draft.generalErrors().map((error) => ({ type: "error" as const, text: translateErrorCode(shell, error.code) })),
      ...(this.saveNotice?.entryId === entryId ? [this.saveNotice.message] : []),
      ...this.goToRefused(),
    ];
    return {
      dirty: draft.dirty,
      saving: this.saving,
      messages,
      save: () => this.save(entryId),
      discard: () => {
        this.saveNotice = undefined;
        draft.discard();
      },
    };
  }

  /** The controls of a draft of creation: Create is ready when nothing required is missing, and Cancel abandons the creation. */
  private creationControls(kind: ConfigKind, draft: NonNullable<ReturnType<ConfigSession["get"]>>["draft"]): CardDraft {
    const missing = this.missingText(kind, draft);
    const refusals = draft.generalErrors().map((error) => translateErrorCode(shell, error.code));
    const messages: DraftMessage[] = [
      ...(refusals.length === 0 ? [] : [{ type: "error" as const, text: `${t("creation.refused")} ${refusals.join(" ")}` }]),
      ...(this.saveNotice?.entryId === creationKey(kind) ? [this.saveNotice.message] : []),
    ];
    return {
      dirty: draft.dirty,
      saving: this.saving,
      messages,
      save: () => this.create(kind),
      discard: () => draft.discard(),
      creation: { ready: missing === "", cancel: () => this.abandon(kind) },
    };
  }

  private pathOf(route: Route): string {
    return [PANEL_PATH, ...[route.tab, route.thermostat, route.entry, ...route.rest].filter((segment): segment is string => segment !== undefined).map(encodeURIComponent)].join("/");
  }

  /** Close the drawer of the menu with the key Escape. */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.drawerOpen) {
      event.stopPropagation();
      this.drawerOpen = false;
    }
  };

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has("drawerOpen") && changed.get("drawerOpen") !== undefined) {
      void this.moveFocusWithDrawer();
    }
  }

  /** When the drawer opens, the focus goes to the active entry of its menu; when it closes, back to the button that opened it. */
  private async moveFocusWithDrawer(): Promise<void> {
    if (this.drawerOpen) {
      const menu = this.renderRoot.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>(".drawer vtherm-side-menu");
      await menu?.updateComplete;
      const links = [...(menu?.shadowRoot?.querySelectorAll<HTMLElement>("a, select, ha-md-list-item, ha-selector") ?? [])];
      (links.find((link) => link.getAttribute("aria-current") === "page") ?? links[0])?.focus();
    } else {
      this.renderRoot.querySelector<HTMLElement>(".menu-button")?.focus();
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    // The page of a new thermostat has its draft of creation, whether the user came from the list or opened the address.
    if (this.phase === "ready" && (changed.has("currentRoute") || changed.has("phase")) && this.creationKind(this.currentRoute) === "thermostat") {
      this.session?.startCreation("thermostat");
    }
    if (changed.has("hass") && this.hass !== undefined) {
      this.pluginHass = this.hass;
      if (!this.started) {
        this.started = true;
        void this.start(this.hass);
      } else if (this.loaded !== undefined) {
        void this.language.update(this.hass);
      }
      // A thermostat moved to another area in Home Assistant: the server says which one, so the list is read again.
      if (this.session?.areasMoved(this.hass as HassRegistries) === true) {
        const session = this.session;
        void session
          .refreshList()
          .then((list) => {
            this.thermostats = list.thermostats.map(toThermostatInfo);
          })
          .catch(() => undefined);
      }
    }
  }

  /**
   * The entries of the plugins in development to send with the request. Only an administrator has them: for anyone else the browser
   * keeps no entry that counts, and the server would refuse them anyway.
   */
  private activeDevelopmentEntries(hass: Hass): readonly DevelopmentEntry[] {
    if (hass.user?.is_admin !== true) {
      return [];
    }
    if (this.developmentEntries.length > 0) {
      return this.developmentEntries;
    }
    try {
      return new DevStore().active();
    } catch {
      // A browser can refuse the local storage.
      return [];
    }
  }

  /** Ask the server for the plugins, import them, read the thermostats and give the language to everything. */
  private async start(hass: Hass): Promise<void> {
    try {
      await this.language.update(hass);
      const development = this.activeDevelopmentEntries(hass);
      this.developmentPlugins = development.map((entry) => entry.id);
      this.loaded = await bootstrap(hass, {
        developmentEntries: development,
        ...(this.importModule === undefined ? {} : { importModule: this.importModule }),
        onStatus: (statuses) => {
          this.statuses = statuses;
          this.requestUpdate();
        },
      });
      this.statuses = this.loaded.statuses;
      const registry = this.loaded.registry;
      publishState({
        statuses: this.statuses,
        issues: registry.issues(),
        dashboardVersion: this.loaded.list.dashboard_version,
        translationWarnings: (pluginId) => registry.definitions().find((definition) => definition.id === pluginId)?.translations.warnings ?? [],
      });
      if (this.loaded.list.dashboard_version !== DASHBOARD_VERSION) {
        // After an update, the browser can keep the previous bundle in its cache.
        console.warn(`The dashboard frontend is ${DASHBOARD_VERSION} but the server is ${this.loaded.list.dashboard_version}. Reload the page without cache.`);
      }
      this.session = new ConfigSession(createConfigApi(hass));
      this.session.subscribe(() => {
        this.configRevision += 1;
      });
      await this.session.refreshList().catch(() => undefined);
      this.thermostats = await this.thermostatProvider(hass);
      await this.language.update(hass);
      this.phase = "ready";
    } catch (error) {
      this.failure = error instanceof Error ? error.message : String(error);
      this.phase = "error";
    }
  }

  /** The values of the draft of a configuration, with the temperatures of its presets under `preset:<name>`. */
  private valuesOf(entryId: string | null): Readonly<Record<string, unknown>> {
    const draft = this.session?.get(entryId)?.draft;
    if (draft === undefined) {
      return {};
    }
    const presets = Object.fromEntries(Object.entries(draft.presets()).map(([preset, value]) => [`${PRESET_PREFIX}${preset}`, value]));
    return { ...draft.values(), ...presets };
  }

  /**
   * The central configuration that the widgets of the Overview page receive: its entry and its values, which are empty while they are
   * read. Undefined when there is no central configuration.
   */
  private centralContext(): CentralContext | undefined {
    const entryId = this.session?.centralId ?? null;
    return entryId === null ? undefined : { entryId, values: this.valuesOf(entryId) };
  }

  private contextOf = (entry: PlacedEntry, thermostat: ThermostatInfo | undefined): VisibilityContext<HookName> => {
    const hass = this.hass as Hass;
    const central = this.valuesOf(this.session?.centralId ?? null);
    if (entry.hook === "thermostat_config" || entry.hook === "thermostat_widget") {
      const values = this.valuesOf(this.thermostatKey(thermostat));
      if (thermostat?.id === NEW_THERMOSTAT) {
        // A new thermostat has the type of its draft, and the defaults of the forms, which the rules of the sections read.
        const type = String(values["thermostat_type"] ?? "").replace("thermostat_", "") as ThermostatType;
        return { hass, thermostatId: thermostat.id, thermostatType: type, values: creationValues("thermostat", values), centralValues: central };
      }
      return { hass, thermostatId: thermostat?.id ?? "", thermostatType: thermostat?.type ?? "over_switch", values, centralValues: central };
    }
    return entry.hook === "general_config" ? { hass, values: this.valuesOf(this.centralKey()) } : { hass };
  };

  /** The creation that a route shows, if any: its kind and the sections that its draft needs. */
  private creationOf(route: Route): CreationInput | undefined {
    const kind = this.creationKind(route);
    const draft = kind === undefined ? undefined : this.session?.creation(kind)?.draft;
    return kind === undefined || draft === undefined ? undefined : { kind, title: t("creation.title"), entries: creationContributionIds(kind, draft.values()) };
  }

  private navigationInput(route: Route): NavigationInput {
    const registry = (this.loaded as BootstrapResult).registry;
    const creation = this.creationOf(route);
    return {
      ...(creation === undefined ? {} : { creation }),
      engine: registry.engine,
      route,
      thermostats: this.thermostats,
      translate: (entry, key) => registry.translate(entry.pluginId, key),
      contextOf: this.contextOf,
      refused: (entry) => this.isRefused(entry, route),
      onStatusError: this.onStatusError,
    };
  }

  /** After a refused save, the message that opens the first other section that the save refused, in the order of the menu. */
  private goToRefused(): DraftMessage[] {
    if (this.loaded === undefined) {
      return [];
    }
    const refused = this.navigationModel(this.currentRoute)
      .sections.flatMap((section) => section.items)
      .find((item) => item.status?.kind === "refused" && !item.active);
    if (refused === undefined) {
      return [];
    }
    return [
      {
        type: "error",
        text: t("draft.refused_section", { title: refused.title }),
        action: { label: t("draft.go_to", { title: refused.title }), run: () => this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: refused.path } })) },
      },
    ];
  }

  /**
   * Whether the last save of the configuration of the route refused a value of the tab of a native section. The step `features` has no
   * tab: a refused value of it belongs to the section of the feature that declares this value.
   */
  private isRefused(entry: PlacedEntry, route: Route): boolean {
    const draft = this.session?.get(this.entryOf(route))?.draft;
    if (draft === undefined) {
      return false;
    }
    const tab = definitionOfContribution(entry.id)?.definition.tab;
    if (tab !== undefined && draft.refusedTabs().has(tab)) {
      return true;
    }
    const feature = (entry.contribution as { feature?: unknown }).feature;
    return typeof feature === "string" && draft.refusedFields("features").has(feature);
  }

  /** The sections whose status function failed, reported once each. */
  private readonly statusErrors = new Set<string>();

  private readonly onStatusError = (entry: PlacedEntry, error: unknown): void => {
    if (!this.statusErrors.has(entry.id)) {
      this.statusErrors.add(entry.id);
      console.warn(`The status of the section ${entry.id} of the plugin ${entry.pluginId} failed, so the menu shows no status for it:`, error);
    }
  };

  private navigationModel(route: Route): NavigationModel {
    return resolveNavigation(this.navigationInput(route));
  }

  /** The properties that the dashboard gives to the component of a page. */
  private propsOf(entry: PlacedEntry, thermostat: ThermostatInfo | undefined): Readonly<Record<string, unknown>> {
    const hass = this.pluginHass ?? this.hass;
    if (entry.hook !== "thermostat_config" && entry.hook !== "general_config") {
      const central = entry.id === CORE_OVERVIEW_ID ? this.centralContext() : undefined;
      return { hass, narrow: this.compact, language: String(this.languageVersion), subpath: this.currentRoute.rest, ...(central === undefined ? {} : { central }) };
    }
    const entryId = entry.hook === "thermostat_config" ? this.thermostatKey(thermostat) : this.centralKey();
    const draft = this.session?.get(entryId)?.draft;
    // A native tab saves into a step of the flow. The configuration of a third-party plugin has no place to be saved yet.
    const tab = definitionOfContribution(entry.id)?.definition.tab;
    const proposeChanges = (changes: Readonly<Record<string, unknown>>) => {
      if (draft === undefined || tab === undefined) {
        console.warn(`The contribution ${entry.id} proposed changes that the dashboard cannot save`, changes);
        return;
      }
      draft.propose(tab, changes);
    };
    const creationKind = (["thermostat", "central"] as const).find((candidate) => creationKey(candidate) === entryId);
    const common = {
      hass,
      narrow: this.compact,
      values: this.valuesOf(entryId),
      errors: tab === undefined || draft === undefined ? {} : draft.errorsOf(tab),
      proposeChanges,
      draft: this.draftControls(entryId),
      ...(creationKind === undefined || draft === undefined ? {} : { missing: this.missingKeys(creationKind, draft, tab) }),
    };
    // The overview of a thermostat draws the texts of the widgets again when the language changes, as the pages of the Dashboard tab do.
    const language = entry.id === THERMOSTAT_OVERVIEW_ID ? { language: String(this.languageVersion) } : {};
    return entry.hook === "thermostat_config" ? { ...common, ...language, thermostatId: thermostat?.id, centralValues: this.valuesOf(this.session?.centralId ?? null) } : common;
  }

  /** The card of the save actions under a configuration component that does not draw them itself (`save_actions` is not `component`). */
  private renderActionsCard(entry: PlacedEntry, entryId: string | null): TemplateResult | undefined {
    if ((entry.contribution as { save_actions?: string }).save_actions === "component") {
      return undefined;
    }
    // A section whose feature is off has its actions in the card of its switch.
    const feature = (entry.contribution as { feature?: unknown }).feature;
    if (typeof feature === "string" && this.session?.get(entryId)?.draft.values()[feature] !== true) {
      return undefined;
    }
    const actions = renderCardActions(this.draftControls(entryId), String(this.languageVersion));
    if (actions === undefined) {
      return undefined;
    }
    return isDefined("ha-card") ? html`<ha-card class="actions-card">${actions}</ha-card>` : html`<div class="actions-card">${actions}</div>`;
  }

  /** The choice of the type of a new thermostat, before its page of configuration, which opens on its first section. */
  private renderTypeChoice(): TemplateResult {
    const draft = this.session?.creation("thermostat")?.draft;
    if (draft === undefined) {
      return html`<div class="message">${renderProgress(t("config.loading"))}</div>`;
    }
    const values = draft.values();
    const first = creationContributionIds("thermostat", values)[0];
    const next = () => this.onNavigate(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path: buildPath({ tab: CORE_TOP_TABS.thermostats, thermostat: NEW_THERMOSTAT, ...(first === undefined ? {} : { entry: first }), rest: [] }) } }));
    return html`<vtherm-type-choice
      .hass=${this.hass}
      .value=${this.typeChosenFor === draft ? String(values["thermostat_type"] ?? "") : ""}
      .select=${(type: string) => {
        this.typeChosenFor = draft;
        if (type !== values["thermostat_type"]) {
          draft.changeType(type);
        }
        next();
      }}
      .cancel=${() => this.abandon("thermostat")}
      .language=${String(this.languageVersion)}
    ></vtherm-type-choice>`;
  }

  /** The keys of the required fields that a creation misses in a section, as the warning lists them: the fields to show in red. */
  private missingKeys(kind: ConfigKind, draft: { values(): Readonly<Record<string, unknown>> }, tab: string | undefined): readonly string[] {
    return creationMissing(kind, draft.values(), this.session?.centralId !== null)
      .filter(({ definition }) => definition.tab === tab)
      .flatMap(({ fields }) => fields.map((field) => field.key));
  }

  /** What a creation still misses, in a warning above the card of the section. Nothing once nothing is missing. */
  private renderMissing(entryId: string | null): TemplateResult | undefined {
    const kind = (["thermostat", "central"] as const).find((candidate) => creationKey(candidate) === entryId);
    const draft = kind === undefined ? undefined : this.session?.creation(kind)?.draft;
    const missing = kind === undefined || draft === undefined ? "" : this.missingText(kind, draft);
    return missing === "" ? undefined : renderAlert("warning", t("creation.missing", { fields: missing }), "missing");
  }

  private renderBody(model: NavigationModel): TemplateResult {
    if (model.mode === "list") {
      return html`<vtherm-thermostat-list .thermostats=${this.thermostats} .hass=${this.hass} .language=${String(this.languageVersion)}></vtherm-thermostat-list>`;
    }
    if (model.mode === "type") {
      return this.renderTypeChoice();
    }
    if (model.current === undefined) {
      return renderAlert("info", t("shell.page.empty"), "message");
    }
    const entry = model.current.entry;
    const isConfig = entry.hook === "thermostat_config" || entry.hook === "general_config";
    const entryId = isConfig ? this.entryOf(this.currentRoute) : null;
    const opened = this.config(entryId);
    if (entryId !== null && opened === undefined) {
      return html`<div class="message">${renderProgress(t("config.loading"))}</div>`;
    }
    const readOnly = opened?.data.read_only === true;
    return html`${readOnly ? renderAlert("warning", t("config.read_only"), "readonly") : undefined} ${this.renderMissing(entryId)}
      <vtherm-contribution
        ?inert=${readOnly}
        .tag=${(entry.contribution as { component: string }).component}
        .contributionId=${entry.id}
        .props=${this.propsOf(entry, model.thermostat)}
        .feature=${isConfig ? this.featureOf(entry, entryId, model.current.title) : undefined}
        .language=${String(this.languageVersion)}
      ></vtherm-contribution>
      ${isConfig ? this.renderActionsCard(entry, entryId) : undefined}`;
  }

  /**
   * The switch of the feature of a configuration section, when it declares one. It changes the value in the tab of the draft where the
   * flow of Versatile Thermostat keeps it: the tab "features" for a plugin, and for a native tab the one that offers the value (the
   * underlyings for the synchronization of the temperature).
   */
  private featureOf(entry: PlacedEntry, entryId: string | null, title: string): FeatureControl | undefined {
    const key = (entry.contribution as { feature?: unknown }).feature;
    const draft = this.session?.get(entryId)?.draft;
    if (typeof key !== "string" || draft === undefined) {
      return undefined;
    }
    const registry = (this.loaded as BootstrapResult).registry;
    const on = draft.values()[key] === true;
    return {
      title,
      intro: registry.translate(entry.pluginId, `feature_intro.${key}`),
      on,
      toggle: (value) => draft.propose(this.featureStep(entry, key, draft.values()), { [key]: value }),
      // While the feature is off, its component is not shown: the save actions are at the foot of the card of the switch, so that a
      // feature turned off in place is saved there.
      actions: on ? undefined : renderCardActions(this.draftControls(entryId), String(this.languageVersion)),
    };
  }

  /** The tab of the draft that holds the value of the feature of a section. */
  private featureStep(entry: PlacedEntry, key: string, values: Readonly<Record<string, unknown>>): string {
    const native = definitionOfContribution(entry.id);
    return native === undefined ? "features" : featureStepOf(key, values, native.kind);
  }

  private renderMenu(model: NavigationModel): TemplateResult {
    // A new thermostat is not one of the thermostats to choose from.
    const selecting = model.thermostat !== undefined && model.thermostat.id !== NEW_THERMOSTAT;
    return html`<vtherm-side-menu
      .sections=${model.sections}
      .thermostats=${selecting ? this.thermostats : []}
      .hass=${this.hass}
      .selected=${selecting ? (model.thermostat?.id ?? "") : ""}
      .label=${t("shell.menu.label")}
      .language=${String(this.languageVersion)}
    ></vtherm-side-menu>`;
  }

  protected override render(): TemplateResult {
    if (this.phase === "loading") {
      return html`<div class="message">${renderProgress(t("shell.loading"))}</div>`;
    }
    if (this.phase === "error") {
      return renderAlert("error", t("shell.plugins_error", { message: this.failure }), "message error");
    }
    const model = this.navigationModel(this.currentRoute);
    if (this.pageTitle !== "" && this.currentRoute.rest.length > 0 && model.breadcrumb.length > 0) {
      // A page that shows one item of a list adds it to the breadcrumb, and the page of the list becomes a link.
      const last = model.breadcrumb[model.breadcrumb.length - 1] as { label: string; path: string | undefined };
      (model as { breadcrumb: unknown }).breadcrumb = [
        ...model.breadcrumb.slice(0, -1),
        { label: last.label, path: buildPath({ ...(this.currentRoute.tab === undefined ? {} : { tab: this.currentRoute.tab }), ...(this.currentRoute.thermostat === undefined ? {} : { thermostat: this.currentRoute.thermostat }), ...(this.currentRoute.entry === undefined ? {} : { entry: this.currentRoute.entry }), rest: [] }) },
        { label: this.pageTitle, path: undefined },
      ];
    }
    // The Dashboard tab with a single page needs no menu: the page takes the full width.
    const singleDashboardPage = model.activeTab?.id === CORE_TOP_TABS.dashboard && model.sections.flatMap((section) => section.items).length <= 1;
    const hasMenu = model.mode === "page" && !singleDashboardPage && (model.sections.length > 0 || model.thermostat !== undefined);
    return html`<vtherm-top-bar
        .tabs=${model.tabs}
        .heading=${t("shell.title")}
        ?compact=${this.compact}
        ?ha-menu=${this.narrow}
        .haMenuLabel=${t("shell.ha_menu")}
        .hass=${this.hass}
      ></vtherm-top-bar>
      ${this.developmentPlugins.length === 0 ? undefined : renderAlert("warning", t("dev.banner", { plugins: this.developmentPlugins.join(", ") }), "devbanner")}
      <div class="toolbar">
        ${this.compact && hasMenu && isDefined("ha-icon-button")
          ? html`<ha-icon-button
              class="menu-button"
              aria-expanded=${this.drawerOpen ? "true" : "false"}
              .label=${t("shell.menu.toggle")}
              title=${t("shell.menu.toggle")}
              @click=${() => (this.drawerOpen = !this.drawerOpen)}
              >${renderIcon("mdi:format-list-bulleted")}</ha-icon-button
            >`
          : undefined}
        ${this.compact && hasMenu && !isDefined("ha-icon-button")
          ? // fallback: a plain button, when ha-icon-button is not defined.
            html`<button
              class="menu-button"
              aria-expanded=${this.drawerOpen ? "true" : "false"}
              aria-label=${t("shell.menu.toggle")}
              title=${t("shell.menu.toggle")}
              @click=${() => (this.drawerOpen = !this.drawerOpen)}
            >
              ${renderIcon("mdi:format-list-bulleted")}
            </button>`
          : undefined}
        <vtherm-breadcrumb .crumbs=${model.breadcrumb} .narrow=${this.compact} .label=${t("shell.breadcrumb.label")}></vtherm-breadcrumb>
      </div>
      ${model.notice !== undefined && !this.noticeDismissed
        ? renderAlert("warning", html`<span>${t("shell.notice.route_unknown")}</span> ${renderButton(t("shell.notice.dismiss"), () => (this.noticeDismissed = true), { plain: true })}`, "notice")
        : undefined}
      ${this.renderLeaveDialog()}
      <div class="body">
        ${!this.compact && hasMenu ? html`<aside>${this.renderMenu(model)}</aside>` : undefined}
        <main ?inert=${this.compact && hasMenu && this.drawerOpen}>${this.renderBody(model)}</main>
        ${this.compact && hasMenu && this.drawerOpen
          ? html`<div class="drawer">
              ${this.renderMenu(model)}
              <!-- Exception to the rule "a component of Home Assistant first": Home Assistant has no public scrim, so the darkened page
                   is a plain button that closes the drawer. -->
              <button class="scrim" aria-label=${t("shell.notice.dismiss")} @click=${() => (this.drawerOpen = false)}></button>
            </div>`
          : undefined}
      </div>`;
  }
}

defineElement(PANEL_ELEMENT, VThermDashboardPanel);
