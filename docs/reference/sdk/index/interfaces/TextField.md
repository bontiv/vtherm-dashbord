[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: TextField

A text. The value is a string.

## Extends

- [`FieldBase`](FieldBase.md)\<`"text"`\>

## Properties

### key

> `readonly` **key**: `string`

The key of the value in the configuration.

#### Inherited from

[`FieldBase`](FieldBase.md).[`key`](FieldBase.md#key)

***

### multiline?

> `readonly` `optional` **multiline?**: `boolean`

Whether the text has several lines.

***

### required?

> `readonly` `optional` **required?**: `boolean`

Whether a value is required.

#### Inherited from

[`FieldBase`](FieldBase.md).[`required`](FieldBase.md#required)

***

### type

> `readonly` **type**: `"text"`

The type of the field, which chooses the control of Home Assistant.

#### Inherited from

[`FieldBase`](FieldBase.md).[`type`](FieldBase.md#type-1)
