[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: TranslationWarning

Something that went wrong while translating. It does not stop the display.

## Properties

### code

> `readonly` **code**: `"missing_key"` \| `"missing_param"` \| `"load_failed"` \| `"fallback"`

What happened: the key exists in no catalog, a parameter is missing, a catalog could not be loaded, or the key is missing
from the loaded catalog of the language of the user and English was shown instead.

***

### detail?

> `readonly` `optional` **detail?**: `string`

More information: the name of the missing parameter, or the error of the loader.

***

### key

> `readonly` **key**: `string`

The key concerned. Empty for a catalog that failed to load.

***

### language

> `readonly` **language**: `string`

The language that was asked, or the language that failed to load.
