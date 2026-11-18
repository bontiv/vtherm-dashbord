[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: ThermostatConfigContribution

An entry of the menu of a thermostat, in particular a configuration section.

## Extends

- `ContributionBase`\<`"thermostat_config"`\>
- `MenuEntryFields`
- `ComponentFields`
- `ConfigFields`\<`"thermostat_config"`\>

## Properties

### component

> `readonly` **component**: `string`

The tag name of the custom element that the plugin defines, for example `smartpi-tab`.

#### Inherited from

`ComponentFields.component`

***

### feature?

> `readonly` `optional` **feature?**: `string`

The key of the boolean value that turns the feature of the section on, for example `use_window_feature`. While it is off, the
section stays in the menu with the status `off`, and its page shows an explanation and a switch drawn by the dashboard instead of
the component. The explanation is the key `feature_intro.<feature>` of the catalog of the plugin.

#### Inherited from

`ConfigFields.feature`

***

### group?

> `readonly` `optional` **group?**: `string`

The key of the group in the translation catalog of the plugin, or one of the groups shared by the core (`CORE_MENU_GROUPS`), whose
heading the dashboard translates. A consecutive run of entries of one group shares one heading.

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

### save\_actions?

> `readonly` `optional` **save\_actions?**: `"component"` \| `"dashboard"`

Who draws the save actions (save, discard) of the section: `component` when the component draws them at the foot of its own card
from `draft`, `dashboard` (default) when the dashboard draws them in a card under the component.

#### Inherited from

`ConfigFields.save_actions`

***

### status?

> `readonly` `optional` **status?**: (`context`) => [`SectionStatus`](../type-aliases/SectionStatus.md) \| `undefined`

The status of the section, shown in the menu. A pure function of the context, called at each drawing of the menu: it must be quick
and must not change anything. `undefined` shows no status. A function that raises or returns another value shows no status, and the
development mode reports it.

#### Parameters

##### context

[`ThermostatVisibilityContext`](ThermostatVisibilityContext.md)

#### Returns

[`SectionStatus`](../type-aliases/SectionStatus.md) \| `undefined`

#### Inherited from

`ConfigFields.status`

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

[`ThermostatVisibilityContext`](ThermostatVisibilityContext.md)

#### Returns

`boolean`

#### Inherited from

`ContributionBase.visible`
