/**
 * Make the components of Home Assistant available before a field is drawn with them.
 *
 * The interface of Home Assistant defines its components once it has loaded, and `ha-selector` loads each of its selectors the first
 * time it draws one. A page that is opened directly may draw before that: the loader waits for the components, with a limit. Out of
 * Home Assistant, as in the tests, it answers at once that the components are missing, and the fields use their fallback.
 *
 * Every caller shares one load: the first call starts it, the others get the same promise.
 */

/** The components that the contract of the fields and the dashboard use. */
export const HA_CONTROLS = [
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
] as const;

/**
 * The components that the loader does not wait for: the page draws its fallback while they are missing, and they are not part of
 * every version of Home Assistant. `ha-progress-button` is the save button of the configuration cards.
 */
const OPTIONAL_CONTROLS: ReadonlySet<HaControl> = new Set(["ha-progress-button"]);

/** The components that the loader waits for. */
const awaitedControls = (): readonly HaControl[] => HA_CONTROLS.filter((tag) => !OPTIONAL_CONTROLS.has(tag));

/** The indicators of progress, from the most recent: a version of Home Assistant has one of them. */
export const HA_SPINNERS = ["ha-spinner", "ha-circular-progress"] as const;

/** A component of Home Assistant that the loader knows. */
export type HaControl = (typeof HA_CONTROLS)[number] | (typeof HA_SPINNERS)[number];

/** What the loader found. */
export interface HaControlsResult {
  /** Whether the fields can be drawn with the components of Home Assistant: `ha-selector` is defined. */
  readonly loaded: boolean;
  /** Whether each component is defined. A component that is not is replaced by its fallback. */
  readonly defined: Readonly<Record<HaControl, boolean>>;
  /** The indicator of progress of this version of Home Assistant, if any. */
  readonly spinner: (typeof HA_SPINNERS)[number] | undefined;
}

/** The part of the registry of custom elements that the loader uses. */
export type ElementRegistry = Pick<CustomElementRegistry, "get" | "whenDefined">;

/** What the loader can be given. */
export interface HaControlsOptions {
  /** How long to wait for the components, in milliseconds. 10 seconds by default. */
  readonly timeout?: number;
  /** The registry of custom elements. The one of the page by default. */
  readonly registry?: ElementRegistry;
}

/** The element of Home Assistant that exists as soon as its interface runs. */
const HOME_ASSISTANT_ELEMENTS = ["home-assistant", "home-assistant-main", "partial-panel-resolver"];

let shared: Promise<HaControlsResult> | undefined;

/**
 * Read which components are defined now, without waiting.
 *
 * @param registry - The registry of custom elements.
 */
export function haControlsStatus(registry: ElementRegistry = customElements): HaControlsResult {
  const all: readonly HaControl[] = [...HA_CONTROLS, ...HA_SPINNERS];
  const defined = Object.fromEntries(all.map((tag) => [tag, registry.get(tag) !== undefined])) as Record<HaControl, boolean>;
  return { loaded: defined["ha-selector"], defined, spinner: HA_SPINNERS.find((tag) => defined[tag]) };
}

const isComplete = (status: HaControlsResult): boolean => awaitedControls().every((tag) => status.defined[tag]) && status.spinner !== undefined;

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * The older versions of Home Assistant only define their pickers when a page of the configuration was opened: ask the router of the
 * panels to load that page. It is not a public interface, so every step is guarded, and a failure only means the fallback.
 */
async function loadConfigurationPanel(registry: ElementRegistry): Promise<void> {
  try {
    const resolver = document.createElement("partial-panel-resolver") as HTMLElement & {
      getRoutes?: (panels: readonly Record<string, string>[]) => { routes?: Record<string, { load?: () => Promise<unknown> }> };
    };
    if (typeof resolver.getRoutes !== "function") {
      return;
    }
    await resolver.getRoutes([{ component_name: "config", url_path: "a" }]).routes?.["a"]?.load?.();
    await registry.whenDefined("ha-panel-config");
    const config = document.createElement("ha-panel-config") as HTMLElement & { routerOptions?: { routes?: Record<string, { load?: () => Promise<unknown> }> } };
    await config.routerOptions?.routes?.["automation"]?.load?.();
  } catch {
    // The fallback of each field is used.
  }
}

async function load(registry: ElementRegistry, timeout: number): Promise<HaControlsResult> {
  const now = haControlsStatus(registry);
  if (isComplete(now) || !HOME_ASSISTANT_ELEMENTS.some((tag) => registry.get(tag) !== undefined)) {
    return now;
  }
  const required = awaitedControls().filter((tag) => !now.defined[tag]);
  const waitAll = Promise.all(required.map((tag) => registry.whenDefined(tag)));
  await Promise.race([waitAll, delay(timeout)]);
  if (!haControlsStatus(registry).loaded) {
    await loadConfigurationPanel(registry);
    await Promise.race([registry.whenDefined("ha-selector"), delay(timeout / 2)]);
  }
  return haControlsStatus(registry);
}

/**
 * Make the components of Home Assistant available, and tell which ones are.
 *
 * It never raises: a component that stays missing is reported in the result, and its fallback is drawn. When every component is
 * already defined, nothing is loaded. Every call shares one load.
 *
 * @param options - The time limit, and the registry for the tests.
 */
export function ensureHaControls(options: HaControlsOptions = {}): Promise<HaControlsResult> {
  shared ??= load(options.registry ?? customElements, options.timeout ?? 10_000);
  return shared;
}

/** Forget the shared load, so that a test can start a new one. Not exported by the entry point of the SDK. */
export function resetHaControls(): void {
  shared = undefined;
}
