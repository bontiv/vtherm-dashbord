[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: HassDeviceRegistryEntry

A device of the registry of the devices of Home Assistant, `hass.devices`.

## Properties

### area\_id?

> `readonly` `optional` **area\_id?**: `string` \| `null`

The area of the device.

***

### config\_entries?

> `readonly` `optional` **config\_entries?**: readonly `string`[]

The configuration entries of the device.

***

### id

> `readonly` **id**: `string`

The identifier of the device.

***

### identifiers?

> `readonly` `optional` **identifiers?**: readonly (readonly \[`string`, `string`\])[]

The identifiers that the integrations gave to the device, as pairs of a domain and an identifier.

***

### name?

> `readonly` `optional` **name?**: `string` \| `null`

The name of the device.
