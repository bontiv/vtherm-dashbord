[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: ThermostatConfigProps

The properties of a component of `thermostat_config`.

## Extends

- [`ThermostatProps`](ThermostatProps.md)
- [`ConfigProps`](ConfigProps.md)

## Properties

### centralValues

> **centralValues**: [`ConfigValues`](../type-aliases/ConfigValues.md)

The values of the central configuration, to show the inherited values.

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

[`ThermostatProps`](ThermostatProps.md).[`hass`](ThermostatProps.md#hass)

***

### thermostatId

> **thermostatId**: `string`

The identifier of the thermostat.

#### Inherited from

[`ThermostatProps`](ThermostatProps.md).[`thermostatId`](ThermostatProps.md#thermostatid)

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
