[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: HassEntityRegistryEntry

An entity of the registry that Home Assistant gives to its frontend for display, `hass.entities`. It is a subset of the full registry:
in particular it has no `config_entry_id`, so the entities of a configuration entry are found through their device, see
`getEntryEntities`.

## Properties

### area\_id?

> `readonly` `optional` **area\_id?**: `string` \| `null`

The area of the entity, when it differs from the area of its device.

***

### device\_id?

> `readonly` `optional` **device\_id?**: `string` \| `null`

The device of the entity, when it has one.

***

### entity\_id

> `readonly` **entity\_id**: `string`

The identifier of the entity, for example `sensor.living_room_power_percent`.

***

### platform?

> `readonly` `optional` **platform?**: `string`

The integration that created the entity, for example `versatile_thermostat`.

***

### translation\_key?

> `readonly` `optional` **translation\_key?**: `string` \| `null`

The key of the name of the entity in the translations of its integration, for example `power_percent`.
