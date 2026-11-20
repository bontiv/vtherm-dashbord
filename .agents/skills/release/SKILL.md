---
name: release
description: Publish a version of the dashboard and of its SDK `@vtherm/dashboard-sdk`. Use when the user asks to release, publish, tag or bump the version (for example "release 0.1.0-beta5", "make a release", "tag the version"), optionally after merging a branch into master. Bumps every version file, writes the section of the changelog, commits, tags, pushes, then follows the release workflow to the GitHub Release and npm.
license: MIT
metadata:
  version: "1.0"
---

Publish a version: bump, commit, tag, push, and follow `.github/workflows/release.yml` until the Release and the package exist.

The reference is [Releasing](../../../docs/contributing/releasing.md) and [Publishing](../../../docs/contributing/publishing.md).
This skill is the same procedure, in an order that can be followed step by step. When they differ, the workflow
(`.github/workflows/release.yml`) and `scripts/validate-release-tag.ts` are the source.

**Input**: the version, without `v` (for example `0.1.0-beta5` or `0.2.0`), and optionally a branch to merge into `master` first.
If the user gives no version, read the current one in `package.json`, propose the next one (the next beta for a beta, else the
next patch) and ask before going on.

**Authorization**: the user's request to release authorizes the commit, the tag and the pushes of this procedure, for that version
only. Anything else (force push, deleting a published tag, a Release or a version on npm) needs its own confirmation.

## Steps

1. **Check the version.** `v<version>` must match the format of the tag: `v<major>.<minor>.<patch>`, an optional pre-release suffix
   (`-beta4`, `-rc.1`), no build metadata (`+...`), no leading zero. A version without suffix is stable, one with a suffix is a
   pre-release. Check that the tag does not exist yet: `git ls-remote --tags origin "v<version>"` prints nothing.

2. **Start from an up-to-date `master`.**
   - `git fetch origin`, then `git status`: the working tree must be clean. If it is not, stop and ask what to do with the changes.
   - With a branch to merge: `git checkout master`, `git merge --ff-only <branch>` (a fast-forward keeps the commits that the CI
     tested), then `git push origin master`. If the fast-forward is refused, stop and ask: the branch must be rebased first.
   - Without a branch: `git checkout master` and `git merge --ff-only origin/master`.
   - A stable tag must be on the history of `origin/master`. A pre-release tag may be on another branch, but its npm publication is
     then only a dry run: release from `master` unless the user asks otherwise.

3. **Bump the version, from `<old>` to `<version>`.** The same `version` in these five files (the list is `VERSION_FILES` in
   `scripts/validate-release-tag.ts`):
   - `custom_components/vtherm_dashboard/manifest.json`
   - `package.json`
   - `packages/sdk/package.json`
   - `frontend/package.json`
   - `examples/vtherm_sample_plugin/ui/package.json`, and in the same file the range of the dependency `@vtherm/dashboard-sdk`:
     `^<version>`.

   Also:
   - `package-lock.json`: the `version` of the root, of `packages[""]`, of `packages["frontend"]` and of `packages["packages/sdk"]`
     (four lines). Replace only `"version": "<old>"`; do not run `npm install`, which would change other lines.
   - `docs/contributing/publishing.md`: the range `^<version>` of the sample plugin in the table of the files.

   Check: `git grep -n "<old>" -- '*.json' docs/contributing/publishing.md` finds nothing (outside `node_modules`).

4. **Write the changelog.** In `CHANGELOG.md`, the content of `## [Unreleased]` becomes the section of the version:
   - Keep an empty `## [Unreleased]` at the top, then `## [<version>]` with one sentence (for example "The fourth beta.").
   - The parts are, in this order and only when they have content: `### Added`, `### Changed`, `### Fixed`, `### For contributors`,
     `### For plugin authors`.
   - `### For plugin authors` is always there: what changed in the SDK, the hooks, the placements or the command that lists the plugins,
     and what to change in a plugin, or "Nothing changes for plugins."
   - Read `git log --oneline v<previous>..HEAD` and complete the sections with what the commits changed and the changelog lacks, in the
     style of the earlier sections. The changelog is in English.

5. **Check before committing.** In the dev container (or with the same tools):
   - `RELEASE_TAG=v<version> node scripts/validate-release-tag.ts` passes: the format, the five versions, and `master`.
   - `npx vitest run scripts`: the tests of the release files.
   - `npm run check:docs`.

   Fix anything that fails before going on.

6. **Commit and tag.**
   - `git add -A` (only the files of steps 3 and 4 must be in `git status`), then `git commit -m "chore: release <version>"`. The
     message is exactly that, without trailers, as the earlier release commits.
   - `git tag v<version>`: a lightweight tag, as the earlier ones, on the commit of the version.

7. **Push**, the commit first, then the tag: `git push origin master`, then `git push origin v<version>`. The tag starts `release.yml`.

8. **Follow the release.**
   - `gh run list --workflow release.yml --limit 3` gives the run of the tag (`headBranch` is the tag).
   - `gh run watch <id> --exit-status` waits for it. It runs in the background when the tool allows it: do not poll in a loop.
   - Then `gh run view <id> --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'`: `validate`, `ci` (and its jobs), `package`,
     `publish` and `publish-npm` must succeed.
   - `gh release view v<version>`: the Release exists, marked pre-release when the version has a suffix, with `vtherm_dashboard.zip`.
   - `npm view @vtherm/dashboard-sdk dist-tags`: `next` is the version for a pre-release, `latest` for a stable one.
   - The CI and CodeQL runs of the push on `master` run at the same time; report them too.

9. **Report**: the commit, the tag, each job, the link of the Release and the npm tag.

## When it fails
Read the log of the failed job: `gh run view <id> --log-failed`.

- **`validate`, `ci` or `package` fails**: nothing was published. Delete the tag (`git push --delete origin v<version>`, then
  `git tag -d v<version>`), fix the cause in a new commit on `master`, push it, and go back to step 6 to tag the fixed commit. Ask the
  user before deleting the tag.
- **`publish-npm` fails and the Release exists**: fix the cause, then rerun the job (`gh run rerun <id> --failed`). If the version is
  already on npm, the failure is harmless.
- **The Release must be redone**: rerun the workflow, which replaces the archive of the existing Release.
- Never delete a Release or unpublish a version from npm without the user's explicit confirmation.

## Guardrails
- One version for everything: the five files, the lock, the sample range and the tag always agree.
- Do not change anything else in the release commit. A fix found on the way goes into its own commit, before the release commit.
- Do not tag a commit whose CI is red, and do not force push `master` or a tag.
