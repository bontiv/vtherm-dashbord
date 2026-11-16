[**@vtherm/dashboard-sdk**](../../index.md)

***

# Type Alias: HaSelector

> **HaSelector** = \{ `boolean`: [`HaEmptySelector`](HaEmptySelector.md); \} \| \{ `number`: [`HaNumberSelector`](../interfaces/HaNumberSelector.md); \} \| \{ `text`: [`HaTextSelector`](../interfaces/HaTextSelector.md); \} \| \{ `entity`: [`HaEntitySelector`](../interfaces/HaEntitySelector.md); \} \| \{ `select`: [`HaSelectSelector`](../interfaces/HaSelectSelector.md); \} \| \{ `duration`: [`HaEmptySelector`](HaEmptySelector.md); \} \| \{ `time`: [`HaEmptySelector`](HaEmptySelector.md); \} \| \{ `template`: [`HaEmptySelector`](HaEmptySelector.md); \}

The description of a selector of Home Assistant: an object with one key, the type of the selector, given to `ha-selector`.

## Union Members

### Type Literal

\{ `boolean`: [`HaEmptySelector`](HaEmptySelector.md); \}

#### boolean

> `readonly` **boolean**: [`HaEmptySelector`](HaEmptySelector.md)

A switch.

***

### Type Literal

\{ `number`: [`HaNumberSelector`](../interfaces/HaNumberSelector.md); \}

#### number

> `readonly` **number**: [`HaNumberSelector`](../interfaces/HaNumberSelector.md)

A number.

***

### Type Literal

\{ `text`: [`HaTextSelector`](../interfaces/HaTextSelector.md); \}

#### text

> `readonly` **text**: [`HaTextSelector`](../interfaces/HaTextSelector.md)

A text.

***

### Type Literal

\{ `entity`: [`HaEntitySelector`](../interfaces/HaEntitySelector.md); \}

#### entity

> `readonly` **entity**: [`HaEntitySelector`](../interfaces/HaEntitySelector.md)

One entity or several.

***

### Type Literal

\{ `select`: [`HaSelectSelector`](../interfaces/HaSelectSelector.md); \}

#### select

> `readonly` **select**: [`HaSelectSelector`](../interfaces/HaSelectSelector.md)

A choice.

***

### Type Literal

\{ `duration`: [`HaEmptySelector`](HaEmptySelector.md); \}

#### duration

> `readonly` **duration**: [`HaEmptySelector`](HaEmptySelector.md)

A duration.

***

### Type Literal

\{ `time`: [`HaEmptySelector`](HaEmptySelector.md); \}

#### time

> `readonly` **time**: [`HaEmptySelector`](HaEmptySelector.md)

A time of the day.

***

### Type Literal

\{ `template`: [`HaEmptySelector`](HaEmptySelector.md); \}

#### template

> `readonly` **template**: [`HaEmptySelector`](HaEmptySelector.md)

A template.
