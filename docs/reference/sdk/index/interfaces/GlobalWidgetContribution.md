[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: GlobalWidgetContribution

A widget of the Overview page.

## Extends

- `ContributionBase`\<`"global_widget"`\>
- `ComponentFields`

## Properties

### component

> `readonly` **component**: `string`

The tag name of the custom element that the plugin defines, for example `smartpi-tab`.

#### Inherited from

`ComponentFields.component`

***

### id

> `readonly` **id**: `string`

The identifier of the contribution. It starts with the identifier of the plugin and a dot, for example `smartpi.tab.main`.

#### Inherited from

`ContributionBase.id`

***

### on\_missing?

> `readonly` `optional` **on\_missing?**: [`OnMissing`](../type-aliases/OnMissing.md)

What to do when the target of the placement does not exist. `last` by default.

#### Inherited from

`ContributionBase.on_missing`

***

### placement?

> `readonly` `optional` **placement?**: [`Placement`](../type-aliases/Placement.md)

Where the contribution goes. Without it, the contribution goes `last`.

#### Inherited from

`ContributionBase.placement`

***

### visible?

> `readonly` `optional` **visible?**: (`context`) => `boolean`

A condition that decides whether the contribution is shown. It is evaluated again at each change of the context.
A hidden contribution keeps its place, so the placements of the other contributions do not move.

#### Parameters

##### context

[`BaseProps`](BaseProps.md)

#### Returns

`boolean`

#### Inherited from

`ContributionBase.visible`
