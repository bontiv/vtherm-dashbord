[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: NumberField

A number, typed in a box. The value is a number, in the unit of the field.

## Extends

- [`FieldBase`](FieldBase.md)\<`"number"` \| `"integer"`\>

## Properties

### key

> `readonly` **key**: `string`

The key of the value in the configuration.

#### Inherited from

[`FieldBase`](FieldBase.md).[`key`](FieldBase.md#key)

***

### max?

> `readonly` `optional` **max?**: `number`

The largest value. No limit when it is absent.

***

### min?

> `readonly` `optional` **min?**: `number`

The smallest value. No limit when it is absent.

***

### required?

> `readonly` `optional` **required?**: `boolean`

Whether a value is required.

#### Inherited from

[`FieldBase`](FieldBase.md).[`required`](FieldBase.md#required)

***

### step?

> `readonly` `optional` **step?**: `number` \| `"any"`

The step. `any` by default for a `number`, `1` for an `integer`.

***

### type

> `readonly` **type**: `"number"` \| `"integer"`

The type of the field, which chooses the control of Home Assistant.

#### Inherited from

[`FieldBase`](FieldBase.md).[`type`](FieldBase.md#type-1)

***

### unit?

> `readonly` `optional` **unit?**: `string`

The unit shown after the box, for example `min`, `s` or `°C`. The value is stored in this unit.
