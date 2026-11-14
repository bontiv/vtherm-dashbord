[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: MenuSection

A run of consecutive entries of a menu that share a group, which the menu shows under one heading.

## Properties

### entries

> `readonly` **entries**: readonly [`PlacedEntry`](PlacedEntry.md)[]

The entries of the run, in order.

***

### group

> `readonly` **group**: `string` \| `undefined`

The key of the group in the translation catalog of the plugin of the first entry. Undefined for entries without a group.
