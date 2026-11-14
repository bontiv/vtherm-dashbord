[**@vtherm/dashboard-sdk**](../index.md)

***

# Interface: Hass

The subset of the Home Assistant frontend state that the dashboard gives to the plugins.

## Properties

### config?

> `readonly` `optional` **config?**: [`HassConfig`](HassConfig.md)

The configuration of Home Assistant, in particular the unit of the temperatures.

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
