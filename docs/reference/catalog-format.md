# Format of the catalog of add-ons
Audience: plugin authors and contributors.

The catalog is a JSON file, a list of objects, published by the project at
`https://raw.githubusercontent.com/bontiv/vtherm-website/latest/pluginsdb/plugins.json`. The address is a constant of the dashboard,
not an option. Read by the server, the entries are normalized and given to the page by
[`vtherm_dashboard/get_complements`](websocket-api.md).

## Fields
| Field | Required | Content |
| --- | --- | --- |
| `name` | yes | The name shown to the user. An entry without a name is ignored with a warning. |
| `type` | yes | `integration`, `interface`, `blueprint` or `addon`. An entry without a type is ignored with a warning. Any other value is kept and shown as a link only. |
| `slug` | no | The GitHub repository `owner/name`. It identifies the entry first. |
| `url` | no | An address. It identifies the entry when there is no `slug`, and it is the link of an entry that has no repository. A GitHub address also gives the repository. |
| `description`, `description_fr`, `description_de` | no | The description in HTML, in English, French and German. A language that is missing falls back on English. Another language uses the same pattern, `description_<language>`. |
| `certification` | no | `official`, `recommended` or `community`. `community` by default. |
| `family` | no | `interface`, `device-helper`, `feature` or `algorithm`. `other` by default. |
| `ha_domain` | no | The domain of the integration in Home Assistant. It gives its state: loaded, entries, config flow. |
| `author` | no | The author. |
| `hacs_category` | no | The category of HACS used to install the add-on. It wins over the default. |

An entry is identified by `slug`, else `url`, else `name`. An identifier that appeared before is ignored with a warning.

## The category of HACS
Without `hacs_category`, an `integration` is installed in the HACS category `integration`, and an `interface` in `plugin` (a card).
An `interface` entry can also be a theme, so it has to say `"hacs_category": "theme"`. The field is an extension of the format to propose
to the repository of the web site `bontiv/vtherm-website`.

The dashboard installs an entry only when it has a repository and a category. Anything else is a link only.

## Descriptions
A `name` that starts with `[EXPERIMENTAL]`, in any letter case, is shown without the prefix, with an **Experimental** badge, and the page of
the add-on warns that it can change or stop working. The search still matches the full name.

The descriptions are HTML and are never shown as they are. Only paragraphs, line breaks, links, emphasis (`em`, `strong`, `b`, `i`),
lists, `code` and `pre` are kept. Scripts, event attributes, styles and any other tag are removed. A link must be `http`, `https` or
`mailto`, and it opens in a new tab with `rel="noopener noreferrer"`. A line break inside a paragraph or a list item is kept as a line break.
