[**@vtherm/dashboard-sdk**](../index.md)

***

# Interface: UiPluginDefinition

The declaration of a UI plugin, given to `registerUiPlugin`.

## Properties

### contributions

> `readonly` **contributions**: [`Contributions`](../type-aliases/Contributions.md)

The contributions of the plugin, by hook.

***

### id

> `readonly` **id**: `string`

The identifier of the plugin. It is the one registered in Python.

***

### translations

> `readonly` **translations**: [`AnyTranslations`](../type-aliases/AnyTranslations.md)

The translations of the plugin, made with `defineTranslations`. The English catalog is required. The titles and the groups of the
contributions are keys of these catalogs.
