# Developing a plugin in the dashboard
Audience: plugin authors.

The development mode loads your plugin from a server on your computer, so that you see a change after a reload of the page. You do
not install anything and you do not restart Home Assistant. It is for administrators only.

## How it works
- The entries are kept in the `localStorage` of your browser. Nothing is written in Home Assistant, and another browser or another user
  does not see them.
- The dashboard sends the active entries with the request for the list of plugins (`dev_plugins` in
  [`vtherm_dashboard/get_ui_plugins`](../reference/websocket-api.md)). The server merges them with the registered plugins and does
  not keep them. A user who is not an administrator is refused.
- A plugin in development follows the rules of any plugin: `dashboard_version`, `requires`, `load_after`, `load_before`, cycles and the
  isolation of failures. See [Loading and dependencies](loading-and-dependencies.md).
- While at least one entry is active, a banner "Development mode" with the identifiers of the plugins is shown on every page.

## Add an entry
Open **Configuration > Development** (the group "Dashboard" of the menu). The page lists your entries, and each one can be enabled,
disabled (it stays in the list) or removed. Changes apply when you reload the page, and the page offers a button for it.

There are two kinds of entry.

| Kind | When | What it gives |
| --- | --- | --- |
| Replaces the installed module | The identifier is the one of a plugin that an integration registered in Python, or of a native plugin. | Only the URL of the module. The constraint and the dependencies stay those of the registration in Python. |
| Declared here | The identifier is unknown to the server. | The entry is the registration: it must give `dashboard_version`, and can give `requires`, `load_after` and `load_before`. |

An entry is refused when:

- the identifier does not start with a letter or uses anything but lower case letters, digits and underscores, or is already there;
- the address is not an absolute `http` or `https` URL (`javascript:` and `data:` are refused);
- the plugin is declared here and gives no `dashboard_version`;
- a dependency is not an identifier.

An identifier `core` or starting with `core_` that is not a native plugin is excluded by the server, with the state "reserved identifier".

## The server of development
The dashboard imports your module from another origin than Home Assistant, so the server must send `Access-Control-Allow-Origin`.

### Vite
<!-- example: docs/examples/dev-server/vite.config.ts -->
```typescript
import { defineConfig } from "vite";

// Serve the plugin from http://localhost:5173 while you work on it. The dashboard imports the module from another origin, so the
// server must allow it with Access-Control-Allow-Origin.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    headers: { "Access-Control-Allow-Origin": "*" },
    // Home Assistant opens the module from its own page: no need to open the dev server in a browser tab.
    open: false,
  },
  build: {
    // The release build is one ES module that registers the plugin when it is imported.
    lib: { entry: "src/main.ts", formats: ["es"], fileName: "my-plugin" },
  },
});
```
<!-- /example -->

Run `npx vite`, then add the entry with the URL of your module, for example `http://localhost:5173/src/main.ts`. Vite serves the
TypeScript source as a module.

### Rollup
<!-- example: docs/examples/dev-server/rollup.config.ts -->
```typescript
import typescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import serve from "rollup-plugin-serve";

// Build the plugin in watch mode (`rollup -c -w`) and serve it from http://localhost:5173. The dashboard imports the module from
// another origin, so the server must allow it with Access-Control-Allow-Origin.
const config: RollupOptions = {
  input: "src/main.ts",
  output: { file: "dist/my-plugin.js", format: "es", sourcemap: true },
  plugins: [typescript(), serve({ contentBase: "dist", port: 5173, headers: { "Access-Control-Allow-Origin": "*" } })],
};

export default config;
```
<!-- /example -->

Run `npx rollup -c -w`, then add the entry with `http://localhost:5173/my-plugin.js`.

## When the module does not load
The status page (**Configuration > Plugins**) shows the source of each plugin. For a plugin in development, it shows the URL and, when
the import failed, the causes that a browser cannot tell apart:

- the development server is stopped, or the URL is wrong;
- the server does not send `Access-Control-Allow-Origin`;
- the page is served over HTTPS and the module over HTTP (mixed content).

The other plugins keep loading.

## HTTPS and Safari
`http://localhost` from an HTTPS page works in Chrome and Firefox. Safari always blocks it: serve your module over HTTPS, or open
Home Assistant over HTTP while you develop.

## Texts
For a plugin in development, the status page lists the texts that the language of the user lacks and that are shown in English
(`fallback`), and the texts that exist nowhere (`missing_key`). They come from `translations.warnings`, see
[Translations](internationalization.md). Change the language of your profile in Home Assistant to check one language.

## Limits
- There is no hot reload: reload the page.
- The entries are not shared between browsers, and are lost when you clear the data of the site.
- Only an administrator can use the mode.
