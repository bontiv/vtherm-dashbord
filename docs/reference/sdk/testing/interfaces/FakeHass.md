[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: FakeHass

A fake `hass`: the state of Home Assistant that a component reads, with ways to change it from a test.

## Extends

- [`Hass`](../../index/interfaces/Hass.md)

## Properties

### config?

> `readonly` `optional` **config?**: [`HassConfig`](../../index/interfaces/HassConfig.md)

The configuration of Home Assistant, in particular the unit of the temperatures.

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`config`](../../index/interfaces/Hass.md#config)

***

### devices?

> `readonly` `optional` **devices?**: `Readonly`\<`Record`\<`string`, [`HassDeviceRegistryEntry`](../../index/interfaces/HassDeviceRegistryEntry.md)\>\>

The registry of the devices, by device id. Undefined in a version of Home Assistant that does not give it.

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`devices`](../../index/interfaces/Hass.md#devices)

***

### entities?

> `readonly` `optional` **entities?**: `Readonly`\<`Record`\<`string`, [`HassEntityRegistryEntry`](../../index/interfaces/HassEntityRegistryEntry.md)\>\>

The registry of the entities for display, by entity id. Undefined in a version of Home Assistant that does not give it, and in the
fake `hass` of the tests unless the test gives it.

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`entities`](../../index/interfaces/Hass.md#entities)

***

### formatEntityAttributeValue?

> `readonly` `optional` **formatEntityAttributeValue?**: (`stateObj`, `attribute`, `value?`) => `string`

Format the value of an attribute of an entity as Home Assistant shows it, with its unit. Undefined when Home Assistant does not give it.

#### Parameters

##### stateObj

[`HassState`](../../index/interfaces/HassState.md)

##### attribute

`string`

##### value?

`unknown`

#### Returns

`string`

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`formatEntityAttributeValue`](../../index/interfaces/Hass.md#formatentityattributevalue)

***

### formatEntityState?

> `readonly` `optional` **formatEntityState?**: (`stateObj`, `state?`) => `string`

Format the state of an entity as Home Assistant shows it: translated, with its unit and its precision. Undefined when Home Assistant
does not give it, for example in the test harness: format the value with `locale` then.

#### Parameters

##### stateObj

[`HassState`](../../index/interfaces/HassState.md)

##### state?

`string`

#### Returns

`string`

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`formatEntityState`](../../index/interfaces/Hass.md#formatentitystate)

***

### language

> **language**: `string`

Language of the profile. Change it with `setLanguage`.

#### Overrides

[`Hass`](../../index/interfaces/Hass.md).[`language`](../../index/interfaces/Hass.md#language)

***

### locale?

> `readonly` `optional` **locale?**: [`HassLocale`](../../index/interfaces/HassLocale.md)

The regional settings of the user.

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`locale`](../../index/interfaces/Hass.md#locale)

***

### serviceCalls

> `readonly` **serviceCalls**: readonly [`ServiceCall`](ServiceCall.md)[]

The services that the component called, in order.

***

### states

> `readonly` **states**: `Readonly`\<`Record`\<`string`, [`HassState`](../../index/interfaces/HassState.md)\>\>

The states of the entities, by entity id.

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`states`](../../index/interfaces/Hass.md#states)

***

### user?

> `readonly` `optional` **user?**: [`HassUser`](../../index/interfaces/HassUser.md)

The user of the session.

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`user`](../../index/interfaces/Hass.md#user)

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

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`callService`](../../index/interfaces/Hass.md#callservice)

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

#### Inherited from

[`Hass`](../../index/interfaces/Hass.md).[`callWS`](../../index/interfaces/Hass.md#callws)

***

### setDevice()

> **setDevice**(`device`): `void`

Add a device to `devices`, or replace the one with the same `id`. The registry is created by the first device: until then
`devices` is undefined, as in a version of Home Assistant that does not give it.

#### Parameters

##### device

[`HassDeviceRegistryEntry`](../../index/interfaces/HassDeviceRegistryEntry.md)

#### Returns

`void`

***

### setEntity()

> **setEntity**(`entity`): `void`

Add an entity to `entities`, or replace the one with the same `entity_id`. The registry is created by the first entity.

#### Parameters

##### entity

[`HassEntityRegistryEntry`](../../index/interfaces/HassEntityRegistryEntry.md)

#### Returns

`void`

***

### setLanguage()

> **setLanguage**(`language`): `void`

Set the language of the user.

#### Parameters

##### language

`string`

#### Returns

`void`

***

### setState()

> **setState**(`entityId`, `state`, `attributes?`): `void`

Set the state of an entity, and its attributes.

#### Parameters

##### entityId

`string`

##### state

`string`

##### attributes?

`Readonly`\<`Record`\<`string`, `unknown`\>\>

#### Returns

`void`

***

### setWebSocketHandler()

> **setWebSocketHandler**(`handler`): `void`

Set what `callWS` answers. By default it rejects, so a test must say what the server answers.

#### Parameters

##### handler

(`message`) => `unknown`

#### Returns

`void`
