# Development environment
Audience: contributors.

How to get the repository running: Home Assistant with Versatile Thermostat and the dashboard, the tests and the checks.

## With the dev container
Open the repository in VS Code and "Reopen in Container", or create a Codespace. The container has Python 3.14, Node.js (LTS) and the
GitHub CLI. Its `postCreateCommand` runs `.devcontainer/post-create.sh`, which:

1. clones the repositories that the dashboard depends on into `external/` (ignored by git): Versatile Thermostat, `vtherm_api` and HACS;
2. installs the Python dependencies (`requirements-dev.txt`) and `vtherm_api` in editable mode, then `numpy` and `scipy`, which
   Versatile Thermostat needs;
3. installs the packages that the browser of Home Assistant needs at its start (voice assistants, cameras): without them the page stays
   on "Loading data", because Home Assistant does not install them for a development instance;
4. runs `npm install` for the workspaces;
5. copies `.devcontainer/configuration.yaml` to `config/configuration.yaml`, the configuration of the development instance.

Versatile Thermostat and HACS are cloned at the commit of `external-refs.txt`, the one that the continuous integration tests against (`scripts/fetch-external.sh`).
To use another repository or reference, set `VERSATILE_THERMOSTAT_REPO`, `VERSATILE_THERMOSTAT_REF`, `HACS_REPO` or `HACS_REF` before the container is created.
`vtherm_api` must have the registry of UI plugins. Until it is published, set `VTHERM_API_REPO` and `VTHERM_API_REF` (a branch or a tag) the same
way. An existing folder of `external/` is never changed, so to use another branch, check it out there.

## Without the container
You need Python 3.14, Node.js 24 or later, git and bash:

```
git clone https://github.com/bontiv/vtherm_dashboard.git && cd vtherm_dashboard
bash .devcontainer/post-create.sh   # needs a virtual environment: python3.14 -m venv .venv && . .venv/bin/activate
```

The script uses `python -m pip`, so activate the virtual environment first. Later shells need `. .venv/bin/activate`.

## Run Home Assistant
1. Build the frontend: `npm run build`. It writes the modules into `custom_components/vtherm_dashboard/www/`, which the integration
   refuses to start without. Run it again after a change of the frontend, or use the preview below.
2. Start: `bash .devcontainer/start-ha.sh`. It links Versatile Thermostat and the dashboard into `config/custom_components/` and
   runs `hass --config config --debug` on port 8123.
3. At the first start, create the user in the browser (onboarding). To skip the login screen on your computer, add `trusted_networks` with
   `allow_bypass_login` to `auth_providers` in `config/configuration.yaml`, see the documentation of Home Assistant.
4. **Settings > Devices & services > Add integration**: add "Versatile Thermostat" (create a thermostat or the central
   configuration), then "VTherm Dashboard". "Home confort" appears in the side menu.

`config/configuration.yaml` has a test switch (`input_boolean.dev_switch`) and a test number so that you can create thermostats without
hardware. The file is yours: git ignores `config/`.

Logs: `config/home-assistant.log`, with debug for `custom_components.vtherm_dashboard` and `vtherm_api`.

## The tests
| Command | What it runs |
| --- | --- |
| `pytest` | The Python tests: the server, the config flow driver (with the real Versatile Thermostat in `external/`), the registry, the catalog of add-ons. |
| `npm test` | The TypeScript tests (Vitest): the SDK, the frontend, the scripts, the examples and the sample plugin. |
| `npm run check` | Everything that is not a test: types, lint, no JavaScript, documentation, SDK reference, generated catalogs, Python format and pylint. |

Run all three before a pull request. The tests that need the real Versatile Thermostat are skipped when `external/versatile_thermostat`
is missing. A test file of the frontend runs in `happy-dom` (a comment `// @vitest-environment happy-dom` on its first line), or in `jsdom` when the
code needs a complete DOM, as the sanitizer of the add-ons does.

Useful variants: `npx vitest run frontend/test/panel.test.ts`, `pytest tests/test_plugin_list.py -k cycle`, `scripts/check-python.sh path.py`.

### Generated files
| Command | Updates |
| --- | --- |
| `npm run docs:sync` | The code of the examples copied into the pages of `docs/`. |
| `npm run docs:reference` | `docs/reference/sdk/`, from the types of the SDK. |
| `npm run catalogs:generate` | The catalogs of the native tabs, from the translations of Versatile Thermostat. |
| `pytest tests/test_schema_drift.py --update-schemas` | `shared/vtherm-config-schemas.json`. |
| `UPDATE_NATIVE_DOCS=1 npx vitest run frontend/test/native-docs.test.ts` | The table of the contributions in [Native plugins](../plugins/native-plugins.md). |

### The preview
`npm run preview -w frontend` serves the panel on port 5199 with a fake Home Assistant, without Home Assistant. The parameters of the
address are `theme` (the themes of `frontend/preview/themes.ts`), `path`, `drawer` and `empty`. `frontend/preview/frame.html?width=420&query=...`
shows a narrow screen. It is how the screenshots of the three themes are made.

### hassfest
```
docker run --rm --platform linux/amd64 -v "$PWD":/github/workspace ghcr.io/home-assistant/hassfest
```
validates the manifest and the structure of the integration, as the continuous integration does.

## Where things are
See [Architecture](architecture.md). The conventions are in [Code conventions](code-conventions.md).
