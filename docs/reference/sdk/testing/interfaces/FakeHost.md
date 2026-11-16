[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: FakeHost

The fake dashboard.

## Extends

- [`UiPluginRegistry`](../../index/interfaces/UiPluginRegistry.md)

## Properties

### dashboardVersion

> `readonly` **dashboardVersion**: `string`

The version of the dashboard, a semantic version such as `1.4.0`.

#### Inherited from

[`UiPluginRegistry`](../../index/interfaces/UiPluginRegistry.md).[`dashboardVersion`](../../index/interfaces/UiPluginRegistry.md#dashboardversion)

***

### hass

> `readonly` **hass**: [`FakeHass`](FakeHass.md)

The fake `hass` given to the components.

## Methods

### install()

> **install**(): `void`

Put the fake dashboard in the page, where `registerUiPlugin` looks for it. Call `uninstall` when the test ends.

#### Returns

`void`

***

### issues()

> **issues**(): readonly [`EngineIssue`](../../index/interfaces/EngineIssue.md)[]

Every problem found while placing the contributions, since the start.

#### Returns

readonly [`EngineIssue`](../../index/interfaces/EngineIssue.md)[]

***

### menu()

> **menu**(`tabId`): readonly [`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]

The entries of the left menu of a top tab, made of the contributions of several hooks.

#### Parameters

##### tabId

`string`

#### Returns

readonly [`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]

***

### register()

> **register**(`definition`): `void`

Apply the contributions of a plugin.

It throws when the plugin is not known: its identifier is neither registered in Python nor declared by a
development entry. No contribution is applied then.

#### Parameters

##### definition

[`UiPluginDefinition`](../../index/interfaces/UiPluginDefinition.md)

#### Returns

`void`

#### Inherited from

[`UiPluginRegistry`](../../index/interfaces/UiPluginRegistry.md).[`register`](../../index/interfaces/UiPluginRegistry.md#register)

***

### registerPlugin()

> **registerPlugin**(`definition`, `relations?`): [`EngineIssue`](../../index/interfaces/EngineIssue.md)[]

Register a plugin as the dashboard does: same validation, same position resolution.

#### Parameters

##### definition

[`UiPluginDefinition`](../../index/interfaces/UiPluginDefinition.md)

The definition of the plugin.

##### relations?

[`PluginRelations`](../../index/interfaces/PluginRelations.md)

Its load dependencies.

#### Returns

[`EngineIssue`](../../index/interfaces/EngineIssue.md)[]

The problems found while placing the contributions.

#### Throws

`UiPluginValidationError` when the definition is not valid, the same error as `registerUiPlugin`.

***

### render()

> **render**\<`H`\>(`entry`, `props`): `Promise`\<`HTMLElement`\>

Show the component of a contribution with properties, in the document.

#### Type Parameters

##### H

`H` *extends* [`ComponentHookName`](../../index/type-aliases/ComponentHookName.md)

#### Parameters

##### entry

[`PlacedEntry`](../../index/interfaces/PlacedEntry.md)

The contribution, from `resolved`.

##### props

`Omit`\<[`HookProps`](../../index/type-aliases/HookProps.md)\<`H`\>, `"hass"` \| `"narrow"`\> & `object`

The properties the dashboard gives to the component of this hook. `hass` is the fake `hass` by default, and `narrow`
  is false by default: give `narrow: true` to see the component as on a phone.

#### Returns

`Promise`\<`HTMLElement`\>

The element, once it has rendered.

***

### resolved()

> **resolved**(`hook`): readonly [`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]

The contributions of a hook, resolved and in order. For `top_tab`, the zone `start` then the zone `end`.

#### Parameters

##### hook

`"top_tab"` \| `"tab_page"` \| `"global_page"` \| `"global_widget"` \| `"general_config"` \| `"thermostat_config"` \| `"thermostat_widget"`

#### Returns

readonly [`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]

***

### uninstall()

> **uninstall**(): `void`

Remove the fake dashboard from the page.

#### Returns

`void`

***

### visible()

> **visible**\<`H`\>(`entries`, `context`): [`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]

Keep the entries that are visible for a context. A condition that raises hides the entry and records an issue.

#### Type Parameters

##### H

`H` *extends* `"top_tab"` \| `"tab_page"` \| `"global_page"` \| `"global_widget"` \| `"general_config"` \| `"thermostat_config"` \| `"thermostat_widget"`

#### Parameters

##### entries

readonly [`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]

##### context

[`VisibilityContext`](../../index/type-aliases/VisibilityContext.md)\<`H`\>

#### Returns

[`PlacedEntry`](../../index/interfaces/PlacedEntry.md)[]
