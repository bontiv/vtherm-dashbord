[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: PlacementEngine

The engine that places the contributions of the plugins.

## Methods

### addPlugin()

> **addPlugin**(`definition`, `relations?`): [`EngineIssue`](EngineIssue.md)[]

Add a plugin and resolve the position of its contributions. Call it for each plugin, in the load order.

#### Parameters

##### definition

[`UiPluginDefinition`](UiPluginDefinition.md)

The definition of the plugin.

##### relations?

[`PluginRelations`](PluginRelations.md)

Its load dependencies, to warn about a `replace` or a `remove` that is not ordered after its target.

#### Returns

[`EngineIssue`](EngineIssue.md)[]

The problems found with this plugin.

***

### issues()

> **issues**(): readonly [`EngineIssue`](EngineIssue.md)[]

Every problem found since the start, without repetition.

#### Returns

readonly [`EngineIssue`](EngineIssue.md)[]

***

### menu()

> **menu**(`tabId`): readonly [`PlacedEntry`](PlacedEntry.md)[]

The entries of the left menu of a top tab, composed of the contributions of several hooks. Empty when the tab was removed.

#### Parameters

##### tabId

`string`

#### Returns

readonly [`PlacedEntry`](PlacedEntry.md)[]

***

### topTabs()

> **topTabs**(): [`TopTabZones`](TopTabZones.md)

The tabs of the top bar, in the zone `start` and in the zone `end`.

#### Returns

[`TopTabZones`](TopTabZones.md)

***

### visible()

> **visible**(`entries`, `contextOf`): [`PlacedEntry`](PlacedEntry.md)[]

Keep the entries whose visibility condition is true. A condition that raises hides the entry and records an issue.
The hidden entries keep their place, so the positions of the others do not move.

#### Parameters

##### entries

readonly [`PlacedEntry`](PlacedEntry.md)[]

The entries of a list, in order.

##### contextOf

(`entry`) => [`VisibilityContext`](../type-aliases/VisibilityContext.md)\<`"top_tab"` \| `"tab_page"` \| `"global_page"` \| `"global_widget"` \| `"general_config"` \| `"thermostat_config"` \| `"thermostat_widget"`\>

Gives the context that the condition of an entry reads.

#### Returns

[`PlacedEntry`](PlacedEntry.md)[]

***

### widgets()

> **widgets**(`hook`): readonly [`PlacedEntry`](PlacedEntry.md)[]

The widgets of the Overview page (`global_widget`) or of the overview of a thermostat (`thermostat_widget`).

#### Parameters

##### hook

`"global_widget"` \| `"thermostat_widget"`

#### Returns

readonly [`PlacedEntry`](PlacedEntry.md)[]
