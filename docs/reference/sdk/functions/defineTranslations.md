[**@vtherm/dashboard-sdk**](../index.md)

***

# Function: defineTranslations()

> **defineTranslations**\<`English`\>(`english`, `others?`): [`Translations`](../interfaces/Translations.md)\<`Extract`\<keyof `English`, `string`\>\>

Declare the translations of a plugin.

## Type Parameters

### English

`English` *extends* [`Catalog`](../type-aliases/Catalog.md)

## Parameters

### english

`English`

The English catalog. Its keys type the translation function. Declare it `as const`.

### others?

[`OtherCatalogs`](../type-aliases/OtherCatalogs.md)\<`English`\> = `{}`

The catalogs of the other languages, by language tag: a catalog, or a loader that loads it when it is needed.

## Returns

[`Translations`](../interfaces/Translations.md)\<`Extract`\<keyof `English`, `string`\>\>

The translations, to give to `registerUiPlugin`, with the function `t` to use in the components.

## Example

```ts
const en = { "tab.title": "Smart TPI", "thermostats": { one: "{count} thermostat", other: "{count} thermostats" } } as const;
const fr = { "tab.title": "TPI intelligent" } satisfies PartialCatalog<typeof en>;
export const translations = defineTranslations(en, { fr });
export const { t } = translations;
```
