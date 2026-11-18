# Native plugins
Audience: plugin authors.

The dashboard itself is made of 16 native plugins, registered by Python like any other plugin. A plugin of yours can place its
tabs, replace one of theirs or remove it, with the identifiers of this page. See [Hooks and placement](hooks-and-placement.md).

- `core`: the top tabs, the pages Overview, Plugins and Development, the overview of a thermostat, and the sections Main attributes,
  Features and Underlyings.
- One plugin for each other section of the config flow of Versatile Thermostat: `core_tpi`, `core_presets`, `core_central_boiler`,
  `core_window`, `core_motion`, `core_power`, `core_presence`, `core_auto_start_stop`, `core_valve_regulation`, `core_sync_temp`,
  `core_advanced`, `core_lock`, `core_humidity` and `core_heating_failure`.
- `core_complements`: the tab "VT add-ons" with its entries Catalog and Installed. See [Add-ons for Versatile Thermostat](../user/complements.md).

The identifiers `core` and `core_*` are reserved: the server leaves out a third-party plugin that uses one.

## Load order
`core` loads first, and every other native plugin requires it. Each native plugin loads after the one that comes before it in the
menu of the config flow.

## Order and groups of the menus
The menus of a thermostat and of the general configuration put the native tabs in two groups that the core shares
(`CORE_MENU_GROUPS`, see [Groups of the menus](hooks-and-placement.md#groups-of-the-menus)), in the order of `MENU_ORDER`
(`tab-definitions.ts`), which is not the order of the flow:

- **General settings** (`core:settings`), the tabs that cannot be turned off: main attributes, underlyings, features, presets, TPI,
  valve regulation, safety and manual override. The page that creates the central configuration is in this group too.
- **Optional features** (`core:features`), the tabs that can be off: central boiler, window, motion, power, presence, auto start and
  stop, synchronization of the temperature, lock, humidity, heating failure detection.

The overview of a thermostat stays first, without group; the group "Dashboard" of the Configuration comes after the two groups. Each
tab is placed `after` the closest tab before it in `MENU_ORDER` whose plugin is already loaded, so the order does not depend on the
load order. A tab of yours placed between two native tabs keeps the heading whole when it declares the same group.

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
| `core` | `core.tab.type` | `thermostat_config` | Underlyings |
| `core` | `core.tab.features` | `thermostat_config` | Features |
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
| `core_advanced` | `core_advanced.tab.main` | `thermostat_config` | Safety and manual override (Versatile Thermostat: Advanced parameters) |
| `core_advanced` | `core_advanced.general.main` | `general_config` | Safety and manual override (Versatile Thermostat: Advanced parameters) |
| `core_lock` | `core_lock.tab.main` | `thermostat_config` | Lock |
| `core_lock` | `core_lock.general.main` | `general_config` | Lock |
| `core_humidity` | `core_humidity.tab.main` | `thermostat_config` | Humidity |
| `core_heating_failure` | `core_heating_failure.tab.main` | `thermostat_config` | Heating failure detection |
| `core_heating_failure` | `core_heating_failure.general.main` | `general_config` | Heating failure detection |
| `core_complements` | `core_complements.top.complements` | `top_tab` | VT add-ons |
| `core_complements` | `core_complements.page.catalog` | `tab_page` | Catalog |
| `core_complements` | `core_complements.page.installed` | `tab_page` | Installed |
<!-- /native-ids -->

## The tabs and their values
A native tab reads and proposes values like any component of a plugin: it receives `hass`, `values`, `errors` and
`proposeChanges`, and for a thermostat `thermostatId` and `centralValues`. The values and the errors are those of the draft, by
the keys of the flow of Versatile Thermostat. Which fields a tab shows, and when it appears, follow the forms of the flow: see
[Driving the config flow](../contributing/config-flow-driver.md).

### The tabs of the features
The tabs of the features (window, motion, power, presence, auto start and stop, central boiler, synchronization of the temperature,
heating failure detection) declare the value that turns their feature on (`feature`: `use_window_feature`, `use_motion_feature`,
`use_power_feature`, `use_presence_feature`, `use_auto_start_stop_feature`, `use_central_boiler_feature`,
`sync_device_internal_temp`, `use_heating_failure_detection_feature`). While the feature is off, the tab stays in the menu with the
status `Off`; its page shows the explanation of the feature and the switch of the dashboard instead of its fields, and turning the
switch on changes, in the draft, the same value as the tab that holds it (`featureStepOf`): the tab Features, or the tab Underlyings
for the synchronization of the temperature of a thermostat over a climate.
A tab whose feature does not exist for the type of the thermostat is not in the menu: the auto start and stop for a thermostat over a
switch, the heating failure detection for a thermostat over a climate without valve regulation, as the form Features of
Versatile Thermostat decides, or the synchronization of the temperature for a thermostat that is not over a climate.

The humidity and the lock have no feature switch, but their values can turn them off (`off` of their `TabDefinition`): the humidity
while **Use humidity sensor** is unchecked, the lock while it blocks neither the users nor the automations. Their page stays as usual.
A thermostat that uses a central lock that blocks nothing shows `Central (off)`.

### The layout of the tabs
A native tab draws its fields on a grid that adds columns with the width (`repeat(auto-fill, minmax(min(240px, 100%), 1fr))`); a
list, a template, a text of several lines and the blocks of commands take the whole width (`isWideField`). Its card uses the width of
the page, up to 1240 px. The fields of `ADVANCED_FIELDS` (`tab-definitions.ts`) are in the panel **Advanced settings (N)**, closed,
open when one of them is refused or required without a value; a field that the list does not know, added by a new version of
Versatile Thermostat, stays out of the panel. The option of inheritance of a tab (`use_*_central_config`) is drawn as the switch
**Customize for this thermostat**, which writes its opposite, and the central values as chips with a link to the same section of the
general configuration. The tab of the window of a thermostat adds the choice of the method of detection (`windowMethod`), and shows
only the fields of the method that is chosen.

### The help of the fields
Each field of a native tab has up to three levels of help, from the catalog of its plugin:

- `hint.<key>`: a hint of one sentence, given to the `helper` of its `ha-selector`. Without it, the help of Versatile Thermostat
  (`help.<key>`) is shown.
- `info.<key>`: the explanation of the panel of help. Without it, the panel shows the help of Versatile Thermostat when it is another
  text than the hint.
- a diagram of the library of the dashboard, which `FIELD_DIAGRAMS` (`field-diagrams.ts`) gives by key: `cycle_min` → `tpi_cycle`, the
  coefficients of TPI → `tpi_formula`, the openings of a valve → `valve_curve`, and so on. `stagger` illustrates only the switches of a
  thermostat over switch.

The button (i) of a field appears when it has an explanation or a diagram. The diagrams are drawn with the values of the draft, the
central ones for a section that inherits, and highlight the setting of the field that has the focus. `GROUP_DIAGRAMS` names the
groups of fields that share a diagram (the openings of a valve, the coefficients of TPI, the detection of a window): their diagram is
a tile of the grid after the last field of the group, on two columns when the grid has three, and after the chips of a section that
inherits. The fields of a group do not repeat it in their own panel, except a field of the group that is in the advanced settings.

### The status of the tabs
Each native tab gives its status to the menu: `Off` or `Central (off)` when its values turn it off, the number of the required fields
that it shows without a value (and the sensor of a window detected with a sensor), `Central` when it uses the central configuration,
otherwise a check mark, which the menu does not show for the tabs of the general settings: they are always on. The dashboard adds
`Off` for a feature that is off, and `Error`. See
[Status of a configuration section](hooks-and-placement.md#status-of-a-configuration-section).

### The controls
The native tabs draw their fields with the components of Home Assistant: one `ha-selector` per field, whose selector comes from the
contract of the SDK (`definitionOf` turns a field of the flow into a `FieldDefinition`, then `selectorOf` gives the selector), in a
`ha-card`, with `ha-alert` for the errors, `ha-expansion-panel` for the advanced settings, `ha-switch` for the switch Customize and
`ha-button` for the actions. The button (i) of the help of a field is a button of the dashboard with the icon `ha-svg-icon`, not
`ha-icon-button`, which gives neither the state of the panel nor the panel that it controls to the button inside it. The method of detection of a window is a `ha-selector` of type `select` in the mode `box`. The commands of
a thermostat on switch and the services of the central boiler use `ha-service-picker`. The units of the delays and the classes of
devices of the sensors are written by hand in `shared/vtherm-config-schemas.json` (`unit`, `device_classes`); the drift test keeps
them. When a component is not defined after `ensureHaControls()`, the tab draws plain HTML controls, the fallback, and writes one
warning in the console. Do the same in your plugin: see [Developing a plugin](plugin-development.md#fields-of-configuration).

## Texts
Each native plugin has English, French and German catalogs, generated from the translations of Versatile Thermostat with
`npm run catalogs:generate`. English is the default for any other language.
