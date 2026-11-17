[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: defineFieldHelpMock()

> **defineFieldHelpMock**(): `void`

Define a simulated help of a field (`FIELD_HELP_ELEMENT`) in the page of a test, so that a plugin can check the help of its fields
without the dashboard: read the element as a `MockFieldHelpElement`. It shows its hint as text, and nothing else. An element that is
already defined, such as the one of the dashboard, is left as it is. The test needs a DOM (`happy-dom` or `jsdom`).

## Returns

`void`
