[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: ResolvedWidgetSize

The size of a widget once resolved: both values are given.

## Properties

### columns

> `readonly` **columns**: `NonNullable`\<`1` \| `2` \| `3` \| `"full"` \| `undefined`\>

How many columns the widget takes, or `full` for the whole row.

***

### rows

> `readonly` **rows**: `NonNullable`\<`1` \| `2` \| `3` \| `undefined`\>

The minimal height in units of 140 px. 1 when the widget declares none: the grid then gives it no minimal height, so that its height
follows its content as before.
