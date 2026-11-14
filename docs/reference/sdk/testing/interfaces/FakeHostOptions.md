[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: FakeHostOptions

What `createFakeHost` can be given.

## Properties

### dashboardVersion?

> `readonly` `optional` **dashboardVersion?**: `string`

The version of the dashboard that the plugins read. `1.0.0` by default.

***

### knownPlugins?

> `readonly` `optional` **knownPlugins?**: readonly `string`[]

The identifiers of the plugins registered in Python. When it is given, a plugin that is not in the list is refused,
as the dashboard does. Without it, every plugin is accepted.
