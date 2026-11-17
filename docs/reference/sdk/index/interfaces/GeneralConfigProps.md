[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: GeneralConfigProps

The properties of a component of `general_config`. It has no thermostat identifier.

## Extends

- [`BaseProps`](BaseProps.md)
- [`ConfigProps`](ConfigProps.md)

## Properties

### draft?

> `optional` **draft?**: [`DraftControls`](DraftControls.md)

The state of the draft and its commands. A new object is given at each change of the draft. It is undefined when the configuration
cannot be saved, for example when it is read-only: no save action is drawn then.

#### Inherited from

[`ConfigProps`](ConfigProps.md).[`draft`](ConfigProps.md#draft)

***

### errors

> **errors**: [`ConfigErrors`](../type-aliases/ConfigErrors.md)

The validation errors of the fields, after a refused save.

#### Inherited from

[`ConfigProps`](ConfigProps.md).[`errors`](ConfigProps.md#errors)

***

### hass

> **hass**: [`Hass`](Hass.md)

The state of Home Assistant.

#### Inherited from

[`BaseProps`](BaseProps.md).[`hass`](BaseProps.md#hass)

***

### values

> **values**: [`ConfigValues`](../type-aliases/ConfigValues.md)

The current values of the edited configuration, draft included.

#### Inherited from

[`ConfigProps`](ConfigProps.md).[`values`](ConfigProps.md#values)

## Methods

### proposeChanges()

> **proposeChanges**(`changes`): `void`

Propose changes to the draft. The real configuration is not changed until the user saves.

#### Parameters

##### changes

[`ConfigValues`](../type-aliases/ConfigValues.md)

#### Returns

`void`

#### Inherited from

[`ConfigProps`](ConfigProps.md).[`proposeChanges`](ConfigProps.md#proposechanges)
