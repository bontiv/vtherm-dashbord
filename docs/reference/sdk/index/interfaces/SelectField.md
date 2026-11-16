[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: SelectField

A choice among fixed values. The value is the `value` of an option.

## Extends

- [`FieldBase`](FieldBase.md)\<`"select"`\>

## Properties

### key

> `readonly` **key**: `string`

The key of the value in the configuration.

#### Inherited from

[`FieldBase`](FieldBase.md).[`key`](FieldBase.md#key)

***

### mode?

> `readonly` `optional` **mode?**: `"dropdown"` \| `"list"`

`dropdown` by default; `list` shows every option, as radio buttons.

***

### options

> `readonly` **options**: readonly [`SelectOption`](SelectOption.md)[]

The values that the field accepts, with their labels.

***

### required?

> `readonly` `optional` **required?**: `boolean`

Whether a value is required.

#### Inherited from

[`FieldBase`](FieldBase.md).[`required`](FieldBase.md#required)

***

### type

> `readonly` **type**: `"select"`

The type of the field, which chooses the control of Home Assistant.

#### Inherited from

[`FieldBase`](FieldBase.md).[`type`](FieldBase.md#type-1)
