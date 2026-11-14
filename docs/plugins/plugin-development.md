# Developing a plugin
Audience: plugin authors.

This guide takes you from nothing to a plugin that runs in Home Assistant and that you can publish. It follows a real plugin, the
[sample plugin](../../examples/vtherm_sample_plugin/README.md) of this repository, and every code block comes from its files. The
reference pages explain each part: [Python API](python-api.md), [Hooks and placement](hooks-and-placement.md),
[Translations](internationalization.md), [Developing in the dashboard](dev-mode.md) and [Testing a plugin](testing.md).

The plugin of the guide does four things: it adds a section right after the TPI section of every thermostat, it replaces the section
"Sync device internal temperature", it adds a widget to the overview of a thermostat, and it removes a widget that another plugin adds.

## What you need
- Home Assistant with Versatile Thermostat and the dashboard "Home confort", and an administrator account. A plugin is made of
  two parts that you write: Python that declares it, and a JavaScript module that contributes to the dashboard.
- Node.js 24 or later and npm, to write and build the module.
- Python code in a custom integration of Home Assistant. The integration of the sample is `vtherm_sample_plugin`.

## 1. Create the project
The integration and the TypeScript project live in one repository:

```
my-plugin/
  custom_components/vtherm_sample_plugin/   the integration (Python), and www/ for the built modules
  ui/                                       the TypeScript project
    src/  test/  package.json  tsconfig.json  vite.config.ts
```

In `ui/`, install the SDK, the tools and Lit, which the sample uses to write its elements. You can use any way to write custom
elements, since the dashboard only needs a tag name.

```
npm install @vtherm/dashboard-sdk lit
npm install --save-dev typescript vite vitest happy-dom @types/node
```

Add a `tsconfig.json` and `"type": "module"` to `package.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "types": ["node"]
  },
  "include": ["src", "test", "vite.config.ts"]
}
```

The SDK gives the types, `defineTranslations`, `registerUiPlugin` and a fake dashboard for the tests. A plugin does not ship a copy of the dashboard: the dashboard puts its registry in
the page, and the SDK finds it when your module registers.

## 2. Declare the plugin in Python
The server decides which plugins load, in which order and whether they are compatible, so everything it needs is declared in Python,
by the integration that serves your module. Add `vtherm_dashboard` to `dependencies` in `manifest.json`, so that Home Assistant
sets the dashboard up first.

<!-- example: examples/vtherm_sample_plugin/custom_components/vtherm_sample_plugin/__init__.py -->
```python
"""A sample UI plugin for the Versatile Thermostat dashboard.

The integration serves the JavaScript modules that `ui/` builds into `www/`, and declares two UI plugins in `vtherm_api`. Everything the
dashboard needs to know about a plugin is declared here, in Python: the address of its module, the versions of the dashboard that it
supports, and the plugins that it depends on. Add `vtherm_sample_plugin:` to `configuration.yaml` to set it up.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from vtherm_api import VThermAPI

DOMAIN = "vtherm_sample_plugin"
"""The domain of the integration."""
STATIC_URL = f"/{DOMAIN}_static"
"""The URL under which the built modules are served."""
WWW_DIR = Path(__file__).parent / "www"
"""The folder where `npm run build` in `ui/` writes the modules."""
DASHBOARD_VERSION = ">=0.1,<1.0"
"""The versions of the dashboard that the plugins support. Change it when you have checked your plugin with a new major version."""

# The widgets that the first plugin offers come first, so that the second plugin can remove one of them.
EXTRAS_PLUGIN = "vtherm_sample_extras"
SAMPLE_PLUGIN = "vtherm_sample"


def _url(module: str, version: str) -> str:
    """Return the URL of a module. The version makes the browser load the new file after an update."""
    return f"{STATIC_URL}/{module}.js?v={version}"


def register_sample_plugins(hass: HomeAssistant, version: str = "0.1.0") -> None:
    """Declare the two UI plugins. Each one is registered again when it already is, so that a reload gives the new version."""
    api = VThermAPI.get_vtherm_api(hass)
    for plugin_id in (EXTRAS_PLUGIN, SAMPLE_PLUGIN):
        api.unregister_ui_plugin(plugin_id)
    api.register_ui_plugin(EXTRAS_PLUGIN, _url("vtherm-sample-extras", version), DASHBOARD_VERSION, requires=["core"])
    api.register_ui_plugin(
        SAMPLE_PLUGIN,
        _url("vtherm-sample", version),
        DASHBOARD_VERSION,
        requires=["core", "core_tpi"],
        # The widget that this plugin removes must be there first.
        load_after=["core_tpi", "core_sync_temp", EXTRAS_PLUGIN],
    )


def unregister_sample_plugins(hass: HomeAssistant) -> None:
    """Withdraw the UI plugins."""
    api = VThermAPI.get_vtherm_api(hass)
    for plugin_id in (SAMPLE_PLUGIN, EXTRAS_PLUGIN):
        api.unregister_ui_plugin(plugin_id)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:  # pylint: disable=unused-argument
    """Serve the modules and declare the plugins."""
    await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(WWW_DIR), cache_headers=False)])
    register_sample_plugins(hass)
    return True
```
<!-- /example -->

- `dashboard_version` is the range of versions of the dashboard that the plugin supports. A plugin outside the range is not
  loaded and its state says why. See [Version constraints](version-constraints.md).
- `requires` lists the plugins that must be ready, `load_after` and `load_before` set the order. A plugin that removes or replaces
  a contribution of another one loads after it. See [Loading and dependencies](loading-and-dependencies.md).
- The module is served by the integration. `?v=` carries the version, so that the browser loads the new file after an update.

To try it, add `vtherm_sample_plugin:` to `configuration.yaml`, then restart Home Assistant.

## 3. Write the elements
A contribution shows a custom element that your module defines. The dashboard creates it and sets its properties, which depend on
the hook: `hass`, and for a thermostat `thermostatId`, `values` and the others. See [Hooks and placement](hooks-and-placement.md).
Add a `language` property so that the element draws its texts again when the user changes language.

<!-- example: examples/vtherm_sample_plugin/ui/src/elements.ts -->
```typescript
import type { ConfigValues, Hass } from "@vtherm/dashboard-sdk";
import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";
import { t } from "./translations";

/** The section that the plugin adds to the configuration of a thermostat. The dashboard sets its properties. */
export class SampleTab extends LitElement {
  // Use the variables of the theme of Home Assistant, never a color of your own.
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
  `;
  static override properties = { hass: { attribute: false }, thermostatId: { type: String }, values: { attribute: false }, language: { type: String } };
  declare hass: Hass | undefined;
  declare thermostatId: string;
  declare values: ConfigValues;
  /** Changes with the language of the user, so that the texts are drawn again. */
  declare language: string;

  constructor() {
    super();
    this.thermostatId = "";
    this.values = {};
    this.language = "";
  }

  protected override render(): TemplateResult {
    const name = String(this.values["name"] ?? this.thermostatId);
    const cycle = this.values["cycle_min"];
    return html`<p>${cycle === undefined ? t("tab.no_cycle", { name }) : t("tab.cycle", { name, minutes: Number(cycle) })}</p>`;
  }
}

/** The section that takes the place of the native one. */
export class SampleSyncTab extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
  `;
  static override properties = { language: { type: String } };
  declare language: string;

  constructor() {
    super();
    this.language = "";
  }

  protected override render(): TemplateResult {
    return html`<h2>${t("sync.title")}</h2>
      <p>${t("sync.text")}</p>`;
  }
}

/** A widget of the overview of a thermostat. */
export class SampleStatusWidget extends LitElement {
  static override properties = { hass: { attribute: false }, thermostatId: { type: String }, language: { type: String } };
  declare hass: Hass | undefined;
  declare thermostatId: string;
  declare language: string;

  constructor() {
    super();
    this.thermostatId = "";
    this.language = "";
  }

  protected override render(): TemplateResult {
    const state = this.hass?.states[this.thermostatId]?.state ?? t("widget.unknown");
    return html`<p>${t("widget.state", { name: this.thermostatId, state })}</p>`;
  }
}

/** The widget that the other plugin of the sample offers, and that the sample removes. */
export class SamplePromoWidget extends LitElement {
  protected override render(): TemplateResult {
    return html`<p>${t("promo.text")}</p>`;
  }
}

/** Define an element once. A plugin can be imported again in a test or after a hot update. */
export function define(tag: string, element: CustomElementConstructor): void {
  if (customElements.get(tag) === undefined) {
    customElements.define(tag, element);
  }
}
```
<!-- /example -->

## 4. Write the translations
Every text comes from a catalog. The English catalog is required and gives the keys, so an unknown key does not compile. The French
and German catalogs can be partial: a missing key is shown in English. Add a language by adding an entry to the second argument of
`defineTranslations`. Titles of contributions are keys too.

<!-- example: examples/vtherm_sample_plugin/ui/src/translations.ts -->
```typescript
import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { PartialCatalog } from "@vtherm/dashboard-sdk";

// The English catalog gives the keys, and a plugin that is in the dashboard must have it. Titles and groups are keys too.
const en = {
  "tab.title": "Sample",
  "tab.cycle": "Cycle of {name}: {minutes} minutes",
  "tab.no_cycle": "{name} has no cycle.",
  "sync.title": "Sync (sample)",
  "sync.text": "This section replaces the native section 'Sync device internal temperature'.",
  "widget.state": "{name} is {state}",
  "widget.unknown": "unknown",
  "promo.text": "A widget that the sample plugin removes.",
} as const;

// French and German can be partial: a missing key is shown in English.
const fr = {
  "tab.title": "Exemple",
  "tab.cycle": "Cycle de {name} : {minutes} minutes",
  "tab.no_cycle": "{name} n'a pas de cycle.",
  "sync.title": "Synchronisation (exemple)",
  "sync.text": "Cette section remplace la section native « Synchronisation de la température interne ».",
  "widget.state": "{name} est {state}",
  "widget.unknown": "inconnu",
  "promo.text": "Un widget que le plugin d'exemple retire.",
} satisfies PartialCatalog<typeof en>;

const de = {
  "tab.title": "Beispiel",
  "tab.cycle": "Zyklus von {name}: {minutes} Minuten",
  "tab.no_cycle": "{name} hat keinen Zyklus.",
  "sync.title": "Synchronisierung (Beispiel)",
  "sync.text": "Dieser Abschnitt ersetzt den nativen Abschnitt „Interne Gerätetemperatur synchronisieren“.",
  "widget.state": "{name} ist {state}",
  "widget.unknown": "unbekannt",
  "promo.text": "Ein Widget, das das Beispiel-Plugin entfernt.",
} satisfies PartialCatalog<typeof en>;

export const translations = defineTranslations(en, { fr, de });
export const { t } = translations;
```
<!-- /example -->

## 5. Contribute and place
The module defines its elements, then registers. A placement says where each contribution goes: `after`, `before`, `first`, `last`,
`replace` and `remove`. A `remove` has only an id and a placement.

<!-- example: examples/vtherm_sample_plugin/ui/src/main.ts -->
```typescript
import { registerUiPlugin } from "@vtherm/dashboard-sdk";
import { SampleStatusWidget, SampleSyncTab, SampleTab, define } from "./elements";
import { translations } from "./translations";

// The elements must exist before the plugin registers: the dashboard creates them when it shows a contribution.
define("vtherm-sample-tab", SampleTab);
define("vtherm-sample-sync-tab", SampleSyncTab);
define("vtherm-sample-status", SampleStatusWidget);

registerUiPlugin({
  id: "vtherm_sample",
  translations,
  contributions: {
    thermostat_config: [
      // A section of the configuration of a thermostat, right after the TPI section of the dashboard.
      { id: "vtherm_sample.tab.main", title: "tab.title", icon: "mdi:flask-outline", component: "vtherm-sample-tab", placement: { after: "core_tpi.tab.main" } },
      // A section that takes the place of a native one.
      { id: "vtherm_sample.tab.sync", title: "sync.title", component: "vtherm-sample-sync-tab", placement: { replace: "core_sync_temp.tab.main" } },
    ],
    thermostat_widget: [
      { id: "vtherm_sample.widget.status", component: "vtherm-sample-status", placement: { first: true } },
      // Remove a widget of another plugin.
      { id: "vtherm_sample.remove.promo", placement: { remove: "vtherm_sample_extras.widget.promo" } },
    ],
  },
});
```
<!-- /example -->

The second plugin of the sample only gives the first one a widget to remove:

<!-- example: examples/vtherm_sample_plugin/ui/src/extras.ts -->
```typescript
import { registerUiPlugin } from "@vtherm/dashboard-sdk";
import { SamplePromoWidget, define } from "./elements";
import { translations } from "./translations";

define("vtherm-sample-promo", SamplePromoWidget);

// A second plugin, only to give the first one something to remove: a widget of the overview of a thermostat.
registerUiPlugin({
  id: "vtherm_sample_extras",
  translations,
  contributions: {
    thermostat_widget: [{ id: "vtherm_sample_extras.widget.promo", component: "vtherm-sample-promo" }],
  },
});
```
<!-- /example -->

The identifiers of the native sections that you can use as a target, such as `core_tpi.tab.main`, are in
[Native plugins](native-plugins.md).

## 6. Develop with the development mode
You do not install anything to see a change. Run a development server that sends `Access-Control-Allow-Origin`, with Vite or with
Rollup in watch mode.

<!-- example: examples/vtherm_sample_plugin/ui/vite.config.ts -->
```typescript
import { defineConfig } from "vite";

// `npx vite` serves the plugin from http://localhost:5173 while you work on it. The dashboard imports the module from another
// origin, so the server must allow it with Access-Control-Allow-Origin.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    headers: { "Access-Control-Allow-Origin": "*" },
    // The dashboard is reloaded by hand. The hot update client would try to reach Home Assistant, not this server.
    hmr: false,
  },
  build: {
    // `npx vite build` writes one ES module for each plugin into the integration, which serves it.
    outDir: "../custom_components/vtherm_sample_plugin/www",
    emptyOutDir: true,
    lib: {
      entry: { "vtherm-sample": "src/main.ts", "vtherm-sample-extras": "src/extras.ts" },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    // A module that two plugins share goes to a chunk of its own.
    rollupOptions: { output: { chunkFileNames: "chunks/[name]-[hash].js" } },
  },
});
```
<!-- /example -->

Run `npx vite` in `ui/`. Then open **Configuration > Development** in the dashboard and add an entry for each plugin:

| Identifier | URL |
| --- | --- |
| `vtherm_sample_extras` | `http://localhost:5173/src/extras.ts` |
| `vtherm_sample` | `http://localhost:5173/src/main.ts` |

Both identifiers are declared in Python, so each entry only replaces the URL of the module. Reload the page: a banner "Development
mode" lists the plugins that load from your computer. After a change, reload the page again.

With Rollup, which builds the modules again at each change, use this configuration and run `npx rollup -c rollup.config.ts
--configPlugin typescript -w`. It needs `rollup`, `@rollup/plugin-typescript`, `@rollup/plugin-node-resolve`, `rollup-plugin-serve` and `tslib`.
The URLs are then `http://localhost:5173/vtherm-sample-extras.js` and `http://localhost:5173/vtherm-sample.js`.

<!-- example: examples/vtherm_sample_plugin/ui/rollup.config.ts -->
```typescript
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import serve from "rollup-plugin-serve";

const OUTPUT = "../custom_components/vtherm_sample_plugin/www";
// Only in this repository, where tsconfig.json reads the SDK from its sources. In your project, leave `rootDir` out.
const ROOT = "../../..";

// `npx rollup -c rollup.config.ts --configPlugin typescript -w` builds the plugins again at each change and serves them from
// http://localhost:5173. The dashboard imports the modules from another origin, so the server must allow it with
// Access-Control-Allow-Origin.
const config: RollupOptions = {
  input: { "vtherm-sample": "src/main.ts", "vtherm-sample-extras": "src/extras.ts" },
  output: { dir: OUTPUT, format: "es", entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js", sourcemap: true },
  plugins: [resolve(), typescript({ noEmit: false, outDir: OUTPUT, declaration: false, rootDir: ROOT }), serve({ contentBase: OUTPUT, port: 5173, headers: { "Access-Control-Allow-Origin": "*" } })],
};

export default config;
```
<!-- /example -->

If a module does not load, **Configuration > Plugins** shows the address that was tried and the usual causes. See
[Developing in the dashboard](dev-mode.md) for the limits, HTTPS and Safari.

## 7. Test with the fake dashboard
The SDK has a fake dashboard that registers plugins as the real one does, resolves the positions and renders the elements. You test
the placements, the visibility and the elements without Home Assistant. The test registers the modules in the order that the server
would give, with the relations that Python declares.

<!-- example: examples/vtherm_sample_plugin/ui/test/sample.test.ts -->
```typescript
// @vitest-environment happy-dom
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";
import { assertCompleteTranslations, createFakeHost, findTranslationProblems } from "@vtherm/dashboard-sdk/testing";
import type { FakeHost } from "@vtherm/dashboard-sdk/testing";
import { beforeAll, describe, expect, it } from "vitest";

let host: FakeHost;
let extras: UiPluginDefinition;
let sample: UiPluginDefinition;

/** The plugins of the dashboard that the sample refers to. A test only needs their identifiers. */
const nativeTab = (id: string): UiPluginDefinition => ({
  id,
  translations: { english: {}, catalogs: {}, t: (key: string) => key, language: "en", setLanguage: async () => undefined, resolve: (_language: string, key: string) => key, warnings: [] } as never,
  contributions: { thermostat_config: [{ id: `${id}.tab.main`, title: "title", component: "native-tab" }] },
});

/** Import a module and give back the definition that it registers. The relations are the ones that the Python side declares. */
async function load(module: () => Promise<unknown>): Promise<UiPluginDefinition> {
  let captured: UiPluginDefinition | undefined;
  (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry = { dashboardVersion: "0.1.0", register: (definition: UiPluginDefinition) => (captured = definition) };
  try {
    await module();
  } finally {
    delete (globalThis as { VThermUiPluginRegistry?: unknown }).VThermUiPluginRegistry;
  }
  return captured as UiPluginDefinition;
}

beforeAll(async () => {
  host = createFakeHost({ dashboardVersion: "0.1.0" });
  host.registerPlugin({ id: "core", translations: { english: {} } as never, contributions: {} });
  for (const id of ["core_tpi", "core_lock", "core_sync_temp"]) {
    host.registerPlugin(nativeTab(id), { requires: ["core"] });
  }
  // The server gives the plugins in the order of their load dependencies: the extras first.
  extras = await load(() => import("../src/extras"));
  sample = await load(() => import("../src/main"));
  host.registerPlugin(extras, { requires: ["core"] });
  host.registerPlugin(sample, { requires: ["core", "core_tpi"], load_after: ["core_tpi", "core_sync_temp", "vtherm_sample_extras"] });
});

describe("the sample plugin", () => {
  it("registers without problem", () => {
    expect(host.issues()).toEqual([]);
  });

  it("adds a section right after the TPI section", () => {
    const ids = host.resolved("thermostat_config").map((entry) => entry.id);
    expect(ids.indexOf("vtherm_sample.tab.main")).toBe(ids.indexOf("core_tpi.tab.main") + 1);
  });

  it("replaces the section of the synchronization", () => {
    const ids = host.resolved("thermostat_config").map((entry) => entry.id);
    expect(ids).toContain("vtherm_sample.tab.sync");
    expect(ids).not.toContain("core_sync_temp.tab.main");
  });

  it("removes the widget of the other plugin and keeps its own, first", () => {
    expect(host.resolved("thermostat_widget").map((entry) => entry.id)).toEqual(["vtherm_sample.widget.status"]);
  });

  it("shows the section with the properties that the dashboard gives it", async () => {
    const section = host.resolved("thermostat_config").find((entry) => entry.id === "vtherm_sample.tab.main");
    const element = await host.render<"thermostat_config">(section as never, { thermostatId: "climate.salon", values: { name: "Salon", cycle_min: 5 }, centralValues: {}, errors: {}, proposeChanges: () => undefined });
    await (element as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(element.shadowRoot?.textContent).toContain("Cycle of Salon: 5 minutes");
  });

  it("shows the state of the thermostat in the widget", async () => {
    host.hass.setState("climate.salon", "heat");
    const widget = host.resolved("thermostat_widget")[0];
    const element = await host.render<"thermostat_widget">(widget as never, { thermostatId: "climate.salon" });
    await (element as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(element.shadowRoot?.textContent).toContain("climate.salon is heat");
  });

  it("has complete French and German catalogs", async () => {
    await assertCompleteTranslations(sample.translations, ["fr", "de"]);
    expect(await findTranslationProblems(sample.translations, ["fr", "de"])).toEqual([]);
    expect(extras.translations).toBe(sample.translations);
  });
});
```
<!-- /example -->

The Python side is tested with the registry of `vtherm_api`: the plugins are ready, and they load in the expected order.

## 8. Install in Home Assistant
1. Run `npx vite build` in `ui/`. It writes one module for each plugin into `custom_components/vtherm_sample_plugin/www/`.
2. Copy `custom_components/vtherm_sample_plugin/` into the `custom_components/` folder of Home Assistant, or install it with HACS.
3. Add `vtherm_sample_plugin:` to `configuration.yaml` and restart Home Assistant.
4. Open **Configuration > Plugins** in the dashboard: the plugins are "Loaded". Remove the development entries, or disable them,
   so that the dashboard uses the installed modules.

## 9. Publish
To publish with HACS, put the repository on GitHub, add a `hacs.json` and publish a release, as
[the documentation of HACS](https://hacs.xyz/docs/publish/integration/) describes. Version the plugin with semantic versioning and put the
same version in `manifest.json` and `package.json`.

## 10. A new major version of the dashboard
The dashboard follows semantic versioning, and `dashboard_version` is the contract. A major version can change the contract of
the SDK. The changes and what to do about them are in the section "For plugin authors" of each version in the
[changelog](../../CHANGELOG.md).

1. Read the changelog for the new version, then update `@vtherm/dashboard-sdk` and fix the types that the compiler reports.
2. Run your tests with the new SDK, and try the plugin in a dashboard of the new version, in development mode.
3. Widen `dashboard_version` in Python, for example from `>=1.0,<2.0` to `>=1.0,<3.0`, only once it works. Keep both versions in the
   range if the same module works with both, or publish a new version of the plugin for the new one.
