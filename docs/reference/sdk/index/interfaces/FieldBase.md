[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: FieldBase\<Type\>

What every field has.

## Extended by

- [`EntityField`](EntityField.md)
- [`EntityListField`](EntityListField.md)
- [`NumberField`](NumberField.md)
- [`SelectField`](SelectField.md)
- [`TextField`](TextField.md)

## Type Parameters

### Type

`Type` *extends* [`FieldType`](../type-aliases/FieldType.md)

## Properties

### key

> `readonly` **key**: `string`

The key of the value in the configuration.

***

### required?

> `readonly` `optional` **required?**: `boolean`

Whether a value is required.

***

### type

> `readonly` **type**: `Type`

The type of the field, which chooses the control of Home Assistant.
