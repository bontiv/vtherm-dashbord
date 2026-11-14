[**@vtherm/dashboard-sdk**](../index.md)

***

# Type Alias: CatalogLoader\<English\>

> **CatalogLoader**\<`English`\> = () => `Promise`\<[`PartialCatalog`](PartialCatalog.md)\<`English`\> \| [`CatalogModule`](../interfaces/CatalogModule.md)\<`English`\>\>

A function that loads the catalog of one language when it is needed, for example `() => import("./de.ts")`.

## Type Parameters

### English

`English` *extends* [`Catalog`](Catalog.md)

## Returns

`Promise`\<[`PartialCatalog`](PartialCatalog.md)\<`English`\> \| [`CatalogModule`](../interfaces/CatalogModule.md)\<`English`\>\>
