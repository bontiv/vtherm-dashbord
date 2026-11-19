[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: EntryEntity

An entity of a configuration entry.

## Properties

### domain

> `readonly` **domain**: `string`

The domain of the entity, the part of its identifier before the dot, for example `sensor`.

***

### entityId

> `readonly` **entityId**: `string`

The identifier of the entity, for example `sensor.living_room_power_percent`.

***

### platform

> `readonly` **platform**: `string` \| `undefined`

The integration that created the entity.

***

### translationKey

> `readonly` **translationKey**: `string` \| `undefined`

The key of the name of the entity in the translations of Versatile Thermostat, for example `power_percent`. Undefined when it has none.
