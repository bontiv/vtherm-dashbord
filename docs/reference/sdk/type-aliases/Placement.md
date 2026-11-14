[**@vtherm/dashboard-sdk**](../index.md)

***

# Type Alias: Placement

> **Placement** = `{ [Form in keyof PlacementForms]: { readonly [Key in Form]: PlacementForms[Form] } & { readonly [Other in Exclude<keyof PlacementForms, Form>]?: never } }`\[keyof [`PlacementForms`](../interfaces/PlacementForms.md)\]

Where a contribution goes in its hook. Exactly one form is allowed, and no numeric order exists.

- `{ first: true }` and `{ last: true }`: at the start or at the end. `last` is the default.
- `{ before: id }` and `{ after: id }`: next to the contribution `id`.
- `{ replace: id }`: in the place of the contribution `id`, which is no longer shown.
- `{ remove: id }`: removes the contribution `id`. It shows nothing itself.
