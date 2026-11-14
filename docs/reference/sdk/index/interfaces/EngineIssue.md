[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: EngineIssue

Something that the engine found about a plugin. It never stops the other plugins.

## Properties

### code

> `readonly` **code**: `string`

A stable code: `invalid_definition`, `invalid_contribution`, `duplicate_id`, `unknown_tab`, `thermostats_tab`, `tab_removed`, `target_missing`, `undeclared_dependency`, `visibility_error`.

***

### contributionId?

> `readonly` `optional` **contributionId?**: `string`

The identifier of the contribution concerned, when there is one.

***

### level

> `readonly` **level**: `"error"` \| `"warning"`

`error`: a contribution was refused. `warning`: it was placed, with a doubt.

***

### message

> `readonly` **message**: `string`

What happened, in English, for the logs and the plugin status page.

***

### pluginId

> `readonly` **pluginId**: `string`

The plugin that has the problem.
