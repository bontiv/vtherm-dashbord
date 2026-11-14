# Documentation

Documentation of the Versatile Thermostat dashboard ("Home confort"). Every page of `docs/` is listed here with the
people it is written for: **User** (uses the dashboard), **Plugin author** (writes a UI plugin) and **Contributor**
(works on this repository).

| Page | Audience | Content |
| --- | --- | --- |
| [Using the dashboard](user/dashboard.md) | User | Open the dashboard, the tabs, the menu and the breadcrumb, a phone, and the status of the plugins. |
| [Python API for UI plugins](plugins/python-api.md) | Plugin author | Declare a UI plugin with `register_ui_plugin`, its parameters, its errors and what the dashboard checks later. |
| [Loading and dependencies](plugins/loading-and-dependencies.md) | Plugin author | `requires`, `load_after` and `load_before`, the load order and the status of a plugin. |
| [Version constraints](plugins/version-constraints.md) | Plugin author | The grammar of `dashboard_version`, pre-releases and how to support a new major version. |
| [Translations](plugins/internationalization.md) | Plugin author | The English catalog, typed keys, language resolution and fallback, titles as keys, parameters, plurals and catalogs loaded on demand. |
| [Theming](plugins/theming.md) | Plugin author | Use the variables of the Home Assistant theme and no color of your own. |
| [Hooks and placement](plugins/hooks-and-placement.md) | Plugin author | The seven hooks, the menus, the six placements, how a position is resolved, visibility and the problems reported. |
| [Testing a plugin](plugins/testing.md) | Plugin author | The fake dashboard of `@vtherm/dashboard-sdk/testing`: register, resolve, render and check translations. |
| [WebSocket API](reference/websocket-api.md) | Contributor, Plugin author | The `vtherm_dashboard/get_ui_plugins` command: request, response, plugin states and errors. |
| [SDK reference](reference/sdk/index.md) | Plugin author | Generated reference of `@vtherm/dashboard-sdk`: types, `registerUiPlugin` and validation. Do not edit it, run `npm run docs:reference`. |

## Rules for the documentation

- The pages are written in English. Code identifiers, API names, paths and commands are not translated.
- Code examples live in `docs/examples/` and are tested. A page shows them between the markers `<!-- example: path -->`
  and `<!-- /example -->`. Run `npm run docs:sync` to copy a changed example into its pages.
- `npm run docs:reference` generates the reference of the SDK in `docs/reference/sdk/` from the code, and `npm run check:reference` fails when it is out of date or when a public export has no documentation comment.
- `npm run check:docs` checks that every page is in this index with its audience, that every relative link and anchor
  leads somewhere, and that the examples of the pages equal their files.
