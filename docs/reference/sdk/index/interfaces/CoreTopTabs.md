[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: CoreTopTabs

The identifiers of the top tabs that the `core` plugin provides. The left menus of three of the hooks belong to them.

## Properties

### configuration

> `readonly` **configuration**: `"core.top.configuration"`

The Configuration tab, the gear on the right. Its menu holds the `general_config` contributions and `tab_page` ones.

***

### dashboard

> `readonly` **dashboard**: `"core.top.dashboard"`

The Dashboard tab. Its menu holds the `global_page` contributions.

***

### thermostats

> `readonly` **thermostats**: `"core.top.thermostats"`

The Thermostats tab. Its menu holds the `thermostat_config` contributions and accepts no `tab_page`.
