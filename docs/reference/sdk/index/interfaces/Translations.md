[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: Translations\<Key\>

The translations of a plugin, created by `defineTranslations`.

## Type Parameters

### Key

`Key` *extends* `string` = `string`

## Properties

### catalogs

> `readonly` **catalogs**: [`OtherCatalogs`](../type-aliases/OtherCatalogs.md)\<[`Catalog`](../type-aliases/Catalog.md)\>

The catalogs of the other languages, as declared.

***

### english

> `readonly` **english**: [`Catalog`](../type-aliases/Catalog.md)

The English catalog, the source of the keys.

***

### language

> `readonly` **language**: `string`

The language that is currently used, as set by the dashboard. `en` until then.

***

### t

> `readonly` **t**: (`key`, `params?`) => `string`

Translate a key into the current language of the user.

#### Parameters

##### key

`Key`

A key of the English catalog. Any other key does not compile.

##### params?

`Readonly`\<`Record`\<`string`, `string` \| `number`\>\>

The values of the parameters of the text, and `count` for a plural text.

#### Returns

`string`

***

### warnings

> `readonly` **warnings**: readonly [`TranslationWarning`](TranslationWarning.md)[]

The warnings that were recorded, without repetition.

## Methods

### resolve()

> **resolve**(`language`, `key`, `params?`): `string`

Translate a key into a given language, without changing the current language. The catalogs must be loaded.

#### Parameters

##### language

`string`

A language tag such as `fr` or `pt-BR`.

##### key

`string`

The key to translate.

##### params?

`Readonly`\<`Record`\<`string`, `string` \| `number`\>\>

The values of the parameters of the text.

#### Returns

`string`

***

### setLanguage()

> **setLanguage**(`language`): `Promise`\<`void`\>

Set the language and load the catalogs that it needs. The dashboard calls it, and shows the plugin again when it is done.

#### Parameters

##### language

`string`

#### Returns

`Promise`\<`void`\>
