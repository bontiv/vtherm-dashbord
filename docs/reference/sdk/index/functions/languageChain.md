[**@vtherm/dashboard-sdk**](../../index.md)

***

# Function: languageChain()

> **languageChain**(`language`): `string`[]

List the languages to try for a user language: the full tag, then the base language, then English.

## Parameters

### language

`string`

The language of the user, for example `pt-BR`.

## Returns

`string`[]

The normalized tags, for example `["pt-br", "pt", "en"]`.
