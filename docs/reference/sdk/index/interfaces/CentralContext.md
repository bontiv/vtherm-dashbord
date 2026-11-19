[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: CentralContext

The central configuration of Versatile Thermostat, as the widgets of the Overview page receive it.

## Properties

### entryId

> `readonly` **entryId**: `string`

The identifier of the configuration entry of the central configuration. Give it to `getEntryEntities` to find the entities of the
central device, such as the `select` of the central mode.

***

### values

> `readonly` **values**: [`ConfigValues`](../type-aliases/ConfigValues.md)

The values of the central configuration. Empty while they are being read.
