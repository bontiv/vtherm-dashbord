# Native plugins
Audience: plugin authors.

The dashboard itself is made of 15 native plugins, registered by Python like any other plugin. A plugin of yours can place its
tabs, replace one of theirs or remove it, with the identifiers of this page. See [Hooks and placement](hooks-and-placement.md).

- `core`: the top tabs, the pages Overview, Plugins and Development, the overview of a thermostat, and the sections Main attributes,
  Features and Underlyings.
- One plugin for each other section of the config flow of Versatile Thermostat: `core_tpi`, `core_presets`, `core_central_boiler`,
  `core_window`, `core_motion`, `core_power`, `core_presence`, `core_auto_start_stop`, `core_valve_regulation`, `core_sync_temp`,
  `core_advanced`, `core_lock`, `core_humidity` and `core_heating_failure`.

The identifiers `core` and `core_*` are reserved: the server leaves out a third-party plugin that uses one.

## Load order
`core` loads first, and every other native plugin requires it. Each native plugin loads after the one that comes before it in the
menu of the config flow, so the tabs come in that order.

## Identifiers of the contributions
A plugin with one tab names it `main`: `core_tpi.tab.main`. `core` has three tabs, named after them: `core.tab.main`,
`core.tab.features` and `core.tab.type`. A section of the central configuration uses `general` instead of `tab`.

For example, `placement: { after: "core_tpi.tab.main" }` puts a tab right after the TPI tab, and `placement: { replace: "core_lock.tab.main" }`
puts yours in place of the lock tab.

The table is generated from the code by `frontend/test/native-docs.test.ts`. Do not edit it: run `UPDATE_NATIVE_DOCS=1 npx vitest run frontend/test/native-docs.test.ts`.

<!-- native-ids -->
| Plugin | Contribution | Where | Title |
| --- | --- | --- | --- |
| `core` | `core.top.dashboard` | `top_tab` | Dashboard |
| `core` | `core.top.thermostats` | `top_tab` | Thermostats |
| `core` | `core.top.configuration` | `top_tab` | Configuration |
| `core` | `core.page.plugins` | `tab_page` | Plugins |
| `core` | `core.page.dev_plugins` | `tab_page` | Development |
| `core` | `core.page.overview` | `global_page` | Overview |
| `core` | `core.general.create` | `general_config` | Central configuration |
| `core` | `core.general.main` | `general_config` | Main attributes |
| `core` | `core.general.features` | `general_config` | Features |
| `core` | `core.page.thermostat_overview` | `thermostat_config` | Overview |
| `core` | `core.tab.main` | `thermostat_config` | Main attributes |
| `core` | `core.tab.features` | `thermostat_config` | Features |
| `core` | `core.tab.type` | `thermostat_config` | Underlyings |
| `core_tpi` | `core_tpi.tab.main` | `thermostat_config` | TPI parameters |
| `core_tpi` | `core_tpi.general.main` | `general_config` | TPI parameters |
| `core_presets` | `core_presets.tab.main` | `thermostat_config` | Presets |
| `core_presets` | `core_presets.general.main` | `general_config` | Presets |
| `core_central_boiler` | `core_central_boiler.general.main` | `general_config` | Central boiler |
| `core_window` | `core_window.tab.main` | `thermostat_config` | Window detection |
| `core_window` | `core_window.general.main` | `general_config` | Window detection |
| `core_motion` | `core_motion.tab.main` | `thermostat_config` | Motion detection |
| `core_motion` | `core_motion.general.main` | `general_config` | Motion detection |
| `core_power` | `core_power.tab.main` | `thermostat_config` | Power management |
| `core_power` | `core_power.general.main` | `general_config` | Power management |
| `core_presence` | `core_presence.tab.main` | `thermostat_config` | Presence detection |
| `core_presence` | `core_presence.general.main` | `general_config` | Presence detection |
| `core_auto_start_stop` | `core_auto_start_stop.tab.main` | `thermostat_config` | Auto start and stop |
| `core_valve_regulation` | `core_valve_regulation.tab.main` | `thermostat_config` | Valve regulation configuration |
| `core_sync_temp` | `core_sync_temp.tab.main` | `thermostat_config` | Synchronize device temperature |
| `core_advanced` | `core_advanced.tab.main` | `thermostat_config` | Advanced parameters |
| `core_advanced` | `core_advanced.general.main` | `general_config` | Advanced parameters |
| `core_lock` | `core_lock.tab.main` | `thermostat_config` | Lock |
| `core_lock` | `core_lock.general.main` | `general_config` | Lock |
| `core_humidity` | `core_humidity.tab.main` | `thermostat_config` | Humidity |
| `core_heating_failure` | `core_heating_failure.tab.main` | `thermostat_config` | Heating failure detection |
| `core_heating_failure` | `core_heating_failure.general.main` | `general_config` | Heating failure detection |
<!-- /native-ids -->

## The tabs and their values
A native tab reads and proposes values like any component of a plugin: it receives `hass`, `values`, `errors` and
`proposeChanges`, and for a thermostat `thermostatId` and `centralValues`. The values and the errors are those of the draft, by
the keys of the flow of Versatile Thermostat. Which fields a tab shows, and when it appears, follow the forms of the flow: see
[Driving the config flow](../contributing/config-flow-driver.md).

## Texts
Each native plugin has English, French and German catalogs, generated from the translations of Versatile Thermostat with
`npm run catalogs:generate`. English is the default for any other language.
