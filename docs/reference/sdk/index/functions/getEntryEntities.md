[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: getEntryEntities()

> **getEntryEntities**(`hass`, `entryId`): [`EntryEntities`](../interfaces/EntryEntities.md)

Find the entities of a configuration entry of Versatile Thermostat: a thermostat (its `thermostatId`) or the central configuration.

It is a pure and synchronous function: it reads `hass.devices` and `hass.entities`, and never calls the server. An entity without a
translation key, such as the `select` of the central mode, is found in `entities` by its domain.

## Parameters

### hass

`Pick`\<[`Hass`](../interfaces/Hass.md), `"devices"` \| `"entities"`\>

The state of Home Assistant.

### entryId

`string`

The identifier of the configuration entry. An entity identifier such as `climate.living_room` is not one: it gives
  empty values.

## Returns

[`EntryEntities`](../interfaces/EntryEntities.md)

The device of the entry and its entities, or empty values when a registry is missing or the entry has no device.
