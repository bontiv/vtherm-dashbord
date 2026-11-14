[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: assertCompleteTranslations()

> **assertCompleteTranslations**(`translations`, `languages`): `Promise`\<`void`\>

Fail when a catalog that must be complete omits a key or has a key that does not exist.

## Parameters

### translations

[`AnyTranslations`](../../index/type-aliases/AnyTranslations.md)

The translations of the plugin.

### languages

readonly `string`[]

The languages that must be complete.

## Returns

`Promise`\<`void`\>

## Throws

An error that names each language and each faulty key.
