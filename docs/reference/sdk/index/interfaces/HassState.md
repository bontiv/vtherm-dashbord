[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: HassState

The state of an entity of Home Assistant.

## Properties

### attributes

> `readonly` **attributes**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

The attributes of the entity.

***

### entity\_id?

> `readonly` `optional` **entity\_id?**: `string`

The identifier of the entity, for example `climate.living_room`. Home Assistant always gives it; a test can leave it out.

***

### last\_changed?

> `readonly` `optional` **last\_changed?**: `string`

When the state last changed, as an ISO 8601 date.

***

### last\_updated?

> `readonly` `optional` **last\_updated?**: `string`

When the state or an attribute was last written, as an ISO 8601 date.

***

### state

> `readonly` **state**: `string`

The state, for example `heat` or `19.5`.
