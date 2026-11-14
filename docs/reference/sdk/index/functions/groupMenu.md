[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: groupMenu()

> **groupMenu**(`entries`): [`MenuSection`](../interfaces/MenuSection.md)[]

Cut the entries of a menu into runs that share a group.

A run is a consecutive sequence of entries of the same group. Two entries of one group that are separated by an entry of
another group give two runs, so the heading is shown above each. Entries without a group have no heading.

## Parameters

### entries

readonly [`PlacedEntry`](../interfaces/PlacedEntry.md)[]

The visible entries of a menu, in order.

## Returns

[`MenuSection`](../interfaces/MenuSection.md)[]
