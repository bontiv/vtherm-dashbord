# Publishing
Audience: contributors.

How a version of the dashboard and of its SDK `@vtherm/dashboard-sdk` is published. The workflows are the ones of the change
`github-actions-ci`, which prevails over this page when they differ: `.github/workflows/release.yml` is the source.

## One version for everything
The dashboard, the SDK and the manifest share one version, which the tag states. These files must have exactly the same `version`:

| File | What it versions |
| --- | --- |
| `custom_components/vtherm_dashboard/manifest.json` | The integration, which Home Assistant and HACS read. |
| `package.json` (root) | The workspace. |
| `packages/sdk/package.json` | The SDK on npm. |
| `frontend/package.json` | The frontend. |
| `examples/vtherm_sample_plugin/ui/package.json` | The sample plugin, which is not a workspace: the CI builds it with the SDK of the commit, and its range `^0.1.0-beta3` is the one that a plugin author copies. |

The frontend reads the version of the manifest at build time, and the server sends the same version to the frontend, which warns when
they differ (a browser that kept an old bundle).

## Release a version
The procedure is in [Releasing](releasing.md). In short:

1. Change the version in the five files above, and write the section of the version in `CHANGELOG.md`, with its part "For plugin
   authors". Commit.
2. Merge the commit into `master`. A stable tag must be on the history of `master`.
3. Tag that commit `vMAJOR.MINOR.PATCH`, or with a pre-release suffix, `v0.2.0-rc.1`, and push the tag.

A tag is `v` and a semantic version, without build metadata (`+build`): npm ignores it, and Home Assistant validates it badly.
`v0.1.1`, `v1.0.0-beta.2` and `v0.2.0-rc.1` are valid. `v1.0`, `0.1.1`, `v01.2.3`, `v1.0.0+build5` and `v1.0.0-` are not.

## What the workflow does
The tag starts `release.yml`. The jobs follow one another, and the one that cannot be undone comes last.

| Job | What it does | Rights |
| --- | --- | --- |
| `validate` | Checks the format of the tag, compares it to the `version` of each file above, and for a stable tag checks that the commit is in `master`. It fails with the file and the two values. | read |
| `ci` | Calls `ci.yml`: tests, the checks, `hassfest` and the HACS action. | read |
| `package` | Builds the frontend, copies `custom_components/vtherm_dashboard/` without tests and caches, and zips it with `manifest.json` at the root. The archive is `vtherm_dashboard.zip`, as `hacs.json` says (`zip_release`). | read |
| `publish` | Creates the GitHub Release with generated notes, marked pre-release when the tag has a suffix. If the Release exists, it replaces the archive. | `contents: write`, only this job |
| `publish-npm` | Publishes `@vtherm/dashboard-sdk` with `npm publish --workspace packages/sdk`. | `id-token: write`, no token |

The npm tag is `latest` for a stable version and `next` for a pre-release, so that `npm install @vtherm/dashboard-sdk` does not give
a pre-release. A pre-release tag on a commit that is not in `master` is a test tag: `publish-npm` then runs `npm publish --dry-run`,
which lists the files of the package and publishes nothing, since a published version cannot be published again.

A tag whose version differs from the files, a stable tag outside `master`, or a malformed tag, fails `validate` and nothing is
published. Delete the tag (`git push --delete origin vX.Y.Z`, `git tag -d vX.Y.Z`), fix the commit and tag again.

## npm: the trusted publisher
There is no npm token in the repository. npm trusts the workflow, with OpenID Connect ("trusted publishing"). Set it up once, on
npmjs.com:

1. Open the package `@vtherm/dashboard-sdk` > **Settings** > **Trusted Publisher**, and choose GitHub Actions.
2. Fill in: organization or user `bontiv`, repository `vtherm_dashboard`, workflow filename `release.yml`. Leave the environment
   empty unless the workflow uses one.
3. Check that `repository.url` in `packages/sdk/package.json` is `git+https://github.com/bontiv/vtherm_dashboard.git`, the address of the repository.

Three things to know:

- **Declare it just before the first real tag.** A configuration that no publication validates expires after 2 days, and the
  dry-run of a test tag does not validate it. npm does not check the configuration when you save it: the first error appears at
  the first publication.
- **The first publication of a package needs the package to exist.** Publish `0.1.0` by hand once, or create the package, then
  declare the trusted publisher.
- **A new run after a success fails on `npm publish`**, because the version exists. This is harmless. After a failure of
  `publish-npm` only, run the failed job again from the page of the workflow run on GitHub: the Release is already there.

## Settings of the repository
The workflows cannot set these. They are listed in [Continuous integration](ci.md): code scanning, and the branch protection with the
required checks `python`, `frontend` and CodeQL. Protect the tags `v*` too, with a ruleset, so that only maintainers can create them.

## Install a release
In HACS, add the repository as a custom repository, category Integration, then download the version. HACS takes the archive of the
Release, since `hacs.json` has `zip_release`, and extracts it into `custom_components/vtherm_dashboard/`. The manifest of the archive
is the one of the repository.
