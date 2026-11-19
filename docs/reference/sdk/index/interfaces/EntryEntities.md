[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: EntryEntities

The entities of a configuration entry. Every field is empty when the entry, its device or a registry is unknown.

## Properties

### byKey

> `readonly` **byKey**: `Readonly`\<`Record`\<`string`, `string`\>\>

The entities that have a translation key, by key: `byKey["power_percent"]` is the sensor of the share of heating.

***

### climate

> `readonly` **climate**: `string` \| `undefined`

The first `climate` entity of the device: the thermostat itself. Undefined for the central configuration.

***

### deviceId

> `readonly` **deviceId**: `string` \| `undefined`

The device of the entry.

***

### entities

> `readonly` **entities**: readonly [`EntryEntity`](EntryEntity.md)[]

The entities of the device of the entry, in the order of the registry.
