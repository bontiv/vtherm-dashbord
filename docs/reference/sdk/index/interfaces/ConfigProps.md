[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: ConfigProps

What a configuration component receives, and how it proposes changes. It never writes the configuration itself: the dashboard saves the draft.

## Extended by

- [`GeneralConfigProps`](GeneralConfigProps.md)
- [`ThermostatConfigProps`](ThermostatConfigProps.md)

## Properties

### draft?

> `optional` **draft?**: [`DraftControls`](DraftControls.md)

The state of the draft and its commands. A new object is given at each change of the draft. It is undefined when the configuration
cannot be saved, for example when it is read-only: no save action is drawn then.

***

### errors

> **errors**: [`ConfigErrors`](../type-aliases/ConfigErrors.md)

The validation errors of the fields, after a refused save.

***

### values

> **values**: [`ConfigValues`](../type-aliases/ConfigValues.md)

The current values of the edited configuration, draft included.

## Methods

### proposeChanges()

> **proposeChanges**(`changes`): `void`

Propose changes to the draft. The real configuration is not changed until the user saves.

#### Parameters

##### changes

[`ConfigValues`](../type-aliases/ConfigValues.md)

#### Returns

`void`
