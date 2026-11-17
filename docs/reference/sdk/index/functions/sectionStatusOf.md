[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: sectionStatusOf()

> **sectionStatusOf**(`entry`, `context`, `onError?`): [`SectionStatus`](../type-aliases/SectionStatus.md) \| `undefined`

Call the status function of a configuration section. A section without a function, a function that returns `undefined`, a function
that raises and a value that is not a status all give no status; the last two are reported to `onError`.

## Parameters

### entry

[`PlacedEntry`](../interfaces/PlacedEntry.md)

The contribution, as the placement engine resolved it.

### context

[`VisibilityContext`](../type-aliases/VisibilityContext.md)\<`"top_tab"` \| `"tab_page"` \| `"global_page"` \| `"global_widget"` \| `"general_config"` \| `"thermostat_config"` \| `"thermostat_widget"`\>

The context of its hook, the one its visibility condition receives.

### onError?

(`error`) => `void`

Told when the function raises or returns a value that is not a status.

## Returns

[`SectionStatus`](../type-aliases/SectionStatus.md) \| `undefined`
