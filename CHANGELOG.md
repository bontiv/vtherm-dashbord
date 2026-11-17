# Changelog
All notable changes of the dashboard and of the SDK `@vtherm/dashboard-sdk`, which share one version. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the versions follow [Semantic Versioning](https://semver.org/).

Each version has a section **For plugin authors**: the changes of the contract of the plugins (the SDK, the hooks, the placements, the
WebSocket command that lists the plugins) and what to change in a plugin to follow them. See
[Developing a plugin](docs/plugins/plugin-development.md#10-a-new-major-version-of-the-dashboard).

## [Unreleased]

### Changed
- Creating a thermostat or the central configuration is a page of configuration, like an existing one: a menu on the left, one
  section at a time, the draft kept from a section to another. A new thermostat first asks for its type on its own screen, then has the sections Main attributes, Underlyings, TPI parameters when the type uses them, and Advanced parameters, so the TPI and advanced parameters that a thermostat without central configuration needs can be set at creation. The breadcrumb brings back the choice of the type. The central configuration has Main attributes, TPI parameters
  and Advanced parameters. **Create** and **Cancel** replace **Save** and **Discard**, and a warning at the top of the page, above the
  card, lists the missing fields by section until nothing is missing. Changing the type keeps the values that the new type accepts. The assistant of creation is gone, and the central
  configuration is no longer created at `/vtherm/<thermostats tab>/new/central`: **Create the central configuration** opens its sections
  in the Configuration tab.

### For contributors
- The sample plugin (`examples/vtherm_sample_plugin/ui`) is no longer a workspace of the root `package.json`, so an SDK version that is not
  published yet can no longer make `npm ci` fail for the whole repository. The CI job `sample-plugin` builds the SDK, installs it in the
  sample from a tarball, then builds and tests the sample. When it fails, the run shows the warning "Sample plugin" and stays green. The
  release check of the version of the sample is unchanged.

## [0.1.0-beta2]
The second beta.

### Added
- The project is under the Apache License 2.0 (`LICENSE`, `NOTICE`). The SDK `@vtherm/dashboard-sdk` carries both files: a plugin
  author, free or paid, keeps the licence and the notice of the author when the plugin includes the SDK.
- The list of the thermostats groups them by area of Home Assistant, ordered by floor then by name, with the thermostats without
  area at the end and a link to give each one an area in its device page. **By area** and **By name** choose the order, remembered in
  the browser. The names of the areas and of the floors follow Home Assistant live. The selector of the menu orders the thermostats
  the same way and names each one with its area.
- `vtherm_dashboard/get_thermostats` gives the device, the climate entity, the area and the floor of each thermostat.

### Changed
- The Dashboard tab hides its menu while it has a single page, its overview, which then takes the full width.
- The dashboard is named "Versatile Thermostat" in the side menu and in its title, instead of "Home confort". An entry of the
  integration created before keeps its title until it is renamed in Home Assistant.
- The address of the dashboard is `/vtherm`, instead of `/home-confort`: update the links and bookmarks to its pages.
- Every control of the dashboard is a component of Home Assistant: entity pickers filtered by domain and device class, the
  underlyings in an ordered list, numbers with their unit, the switch commands with a service picker for each underlying, messages
  in `ha-alert`, confirmations in `ha-dialog` (leaving unsaved changes, installing and restarting in VT add-ons), cards, menus and
  spinners. An entity shown as text opens its card. Each control keeps a plain HTML fallback when Home Assistant does not load it.
- **Save** and **Discard** are at the foot of the card of each section, as in the configuration pages of Home Assistant: Discard on
  the left, Save on the right with the progress button of Home Assistant, which turns green with a check mark when the save succeeds
  and red with an alert icon when it fails. The bar that stayed at the bottom of the screen is gone, on a phone too: scroll to the
  foot of the card to save. The message "Saved." is gone; screen readers are still told.

### Fixed
- A thermostat can be created without a central configuration. The creation was refused with "no central configuration found":
  the fields that the user did not change were sent with the defaults of the forms of Versatile Thermostat (the central mode on),
  instead of the values that its flow proposes, as the screens of Home Assistant send them. The creation also sends the TPI and
  advanced parameters, with the defaults of Versatile Thermostat, that a thermostat without central configuration needs.
- Without a central configuration, every option that needs one is off and disabled, with its explanation: the control by the
  central mode and the central boiler, not only the use of the central configuration.
- The UI plugins are no longer lost when the central configuration of Versatile Thermostat is the only entry and is saved: the
  dashboard keeps the instance of `vtherm_api` that holds them.
- The panel follows the navigation again: Home Assistant set a property `route` on it that replaced the route of the panel.
- The dashboard is no longer empty when the user leaves it and comes back: the new panel gives the plugins whose modules the browser
  already evaluated to its registry again.

### For contributors
- `npm run dev` and `start-ha.sh --dev-frontend`: Home Assistant loads the panel and the native plugins from the TypeScript sources
  served by Vite (`VTHERM_DASHBOARD_DEV_SERVER`), so that a change is seen after a reload of the page, without a build or a restart.

### For plugin authors
- Every component receives `narrow`, true on a narrow screen such as a phone (`DisplayProps` in the SDK). The fake host of
  `@vtherm/dashboard-sdk/testing` gives `narrow: false` unless a test gives it. The change is compatible: nothing to migrate.
- The SDK has a contract for the fields of configuration (`FieldDefinition`, `selectorOf`) that gives the `ha-selector` of each
  field, and a loader of the components of Home Assistant (`ensureHaControls`, `haControlsStatus`). `@vtherm/dashboard-sdk/testing`
  adds `defineHaControlMocks`. The change is compatible: nothing to migrate.
- A configuration component (`general_config`, `thermostat_config`) receives `draft` (`DraftControls`): whether the draft has changes,
  whether a save is running, the translated messages to show above the actions, `save()` (which resolves to `success`, `error` or
  `partial`) and `discard()`. A contribution that draws the save actions at the foot of its own card declares
  `save_actions: "component"`; without it, the dashboard draws them in a card under the component. `ha-progress-button` is in
  `HA_CONTROLS`, and its simulated version in `defineHaControlMocks` records `actionSuccess()` and `actionError()`. The change is
  compatible: a plugin without `save_actions` keeps its save actions, under its component.

## [0.1.0]
The first version.

### For plugin authors
- The contract of the plugins starts here: seven hooks, six placements, typed translations, and the version constraint `dashboard_version`.
- A plugin is declared in Python with `register_ui_plugin` of `vtherm_api`, and contributes from a JavaScript module built with
  `@vtherm/dashboard-sdk`.
- Nothing to migrate.
