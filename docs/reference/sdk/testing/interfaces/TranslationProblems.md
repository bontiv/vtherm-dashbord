[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: TranslationProblems

The keys of the catalog of a language that do not match the English catalog.

## Properties

### language

> `readonly` **language**: `string`

The language that was checked.

***

### missing

> `readonly` **missing**: readonly `string`[]

The keys of the English catalog that the language does not have.

***

### unknown

> `readonly` **unknown**: readonly `string`[]

The keys of the language that are not in the English catalog.
