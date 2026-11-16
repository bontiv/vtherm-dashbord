/**
 * A fake Home Assistant around the real panel, for looking at the layouts and the themes.
 *
 * Open it with `npm run preview -w frontend`. The address takes `theme` (light, dark, custom), `path` (the page of the
 * panel to open) and `empty` (no thermostat).
 */

import { CORE_TOP_TABS, defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { html, render } from "lit";

import "../src/index.ts";
import type { VThermDashboardPanel } from "../src/panel.ts";
import { THEMES } from "./themes.ts";

const params = new URLSearchParams(window.location.search);
const theme = THEMES[params.get("theme") ?? "light"] ?? THEMES["light"] ?? {};
for (const [name, value] of Object.entries(theme)) {
  document.documentElement.style.setProperty(name, value);
}
document.body.style.backgroundColor = "var(--primary-background-color)";

// The icon element of Home Assistant, with the two icons that the preview needs.
const ICONS: Record<string, string> = {
  "mdi:cog": "M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z",
  "mdi:puzzle": "M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5c1.5 0 2.7 1.2 2.7 2.7S5 16.2 3.5 16.2H2V20a2 2 0 0 0 2 2h3.8v-1.5c0-1.5 1.2-2.7 2.7-2.7s2.7 1.2 2.7 2.7V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5Z",
};
customElements.define(
  "ha-icon",
  class extends HTMLElement {
    icon = "";
    connectedCallback(): void {
      this.style.cssText = "display:inline-flex;width:24px;height:24px";
      this.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="${ICONS[this.icon] ?? ""}"/></svg>`;
    }
  },
);

const translations = defineTranslations({ title: "Title" });
const plugin = (id: string, contributions: Record<string, unknown>): UiPluginDefinition => ({ id, translations, contributions }) as unknown as UiPluginDefinition;
const page = (id: string, title: string, extra: Record<string, unknown> = {}) => ({ id, title, component: "preview-page", ...extra });

// A long menu, to see that it scrolls on its own.
const sections = ["Main", "Features", "Type", "TPI", "Presets", "Central boiler", "Window", "Motion", "Power", "Presence", "Auto start and stop", "Valve regulation", "Temperature sync", "Advanced", "Lock", "Humidity", "Heating failure"];

const definitions: UiPluginDefinition[] = [
  plugin("core", {
    top_tab: [
      { id: CORE_TOP_TABS.dashboard, title: "Dashboard" },
      { id: CORE_TOP_TABS.thermostats, title: "Thermostats" },
      { id: CORE_TOP_TABS.configuration, title: "Configuration", zone: "end", icon: "mdi:cog" },
    ],
    global_page: [page("core.page.overview", "Overview")],
    thermostat_config: [page("core.page.thermostat_overview", "Overview"), ...sections.map((name, index) => page(`core.tab.${index}`, name))],
    general_config: [
      ...sections.slice(0, 6).map((name, index) => page(`core.general.${index}`, name, { group: "Versatile Thermostat" })),
      page("core.page.plugins", "Plugins", { group: "Dashboard" }),
      page("core.page.dev", "Development", { group: "Dashboard" }),
    ],
  }),
  plugin("core_complements", { top_tab: [{ id: "core_complements.top", title: "VT add-ons", icon: "mdi:puzzle", placement: { after: CORE_TOP_TABS.thermostats } }], tab_page: [page("core_complements.catalog", "Catalog", { tab: "core_complements.top" })] }),
];

customElements.define(
  "preview-page",
  class extends HTMLElement {
    thermostatId = "";
    connectedCallback(): void {
      this.style.cssText = "display:block;padding:16px;color:var(--primary-text-color)";
      render(html`<div style="padding:16px;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,12px)">Page content ${this.thermostatId}</div>`, this);
    }
  },
);

const list = (open: boolean) => ({
  dashboard_version: "0.1.0",
  plugins: definitions.map((definition, order) => ({
    id: definition.id,
    js_url: `/${definition.id}/ui.js`,
    dashboard_version: ">=0.1,<1.0",
    requires: [],
    load_after: [],
    load_before: [],
    source: "native",
    state: "ready",
    reason: null,
    details: {},
    order: open ? order : order,
  })),
});

const language = params.get("language") ?? "en";
const hass = { language, locale: { language }, states: {}, user: { is_admin: true }, callService: async () => undefined, callWS: async () => list(true) };
const panel = document.querySelector("vtherm-dashboard-panel") as VThermDashboardPanel;
window.history.replaceState(null, "", params.get("path") ?? "/vtherm");
// The panel read the address when it was created: tell it that the address is now the one asked for.
window.dispatchEvent(new PopStateEvent("popstate"));
panel.importModule = async (url) => {
  const id = url.split("/")[1];
  registerUiPlugin(definitions.find((definition) => definition.id === id) as UiPluginDefinition);
};
panel.thermostatProvider = async () =>
  params.has("empty")
    ? []
    : [
        { id: "climate.salon", name: "Salon", type: "over_switch" },
        { id: "climate.chambre", name: "Chambre", type: "over_climate" },
        { id: "climate.bureau", name: "Bureau", type: "over_valve" },
      ];
panel.hass = hass as never;

// `drawer` opens the menu of a narrow screen, as a tap on the button does.
if (params.has("drawer")) {
  setTimeout(() => panel.shadowRoot?.querySelector<HTMLButtonElement>(".menu-button")?.click(), 600);
}
