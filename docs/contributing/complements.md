# The add-ons feature
Audience: contributors.

How the tab "VT add-ons" works, and what to do when the store of add-ons (the Marketplace of Home Assistant, or HACS) changes.

## The pieces
| Piece | Where | What it does |
| --- | --- | --- |
| The catalog | `custom_components/vtherm_dashboard/complements.py` | Reads the catalog, caches it, keeps the last valid copy, normalizes the entries and adds what Home Assistant knows. |
| The command | `vtherm_dashboard/get_complements`, in `websocket_api.py` | Gives the add-ons to the page. See [WebSocket API](../reference/websocket-api.md). |
| The README | `custom_components/vtherm_dashboard/complements.py` (`ReadmeReader`, `absolutize_links`) | Reads the README of a repository of the catalog and makes its links absolute. |
| The adapter of the store | `frontend/src/complements/store-client.ts` | The only code that calls the Marketplace or HACS. |
| The states | `frontend/src/complements/states.ts` | Deduces the state of an add-on. |
| The model | `frontend/src/complements/model.ts` | The state that the pages share: the catalog, the store, the installations and the restart. |
| The sanitizer | `frontend/src/complements/sanitize.ts` | DOMPurify with an allow-list. |
| The pages | `frontend/src/complements/complements-page.ts` | The catalog, the installed add-ons and the page of an add-on. |
| The plugin | `frontend/src/native/plugins/core_complements.ts` | Registers the tab and the two menu entries. |

The format of the catalog is in [Format of the catalog](../reference/catalog-format.md).

## The catalog on the server
The file is read with the HTTP session of Home Assistant, with a timeout of 15 seconds. The answer is kept in memory for an hour (`CACHE_SECONDS`).
Once it has expired, the server asks again with `If-None-Match`, and a 304 renews the copy. Each valid copy is saved in the storage
`vtherm_dashboard.complements`, with its entity tag. When the server of the catalog does not answer, the last copy is returned as `stale`.
Without a copy, the command fails with `catalog_unavailable`.

The catalog is read leniently: a missing field is accepted, and an entry without a name or a type is ignored with a warning in the log
and in `warnings`, which does not stop the other entries.

## The README of an add-on
The command `vtherm_dashboard/get_complement_readme` takes the `complement_id` of an add-on of the catalog and the language of the
user. It looks the add-on up in the current catalog: an unknown identifier, or an add-on without a GitHub repository, is `not_found`
and nothing is requested. This is what keeps the command from reading any other repository.

The files are tried in this order on `raw.githubusercontent.com`: `README-<lang>.md`, `README.<lang>.md`, `README_<lang>.md` (the base
language of the tag, skipped for English), then `README.md`. A 404 goes to the next file, any other error is `readme_unavailable`. When
`README.md` is missing, the API `repos/<owner>/<repo>/readme` gives the real path (letter case, `docs/` or `.github/`), which is
then read. The limit is 512 KiB, read in chunks. The cache is in memory, an hour for each repository and requested language, and a
failure is not cached.

`absolutize_links` rewrites the targets with the folder of the file that was read as the base: `[text](target)`, `![text](target)`,
`[name]: target` and the HTML attributes `src` and `href`. Images and `src` go to the raw files, other targets to the page on GitHub, an
image page on GitHub becomes the raw image, and absolute targets and anchors stay. The page shows the result with `ha-markdown` and
puts `target="_blank"` and `rel="noopener noreferrer"` on its absolute links; without `ha-markdown`, it shows the description of the
catalog.

## The store
The add-ons are installed by a store. Since Home Assistant 2026.11, HACS is built into Home Assistant as the **Marketplace**
(`homeassistant/components/marketplace`): the custom integration HACS is removed when Home Assistant migrates, and Home Assistant
answers `unknown_command` to the commands `hacs/*`. Older versions only have HACS. `detectStore()` asks `marketplace/info` first, and
`hacs/info` only when Home Assistant does not know it. Nothing is stored: the store is found again at each read of the page.

Neither store has a public API. The adapter calls the commands of their own interface. The Marketplace is HACS built into Home
Assistant: the answers that the dashboard reads have the same fields and the same values of `status`, so one client (`StoreClient`)
serves both, with the names of the commands of each store (`MARKETPLACE` and `HACS`):

| Marketplace | HACS | Used to |
| --- | --- | --- |
| `marketplace/info` | `hacs/info` | Know that the store is there, enabled (`disabled_reason`), its `version` and its `categories`. The Marketplace also gives `warning_accepted` (for the user of the connection) and `github_connected`. |
| `marketplace/repositories/list` with `categories` | `hacs/repositories/list` with `categories` | Know which repositories the store has, and their `status`. |
| `marketplace/repositories/add` with `repository` and `category` | `hacs/repositories/add` with `repository` and `category` | Add a repository. |
| `marketplace/repository/install` with `repository` (the identifier in the store) | `hacs/repository/download` with `repository` | Install its latest version. |

The pages of the stores are `/marketplace/repository/<id>` and `/hacs/repository/<id>` (`storeLink`). The Marketplace redirects the old
addresses `/hacs/...` to `/marketplace/...`. The sources of the Marketplace are in the package of Home Assistant
(`homeassistant/components/marketplace/websocket/`).

## HACS

The sources are in the folder of `VTHERM_HACS_DIR` (fetched by `.devcontainer/post-create.sh` when the variable is not set, `custom_components/hacs/websocket/`). The adapter is
tested against the answers of this real HACS (see [Tests](#tests)), and the page tests use a fake HACS
(`frontend/test/support/fake-store.ts`) that answers like these commands, as HACS or as the Marketplace.

Three behaviours of HACS shape the adapter:

- **`hacs/repositories/add` never fails.** It answers `{}` even when it refuses the repository: the error goes to an internal event. The
  adapter reads the list again and fails with `add_refused` when the repository is not there.
- **A download fails with an error and a message** (`code: "error"`). The adapter gives the message as it is.
- **`pending-restart` is a `status`.** HACS has no field for it. An integration that was not installed before and that has a config flow
  is not pending: HACS reloads the custom components, and it can be configured at once.

When Home Assistant does not know the command `hacs/info` either, there is no store. Any other command that is unknown means that the
interface of the store changed: the page shows a message and a link that opens the repository in the store.

## The Marketplace
The Marketplace keeps the behaviours of HACS that the adapter relies on (`status`, `pending-restart`), and adds guards:

- **The warning must be accepted.** `marketplace/repositories/add` and `marketplace/repository/install` answer `warning_not_accepted`
  until the user accepted the warning of the Marketplace. `marketplace/info` gives `warning_accepted`: the page then disables the
  installation and links to `/marketplace`. The dashboard never accepts the warning itself.
- **Adding a repository needs GitHub.** `marketplace/repositories/add` answers `github_not_connected` when no GitHub account is
  connected. `marketplace/info` gives `github_connected`: the page disables only the add-ons whose repository is not in the list of the
  Marketplace. Installing a repository that it already has does not need GitHub.
- **A refused repository is an error.** `marketplace/repositories/add` answers with an error and a message (`add_failed`, for example),
  which the page shows as it is. `repository_exists` means that the Marketplace has the repository but has not read it yet, so its list
  does not show it: the adapter reads the list again and goes on when the repository is there.
- **Every command answers `not_loaded`** when the configuration entry of the Marketplace is not loaded. The page says so and links to
  `/marketplace`, which explains a setup that failed.
- **A new integration needs no restart.** After installing an integration that has a config flow and that Home Assistant did not know,
  the Marketplace reloads the custom components and does not set `pending-restart`. The model reads the catalog again after an
  installation, and the server then finds the integration and its config flow: the state is "to configure".

### Errors of the adapter
| Code | Meaning |
| --- | --- |
| `store_error` | The store answered with an error. The message is the one of the store. |
| `interface_changed` | A command is unknown. |
| `unexpected_response` | The answer has not the expected shape, or the add-on cannot be installed by the dashboard. |
| `add_refused` | The store answered without error but the repository is not in its list. |
| `category_unsupported` | The store does not offer the category of the add-on. |
| `not_loaded` | The Marketplace is in Home Assistant but not loaded. |
| `warning_not_accepted` | The user has not accepted the warning of the Marketplace. |
| `github_not_connected` | Adding the repository to the Marketplace needs GitHub, which is not connected. |

The texts that name the store are under `store.marketplace.*` and `store.hacs.*` in `catalogs.ts`, and `store.none.*` when there is
no store: the name of the store is not put into a common sentence, because its article changes with the language.

### The versions
`MIN_HACS_VERSION` is the oldest version of HACS that was checked, the 2.x line. A HACS older than that gets the link to HACS. The
version of the Marketplace is the one of Home Assistant, and is not checked. To support
another version: set its reference in `external-refs.txt` and fetch it in the folder of `VTHERM_HACS_DIR`, run `pytest tests/test_hacs_contract.py`, which
fails when the answers changed, check the adapter, record the new answers with `--update-hacs-answers`, then update the fake HACS and
`MIN_HACS_VERSION`.

## The states
`deduceState` is a pure function of the add-on (with what Home Assistant says) and of its repository in the store. The order matters: a
restart that is pending wins, then the entries, then the config flow. After a restart, nothing is lost since nothing was stored.

## The restart
`homeassistant.restart` is called once the user confirmed in the page. The model then calls `get_config` every two seconds. It waits
for the first failure of the connection, then for the first answer, and reads the catalog and the store again. After five minutes without
an answer, the phase is `timeout`.

## The configuration of an add-on
**Configure** opens `/config/integrations/dashboard/add?domain=<ha_domain>`, the address that Home Assistant itself uses to start the
config flow of an integration. It is checked on the version of Home Assistant that the repository targets. If it changes, only
`configFlowPath` has to change.

## Tests
`tests/test_complements.py` reads the real file of the catalog (`tests/data/plugins.json`) and covers the caches, the offline copy and
the entries. `frontend/test/complements-core.test.ts` covers the adapter (both stores and the choice between them), the states and the model, `complements-sanitize.test.ts` the
sanitizer on a complete DOM (jsdom, since happy-dom does not run DOMPurify), and `complements-pages.test.ts` the pages.
`tests/test_complement_readme.py` covers the README: the links, the files tried, the cache and the command.

The adapter is also checked against the real HACS, in two steps that share `shared/hacs-answers.json`:

1. `tests/test_hacs_contract.py` runs the WebSocket handlers of HACS (folder of `VTHERM_HACS_DIR`) in Home Assistant, in the scenarios of the adapter: HACS
   absent, ready, disabled, a repository already in HACS, one that is added, one that HACS refuses without an error, a download that fails
   and a command that HACS no longer knows. Only GitHub is replaced: registering and downloading a repository do what HACS does when they
   succeed or fail. The test compares the answers with the file, and fails when HACS changes them.
2. `frontend/test/store-contract.test.ts` replays the file through `StoreClient` with the commands of HACS: each command must be the
   recorded one, in the recorded order, and the adapter must reach the expected state or error.

After a change of HACS, check the adapter, then record the answers with `pytest tests/test_hacs_contract.py --update-hacs-answers`. The
test is skipped when the folder of `VTHERM_HACS_DIR` is missing.

The adapter is checked against the real Marketplace the same way, with `shared/marketplace-answers.json`:

1. `tests/test_marketplace_contract.py` runs the WebSocket handlers of `homeassistant.components.marketplace`, from the Home Assistant
   of `requirements-dev.txt`, in the scenarios of the adapter: the Marketplace absent, not loaded, ready, disabled, a repository already
   in the Marketplace (with a restart, and a new integration loaded without one), one that is added, one that the Marketplace refuses
   with an error, one that it has but did not list yet (`repository_exists`), an installation that fails, GitHub not connected, the
   warning not accepted, and a command that it no longer knows. Only GitHub is replaced: registering and installing a repository do what
   the Marketplace does when they succeed or fail. The error messages are the English texts of the Marketplace. The version that it
   answers is fixed by the test (`MARKETPLACE_VERSION`), so the file does not change with each release of Home Assistant.
2. `frontend/test/store-contract.test.ts` replays it through `StoreClient` with the commands of the Marketplace, and checks that
   `detectStore` falls back on HACS when Home Assistant does not know `marketplace/info`.

After a new version of Home Assistant in `requirements-dev.txt`, run `pytest tests/test_marketplace_contract.py`: it fails when the
Marketplace changed its answers. Check the adapter, then record them with `--update-marketplace-answers`. The test is skipped with a
Home Assistant older than 2026.11, which has no Marketplace.

The common part of both contract tests, the recorder of the answers, is in `tests/store_contract.py`.
