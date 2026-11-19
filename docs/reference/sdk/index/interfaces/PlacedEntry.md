[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: PlacedEntry

A contribution at its place.

## Properties

### contribution

> `readonly` **contribution**: [`ShownContribution`](../type-aliases/ShownContribution.md)

The contribution as the plugin declared it.

***

### hook

> `readonly` **hook**: `"top_tab"` \| `"tab_page"` \| `"global_page"` \| `"global_widget"` \| `"general_config"` \| `"thermostat_config"` \| `"thermostat_widget"`

The hook of the contribution.

***

### id

> `readonly` **id**: `string`

The identifier of the contribution.

***

### pluginId

> `readonly` **pluginId**: `string`

The plugin that contributes it.

***

### size?

> `readonly` `optional` **size?**: [`ResolvedWidgetSize`](ResolvedWidgetSize.md)

The size of a widget, with its default values: present for the contributions of `global_widget` and `thermostat_widget` only.
