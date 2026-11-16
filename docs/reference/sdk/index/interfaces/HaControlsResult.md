[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: HaControlsResult

What the loader found.

## Properties

### defined

> `readonly` **defined**: `Readonly`\<`Record`\<[`HaControl`](../type-aliases/HaControl.md), `boolean`\>\>

Whether each component is defined. A component that is not is replaced by its fallback.

***

### loaded

> `readonly` **loaded**: `boolean`

Whether the fields can be drawn with the components of Home Assistant: `ha-selector` is defined.

***

### spinner

> `readonly` **spinner**: `"ha-spinner"` \| `"ha-circular-progress"` \| `undefined`

The indicator of progress of this version of Home Assistant, if any.
