[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: EntityField

An entity. The value is an entity identifier.

## Extends

- [`FieldBase`](FieldBase.md)\<`"entity"`\>
- `EntityFilter`

## Properties

### device\_class\_domains?

> `readonly` `optional` **device\_class\_domains?**: readonly `string`[]

The domains whose entities must have one of `device_classes`. `sensor` and `binary_sensor` by default.

#### Inherited from

`EntityFilter.device_class_domains`

***

### device\_classes?

> `readonly` `optional` **device\_classes?**: readonly `string`[]

The classes of the devices, for example `temperature`. They apply to the domains of `deviceClassDomains`; the other domains are
accepted without a class, since entities such as `input_number` have none.

#### Inherited from

`EntityFilter.device_classes`

***

### domains?

> `readonly` `optional` **domains?**: readonly `string`[]

The domains of the entities, for example `sensor` or `climate`. Every domain when it is absent.

#### Inherited from

`EntityFilter.domains`

***

### key

> `readonly` **key**: `string`

The key of the value in the configuration.

#### Inherited from

[`FieldBase`](FieldBase.md).[`key`](FieldBase.md#key)

***

### required?

> `readonly` `optional` **required?**: `boolean`

Whether a value is required.

#### Inherited from

[`FieldBase`](FieldBase.md).[`required`](FieldBase.md#required)

***

### type

> `readonly` **type**: `"entity"`

The type of the field, which chooses the control of Home Assistant.

#### Inherited from

[`FieldBase`](FieldBase.md).[`type`](FieldBase.md#type-1)
