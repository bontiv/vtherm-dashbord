[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: DisplayProps

What every component of a contribution is told about the display. Visibility conditions do not receive it.

## Properties

### narrow

> **narrow**: `boolean`

Whether the dashboard is shown on a narrow screen, such as a phone: its menu is then a drawer and its pages take the whole width.
It changes without a reload when the width of the window crosses the threshold, so a component that uses it must draw again.
