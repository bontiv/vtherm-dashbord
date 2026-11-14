[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: PluralMessage

A text with one form per plural category. `other` is required. The form is chosen with the parameter `count`.

## Example

```ts
`{ one: "{count} thermostat", other: "{count} thermostats" }`
```

## Properties

### few?

> `readonly` `optional` **few?**: `string`

The form for a few, in the languages that have one.

***

### many?

> `readonly` `optional` **many?**: `string`

The form for many, in the languages that have one.

***

### one?

> `readonly` `optional` **one?**: `string`

The form for one, for example `{count} thermostat`.

***

### other

> `readonly` **other**: `string`

The form used when no other form applies. It is the only required one.

***

### two?

> `readonly` `optional` **two?**: `string`

The form for two, in the languages that have one.

***

### zero?

> `readonly` `optional` **zero?**: `string`

The form for zero, in the languages that have one.
