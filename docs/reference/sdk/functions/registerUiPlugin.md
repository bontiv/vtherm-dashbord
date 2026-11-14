[**@vtherm/dashboard-sdk**](../index.md)

***

# Function: registerUiPlugin()

> **registerUiPlugin**(`definition`): `void`

Declare a plugin and its contributions to the dashboard.

Call it once, when the module of the plugin is loaded. The definition is checked first, with the same rules as the dashboard.

## Parameters

### definition

[`UiPluginDefinition`](../interfaces/UiPluginDefinition.md)

The identifier of the plugin and its contributions by hook.

## Returns

`void`

## Throws

[UiPluginValidationError](../classes/UiPluginValidationError.md) when the definition is not valid. The message names each faulty element.

## Throws

[DashboardNotFoundError](../classes/DashboardNotFoundError.md) when the dashboard is not loaded in the page.

## Throws

An error of the dashboard when the identifier of the plugin is not known, because it was not registered in Python.
