# Code conventions
Audience: contributors.

The rules of the repository, and the command that checks them.

## Language
Every file header, comment, docstring, documentation comment, commit message and page of `docs/` is written in **English**, and so
are the README and the changelog. Identifiers, names of APIs, paths and commands are not translated.

The texts that the dashboard shows are product strings, not documentation. They go through the translation catalogs of each plugin
(English, French and German for the native plugins, English by default). To add a French label, add it to the French catalog, not
to the code. See [Translations](../plugins/internationalization.md).

Nothing detects the language automatically: the review and the checklist of the pull request do.

## TypeScript
- All the code that runs in the browser or in Node is TypeScript: the dashboard, the SDK, the native plugins, the sample plugin, the
  tests, the scripts, and the configuration of the tools when they accept it.
- `.js`, `.mjs` and `.cjs` files are not versioned in the sources. Generated files (the build in `www/`, `dist/`) are ignored by git.
  When a tool only accepts a JavaScript file, add it to `scripts/js-exceptions.json` with the reason. `npm run check:js` fails for
  any other file, and names it.
- The compiler is strict (`"strict": true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`), and
  `allowJs` is off.
- An explicit `any` is refused by ESLint. If it is really needed, disable the rule on that line with a comment that says why.
- Imports of local files in the frontend end with `.ts`. Imports of types use `import type` (`verbatimModuleSyntax`).
- Every exported element of the SDK has a documentation comment: `npm run check:reference` fails otherwise, and when
  `docs/reference/sdk/` is not the one that the code would generate.
- Components are custom elements. Colors, spacing and fonts come from the variables of the theme of Home Assistant, never from a
  value of the code ([Theming](../plugins/theming.md)). A test checks it.
- **A component of Home Assistant first.** A control (field, button, message, confirmation, card, list, menu, loading) is drawn
  with the component of Home Assistant that does the job: `ha-selector` for a field, `ha-button`, `ha-alert`, `ha-dialog`, `ha-card`,
  `ha-expansion-panel`, `ha-md-list-item`, `ha-spinner`. The helpers of `frontend/src/components/ha.ts` and the field contract of the
  SDK do most of it ([Components of Home Assistant](architecture.md#components-of-home-assistant)). A plain HTML control is allowed
  only in these cases, each with a comment next to it:
  - a **fallback**, drawn when the component of Home Assistant is not defined; the comment starts with `fallback:` and names the
    component;
  - an **exception**, where Home Assistant has no public component: the tabs of the top bar, the breadcrumb and the darkened page
    behind the drawer; and the compact number cells of the table of the presets, where `ha-selector` is too large for four columns; the comment starts with `Exception to the rule "a component of Home Assistant first"` and says why.

## Python
The rules are those of Versatile Thermostat, so that code can move between the repositories:

- Black, with a line length of **180**.
- pylint with `max-line-length=180` (`.pylintrc`), and the score must be 10.00/10. A disabled message has a comment that says why.
- LF line ends, 4 spaces.
- Docstrings in the Google style (`Args`, `Returns`, `Raises`), with type hints.
- pytest with `asyncio_mode = auto`.

## The check
```
npm run check
```
runs, in this order: the type checks of every project (`typecheck`), ESLint, `check:js`, `check:docs` (index, links, examples, anchors),
`check:completeness` (the pages that the specification requires, the audiences, the changelog and the template of the pull request),
`check:reference`, `check:catalogs` and `check:python` (Black and pylint over every Python file of the repository, which
`scripts/check-python.sh` can also run on given files). Then run `npm test` and `pytest`. The continuous integration runs the same
commands.

## Documentation
A change of a public behavior (the API, the contract of a plugin, a procedure, what the dashboard does) updates `docs/` in the same
pull request. The template of the pull request asks for it. Every page of `docs/` is in the index of `docs/README.md` with its
audience, and the code of the examples comes from tested files, see the rules at the end of that index.

## Commits
Messages are in English, in the imperative mood or `feat:`, `fix:`, `docs:` and `chore:` prefixes. One logical change for each commit.
