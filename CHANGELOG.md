# Changelog
All notable changes of the dashboard and of the SDK `@vtherm/dashboard-sdk`, which share one version. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the versions follow [Semantic Versioning](https://semver.org/).

Each version has a section **For plugin authors**: the changes of the contract of the plugins (the SDK, the hooks, the placements, the
WebSocket command that lists the plugins) and what to change in a plugin to follow them. See
[Developing a plugin](docs/plugins/plugin-development.md#10-a-new-major-version-of-the-dashboard).

## [Unreleased]

### Changed
- The dashboard is named "Versatile Thermostat" in the side menu and in its title, instead of "Home confort". An entry of the
  integration created before keeps its title until it is renamed in Home Assistant.
- The address of the dashboard is `/vtherm`, instead of `/home-confort`: update the links and bookmarks to its pages.
- Every control of the dashboard is a component of Home Assistant: entity pickers filtered by domain and device class, the
  underlyings in an ordered list, numbers with their unit, the switch commands with a service picker for each underlying, messages
  in `ha-alert`, confirmations in `ha-dialog` (leaving unsaved changes, installing and restarting in VT add-ons), cards, menus and
  spinners. An entity shown as text opens its card. Each control keeps a plain HTML fallback when Home Assistant does not load it.

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

## [0.1.0]
The first version.

### For plugin authors
- The contract of the plugins starts here: seven hooks, six placements, typed translations, and the version constraint `dashboard_version`.
- A plugin is declared in Python with `register_ui_plugin` of `vtherm_api`, and contributes from a JavaScript module built with
  `@vtherm/dashboard-sdk`.
- Nothing to migrate.
