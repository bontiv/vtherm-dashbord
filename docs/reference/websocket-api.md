# WebSocket API

The dashboard adds WebSocket commands to Home Assistant. They are used by the dashboard frontend and are documented
here for contributors and plugin authors. Audience: contributors, plugin authors.

All commands require an authenticated connection, as every Home Assistant WebSocket command.

## `vtherm_dashboard/get_ui_plugins`

Returns the UI plugins to load, validated and sorted in load order, with the outcome of each plugin. The list is built
on each call from the plugins registered in `vtherm_api` (see the [Python API](../plugins/python-api.md)) and, for an
administrator, from the development entries of the request. The frontend imports the modules in the order received and
does not sort them again.

### Request

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `string` | yes | `vtherm_dashboard/get_ui_plugins` |
| `dev_plugins` | `list` of objects | no | Development entries of the browser, sent by an administrator. They are merged for this call and are not kept. |

A development entry has the fields below. If `id` is the identifier of a registered plugin, only `js_url` is used and
the registered metadata stay. Otherwise the entry is a complete declaration and `dashboard_version` is required.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Identifier of the plugin. |
| `js_url` | `string` | yes | Absolute `http` or `https` URL of the module on the development server. |
| `dashboard_version` | `string` | for an unknown `id` | Constraint on the dashboard version. |
| `requires`, `load_after`, `load_before` | `list` of `string` | no | Load dependencies, for an unknown `id`. |

### Response

```json
{
  "dashboard_version": "0.1.0",
  "plugins": [
    {
      "id": "smartpi",
      "js_url": "/smartpi_static/ui.js",
      "dashboard_version": ">=0.1,<1.0",
      "requires": ["core"],
      "load_after": [],
      "load_before": [],
      "source": "installed",
      "state": "ready",
      "reason": null,
      "details": {},
      "order": 1
    }
  ]
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `dashboard_version` | `string` | Version of the dashboard, from the manifest of the integration. |
| `plugins` | `list` | Plugins to load first, in load order, then the other plugins ordered by identifier. Empty when no plugin is registered. |

Each plugin of `plugins` has these fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Identifier of the plugin. |
| `js_url` | `string` | URL of the module to import. |
| `dashboard_version` | `string` | Constraint declared by the plugin. Empty for a development entry that gave none. |
| `requires` | `list` of `string` | Plugins that must be ready. |
| `load_after` | `list` of `string` | Plugins to load before this one when they are present. |
| `load_before` | `list` of `string` | Plugins to load after this one when they are present. |
| `source` | `string` | `installed` (registered by an integration), `native` (a plugin of the dashboard) or `development` (a development entry). |
| `state` | `string` | Outcome of the server checks, see below. |
| `reason` | `string` or `null` | Code that refines the state, see below. |
| `details` | `object` | Data that explains the state. Empty when the plugin is ready. |
| `order` | `integer` or `null` | Rank in the load order, starting at 0. `null` when the plugin is not loaded. |

### States

Only a plugin whose `state` is `ready` has an `order` and is imported by the frontend. The frontend adds its own
states when an import fails (see the plugin status page of the dashboard).

| `state` | `reason` | `details` | Cause |
| --- | --- | --- | --- |
| `ready` | `null` | `{}` | The plugin is valid, compatible and its dependencies are ready. |
| `invalid` | `reserved_id` | `{}` | The identifier is `core` or starts with `core_` and does not belong to a native plugin. |
| `invalid` | `invalid_url` | `{"url": "<url>"}` | An installed plugin must give a path that starts with `/` and is not another host. A development entry must give an absolute `http` or `https` URL. |
| `invalid` | `invalid_constraint` | `{"fault": "<comparator>"}` | `dashboard_version` has an unsupported operator or an invalid version. `fault` is the faulty comparator. |
| `invalid` | `missing_constraint` | `{}` | A development entry for an unknown plugin has no `dashboard_version`. |
| `dashboard_incompatible` | `too_old` or `too_new` | `{"constraint": "<constraint>", "dashboard_version": "<version>"}` | The dashboard version does not satisfy the constraint. `too_old` means the dashboard is older than the plugin supports, `too_new` that it is more recent. |
| `missing_dependency` | `null` | `{"missing": ["<id>"]}` | A plugin of `requires` is absent or is not ready. The state spreads to the plugins that require it. |
| `cycle` | `null` | `{"plugins": ["<id>"]}` | The plugin belongs to a loop of load dependencies. `plugins` lists the plugins of the loop. |

The load order respects `requires`, `load_after` and `load_before`. A link to a plugin that is absent is ignored for
`load_after` and `load_before`. The `core` plugin is always first, and plugins without constraint between them are
ordered by identifier, so the order is the same on every call.

### Errors

| Error code | Cause |
| --- | --- |
| `unauthorized` | The request has `dev_plugins` and the user is not an administrator. |
| `invalid_format` | The request does not match the schema, for example `dev_plugins` is not a list of objects. |
