[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: DraftMessage

A message about the draft, translated, to show above the save actions.

## Properties

### text

> `readonly` **text**: `string`

The translated text.

***

### type

> `readonly` **type**: `"error"` \| `"info"` \| `"warning"`

The kind of message: `info` for the unsaved changes, `warning` for a partial save, `error` for a refused or failed save.
