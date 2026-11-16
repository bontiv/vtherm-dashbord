[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: selectorOf()

> **selectorOf**(`field`): [`HaSelector`](../type-aliases/HaSelector.md)

Return the selector of Home Assistant that shows a field.

It is a pure function: it reads the definition only, so it can be tested without a browser.

## Parameters

### field

[`FieldDefinition`](../type-aliases/FieldDefinition.md)

The definition of the field.

## Returns

[`HaSelector`](../type-aliases/HaSelector.md)

The value of the property `selector` of `ha-selector`.
