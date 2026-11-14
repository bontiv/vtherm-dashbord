import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { describe, expect, it } from "vitest";

import { BUNDLE_NAME, readManifestVersion } from "../build/manifest-version.ts";

describe("the frontend build", () => {
  it("produces the single module that the integration serves, with the version of the manifest", async () => {
    const output = mkdtempSync(join(tmpdir(), "vtherm-frontend-"));
    try {
      await build({ configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)), logLevel: "silent", build: { outDir: output, emptyOutDir: true } });
      expect(readdirSync(output)).toEqual([BUNDLE_NAME]);
      const bundle = readFileSync(join(output, BUNDLE_NAME), "utf8");
      expect(bundle).toContain(JSON.stringify(readManifestVersion()).slice(1, -1));
      expect(bundle).toContain("vtherm-dashboard-panel");
      expect(bundle).not.toContain("__DASHBOARD_VERSION__");
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 60000);
});
