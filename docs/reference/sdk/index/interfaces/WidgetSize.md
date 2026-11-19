[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: WidgetSize

The size of a widget in the grid of its page. Without it, a widget takes one column and the height of its content.

- `columns`: how many columns of the grid it takes (a column is at least 280 px wide), or `full` for the whole row. A width larger
  than the grid is reduced to the grid, and a narrow screen has one column.
- `rows`: a minimal height of `rows` units of 140 px, plus the gaps between them. The card grows when its content is higher.

## Properties

### columns?

> `readonly` `optional` **columns?**: `1` \| `2` \| `3` \| `"full"`

How many columns the widget takes, or `full` for the whole row. 1 by default.

***

### rows?

> `readonly` `optional` **rows?**: `1` \| `2` \| `3`

The minimal height of the widget, in units of 140 px. Without it, the height follows the content.
