[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: validateDefinition()

> **validateDefinition**(`definition`): [`ValidationIssue`](../interfaces/ValidationIssue.md)[]

Check a plugin definition.

## Parameters

### definition

`unknown`

The value given to `registerUiPlugin`.

## Returns

[`ValidationIssue`](../interfaces/ValidationIssue.md)[]

The problems found, with the path of each faulty element. The list is empty when the definition is valid.
