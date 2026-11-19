[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: FakeHassOptions

What `createFakeHass` can be given.

## Properties

### devices?

> `readonly` `optional` **devices?**: `Readonly`\<`Record`\<`string`, [`HassDeviceRegistryEntry`](../../index/interfaces/HassDeviceRegistryEntry.md)\>\>

The registry of the devices, by device id. Undefined by default.

***

### entities?

> `readonly` `optional` **entities?**: `Readonly`\<`Record`\<`string`, [`HassEntityRegistryEntry`](../../index/interfaces/HassEntityRegistryEntry.md)\>\>

The registry of the entities, by entity id. Undefined by default.

***

### isAdmin?

> `readonly` `optional` **isAdmin?**: `boolean`

Whether the user is an administrator. `true` by default.

***

### language?

> `readonly` `optional` **language?**: `string`

The language of the user. `en` by default.

***

### states?

> `readonly` `optional` **states?**: `Readonly`\<`Record`\<`string`, `string`\>\>

The states of the entities, by entity id.
