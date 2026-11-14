/** Read the version of the dashboard from the manifest of the integration, the single place where it is written. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The manifest of the integration. */
export const MANIFEST_PATH = fileURLToPath(new URL("../../custom_components/vtherm_dashboard/manifest.json", import.meta.url));

/** The folder where the build writes the bundle. The integration serves it. */
export const OUTPUT_DIR = fileURLToPath(new URL("../../custom_components/vtherm_dashboard/www", import.meta.url));

/** The name of the bundle. It must match the one the integration serves. */
export const BUNDLE_NAME = "vtherm-dashboard.js";

/**
 * Read the version in the manifest.
 *
 * @returns The version, for example `0.1.0`.
 */
export function readManifestVersion(): string {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { version?: unknown };
  if (typeof manifest.version !== "string" || manifest.version === "") {
    throw new Error(`The manifest ${MANIFEST_PATH} has no version`);
  }
  return manifest.version;
}
