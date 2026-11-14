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
