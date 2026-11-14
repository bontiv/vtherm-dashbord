# Testing a plugin

`@vtherm/dashboard-sdk/testing` is a fake dashboard. It lets you test a plugin without Home Assistant and without a browser
that runs the dashboard. Audience: plugin authors.

The fake dashboard uses the same code as the dashboard for the validation of a definition and for the resolution of the positions.
A plugin that passes here is accepted and placed the same way by the dashboard.

Import it in your tests only. The main entry point `@vtherm/dashboard-sdk` never imports it, so a plugin bundle that imports
only the main entry point does not contain it.

## The fake host

`createFakeHost(options)` returns the fake dashboard. Register the plugins that your plugin points at, then your plugin, in the
load order of the real dashboard.

| Member | Use |
| --- | --- |
| `registerPlugin(definition, relations?)` | Register a plugin like the dashboard. It throws `UiPluginValidationError` for an invalid definition, the same error as `registerUiPlugin`. It returns the problems of the placement. `relations` gives `requires` and `load_after`. |
| `resolved(hook)` | The contributions of a hook, resolved and in order. For `top_tab`, the zone `start` then the zone `end`. |
| `menu(tabId)` | The left menu of a top tab, which holds the contributions of several hooks. |
| `visible(entries, context)` | The entries whose visibility condition is true for a context. |
| `render(entry, props)` | Shows the component of a contribution in the document with its properties, and waits for its first render. `hass` is the fake `hass`. It needs a DOM, such as the one of `happy-dom` or `jsdom`. |
| `hass` | The fake `hass` given to the components. |
| `install()` and `uninstall()` | Put the fake dashboard in the page, so that `registerUiPlugin` finds it. |
| `issues()` | Every problem of the placement since the start. |

Options: `dashboardVersion` is the version that the plugin reads with `getDashboardVersion()`, and `knownPlugins` lists the identifiers
registered in Python. When it is given, a plugin that is not in the list is refused, as the dashboard does.

## The fake hass

`createFakeHass(options)` is the state of Home Assistant that a component reads. `setState(entityId, state, attributes)` sets an entity,
`setLanguage(language)` changes the language of the user, `serviceCalls` lists the services the component called, and
`setWebSocketHandler(handler)` says what the server answers to `callWS`. By default `callWS` fails, so a test has to say what it expects.

## Example

This test registers stand-ins for the native plugins, then the plugin of the page [Hooks and placement](hooks-and-placement.md).
It checks the positions, the visibility condition and the properties of a rendered component.

<!-- example: docs/examples/typescript/plugin-test.test.ts -->
```typescript
// @vitest-environment happy-dom
import { createFakeHost } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { nativePlugins } from "./base-plugins.ts";
import { definition } from "./hooks-and-placement.ts";

/** A host with the plugins of the dashboard, and the plugin under test registered after them. */
function hostWithPlugin() {
  const host = createFakeHost();
  for (const native of nativePlugins) {
    host.registerPlugin(native);
  }
  const issues = host.registerPlugin(definition, { requires: ["core"], load_after: ["core_tpi", "core_lock"] });
  return { host, issues };
}

it("replaces the TPI section and removes the lock section", () => {
  const { host, issues } = hostWithPlugin();
  expect(issues).toEqual([]);
  expect(host.resolved("thermostat_config").map((entry) => entry.id)).toEqual(["smartpi.tab.main"]);
});

it("places the tab after the Thermostats tab and keeps the configuration gear last", () => {
  const { host } = hostWithPlugin();
  expect(host.resolved("top_tab").map((entry) => entry.id)).toEqual(["core.top.dashboard", "core.top.thermostats", "smartpi.top", "core.top.configuration"]);
  expect(host.menu("smartpi.top").map((entry) => entry.id)).toEqual(["smartpi.page.overview"]);
});

it("shows the section only for the thermostats that use Smart TPI", () => {
  const { host } = hostWithPlugin();
  const sections = host.resolved("thermostat_config");
  const context = (use: boolean) => ({ hass: host.hass, thermostatId: "climate.salon", thermostatType: "over_switch" as const, values: { use_smartpi: use }, centralValues: {} });
  expect(host.visible(sections, context(true))).toHaveLength(1);
  expect(host.visible(sections, context(false))).toHaveLength(0);
});

it("shows the component with the properties that the dashboard gives it", async () => {
  class SmartTab extends HTMLElement {
    hass: unknown;
    thermostatId = "";
  }
  customElements.define("smartpi-tab", SmartTab);

  const { host } = hostWithPlugin();
  const [section] = host.resolved("thermostat_config");
  host.hass.setState("climate.salon", "heat");

  const element = (await host.render<"thermostat_config">(section as never, { thermostatId: "climate.salon", values: {}, centralValues: {}, errors: {}, proposeChanges: () => undefined })) as SmartTab;
  expect(element.thermostatId).toBe("climate.salon");
  expect(element.hass).toBe(host.hass);
});
```
<!-- /example -->

## Check the translations

`assertCompleteTranslations(translations, languages)` fails when a catalog that must be complete omits a key of the English
catalog or has a key that does not exist. The error names the language and each faulty key. It loads a catalog that is loaded on
demand. `findTranslationProblems` returns the same information without throwing. The compiler already checks a catalog declared
with `satisfies CompleteCatalog`; this check also covers catalogs written without it.

```typescript
import { assertCompleteTranslations } from "@vtherm/dashboard-sdk/testing";
import { translations } from "./translations.ts";

it("has complete French and German catalogs", async () => {
  await assertCompleteTranslations(translations, ["fr", "de"]);
});
```
