[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: defineHaControlMocks()

> **defineHaControlMocks**(): `void`

Define simulated components of Home Assistant in the page of a test, so that a component that draws `ha-selector`, `ha-switch`,
`ha-button`... can be tested without Home Assistant. A component that is already defined is left as it is. The test needs a DOM
(`happy-dom` or `jsdom`).

Read a simulated component as a `MockHaElement` to check what it received, and call `change(value)` to act as the user.

## Returns

`void`
