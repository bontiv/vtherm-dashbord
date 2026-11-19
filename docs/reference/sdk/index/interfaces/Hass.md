[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: Hass

The subset of the Home Assistant frontend state that the dashboard gives to the plugins.

## Extended by

- [`FakeHass`](../../testing/interfaces/FakeHass.md)

## Properties

### config?

> `readonly` `optional` **config?**: [`HassConfig`](HassConfig.md)

The configuration of Home Assistant, in particular the unit of the temperatures.

***

### devices?

> `readonly` `optional` **devices?**: `Readonly`\<`Record`\<`string`, [`HassDeviceRegistryEntry`](HassDeviceRegistryEntry.md)\>\>

The registry of the devices, by device id. Undefined in a version of Home Assistant that does not give it.

***

### entities?

> `readonly` `optional` **entities?**: `Readonly`\<`Record`\<`string`, [`HassEntityRegistryEntry`](HassEntityRegistryEntry.md)\>\>

The registry of the entities for display, by entity id. Undefined in a version of Home Assistant that does not give it, and in the
fake `hass` of the tests unless the test gives it.

***

### formatEntityAttributeValue?

> `readonly` `optional` **formatEntityAttributeValue?**: (`stateObj`, `attribute`, `value?`) => `string`

Format the value of an attribute of an entity as Home Assistant shows it, with its unit. Undefined when Home Assistant does not give it.

#### Parameters

##### stateObj

[`HassState`](HassState.md)

##### attribute

`string`

##### value?

`unknown`

#### Returns

`string`

***

### formatEntityState?

> `readonly` `optional` **formatEntityState?**: (`stateObj`, `state?`) => `string`

Format the state of an entity as Home Assistant shows it: translated, with its unit and its precision. Undefined when Home Assistant
does not give it, for example in the test harness: format the value with `locale` then.

#### Parameters

##### stateObj

[`HassState`](HassState.md)

##### state?

`string`

#### Returns

`string`

***

### language

> `readonly` **language**: `string`

The language of the user profile.

***

### locale?

> `readonly` `optional` **locale?**: [`HassLocale`](HassLocale.md)

The regional settings of the user.

***

### states

> `readonly` **states**: `Readonly`\<`Record`\<`string`, [`HassState`](HassState.md)\>\>

The states of the entities, by entity id.

***

### user?

> `readonly` `optional` **user?**: [`HassUser`](HassUser.md)

The user of the session.

## Methods

### callService()

> **callService**(`domain`, `service`, `data?`): `Promise`\<`unknown`\>

Call a service of Home Assistant.

#### Parameters

##### domain

`string`

##### service

`string`

##### data?

`Readonly`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`unknown`\>

***

### callWS()

> **callWS**\<`Result`\>(`message`): `Promise`\<`Result`\>

Send a WebSocket message to Home Assistant.

#### Type Parameters

##### Result

`Result`

#### Parameters

##### message

`Readonly`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`Promise`\<`Result`\>
