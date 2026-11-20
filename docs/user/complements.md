# Add-ons for Versatile Thermostat
Audience: users.

The tab **VT add-ons** lists the add-ons of Versatile Thermostat: integrations, cards and themes, blueprints and Home Assistant
add-ons. It is shown to administrators only. The dashboard installs the integrations and the cards with the store of add-ons of Home
Assistant: the **Marketplace** on Home Assistant 2026.11 and later, or HACS, the community store, on older versions. The other kinds come
with a link. The pages name the store that your Home Assistant has.

## The catalog
The catalog is a file of the project, read by Home Assistant itself and kept for an hour. If it cannot be read, the last copy that
worked is shown with a warning that gives its date. If there is no copy, the page says so and offers **Try again**. **Refresh the
catalog** reads it again at once.

The menu of the tab has two entries:

- **Installed**: only the add-ons that are installed, whoever installed them. It is the first entry, the one the tab opens on.
- **Catalog**: every add-on.

Search by name or description, and filter by type, family, certification and state. Each filter only offers the values that the add-ons
of the page have: **Installed** never offers "Not installed" or "Manual install", and a family that no add-on has is not offered. The
filters are at "All" until you choose one, and a filter at "All" has no clear button. The state filter has one more choice, **To handle**,
which keeps the add-ons that wait for you: to configure, to restart, or with an update available.

On a phone, the search stays on top and the filters are folded behind the button **Filters**. It shows the number of filters in force,
for example **Filters (1)**, and opens the filters and the sort.

The list says how many add-ons it shows ("13 add-ons"). **Clear filters** empties the search and puts every filter back to "All". It is
offered as soon as a search or a filter is in force, and in the message of an empty list. The sort is by certification by default, with
a heading for each level (Official, Recommended, Community). You can also sort by name, or by state, which puts the add-ons to handle
first.

The search, the filters and the sort are kept in the address of the page, so that a reload or a shared link opens the same list. When
you open an add-on and come back with the breadcrumb, the list is as you left it. When at least one add-on is to handle, **Catalog** and
**Installed** start with a summary ("2 add-ons need action") and a link to **Installed** filtered on **To handle**.

Each add-on shows its description in your language, or in English when the catalog has no text in your language. That English text is
marked **(EN)**. Descriptions only keep simple formatting: paragraphs, links, emphasis, lists and code. A line break inside a paragraph
or a list item is kept. A link opens in a new tab.

Each add-on is a card, and the whole card opens the page of the add-on. The card shows its status (an icon and a text, apart from the
type, the family and the certification), its description and its author. A name that starts with `[EXPERIMENTAL]` is shown without the
prefix and with an **Experimental** badge. When an add-on waits for you, its card has the action to do: **Configure**, **Restart
Home Assistant** (with the same confirmation as on the page of the add-on) or **Open in the Marketplace** (**Open in HACS** with HACS)
for an update. The cards never install:
the installation is on the page of the add-on, after a confirmation.

## The page of an add-on
Every add-on has its own address, which you can bookmark or reload. The page opens with the name, the **Experimental** badge if there is one, and the description of the catalog. Then come two cards:

- The action card holds the status, the versions, the action to do, the warnings, and the author, type, family, certification and
  source. The source link shows `owner/name` for a GitHub repository, else the host of the site. On a wide screen the card is next to
  the documentation and stays in view while you scroll it. On a phone it comes before the documentation.
- The **Documentation** card shows the README of the repository, in your language when the repository has a version of it, else the main
  README marked **(EN)**. **View on GitHub** opens the file. The links of the README open in a new tab, and its relative links and
  images point to the repository. The images come from sites such as GitHub or badge services: your browser loads them from there,
  as it does in the Marketplace. Without a README, without a GitHub repository, or when it cannot be read, the card shows the description of the
  catalog and the link to the source.

An add-on that is experimental has a warning in the action card: it can change or stop working. The title of the tab of the browser starts with the
name of the add-on, and goes back to what it was when you leave the page.

The page is shown as soon as the catalog is read. The store can be slow, with thousands of repositories: until it answers, the status
says **Reading the add-on store…** and no action that depends on the store is offered. Then the states and the actions appear, without
reloading the page.

## The states
The state is read again from Home Assistant and from the store each time you open the page. The dashboard keeps nothing of its own, so the
states are right after a restart.

| State | Meaning |
| --- | --- |
| Not installed | Neither Home Assistant nor the store has it. |
| Installed | It is loaded, or the store installed it, and nothing is left to do. An integration installed without the store is also "installed". |
| Restart required | The store installed the integration and Home Assistant must restart to load it. |
| To configure | The integration is available, declares a config flow and has no configuration yet. The Marketplace loads a new integration with a config flow at once: it goes straight to this state, without restart. |
| Configured | The integration has at least one configuration entry. |
| Manual install | The dashboard does not install this kind of add-on (a blueprint, a Home Assistant add-on, or a type it does not know). The action card says what to do. |

**Update available** is not a state, it comes on top of the state. The store says that an update is waiting, or gives an available
version that is not the installed one. A configured add-on stays "Configured" and also shows "Update available", with the versions
("1.2.0 → 1.3.0") on its card and on its page. The update is done in the store: the dashboard only opens the add-on there. Without an
installed version, or with the same version twice, nothing is shown.

An add-on is **to handle** when it is "To configure", "Restart required", or has an update.

## Install
You need a store of add-ons:

- On Home Assistant 2026.11 and later, the **Marketplace** (Settings > Marketplace). It replaces HACS, which cannot be installed there any
  more. Before the first installation, the Marketplace asks you to accept its warning: until you do, the install buttons are off and a
  message links to the Marketplace, where you accept it. The dashboard never accepts it for you. An add-on that is not in the Marketplace
  yet must be added to it, which needs GitHub connected in the Marketplace: until it is, the install button of that add-on is off and
  its page says so. The add-ons that the Marketplace already has stay installable.
- On older versions, **HACS**, installed, configured and enabled.

Without a store, the catalog stays readable, the install button is off, and a message says that the Marketplace is needed, with a link
to its documentation. When the Marketplace is there but not loaded, the message says so and links to it. When the Marketplace or HACS
is disabled, the message gives the reason that it reports.

1. Open the add-on and click **Install**.
2. A window of Home Assistant shows the repository, the category in the store, the certification and the author. An add-on that comes
   from the community adds a warning: it is third-party code that will run on your Home Assistant. **Cancel** changes nothing in the
   store.
3. The page shows each step: looking for the repository in the store, adding it if the store does not have it, checking that the store
   added it, and installing.

Messages, such as an error, a warning about the catalog or the absence of a store, are shown in a colored box with an icon. An error of
the store is shown with its message, with **Try again** and a link that opens the repository in the store. The dashboard only installs
add-ons of the catalog. It does not take any other repository.

### Restart
After an integration is installed, when the store says that Home Assistant must restart, the page proposes to restart it and does not
do it. A new integration with a config flow that the Marketplace loaded at once needs no restart: it is "To configure" right away. **Restart Home Assistant** asks
once more, in a window of Home Assistant, and **Cancel** closes it without restarting. **Later** leaves the add-on in "Restart required", and you can install other add-ons meanwhile. While Home Assistant
restarts, the page says that it is reconnecting, then reads the states again. If Home Assistant is not back after five minutes, the
page says so: check it and reload the page.

### Add-ons that you install yourself
The dashboard does not install a blueprint, a Home Assistant add-on or an add-on of an unknown type. Its action card says what to do:

- **Blueprint** with an address: **Import into Home Assistant** opens the import window of Home Assistant with that address, and asks
  you to confirm.
- **Add-on** of Home Assistant: **Add the repository to Home Assistant** opens the window that adds a repository of add-ons, when your
  Home Assistant has the Supervisor. Without it (Home Assistant Container or Core), the card says that add-ons need Home Assistant OS or
  Supervised, with the link to the repository.
- Both buttons use the My Home Assistant links, which need the integration `my`. A usual Home Assistant has it. Without it, the card
  shows the address in a field with **Copy** (the page says **Copied**), and a link to the blueprints of Home Assistant or to its
  add-on store.
- Another type: the card says that the dashboard does not install it, and **Open the source** opens its page.

### The window of confirmation
The window that asks to confirm an installation shows the repository as a link that opens in a new tab, and the category of the store
in your language (for example "Intégration", not `integration`).

### Cards and themes
A card or a theme needs no restart. Reload the page of your browser to use it.

## Configure
An integration in the state "To configure" has the button **Configure**. It opens the screen of Home Assistant that adds the
integration, for its domain. There is no button for an integration without a config flow: it is simply "Installed".

## Update and remove
The dashboard does not update or remove add-ons. The page of an installed add-on shows the installed version, and the available
version when the store knows a newer one. Open the add-on in the store with the link on its page, or with **Open in the Marketplace**
(**Open in HACS**) on its card.

## When the store changes
The dashboard talks to the store with the commands that the screens of the Marketplace or of HACS use. They are not a public interface.
When HACS is older than the dashboard knows, or when a command does not exist any more, the page says so and links to the repository in
the store, where you can install it by hand.
