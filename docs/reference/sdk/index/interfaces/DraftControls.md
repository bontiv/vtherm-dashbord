[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: DraftControls

The state of the draft of the edited configuration and its commands, to draw the save actions at the foot of a card, as the
configuration pages of Home Assistant do. The draft is shared by every section of the configuration: saving writes all of it.

## Properties

### dirty

> `readonly` **dirty**: `boolean`

Whether the draft has changes that are not saved.

***

### messages

> `readonly` **messages**: readonly [`DraftMessage`](DraftMessage.md)[]

The messages to show above the actions: the unsaved changes, the general errors of a refused save, a partial save.

***

### saving

> `readonly` **saving**: `boolean`

Whether a save is in progress.

## Methods

### discard()

> **discard**(): `void`

Drop every change of the draft, in every section, without confirmation.

#### Returns

`void`

***

### save()

> **save**(): `Promise`\<[`SaveResult`](../type-aliases/SaveResult.md)\>

Save the whole draft. It never rejects: a failure of the connection gives `error`, with a message in `messages`.

#### Returns

`Promise`\<[`SaveResult`](../type-aliases/SaveResult.md)\>
