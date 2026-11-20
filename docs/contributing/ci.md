# Continuous integration
Audience: contributors.

What runs on GitHub for each push and pull request, the coverage, the security analysis, and the settings of the repository that the
workflows cannot make. The releases are in [Releasing](releasing.md) and [Publishing](publishing.md).

## The workflows
| File | Starts on | Does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | each push of a branch, each pull request, and a call of another workflow | Builds, tests, checks, `hassfest` and the HACS action. |
| `.github/workflows/codeql.yml` | each push, each pull request and every Monday | The security analysis of the code. |
| `.github/workflows/release.yml` | the push of a tag `v*` | See [Releasing](releasing.md). It calls `ci.yml`. |
| `.github/dependabot.yml` | every week | Proposes the update of the actions. |

Tags do not start `ci.yml`: `release.yml` calls it, so a tag does not run the same jobs twice.

### The jobs of `ci.yml`
| Job | What it runs |
| --- | --- |
| `python` | Python 3.14, `pip install -r requirements-dev.txt`, then `pytest --cov`. |
| `frontend` | Node.js 24, `npm ci`, `npm run build` (the SDK and the frontend), then `npm test -- --coverage`. |
| `sample-plugin` | Builds the SDK, installs it from a tarball in `examples/vtherm_sample_plugin/ui`, then builds and tests the sample. Its steps have `continue-on-error`: a failure shows a warning, never a red run. |
| `checks` | `npm run check`: the single command of the developers (types, lint, no JavaScript, documentation, SDK reference, catalogs, Black and pylint). |
| `hassfest` | The action of Home Assistant that validates `manifest.json`, the translations and the structure of the integration. |
| `hacs` | The HACS action, category `integration`: it validates `hacs.json`, the structure of the repository and its settings on GitHub. |

The jobs are independent and run in parallel. The sample plugin is not a workspace of `package.json`: it depends on the SDK like the plugin of an author, and an SDK whose version is not published yet would make `npm ci` fail for the whole repository. When `sample-plugin` fails, the run stays green and shows the warning "Sample plugin" and a note in its summary. Do not require this job in the branch protection, and `release.yml` does not wait for it separately: it waits for `ci`, which is green. The same commands run on your computer, so a red job is reproduced with the command of its name.

### What the tests read
- `vtherm_api` comes from its package index, at the version that `manifest.json` requires.
- Versatile Thermostat and HACS are cloned at the commit or tag of `external-refs.txt` by `scripts/fetch-external.sh`, into the default folder of
  `VTHERM_VERSATILE_THERMOSTAT_DIR` and `VTHERM_HACS_DIR`. The workflow sets none of the variables of
  [Development environment](development-environment.md#where-the-other-projects-are).
  Two runs on the same commit test against the same code. The dev container reads the same file. To follow a new version of one of
  them, change its reference in a pull request, and see the tests.

### Rights and forks
Each workflow has `permissions: contents: read`, and a job takes more only when it needs it: `security-events: write` for CodeQL, `contents: write`
for the creation of the GitHub Release, `id-token: write` for npm. The workflows never use `pull_request_target`, so the code of a fork never runs
with a secret. The checkouts do not keep the token (`persist-credentials: false`).

A run for a reference is cancelled by the next commit on it, except on the default branch, where every run is kept.

### The actions are pinned
Each action is written with the commit that a version points to, and the version in a comment: `uses: actions/checkout@3d3c42e... # v7.0.1`.
A moving tag could change what runs in the repository without a commit. Dependabot proposes the new commits. `hassfest` and the HACS
action have no stable tag, only a branch, which is one more reason to pin them. `scripts/workflows.test.ts` checks the pins, the rights
and the triggers of the three workflows, and `actionlint` checks their syntax (`brew install actionlint`, then `actionlint`).

### The check of the brands
The HACS action is run with `ignore: brands`. This check asks for the integration to be in the repository `home-assistant/brands`, which
does not accept custom integrations. The icon is in `custom_components/vtherm_dashboard/brand/`. No other check is ignored. If the
action fails on a setting of the repository (description, topics, issues), set it on GitHub rather than ignoring the check.

## Coverage
The coverage is measured, published, and has no threshold: a low number does not fail a run.

| Language | Tool | Report |
| --- | --- | --- |
| Python | `pytest-cov`, `--cov` of `pyproject.toml` (`custom_components/vtherm_dashboard`, tests and `www/` left out) | `coverage/python/` (XML and HTML) |
| TypeScript | `@vitest/coverage-v8` (the frontend, the SDK and the scripts; tests, generated catalogs and the preview left out) | `coverage/typescript/` (`lcov.info`, HTML, `coverage-summary.json`) |

Locally: `pytest --cov --cov-report=html:coverage/python/html` and `npm test -- --coverage`.

In GitHub, each run has the artifacts `coverage-python` and `coverage-typescript`, kept even when a test fails (`if: always()`), and its
summary shows the percentage of each language. There is no external service.

## Security analysis
CodeQL analyzes `python` and `javascript-typescript`, in two jobs of a matrix with `fail-fast: false`, so one language does not hide the other.
Neither needs a build (`build-mode: none`). The alerts are in **Security > Code scanning**.

## Settings of the repository
Set them once, in **Settings** of the repository on GitHub. The workflows and the files cannot.

| Setting | Where | Value |
| --- | --- | --- |
| Code scanning | Security > Code security | Use the advanced setup, which is `codeql.yml`: do not enable the default setup, which would run CodeQL twice. |
| Secret scanning and push protection | Security > Code security | On. |
| Dependabot alerts | Security > Code security | On. `dependabot.yml` already opens the updates of the actions. |
| Branch protection of `master` | Rules > Rulesets | Require a pull request, and these checks: `python`, `frontend`, `analyze (python)` and `analyze (javascript-typescript)` (CodeQL). Also `checks`, `hassfest` and `hacs` to keep the conventions and the structure. |
| Protection of the tags `v*` | Rules > Rulesets | Only the maintainers create them. The workflow checks the tag, but only a ruleset prevents its creation. |
| Workflow permissions | Actions > General | The default token is read-only. |
| Pull requests from forks | Actions > General | Require the approval of a maintainer for the first contribution. |
| Description, topics, issues | General | Set. The HACS action checks them. |

The settings of npm are in [Publishing](publishing.md).
