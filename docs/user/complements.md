# Add-ons for Versatile Thermostat
Audience: users.

The tab **VT add-ons** lists the add-ons of Versatile Thermostat: integrations, cards and themes, blueprints and Home Assistant
add-ons. It is shown to administrators only. The dashboard installs the integrations and the cards with HACS, the community store of
Home Assistant. The other kinds come with a link.

## The catalog
The catalog is a file of the project, read by Home Assistant itself and kept for an hour. If it cannot be read, the last copy that
worked is shown with a warning that gives its date. If there is no copy, the page says so and offers **Try again**. **Refresh the
catalog** reads it again at once.

The menu of the tab has two entries:

- **Catalog**: every add-on.
- **Installed**: only the add-ons that are installed, whoever installed them.

Search by name or description, and filter by type, family, certification and state. Each add-on shows its description in your language,
or in English when the catalog has no text in your language. Descriptions only keep simple formatting: paragraphs, links, emphasis,
lists and code. A link opens in a new tab.

Each add-on is a card. Open an add-on to see its full description, its author, and the link to its repository. The address of the page is yours to keep: you
can bookmark it or reload it.

## The states
The state is read again from Home Assistant and from HACS each time you open the page. The dashboard keeps nothing of its own, so the
states are right after a restart.

| State | Meaning |
| --- | --- |
| Not installed | Neither Home Assistant nor HACS has it. |
| Installed | It is loaded, or HACS downloaded it, and nothing is left to do. An integration installed without HACS is also "installed". |
| Restart required | HACS downloaded the integration and Home Assistant must restart to load it. |
| To configure | The integration is available, declares a config flow and has no configuration yet. |
| Configured | The integration has at least one configuration entry. |
| Link only | The dashboard does not install this kind of add-on (a blueprint, a Home Assistant add-on, or a type it does not know). Follow the link. |

## Install
You need HACS, installed, configured and enabled. Without it, the catalog stays readable, the install button is off, and a message
explains why, with a link to the documentation of HACS. When HACS is disabled, the message gives the reason that HACS reports.

1. Open the add-on and click **Install**.
2. A window of Home Assistant shows the repository, the category in HACS, the certification and the author. An add-on that comes from the community adds
   a warning: it is third-party code that will run on your Home Assistant. **Cancel** changes nothing in HACS.
3. The page shows each step: looking for the repository in HACS, adding it if HACS does not have it, checking that HACS added it, and
   downloading.

Messages, such as an error, a warning about the catalog or the absence of HACS, are shown in a colored box with an icon. An error of HACS
is shown with its message, with **Try again** and a link that opens the repository in HACS. The dashboard only installs
add-ons of the catalog. It does not take any other repository.

### Restart
After an integration is downloaded, the page proposes to restart Home Assistant and does not do it. **Restart Home Assistant** asks
once more, in a window of Home Assistant, and **Cancel** closes it without restarting. **Later** leaves the add-on in "Restart required", and you can install other add-ons meanwhile. While Home Assistant
restarts, the page says that it is reconnecting, then reads the states again. If Home Assistant is not back after five minutes, the
page says so: check it and reload the page.

### Cards and themes
A card or a theme needs no restart. Reload the page of your browser to use it.

## Configure
An integration in the state "To configure" has the button **Configure**. It opens the screen of Home Assistant that adds the
integration, for its domain. There is no button for an integration without a config flow: it is simply "Installed".

## Update and remove
The dashboard does not update or remove add-ons. Open the add-on in HACS with the link on its page.

## When HACS changes
The dashboard talks to HACS with the commands that the screens of HACS use. They are not a public interface. When HACS is older than
the dashboard knows, or when a command does not exist any more, the page says so and links to the repository in HACS, where you can
install it by hand.
