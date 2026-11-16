import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { describe, expect, it } from "vitest";

import { BUNDLE_NAME, readManifestVersion } from "../build/manifest-version.ts";
import { NATIVE_LOAD_ORDER } from "./support/native-host.ts";

describe("the frontend build", () => {
  it("produces the single module that the integration serves, with the version of the manifest", async () => {
    const output = mkdtempSync(join(tmpdir(), "vtherm-frontend-"));
    try {
      await build({ configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)), logLevel: "silent", build: { outDir: output, emptyOutDir: true } });
      expect(readdirSync(output).sort()).toEqual(["chunks", "plugins", BUNDLE_NAME]);
      const code = [BUNDLE_NAME, ...readdirSync(join(output, "chunks")).map((file) => join("chunks", file))].map((file) => readFileSync(join(output, file), "utf8")).join("\n");
      expect(code).toContain(JSON.stringify(readManifestVersion()).slice(1, -1));
      expect(code).toContain("vtherm-dashboard-panel");
      expect(code).not.toContain("__DASHBOARD_VERSION__");
      // The connection to the development server (`npm run dev`) exists only when Vite serves the sources.
      expect(code).not.toContain("@vite/client");
      expect(code).not.toContain("vite:beforeFullReload");
      expect(readdirSync(join(output, "plugins")).sort()).toEqual(NATIVE_LOAD_ORDER.map((id) => `${id}.js`).sort());
      // The registry of the plugins is in one shared chunk, not copied in each plugin.
      const registryCopies = readdirSync(join(output, "plugins")).filter((file) => readFileSync(join(output, "plugins", file), "utf8").includes("window.VThermUiPluginRegistry is missing"));
      expect(registryCopies).toEqual([]);
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 60000);
});
