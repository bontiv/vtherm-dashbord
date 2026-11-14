/**
 * A dashboard in a test: the panel, a server that answers with a list of plugins, and plugins whose modules register themselves.
 */

import { CORE_TOP_TABS, defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { vi } from "vitest";

import "../../src/index.ts";
import type { ThermostatInfo } from "../../src/navigation.ts";
import type { VThermDashboardPanel } from "../../src/panel.ts";
import { uninstallRegistry } from "../../src/registry.ts";

/** A plugin of the test: its definition, and the elements that its contributions show. */
export interface TestPlugin {
  readonly definition: UiPluginDefinition;
  /** The state that the server gives it. `ready` by default. */
  readonly state?: string;
  readonly reason?: string | null;
  readonly details?: Record<string, unknown>;
  readonly requires?: readonly string[];
  readonly source?: "installed" | "native" | "development";
}

const translations = defineTranslations({ title: "Title" });

/** A navigation contribution. The title is its identifier, which is also its key. */
export const page = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, component: `${id.replace(/\./g, "-")}-el`, ...extra });

/** A contribution that shows a widget. */
export const widget = (id: string, extra: Record<string, unknown> = {}) => ({ id, component: `${id.replace(/\./g, "-")}-el`, ...extra });

/** A plugin definition. */
export function plugin(id: string, contributions: Record<string, unknown>): UiPluginDefinition {
  return { id, translations, contributions } as unknown as UiPluginDefinition;
}

/** The elements that the pages and widgets of the test show. They record the properties that they receive. */
export class TestElement extends HTMLElement {
  hass: unknown;
  thermostatId: string | undefined;
  values: unknown;
  connectedCallback(): void {
    this.textContent = `${this.localName} ${this.thermostatId ?? ""}`.trim();
  }
}

/** Define an element for every component that the definitions use, once. */
export function defineElements(definitions: readonly UiPluginDefinition[]): void {
  for (const definition of definitions) {
    for (const list of Object.values(definition.contributions)) {
      for (const contribution of list ?? []) {
        const tag = (contribution as { component?: string }).component;
        if (tag !== undefined && customElements.get(tag) === undefined) {
          try {
            customElements.define(tag, class extends TestElement {});
          } catch {
            // A test can use a name that is not a valid element name, to see how the dashboard reacts.
          }
        }
      }
    }
  }
}

/** The native plugins of the dashboard, as far as the panel is concerned. */
export const nativePlugins: readonly UiPluginDefinition[] = [
  plugin("core", {
    top_tab: [
      { id: CORE_TOP_TABS.dashboard, title: "Dashboard" },
      { id: CORE_TOP_TABS.thermostats, title: "Thermostats" },
      { id: CORE_TOP_TABS.configuration, title: "Configuration", zone: "end", icon: "mdi:cog" },
    ],
    global_page: [page("core.page.overview")],
    thermostat_config: [page("core.page.thermostat_overview")],
    general_config: [page("core.general.main", { group: "Versatile Thermostat" }), page("core.page.plugins", { group: "Dashboard" })],
  }),
  plugin("core_tpi", { thermostat_config: [page("core_tpi.tab.main")] }),
];

export const thermostats: readonly ThermostatInfo[] = [
  { id: "climate.salon", name: "Salon", type: "over_switch" },
  { id: "climate.chambre", name: "Chambre", type: "over_climate" },
];

/** The answer of the server for some plugins, which are all ready and in the order given unless a plugin says otherwise. */
export function serverAnswer(plugins: readonly TestPlugin[]) {
  let rank = 0;
  return {
    dashboard_version: "0.1.0",
    plugins: plugins.map((item) => {
      const state = item.state ?? "ready";
      return {
        id: item.definition.id,
        js_url: `/${item.definition.id}/ui.js`,
        dashboard_version: ">=0.1,<1.0",
        requires: item.requires ?? [],
        load_after: [],
        load_before: [],
        source: item.source ?? "installed",
        state,
        reason: item.reason ?? null,
        details: item.details ?? {},
        order: state === "ready" ? rank++ : null,
      };
    }),
  };
}

/** A fake `hass` for the panel. */
export function createHass(language = "en", answer?: unknown) {
  return {
    language,
    locale: { language },
    states: {},
    user: { is_admin: true },
    callService: vi.fn(),
    callWS: vi.fn().mockResolvedValue(answer),
  };
}

/** What `mountPanel` can be given. */
export interface MountOptions {
  readonly plugins?: readonly TestPlugin[];
  readonly language?: string;
  readonly thermostats?: readonly ThermostatInfo[];
  /** The modules that fail to import, by plugin identifier. */
  readonly failing?: Readonly<Record<string, Error>>;
  /** The address to open, which the test sets before mounting. */
  readonly path?: string;
}

/** Mount the panel with plugins and wait for it to be ready. */
export async function mountPanel(options: MountOptions = {}) {
  const plugins = options.plugins ?? nativePlugins.map((definition) => ({ definition }));
  defineElements(plugins.map((item) => item.definition));
  window.history.replaceState(null, "", options.path ?? "/home-confort");
  const byUrl = new Map(plugins.map((item) => [`/${item.definition.id}/ui.js`, item.definition]));
  const panel = document.createElement("vtherm-dashboard-panel") as VThermDashboardPanel;
  const hass = createHass(options.language ?? "en", serverAnswer(plugins));
  panel.importModule = async (url) => {
    const failure = options.failing?.[url.split("/")[1] as string];
    if (failure !== undefined) {
      throw failure;
    }
    registerUiPlugin(byUrl.get(url) as UiPluginDefinition);
  };
  panel.thermostatProvider = async () => options.thermostats ?? thermostats;
  panel.hass = hass as never;
  document.body.append(panel);
  await vi.waitFor(() => {
    if (panel.phase === "loading") {
      throw new Error("still loading");
    }
  });
  await panel.updateComplete;
  return { panel, hass };
}

/** Remove the panel and the registry from the page. */
export function cleanup(): void {
  document.body.innerHTML = "";
  uninstallRegistry();
  window.history.replaceState(null, "", "/");
}

/** Whether the selector is only the name of an element, which happy-dom cannot parse when it has an underscore. */
const isTagName = (selector: string): boolean => /^[a-z][a-z0-9_.-]*$/.test(selector);

function matches(element: Element, selector: string): boolean {
  return isTagName(selector) ? element.localName === selector : element.matches(selector);
}

/** Find an element in the shadow roots of the panel, as a user sees them. */
export function find<Element extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): Element | null {
  return findAll<Element>(root, selector)[0] ?? null;
}

/** Find all the elements that match in the shadow roots of the panel. */
export function findAll<Element extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): Element[] {
  const found: Element[] = [];
  for (const candidate of root.querySelectorAll("*")) {
    if (matches(candidate, selector)) {
      found.push(candidate as Element);
    }
    if (candidate.shadowRoot !== null) {
      found.push(...findAll<Element>(candidate.shadowRoot, selector));
    }
  }
  return found;
}
