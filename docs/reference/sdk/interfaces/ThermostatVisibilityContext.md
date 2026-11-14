[**@vtherm/dashboard-sdk**](../index.md)

***

# Interface: ThermostatVisibilityContext

What the visibility condition of a contribution shown for a thermostat can read.

## Extends

- [`ThermostatProps`](ThermostatProps.md)

## Properties

### centralValues

> **centralValues**: [`ConfigValues`](../type-aliases/ConfigValues.md)

The values of the central configuration.

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

### thermostatType

> **thermostatType**: [`ThermostatType`](../type-aliases/ThermostatType.md)

The type of the thermostat.

***

### values

> **values**: [`ConfigValues`](../type-aliases/ConfigValues.md)

The current values of the configuration of the thermostat, draft included.
