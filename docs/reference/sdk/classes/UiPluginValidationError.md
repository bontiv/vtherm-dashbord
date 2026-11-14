[**@vtherm/dashboard-sdk**](../index.md)

***

# Class: UiPluginValidationError

The error of a definition that is not valid. Its message lists every issue with its path.

## Extends

- `Error`

## Constructors

### Constructor

> **new UiPluginValidationError**(`issues`): `UiPluginValidationError`

#### Parameters

##### issues

readonly [`ValidationIssue`](../interfaces/ValidationIssue.md)[]

The problems of the definition.

#### Returns

`UiPluginValidationError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### issues

> `readonly` **issues**: readonly [`ValidationIssue`](../interfaces/ValidationIssue.md)[]

The problems of the definition.

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`
