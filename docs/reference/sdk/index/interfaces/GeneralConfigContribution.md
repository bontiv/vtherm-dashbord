[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: GeneralConfigContribution

A section of the general configuration of Versatile Thermostat.

## Extends

- `ContributionBase`\<`"general_config"`\>
- `MenuEntryFields`
- `ComponentFields`

## Properties

### component

> `readonly` **component**: `string`

The tag name of the custom element that the plugin defines, for example `smartpi-tab`.

#### Inherited from

`ComponentFields.component`

***

### group?

> `readonly` `optional` **group?**: `string`

The key of the group in the translation catalog of the plugin. A consecutive run of entries of one group shares one heading.

#### Inherited from

`MenuEntryFields.group`

***

### icon?

> `readonly` `optional` **icon?**: `string`

The icon, for example `mdi:thermometer`. Without it, only the title is shown.

#### Inherited from

`MenuEntryFields.icon`

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

### title

> `readonly` **title**: `string`

The key of the title in the translation catalog of the plugin. It is used in the menu and in the breadcrumb.

#### Inherited from

`MenuEntryFields.title`

***

### visible?

> `readonly` `optional` **visible?**: (`context`) => `boolean`

A condition that decides whether the contribution is shown. It is evaluated again at each change of the context.
A hidden contribution keeps its place, so the placements of the other contributions do not move.

#### Parameters

##### context

[`GeneralConfigVisibilityContext`](GeneralConfigVisibilityContext.md)

#### Returns

`boolean`

#### Inherited from

`ContributionBase.visible`
