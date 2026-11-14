[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: findTranslationProblems()

> **findTranslationProblems**(`translations`, `languages`): `Promise`\<[`TranslationProblems`](../interfaces/TranslationProblems.md)[]\>

Compare the catalogs of some languages with the English catalog of a plugin.

Use it for the languages that the plugin declares complete. A catalog loaded on demand is loaded for the check.

## Parameters

### translations

[`AnyTranslations`](../../index/type-aliases/AnyTranslations.md)

The translations of the plugin.

### languages

readonly `string`[]

The languages that must be complete, for example `["fr", "de"]`.

## Returns

`Promise`\<[`TranslationProblems`](../interfaces/TranslationProblems.md)[]\>

The problems of the languages that have some. The list is empty when every language is complete and has no unknown key.
