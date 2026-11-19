/**
 * A fake dashboard to test a plugin without Home Assistant.
 *
 * Import it from `@vtherm/dashboard-sdk/testing`, in the tests only. It applies the same validation and the same
 * resolution of the positions as the dashboard, because it uses the same code, so a plugin that behaves well here behaves the
 * same in the dashboard. The main entry point of the SDK never imports this module, so it is not part of the bundle of a plugin.
 *
 * @packageDocumentation
 */

import { CORE_TOP_TABS, createPlacementEngine } from "./placement.js";
import type { EngineIssue, PlacedEntry, PlacementEngine, PluginRelations } from "./placement.js";
import { unwrapCatalog } from "./translations.js";
import type { AnyTranslations, Catalog } from "./translations.js";
import type { UiPluginRegistry } from "./registry.js";
import { sectionStatusOf } from "./status.js";
import { FIELD_HELP_ELEMENT } from "./field-help.js";
import type { FieldHelpProps } from "./field-help.js";
import type {
  ComponentHookName,
  Hass,
  HassDeviceRegistryEntry,
  HassEntityRegistryEntry,
  HookName,
  HookProps,
  SectionStatus,
  UiPluginDefinition,
  VisibilityContext,
} from "./types.js";
import { assertValidDefinition } from "./validation.js";

/** A service that a component called on the fake `hass`. */
export interface ServiceCall {
  /** The domain of the service, for example `number`. */
  readonly domain: string;
  /** The name of the service, for example `set_value`. */
  readonly service: string;
  /** The data given to the service. */
  readonly data: Readonly<Record<string, unknown>> | undefined;
}

/** A fake `hass`: the state of Home Assistant that a component reads, with ways to change it from a test. */
export interface FakeHass extends Hass {
  /** Language of the profile. Change it with `setLanguage`. */
  language: string;
  /** Set the state of an entity, and its attributes. */
  setState(entityId: string, state: string, attributes?: Readonly<Record<string, unknown>>): void;
  /**
   * Add a device to `devices`, or replace the one with the same `id`. The registry is created by the first device: until then
   * `devices` is undefined, as in a version of Home Assistant that does not give it.
   */
  setDevice(device: HassDeviceRegistryEntry): void;
  /** Add an entity to `entities`, or replace the one with the same `entity_id`. The registry is created by the first entity. */
  setEntity(entity: HassEntityRegistryEntry): void;
  /** Set the language of the user. */
  setLanguage(language: string): void;
  /** The services that the component called, in order. */
  readonly serviceCalls: readonly ServiceCall[];
  /** Set what `callWS` answers. By default it rejects, so a test must say what the server answers. */
  setWebSocketHandler(handler: (message: Readonly<Record<string, unknown>>) => unknown): void;
}

/** What `createFakeHass` can be given. */
export interface FakeHassOptions {
  /** The language of the user. `en` by default. */
  readonly language?: string;
  /** The states of the entities, by entity id. */
  readonly states?: Readonly<Record<string, string>>;
  /** Whether the user is an administrator. `true` by default. */
  readonly isAdmin?: boolean;
  /** The registry of the devices, by device id. Undefined by default. */
  readonly devices?: Readonly<Record<string, HassDeviceRegistryEntry>>;
  /** The registry of the entities, by entity id. Undefined by default. */
  readonly entities?: Readonly<Record<string, HassEntityRegistryEntry>>;
}

/**
 * Create a fake `hass`.
 *
 * @param options - The language, the states of some entities and the rights of the user.
 */
export function createFakeHass(options: FakeHassOptions = {}): FakeHass {
  const states: Record<string, { entity_id: string; state: string; attributes: Readonly<Record<string, unknown>>; last_changed: string; last_updated: string }> = {};
  const stateOf = (entityId: string, state: string, attributes: Readonly<Record<string, unknown>>) => {
    const now = new Date().toISOString();
    return { entity_id: entityId, state, attributes, last_changed: now, last_updated: now };
  };
  for (const [entityId, state] of Object.entries(options.states ?? {})) {
    states[entityId] = stateOf(entityId, state, {});
  }
  // The registries stay undefined until a test gives them, as in a version of Home Assistant that does not have them.
  let devices: Record<string, HassDeviceRegistryEntry> | undefined = options.devices === undefined ? undefined : { ...options.devices };
  let entities: Record<string, HassEntityRegistryEntry> | undefined = options.entities === undefined ? undefined : { ...options.entities };
  const serviceCalls: ServiceCall[] = [];
  let handler: (message: Readonly<Record<string, unknown>>) => unknown = (message) => {
    throw new Error(`The fake hass has no answer for the WebSocket message ${JSON.stringify(message)}. Use setWebSocketHandler.`);
  };
  const hass: FakeHass = {
    language: options.language ?? "en",
    locale: { language: options.language ?? "en" },
    states,
    user: { is_admin: options.isAdmin ?? true },
    get devices() {
      return devices;
    },
    get entities() {
      return entities;
    },
    serviceCalls,
    setState(entityId, state, attributes = {}) {
      states[entityId] = stateOf(entityId, state, attributes);
    },
    setDevice(device) {
      // A new object, as Home Assistant gives a new registry when it changes.
      devices = { ...devices, [device.id]: device };
    },
    setEntity(entity) {
      entities = { ...entities, [entity.entity_id]: entity };
    },
    setLanguage(language) {
      hass.language = language;
      (hass as { locale: { language: string } }).locale = { language };
    },
    setWebSocketHandler(newHandler) {
      handler = newHandler;
    },
    async callService(domain, service, data) {
      serviceCalls.push({ domain, service, data });
      return undefined;
    },
    async callWS<Result>(message: Readonly<Record<string, unknown>>): Promise<Result> {
      return handler(message) as Result;
    },
  };
  return hass;
}

/** What `createFakeHost` can be given. */
export interface FakeHostOptions {
  /** The version of the dashboard that the plugins read. `1.0.0` by default. */
  readonly dashboardVersion?: string;
  /**
   * The identifiers of the plugins registered in Python. When it is given, a plugin that is not in the list is refused,
   * as the dashboard does. Without it, every plugin is accepted.
   */
  readonly knownPlugins?: readonly string[];
}

/** The fake dashboard. */
export interface FakeHost extends UiPluginRegistry {
  /** The fake `hass` given to the components. */
  readonly hass: FakeHass;
  /** Put the fake dashboard in the page, where `registerUiPlugin` looks for it. Call `uninstall` when the test ends. */
  install(): void;
  /** Remove the fake dashboard from the page. */
  uninstall(): void;
  /**
   * Register a plugin as the dashboard does: same validation, same position resolution.
   *
   * @param definition - The definition of the plugin.
   * @param relations - Its load dependencies.
   * @throws `UiPluginValidationError` when the definition is not valid, the same error as `registerUiPlugin`.
   * @returns The problems found while placing the contributions.
   */
  registerPlugin(definition: UiPluginDefinition, relations?: PluginRelations): EngineIssue[];
  /** The contributions of a hook, resolved and in order. For `top_tab`, the zone `start` then the zone `end`. */
  resolved(hook: HookName): readonly PlacedEntry[];
  /** The entries of the left menu of a top tab, made of the contributions of several hooks. */
  menu(tabId: string): readonly PlacedEntry[];
  /** Keep the entries that are visible for a context. A condition that raises hides the entry and records an issue. */
  visible<H extends HookName>(entries: readonly PlacedEntry[], context: VisibilityContext<H>): PlacedEntry[];
  /**
   * The status that a configuration section declares for a context, as the menu of the dashboard reads it. A function that raises or
   * returns a value that is not a status gives `undefined`, and the problem is in `statusErrors`.
   */
  status<H extends "general_config" | "thermostat_config">(entry: PlacedEntry, context: VisibilityContext<H>): SectionStatus | undefined;
  /** The problems of the status functions, since the start: what the development mode of the dashboard reports. */
  statusErrors(): readonly unknown[];
  /**
   * Show the component of a contribution with properties, in the document.
   *
   * @param entry - The contribution, from `resolved`.
   * @param props - The properties the dashboard gives to the component of this hook. `hass` is the fake `hass` by default, and `narrow`
   *   is false by default: give `narrow: true` to see the component as on a phone.
   * @returns The element, once it has rendered.
   */
  render<H extends ComponentHookName>(entry: PlacedEntry, props: Omit<HookProps<H>, "hass" | "narrow"> & { hass?: Hass; narrow?: boolean }): Promise<HTMLElement>;
  /** Every problem found while placing the contributions, since the start. */
  issues(): readonly EngineIssue[];
}

/**
 * Create a fake dashboard.
 *
 * @param options - The version of the dashboard and the plugins known in Python.
 */
export function createFakeHost(options: FakeHostOptions = {}): FakeHost {
  const engine: PlacementEngine = createPlacementEngine();
  const hass = createFakeHass();
  const registered = new Set<string>();
  const statusErrors: unknown[] = [];

  const menuOf = (hook: HookName): string | undefined =>
    hook === "global_page" ? CORE_TOP_TABS.dashboard : hook === "general_config" ? CORE_TOP_TABS.configuration : hook === "thermostat_config" ? CORE_TOP_TABS.thermostats : undefined;

  const host: FakeHost = {
    dashboardVersion: options.dashboardVersion ?? "1.0.0",
    hass,
    install() {
      (globalThis as { VThermUiPluginRegistry?: UiPluginRegistry }).VThermUiPluginRegistry = host;
    },
    uninstall() {
      delete (globalThis as { VThermUiPluginRegistry?: UiPluginRegistry }).VThermUiPluginRegistry;
    },
    register(definition) {
      host.registerPlugin(definition);
    },
    registerPlugin(definition, relations) {
      assertValidDefinition(definition);
      if (options.knownPlugins !== undefined && !options.knownPlugins.includes(definition.id)) {
        throw new Error(`The plugin '${definition.id}' is not known: it is not registered in Python, so it cannot register.`);
      }
      if (registered.has(definition.id)) {
        throw new Error(`The plugin '${definition.id}' already registered its contributions.`);
      }
      registered.add(definition.id);
      return engine.addPlugin(definition, relations);
    },
    resolved(hook) {
      if (hook === "top_tab") {
        return [...engine.topTabs().start, ...engine.topTabs().end];
      }
      if (hook === "global_widget" || hook === "thermostat_widget") {
        return engine.widgets(hook);
      }
      if (hook === "tab_page") {
        const tabs = [...engine.topTabs().start, ...engine.topTabs().end].map((entry) => entry.id);
        return tabs.flatMap((tab) => engine.menu(tab).filter((entry) => entry.hook === "tab_page"));
      }
      return engine.menu(menuOf(hook) as string).filter((entry) => entry.hook === hook);
    },
    menu: (tabId) => engine.menu(tabId),
    visible: (entries, context) => engine.visible(entries, () => context),
    status: (entry, context) => sectionStatusOf(entry, context, (error) => statusErrors.push(error)),
    statusErrors: () => [...statusErrors],
    async render(entry, props) {
      const tag = (entry.contribution as { component?: string }).component;
      if (tag === undefined) {
        throw new Error(`The contribution '${entry.id}' has no component to render.`);
      }
      if (customElements.get(tag) === undefined) {
        throw new Error(`The custom element <${tag}> of '${entry.id}' is not defined. Import the module of the plugin, or define the element, before rendering.`);
      }
      const element = document.createElement(tag);
      // The properties are set before the element is connected, so its first render already has them.
      Object.assign(element, { hass, narrow: false, ...props });
      document.body.append(element);
      await (element as { updateComplete?: Promise<unknown> }).updateComplete;
      return element;
    },
    issues: () => engine.issues(),
  };
  return host;
}

/** The keys of the catalog of a language that do not match the English catalog. */
export interface TranslationProblems {
  /** The language that was checked. */
  readonly language: string;
  /** The keys of the English catalog that the language does not have. */
  readonly missing: readonly string[];
  /** The keys of the language that are not in the English catalog. */
  readonly unknown: readonly string[];
}

/**
 * Compare the catalogs of some languages with the English catalog of a plugin.
 *
 * Use it for the languages that the plugin declares complete. A catalog loaded on demand is loaded for the check.
 *
 * @param translations - The translations of the plugin.
 * @param languages - The languages that must be complete, for example `["fr", "de"]`.
 * @returns The problems of the languages that have some. The list is empty when every language is complete and has no unknown key.
 */
export async function findTranslationProblems(translations: AnyTranslations, languages: readonly string[]): Promise<TranslationProblems[]> {
  const english = Object.keys(translations.english);
  const problems: TranslationProblems[] = [];
  for (const language of languages) {
    const tag = language.trim().toLowerCase().replace(/_/g, "-");
    const declared = Object.entries(translations.catalogs).find(([name]) => name.trim().toLowerCase().replace(/_/g, "-") === tag)?.[1];
    if (declared === undefined) {
      problems.push({ language, missing: english, unknown: [] });
      continue;
    }
    const loaded = typeof declared === "function" ? await (declared as () => Promise<Catalog | { default: Catalog }>)() : declared;
    const catalog = unwrapCatalog(loaded);
    const keys = Object.keys(catalog);
    const missing = english.filter((key) => !keys.includes(key));
    const unknown = keys.filter((key) => !english.includes(key));
    if (missing.length > 0 || unknown.length > 0) {
      problems.push({ language, missing, unknown });
    }
  }
  return problems;
}

/**
 * Fail when a catalog that must be complete omits a key or has a key that does not exist.
 *
 * @param translations - The translations of the plugin.
 * @param languages - The languages that must be complete.
 * @throws An error that names each language and each faulty key.
 */
export async function assertCompleteTranslations(translations: AnyTranslations, languages: readonly string[]): Promise<void> {
  const problems = await findTranslationProblems(translations, languages);
  if (problems.length > 0) {
    throw new Error(
      `The translations are not complete:\n${problems
        .map((problem) => `  ${problem.language}: ${problem.missing.length > 0 ? `missing ${problem.missing.map((key) => `'${key}'`).join(", ")}` : ""}${problem.missing.length > 0 && problem.unknown.length > 0 ? "; " : ""}${problem.unknown.length > 0 ? `unknown ${problem.unknown.map((key) => `'${key}'`).join(", ")}` : ""}`)
        .join("\n")}`,
    );
  }
}

/** A simulated component of Home Assistant: it keeps the properties that it receives, so that a test can read them. */
export interface MockHaElement extends HTMLElement {
  /** The state of Home Assistant. */
  hass: unknown;
  /** The selector of `ha-selector`, from `selectorOf`. */
  selector: unknown;
  /** The value of `ha-selector`. */
  value: unknown;
  /** The label, as the component translates it. */
  label: string | undefined;
  /** The help shown under the control. */
  helper: string | undefined;
  /** The error shown on the control. */
  error: string | undefined;
  /** Whether a value is required. */
  required: boolean;
  /** Whether the control cannot be changed. */
  disabled: boolean;
  /** Whether `ha-switch` is on. */
  checked: boolean;
  /** Whether `ha-dialog` is open. */
  open: boolean;
  /** Whether `ha-expansion-panel` is open. */
  expanded: boolean;
  /** The title of `ha-dialog`. */
  heading: string | undefined;
  /** The title of `ha-card` and `ha-expansion-panel`. */
  header: string | undefined;
  /** The type of `ha-alert`: `error`, `warning`, `info` or `success`. */
  alertType: string | undefined;
  /** The appearance of `ha-button` and `ha-progress-button`, for example `plain` or `filled`. */
  appearance: string | undefined;
  /** Whether `ha-progress-button` shows its indicator of progress. */
  progress: boolean;
  /** The last result that `ha-progress-button` was told to show, by `actionSuccess()` or `actionError()`. */
  result: "success" | "error" | undefined;
  /** The path of the icon of `ha-svg-icon`. */
  path: string | undefined;
  /** Show the success on `ha-progress-button`: green with a check mark, in Home Assistant. */
  actionSuccess(): void;
  /** Show the failure on `ha-progress-button`: red with an alert icon, in Home Assistant. */
  actionError(): void;
  /**
   * Change the value as the user would: the new value is kept and sent with the event that Home Assistant sends, `value-changed`
   * (`change` for `ha-switch`).
   *
   * @param value - The new value.
   */
  change(value: unknown): void;
}

/** The components of Home Assistant that `defineHaControlMocks` simulates: those of the contract of the fields and of the dashboard. */
export const MOCKED_HA_CONTROLS = [
  "ha-selector",
  "ha-switch",
  "ha-button",
  "ha-icon",
  "ha-alert",
  "ha-card",
  "ha-dialog",
  "ha-expansion-panel",
  "ha-service-picker",
  "ha-data-table",
  "ha-md-list-item",
  "ha-progress-button",
  "ha-svg-icon",
  "ha-spinner",
] as const;

/**
 * Define simulated components of Home Assistant in the page of a test, so that a component that draws `ha-selector`, `ha-switch`,
 * `ha-button`... can be tested without Home Assistant. A component that is already defined is left as it is. The test needs a DOM
 * (`happy-dom` or `jsdom`).
 *
 * Read a simulated component as a `MockHaElement` to check what it received, and call `change(value)` to act as the user.
 */
export function defineHaControlMocks(): void {
  class Mock extends HTMLElement {
    hass: unknown = undefined;
    selector: unknown = undefined;
    value: unknown = undefined;
    label: string | undefined = undefined;
    helper: string | undefined = undefined;
    error: string | undefined = undefined;
    required = false;
    disabled = false;
    checked = false;
    open = false;
    expanded = false;
    heading: string | undefined = undefined;
    header: string | undefined = undefined;
    alertType: string | undefined = undefined;
    appearance: string | undefined = undefined;
    progress = false;
    result: "success" | "error" | undefined = undefined;
    path: string | undefined = undefined;

    actionSuccess(): void {
      this.result = "success";
    }

    actionError(): void {
      this.result = "error";
    }

    change(value: unknown): void {
      this.value = value;
      if (this.localName === "ha-switch") {
        this.checked = value === true;
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        return;
      }
      this.dispatchEvent(new CustomEvent("value-changed", { detail: { value }, bubbles: true, composed: true }));
    }
  }
  for (const tag of MOCKED_HA_CONTROLS) {
    if (customElements.get(tag) === undefined) {
      customElements.define(tag, class extends Mock {});
    }
  }
}

/** A simulated help of a field: the properties that a component gave to `FIELD_HELP_ELEMENT`, to read in a test. */
export interface MockFieldHelpElement extends HTMLElement {
  /** The name of the field. */
  label: FieldHelpProps["label"];
  /** The short hint. */
  hint: FieldHelpProps["hint"];
  /** The detailed explanation. */
  info: FieldHelpProps["info"];
  /** The diagram of the library. */
  diagram: FieldHelpProps["diagram"];
  /** The values that the diagram illustrates. */
  values: FieldHelpProps["values"];
  /** The setting that the diagram highlights. */
  highlight: FieldHelpProps["highlight"];
}

/**
 * Define a simulated help of a field (`FIELD_HELP_ELEMENT`) in the page of a test, so that a plugin can check the help of its fields
 * without the dashboard: read the element as a `MockFieldHelpElement`. It shows its hint as text, and nothing else. An element that is
 * already defined, such as the one of the dashboard, is left as it is. The test needs a DOM (`happy-dom` or `jsdom`).
 */
export function defineFieldHelpMock(): void {
  if (customElements.get(FIELD_HELP_ELEMENT) !== undefined) {
    return;
  }
  customElements.define(
    FIELD_HELP_ELEMENT,
    class extends HTMLElement {
      label = "";
      info: string | undefined = undefined;
      diagram: FieldHelpProps["diagram"] = undefined;
      values: FieldHelpProps["values"] = undefined;
      highlight: string | undefined = undefined;
      #hint: string | undefined = undefined;

      get hint(): string | undefined {
        return this.#hint;
      }

      set hint(value: string | undefined) {
        this.#hint = value;
        this.textContent = value ?? "";
      }
    },
  );
}

/** Forget the shared load of `ensureHaControls`, so that a test can start a new one, for example after `defineHaControlMocks`. */
export { resetHaControls } from "./ha-controls.js";
