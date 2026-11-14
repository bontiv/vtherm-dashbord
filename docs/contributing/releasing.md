# Releasing
Audience: contributors.

How to publish a version, step by step, and what to do when it fails. What each job does, and the setting of npm, are in
[Publishing](publishing.md). The checks that run before are in [Continuous integration](ci.md).

## Publish a version
1. **Change the version** in the files that [Publishing](publishing.md#one-version-for-everything) lists, to the same value, for example `0.1.1`. Write the
   section of the version in `CHANGELOG.md`, with its part "For plugin authors".
2. **Commit** the change, and merge it into `master` (a stable version must be in the history of `master`).
3. **Tag the commit**: `git tag v0.1.1 && git push origin v0.1.1`. The tag is made of `v` and the version, so the order is the commit of the version, then the tag.

The workflow takes it from there. The Release appears on GitHub with its archive, and the package on npm.

### The format of the tag
`v<major>.<minor>.<patch>`, with an optional suffix of pre-release (`-rc.1`, `-beta.2`), and no build metadata (`+...`). This is the
intersection of what Home Assistant and npm accept.

| Valid | Not valid |
| --- | --- |
| `v0.1.1`, `v1.0.0`, `v1.0.0-beta.2`, `v0.2.0-rc.1` | `v1.0` (two numbers), `0.1.1` (no `v`), `v01.2.3` (leading zero), `v1.0.0+build5` (metadata), `v1.0.0-` (empty suffix), `v1.0.0-01` (number with a leading zero) |

A tag without a suffix is stable, and a tag with one is a pre-release.

### Where the tag can be
- A stable tag must be on a commit of the history of `master`. The workflow tests it with `git merge-base --is-ancestor`, so a stable tag on a
  commit that was merged is accepted, whatever the branch it was pushed from.
- A pre-release tag can be on any branch. It lets you try the release from a branch of a feature. Its publication on npm is only a
  dry run when the commit is not in `master`.

## What the workflow does
1. **`validate`** checks the tag, compares it with the `version` of each file, and for a stable tag checks the branch. It fails with the file
   and the two versions. Nothing is built before it succeeds.
2. **`ci`** runs `ci.yml`: build, tests, checks, `hassfest` and the HACS action, on the commit of the tag.
3. **`package`** builds the frontend and runs `scripts/package-release.sh`, which makes `vtherm_dashboard.zip` (the name that `hacs.json` declares).
   The content of the integration is at its root, with the built frontend (`www/`) and the images (`brand/`), without tests, caches or sources.
   The manifest is the one of the repository.
4. **`publish`** creates the GitHub Release with generated notes, marked pre-release when the tag has a suffix. If the Release already exists, it
   replaces the archive and creates no second one.
5. **`publish-npm`** publishes `@vtherm/dashboard-sdk`: `latest` for a stable version, `next` for a pre-release, and a dry run for a pre-release outside `master`.

A failure of a job stops the next ones: nothing is published when the tag, the tests or the archive fail.

## Install the archive in HACS
Add the repository to HACS as a custom repository, category Integration. HACS reads `hacs.json`, takes `vtherm_dashboard.zip` from the Release,
and extracts it into `custom_components/vtherm_dashboard/`. To try an archive by hand, unzip it into that folder.

## When it fails
- **`validate` fails.** Read the message: it names the file and the two versions, or the rule of the tag. Delete the tag
  (`git push --delete origin v0.1.1` and `git tag -d v0.1.1`), fix the commit, and tag again. Nothing was published.
- **A test fails on the tag.** Same: delete the tag, fix, and tag again. A change after the tag needs another tag.
- **`publish-npm` fails and the Release exists.** Fix the cause, then run the job again from the page of the run on GitHub. If the version is
  already on npm, the failure is harmless.
- **The Release must be redone.** Run the workflow again: it replaces the archive of the existing Release.
