# Using the dashboard

The Versatile Thermostat dashboard is where you look at and configure your Versatile Thermostat thermostats, in Home Assistant.
Audience: users.

## Open it

"Versatile Thermostat" appears in the side menu of Home Assistant, for administrators only. A user who is not an administrator does not
see it. It needs the Versatile Thermostat integration: Home Assistant does not load the dashboard without it.

Each page of the dashboard has its own address. You can bookmark a page, share its link, reload the browser on it, and use the
back button of the browser. An address that does not exist any more opens the default page of its tab, with a message that you
can close.

## The tabs

The bar at the top shows the tabs:

- **Dashboard**: an overview of your thermostats, with the widgets that the plugins add.
- **Thermostats**: the list of your thermostats, in full width. Open one to see its overview and its configuration.
- **VT add-ons** and the tabs that other plugins add.
- The **Configuration** gear, alone on the right: the general configuration of Versatile Thermostat and the pages of the
  dashboard itself. It has no text. Its name, Configuration, appears when you hover it, and a screen reader reads it.

The tab you are in is underlined.

## The list of the thermostats

The Thermostats tab shows each thermostat as a tile, live: the icon of its type, its name, the temperature of the room and the
setpoint (`19.5 °C → 21 °C`), what it does now (heating, cooling, idle or off, with a dot of the color of the action) and its preset.
When its climate entity is unavailable, the tile says so and still opens the thermostat. The last tile, **New thermostat**, opens the
creation of a thermostat. The tiles wrap to the width of the screen: one column on a phone.

The tiles are grouped by area, the rooms of Home Assistant. Each area has a heading with its icon and its name,
and the floor it is on when your home has floors. The areas are ordered by floor, then by name, and the thermostats of an area by name.

A thermostat is in the area of its device. If you gave its climate entity an area of its own in Home Assistant, that area wins, as
everywhere in Home Assistant. To change the area of a thermostat, change it in Home Assistant: the list follows at once, and so do the
names of the areas and of the floors when you rename them.

The thermostats without area come last, under **No area**. Give them an area in Home Assistant, on the page of their device.

Above the list, **By area** and **By name** let you choose the order. The dashboard remembers your choice in this browser. When none
of your thermostats has an area, the list is simply ordered by name, without headings and without this choice.

## The menu and the breadcrumb

Most tabs have a menu on the left. It lists the pages of the tab, and the page you are on is highlighted. Pages are grouped under
headings, such as "General settings", "Optional features" and "Dashboard" in the Configuration. The menu scrolls on its own when it is longer than the
screen, so the tabs and the page do not move. The Dashboard tab has no menu while it has a single page, its overview: the page takes
the full width.

In the Thermostats tab, the menu starts with a selector of thermostat, then the overview of the thermostat, then its pages under
two headings: **General settings**, the sections that every thermostat has, and **Optional features**, the ones that can be off. The
Configuration groups the sections of the central configuration the same way (see
[Configuring thermostats](configuration.md#the-sections-one-by-one)). The
selector orders the thermostats as the list does, and names each one with its area, for example `Living room · Sofa`.
When you choose another thermostat, the page you are on stays open if the new thermostat has it. Otherwise its overview opens.

Each section of the configuration of a thermostat, and of the central configuration, shows its status at the right of its title, in
the menu and in the drawer of a phone, as soon as you change a value, before you save:

| Status | Meaning |
| --- | --- |
| a check mark | Nothing required is missing, for a section of the optional features. A section of the general settings is always on: it shows nothing then. |
| `Central` | The section uses the central configuration. |
| `N missing` | N required values have no value. |
| `Off` | The section does nothing: its feature is off, the humidity sensor is not used, or the lock blocks neither the users nor the automations. The entry is in retreat. |
| `Central (off)` | The section uses the central configuration, and the central values make it do nothing, such as a central lock that blocks nothing. The entry is in retreat. |
| `Error` | The last save refused a value of the section. It goes away when you change the refused value, or when a save succeeds. |

When several apply, the first of `Error`, `Off`, `Central (off)`, `N missing`, `Central`, the check mark is shown. A screen reader says the status after
the title, for example "Window detection, off".

The sections of the features that are off (window, motion, power, presence, auto start and stop, central boiler, synchronization of the
temperature, heating failure detection) stay in the menu, so that you can find them. Open one: it explains the feature and has a switch
to turn it on. Turning it on shows its fields, with the switch above them to turn it off again; save to keep the change, with the
actions at the foot of the page. The synchronization of the temperature changes the same option as the section Underlyings. A feature that does not exist for the type of the thermostat, such as the auto
start and stop of a thermostat over a switch, is not in the menu. The sections Humidity and Lock have no such switch: their page shows
their options as usual, and checking one of them turns the section on.

Under the tabs, the breadcrumb shows where you are, for example `Thermostats > Salon > TPI`. Click a part of it to go back to that level.

## Fields, messages and windows

The dashboard uses the controls of Home Assistant, so they look and work as in the rest of Home Assistant:

- A field that takes an entity offers a search among your entities, limited to the right kind (for example temperature sensors). A
  list of entities, such as the underlyings of a thermostat, can be put in order by dragging.
- A delay or a temperature is a number with its unit.
- A message (an error, a warning, a field that is read only) is shown in a colored box with an icon.
- An entity shown as text, such as a value inherited from the central configuration, opens its card when you click it.
- When you leave a page with changes that are not saved, a window asks you to confirm. **Stay** keeps the page and your changes.

While Home Assistant loads its controls, the page shows a spinner for a moment. If they do not load, the page shows simpler fields that
do the same thing. See [the fields of the configuration](configuration.md#the-fields).

## No thermostat, no plugin

If you have no thermostat, the Thermostats tab says so and tells you to create one from the Configuration. Without any plugin of
your own, the dashboard shows the pages that come with it, and nothing else.

## On a phone

On a phone, in the Home Assistant app or in a browser, the dashboard is laid out for a narrow screen (under 700 px):

- The bar at the top starts with the button of the Home Assistant menu, to reach the other pages of Home Assistant. The title of the
  dashboard is not shown, so that the tabs have the whole width. The tabs scroll sideways, a shade shows on the side where tabs are
  hidden, and the open tab is always brought into view. The Configuration gear always stays visible.
- The menu of the pages is hidden. The **Menu of the pages** button, at the left of the breadcrumb, opens it as a drawer over the page,
  which is darkened.
  The drawer closes when you choose a page, when you touch the darkened page, or with the Escape key.
- The breadcrumb only shows its last two parts.
- Buttons, fields and lists are large enough to be touched, and long texts such as addresses wrap instead of widening the page.
- The bar that saves a configuration stays at the bottom of the screen; its buttons go under its message.

## The plugin status

The plugins add tabs, pages and widgets to the dashboard. Open **Configuration > Dashboard > Plugins** to see each plugin, where
it comes from, its state and, when it did not load, why. A plugin that does not load never stops the dashboard or the other plugins.

| State | What it means |
| --- | --- |
| Loaded | The plugin works. |
| Waiting | The plugin passed the checks and is being loaded. You only see it for a moment. |
| Missing dependency | The plugin needs another plugin that is not installed, did not load, or is not compatible. The page names the missing plugins. |
| Dashboard incompatible | The plugin was not made for this version of the dashboard. The page gives the version that it asks for and says whether the dashboard is older or more recent. Update the plugin, or the dashboard. |
| Dependency cycle | Several plugins wait for each other. The page lists them. This is a mistake of the plugin authors. |
| Invalid | The plugin declares something that is not valid, for example an address that is not allowed or a version constraint that cannot be read. |
| Failed | The plugin was downloaded but could not start. The page shows the error. |

The **Source** says whether a plugin is installed with an integration, comes with the dashboard (native), or is a plugin that a
developer tests from his own computer (development, with its address).

Each plugin has its own card. Under the plugins, the warnings and errors list the contributions that a plugin made but that the dashboard could not place as
asked, for example a menu entry placed after a page that does not exist.

## Colors

The dashboard has no colors of its own. It uses the colors, the fonts and the dark or light mode of the Home Assistant theme
that you chose, including a theme that you installed, and follows when you change theme.
