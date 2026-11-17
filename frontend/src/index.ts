/**
 * Entry point of the dashboard frontend: the module that Home Assistant loads for the panel.
 */

import "./components/plugin-status-page.ts";
import "./components/widgets-page.ts";
import "./dev/dev-plugins-page.ts";
import "./panel.ts";

// Served by the development server (`npm run dev`), a module that uses `import.meta.hot` gets the client of Vite. The page belongs to
// Home Assistant and has no script of Vite: this line connects it to the development server, which reloads the page when a source
// changes, since no module accepts the update itself. The build replaces `import.meta.hot` with `undefined` and drops the line.
import.meta.hot?.on("vite:beforeFullReload", () => console.info("[vtherm-dashboard] A source changed: reloading the page"));
