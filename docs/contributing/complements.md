# The add-ons feature
Audience: contributors.

How the tab "VT add-ons" works, and what to do when HACS changes.

## The pieces
| Piece | Where | What it does |
| --- | --- | --- |
| The catalog | `custom_components/vtherm_dashboard/complements.py` | Reads the catalog, caches it, keeps the last valid copy, normalizes the entries and adds what Home Assistant knows. |
| The command | `vtherm_dashboard/get_complements`, in `websocket_api.py` | Gives the add-ons to the page. See [WebSocket API](../reference/websocket-api.md). |
| The adapter of HACS | `frontend/src/complements/hacs-client.ts` | The only code that calls HACS. |
| The states | `frontend/src/complements/states.ts` | Deduces the state of an add-on. |
| The model | `frontend/src/complements/model.ts` | The state that the pages share: the catalog, HACS, the installations and the restart. |
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

## HACS
HACS has no public API. The adapter calls the commands of its own interface:

| Command | Used to |
| --- | --- |
| `hacs/info` | Know that HACS is there, enabled (`disabled_reason`), its `version` and its `categories`. |
| `hacs/repositories/list` with `categories` | Know which repositories HACS has, and their `status`. |
| `hacs/repositories/add` with `repository` and `category` | Add a repository. |
| `hacs/repository/download` with `repository` (the identifier of HACS) | Download it. |

The sources are in `external/hacs` (cloned by `.devcontainer/post-create.sh`, `custom_components/hacs/websocket/`). The adapter is
tested against the answers of this real HACS (see [Tests](#tests)), and the page tests use a fake HACS
(`frontend/test/support/fake-hacs.ts`) that answers like these commands.

Three behaviours of HACS shape the adapter:

- **`hacs/repositories/add` never fails.** It answers `{}` even when it refuses the repository: the error goes to an internal event. The
  adapter reads the list again and fails with `add_refused` when the repository is not there.
- **A download fails with an error and a message** (`code: "error"`). The adapter gives the message as it is.
- **`pending-restart` is a `status`.** HACS has no field for it. An integration that was not installed before and that has a config flow
  is not pending: HACS reloads the custom components, and it can be configured at once.

When Home Assistant does not know the command `hacs/info`, HACS is absent. Any other command that is unknown means that the
interface of HACS changed: the page shows a message and a link that opens the repository in HACS.

### Errors of the adapter
| Code | Meaning |
| --- | --- |
| `hacs_error` | HACS answered with an error. The message is the one of HACS. |
| `interface_changed` | A command is unknown. |
| `unexpected_response` | The answer has not the expected shape, or the add-on cannot be installed by the dashboard. |
| `add_refused` | HACS answered without error but the repository is not in its list. |
| `category_unsupported` | HACS does not offer the category of the add-on. |

### The versions
`MIN_HACS_VERSION` is the oldest version that was checked, the 2.x line. A HACS older than that gets the link to HACS. To support
another version: set its reference in `external-refs.txt` and fetch it in `external/hacs`, run `pytest tests/test_hacs_contract.py`, which
fails when the answers changed, check the adapter, record the new answers with `--update-hacs-answers`, then update the fake HACS and
`MIN_HACS_VERSION`.

## The states
`deduceState` is a pure function of the add-on (with what Home Assistant says) and of its repository in HACS. The order matters: a
restart that is pending wins, then the entries, then the config flow. After a restart, nothing is lost since nothing was stored.

## The restart
`homeassistant.restart` is called once the user confirmed in the page. The model then calls `get_config` every two seconds. It waits
for the first failure of the connection, then for the first answer, and reads the catalog and HACS again. After five minutes without
an answer, the phase is `timeout`.

## The configuration of an add-on
**Configure** opens `/config/integrations/dashboard/add?domain=<ha_domain>`, the address that Home Assistant itself uses to start the
config flow of an integration. It is checked on the version of Home Assistant that the repository targets. If it changes, only
`configFlowPath` has to change.

## Tests
`tests/test_complements.py` reads the real file of the catalog (`tests/data/plugins.json`) and covers the caches, the offline copy and
the entries. `frontend/test/complements-core.test.ts` covers the adapter, the states and the model, `complements-sanitize.test.ts` the
sanitizer on a complete DOM (jsdom, since happy-dom does not run DOMPurify), and `complements-pages.test.ts` the pages.

The adapter is also checked against the real HACS, in two steps that share `shared/hacs-answers.json`:

1. `tests/test_hacs_contract.py` runs the WebSocket handlers of `external/hacs` in Home Assistant, in the scenarios of the adapter: HACS
   absent, ready, disabled, a repository already in HACS, one that is added, one that HACS refuses without an error, a download that fails
   and a command that HACS no longer knows. Only GitHub is replaced: registering and downloading a repository do what HACS does when they
   succeed or fail. The test compares the answers with the file, and fails when HACS changes them.
2. `frontend/test/hacs-contract.test.ts` replays the file through `HacsClient`: each command must be the recorded one, in the recorded
   order, and the adapter must reach the expected state or error.

After a change of HACS, check the adapter, then record the answers with `pytest tests/test_hacs_contract.py --update-hacs-answers`. The
test is skipped when `external/hacs` is missing.
