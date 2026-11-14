[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: UiPluginRegistry

The registry that the dashboard puts in the page.

## Extended by

- [`FakeHost`](../../testing/interfaces/FakeHost.md)

## Properties

### dashboardVersion

> `readonly` **dashboardVersion**: `string`

The version of the dashboard, a semantic version such as `1.4.0`.

## Methods

### register()

> **register**(`definition`): `void`

Apply the contributions of a plugin.

It throws when the plugin is not known: its identifier is neither registered in Python nor declared by a
development entry. No contribution is applied then.

#### Parameters

##### definition

[`UiPluginDefinition`](UiPluginDefinition.md)

#### Returns

`void`
