# @vtherm/dashboard-sdk

Types and helpers to write UI plugins for the Versatile Thermostat dashboard ("Home confort") in Home Assistant.

A UI plugin is an integration that adds tabs, menu entries, widgets and configuration sections to the dashboard. It has
two parts: a Python declaration with `vtherm_api`, and a JavaScript module that declares its contributions with this SDK.

## Install

```sh
npm install @vtherm/dashboard-sdk
```

Use a version range that matches the `dashboard_version` constraint that your plugin declares in Python. The SDK has
the same version as the dashboard it is published with.

## Minimal example

This module declares its translations and defines a custom element, then declares a section of the configuration of every thermostat, placed just
after the TPI section. The dashboard loads the module, so `registerUiPlugin` finds the dashboard in the page.

<!-- example: docs/examples/typescript/minimal-plugin.ts -->
```typescript
import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { HookProps, PartialCatalog } from "@vtherm/dashboard-sdk";

// The English catalog gives the keys. The other languages can be partial.
const en = { "tab.title": "My plugin", "tab.greeting": "Thermostat {name}" } as const;
const fr = { "tab.title": "Mon plugin" } satisfies PartialCatalog<typeof en>;
const translations = defineTranslations(en, { fr });
const { t } = translations;

type Props = HookProps<"thermostat_config">;

/** The section of the configuration of a thermostat. The dashboard sets its properties. */
class MyPluginTab extends HTMLElement implements Partial<Props> {
  thermostatId?: string;

  connectedCallback(): void {
    this.textContent = t("tab.greeting", { name: this.thermostatId ?? "unknown" });
  }
}

customElements.define("my-plugin-tab", MyPluginTab);

registerUiPlugin({
  id: "my_plugin",
  translations,
  contributions: {
    thermostat_config: [
      {
        id: "my_plugin.tab.main",
        title: "tab.title",
        component: "my-plugin-tab",
        placement: { after: "core_tpi.tab.main" },
      },
    ],
  },
});
```
<!-- /example -->

The identifier `my_plugin` is the one that the integration registers in Python with `register_ui_plugin`. Every
contribution identifier starts with it and a dot. The plugin fails to load when it was not registered in Python.

## What the SDK provides

- `registerUiPlugin(definition)` checks the definition, then gives it to the dashboard. It throws an error that names
  each faulty element when the definition is not valid.
- `defineTranslations(english, others)` declares the translations of the plugin. The English catalog is required and gives
  the keys: the translation function `t` only accepts these keys. Other languages can be partial, or loaded on demand.
  A text missing in the language of the user falls back to English, key by key.
- `getDashboardVersion()` returns the version of the dashboard that runs in the page.
- The types of the contract: the seven hooks, the six placements, the properties of each component, and the visibility
  conditions.

## Documentation

- [Develop a plugin](https://github.com/bontiv/vtherm_dashboard/blob/master/docs/plugins/plugin-development.md): the complete procedure.
- [SDK reference](https://github.com/bontiv/vtherm_dashboard/blob/master/docs/reference/sdk/index.md): every type and function.
