[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: ensureHaControls()

> **ensureHaControls**(`options?`): `Promise`\<[`HaControlsResult`](../interfaces/HaControlsResult.md)\>

Make the components of Home Assistant available, and tell which ones are.

It never raises: a component that stays missing is reported in the result, and its fallback is drawn. When every component is
already defined, nothing is loaded. Every call shares one load.

## Parameters

### options?

[`HaControlsOptions`](../interfaces/HaControlsOptions.md) = `{}`

The time limit, and the registry for the tests.

## Returns

`Promise`\<[`HaControlsResult`](../interfaces/HaControlsResult.md)\>
