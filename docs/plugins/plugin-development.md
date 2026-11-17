# Developing a plugin
Audience: plugin authors.

This guide takes you from nothing to a plugin that runs in Home Assistant and that you can publish. It follows a real plugin, the
[sample plugin](../../examples/vtherm_sample_plugin/README.md) of this repository, and every code block comes from its files. The
reference pages explain each part: [Python API](python-api.md), [Hooks and placement](hooks-and-placement.md),
[Translations](internationalization.md), [Developing in the dashboard](dev-mode.md) and [Testing a plugin](testing.md).

The plugin of the guide does four things: it adds a section right after the TPI section of every thermostat, it replaces the section
"Sync device internal temperature", it adds a widget to the overview of a thermostat, and it removes a widget that another plugin adds.

## What you need
- Home Assistant with Versatile Thermostat and the dashboard, and an administrator account. A plugin is made of
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

### Fields of configuration
A section of configuration draws its fields with the components of Home Assistant, as the native tabs do, so that the user finds the
same pickers, filters and themes as in the rest of Home Assistant. Describe each field with the contract of the SDK
(`FieldDefinition`: `boolean`, `number`, `integer`, `text`, `text_list`, `entity`, `entity_list`, `select`, `duration`, `time`,
`template`), give `selectorOf(field)` to the `selector` of a `ha-selector`, and propose the value of its event `value-changed`.

- An `entity` or `entity_list` field filters by `domains`, and by `device_classes` for the domains that have one (`sensor`,
  `binary_sensor`): `input_number` or `number` stay offered without a class. A list can be put in order by the user (`reorder`).
- A delay stored as a number (minutes, seconds) is a `number` or an `integer` with its `unit`, not a `duration`, which holds an object.
- `ensureHaControls()` waits until the components of Home Assistant are defined, which may take a moment when the page is opened
  directly, and tells whether they are (`loaded`). Without them, draw a plain control as a fallback, with a comment that names the
  component of Home Assistant it replaces.

<!-- example: docs/examples/typescript/config-fields.ts -->
```typescript
import { ensureHaControls, selectorOf } from "@vtherm/dashboard-sdk";
import type { FieldDefinition, HookProps } from "@vtherm/dashboard-sdk";

type Props = HookProps<"thermostat_config">;

/** The fields of the section, described with the contract of the SDK. Each type is a control of Home Assistant. */
export const FIELDS: readonly FieldDefinition[] = [
  { type: "entity", key: "my_plugin_sensor", domains: ["sensor", "input_number"], device_classes: ["temperature"] },
  { type: "entity_list", key: "my_plugin_heaters", domains: ["climate"] },
  { type: "integer", key: "my_plugin_delay", min: 0, max: 600, unit: "s" },
  { type: "boolean", key: "my_plugin_enabled" },
];

/** A section of the configuration of a thermostat, drawn with the `ha-selector` of Home Assistant. */
export class MyPluginFields extends HTMLElement implements Partial<Props> {
  hass?: Props["hass"];
  values: Props["values"] = {};
  proposeChanges: Props["proposeChanges"] = () => undefined;

  async connectedCallback(): Promise<void> {
    // The components of Home Assistant may not be defined yet when the page is opened directly: wait for them.
    const controls = await ensureHaControls();
    this.replaceChildren(...FIELDS.map((field) => (controls.loaded ? this.selector(field) : this.fallback(field))));
  }

  private selector(field: FieldDefinition): HTMLElement {
    const element = document.createElement("ha-selector") as HTMLElement & Record<string, unknown>;
    Object.assign(element, { hass: this.hass, selector: selectorOf(field), value: this.values[field.key], label: field.key });
    // Home Assistant sends the new value with `value-changed`; the dashboard saves the draft.
    element.addEventListener("value-changed", (event) => this.proposeChanges({ [field.key]: (event as CustomEvent<{ value: unknown }>).detail.value }));
    return element;
  }

  /** Without `ha-selector` (a version of Home Assistant that does not have it), a plain input keeps the value editable. */
  private fallback(field: FieldDefinition): HTMLElement {
    const input = document.createElement("input"); // fallback: ha-selector is not defined
    input.value = String(this.values[field.key] ?? "");
    input.addEventListener("change", () => this.proposeChanges({ [field.key]: input.value }));
    return input;
  }
}
```
<!-- /example -->

### Save actions
The draft of a configuration is shared by all its sections, and the dashboard saves it. Each section shows the actions at the foot of
its card, as the configuration pages of Home Assistant do: **Discard** on the left, a plain `ha-button` with the restore icon, and
**Save** on the right, a `ha-progress-button` with the appearance `filled`. On a click, the progress button shows its indicator, then
`actionSuccess()` (green with a check mark for two seconds) or `actionError()` (red with an alert icon).

A configuration component receives `draft` for that: `dirty`, `saving`, the translated `messages` to show above the actions (unsaved
changes, general errors of a refused save, a partial save), `save()`, which resolves to `success`, `error` or `partial` and never
rejects, and `discard()`. A new `draft` is given at each change of the draft; it is undefined when the configuration is read-only,
and then no action is drawn.

- With `save_actions: "component"` on the contribution, the component draws the actions itself, as below.
- Without it (`"dashboard"`, the default), the dashboard draws them in a card under the component: a plugin written before this
  contract keeps its save actions.
- A page of the menu of a thermostat that edits nothing, such as an overview, declares `save_actions: "component"` and draws no
  action.

<!-- example: docs/examples/typescript/save-actions.ts -->
```typescript
import type { HookProps, SaveResult } from "@vtherm/dashboard-sdk";

type Props = HookProps<"thermostat_config">;

/** The icon of Home Assistant for "discard" (mdiRestore), copied to avoid a dependency on @mdi/js. */
const RESTORE = "M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z";

/** The progress button of Home Assistant, as the actions use it. */
type ProgressButton = HTMLElement & { progress: boolean; disabled: boolean; appearance: string; actionSuccess(): void; actionError(): void };

/**
 * A section that draws the save actions at the foot of its own card, as the configuration pages of Home Assistant do. Its contribution
 * declares `save_actions: "component"`, so the dashboard draws no other card of actions under it.
 */
export class MyPluginSection extends HTMLElement {
  private controls: Props["draft"];

  /** The dashboard gives a new `draft` at each change of the draft, and none when the configuration is read-only. */
  set draft(draft: Props["draft"]) {
    this.controls = draft;
    this.render();
  }

  get draft(): Props["draft"] {
    return this.controls;
  }

  private render(): void {
    const card = document.createElement("ha-card");
    card.append(Object.assign(document.createElement("div"), { className: "card-content", textContent: "…the fields of the section…" }));
    const draft = this.controls;
    if (draft !== undefined) {
      for (const message of draft.messages) {
        card.append(Object.assign(document.createElement("ha-alert"), { alertType: message.type, textContent: message.text }));
      }
      card.append(this.actions(draft));
    }
    this.replaceChildren(card);
  }

  /** Discard on the left, a plain button with the restore icon; Save on the right, the progress button of Home Assistant. */
  private actions(draft: NonNullable<Props["draft"]>): HTMLElement {
    const actions = Object.assign(document.createElement("div"), { className: "card-actions" });
    const discard = Object.assign(document.createElement("ha-button"), { appearance: "plain", disabled: !draft.dirty || draft.saving, textContent: "Discard" });
    discard.prepend(Object.assign(document.createElement("ha-svg-icon"), { slot: "start", path: RESTORE }));
    discard.addEventListener("click", () => draft.discard());
    const save = Object.assign(document.createElement("ha-progress-button") as ProgressButton, { appearance: "filled", disabled: !draft.dirty || draft.saving, textContent: "Save" });
    save.addEventListener("click", async (event) => {
      const button = event.currentTarget as ProgressButton;
      if (button.progress) {
        return;
      }
      button.progress = true;
      const result: SaveResult = await draft.save();
      // Green with a check mark for two seconds, or red with an alert icon: a partial save is a failure too.
      if (result === "success") {
        button.actionSuccess();
      } else {
        button.actionError();
      }
      button.progress = false;
    });
    actions.append(discard, save);
    return actions;
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
