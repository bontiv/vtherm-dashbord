[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: RemovalContribution

A contribution that removes another one. It shows nothing, so it needs no title or component.

## Properties

### id

> `readonly` **id**: `string`

The identifier of the contribution.

***

### on\_missing?

> `readonly` `optional` **on\_missing?**: [`OnMissing`](../type-aliases/OnMissing.md)

What to do when the target does not exist.

***

### placement

> `readonly` **placement**: [`RemovalPlacement`](RemovalPlacement.md)

The contribution to remove.
