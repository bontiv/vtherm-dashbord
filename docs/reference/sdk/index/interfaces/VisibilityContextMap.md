[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: VisibilityContextMap

What a visibility condition can read, by hook. A condition is a pure function and must not change anything.

## Properties

### general\_config

> **general\_config**: [`GeneralConfigVisibilityContext`](GeneralConfigVisibilityContext.md)

The context of the sections of the general configuration.

***

### global\_page

> **global\_page**: [`BaseProps`](BaseProps.md)

The context of the pages of the Dashboard tab.

***

### global\_widget

> **global\_widget**: [`BaseProps`](BaseProps.md)

The context of the widgets of the Overview page.

***

### tab\_page

> **tab\_page**: [`BaseProps`](BaseProps.md)

The context of the pages of the left menu of a top tab.

***

### thermostat\_config

> **thermostat\_config**: [`ThermostatVisibilityContext`](ThermostatVisibilityContext.md)

The context of the entries of the menu of a thermostat.

***

### thermostat\_widget

> **thermostat\_widget**: [`ThermostatVisibilityContext`](ThermostatVisibilityContext.md)

The context of the widgets of the overview of a thermostat.

***

### top\_tab

> **top\_tab**: [`BaseProps`](BaseProps.md)

The context of the tabs of the top bar.
