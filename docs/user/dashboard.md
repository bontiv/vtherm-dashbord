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

## The menu and the breadcrumb

Most tabs have a menu on the left. It lists the pages of the tab, and the page you are on is highlighted. Pages are grouped under
headings, such as "Versatile Thermostat" and "Dashboard" in the Configuration. The menu scrolls on its own when it is longer than the
screen, so the tabs and the page do not move.

In the Thermostats tab, the menu starts with a selector of thermostat, then the overview of the thermostat, then its pages.
When you choose another thermostat, the page you are on stays open if the new thermostat has it. Otherwise its overview opens.

Under the tabs, the breadcrumb shows where you are, for example `Thermostats > Salon > TPI`. Click a part of it to go back to that level.

## No thermostat, no plugin

If you have no thermostat, the Thermostats tab says so and tells you to create one from the Configuration. Without any plugin of
your own, the dashboard shows the pages that come with it, and nothing else.

## On a phone

On a narrow screen the menu is hidden. A **Menu** button opens it as a drawer, and the drawer closes when you choose a page.
The tabs scroll sideways, and the Configuration gear always stays visible. The breadcrumb only shows its last two parts.

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

Under the table, the warnings and errors list the contributions that a plugin made but that the dashboard could not place as
asked, for example a menu entry placed after a page that does not exist.

## Colors

The dashboard has no colors of its own. It uses the colors, the fonts and the dark or light mode of the Home Assistant theme
that you chose, including a theme that you installed, and follows when you change theme.
