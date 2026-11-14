[**@vtherm/dashboard-sdk**](../index.md)

***

# Function: assertValidDefinition()

> **assertValidDefinition**(`definition`): `asserts definition is UiPluginDefinition`

Check a plugin definition and refuse it when it is not valid.

## Parameters

### definition

`unknown`

The value given to `registerUiPlugin`.

## Returns

`asserts definition is UiPluginDefinition`

## Throws

[UiPluginValidationError](../classes/UiPluginValidationError.md) when the definition has at least one problem.
