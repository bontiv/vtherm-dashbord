import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the files of the release", () => {
  const hacs = JSON.parse(read("hacs.json")) as { zip_release?: boolean; filename?: string };
  const manifest = JSON.parse(read("custom_components/vtherm_dashboard/manifest.json")) as { domain: string };

  it("declare the distribution by archive", () => {
    expect(hacs.zip_release).toBe(true);
  });

  it("name the archive that the packaging script writes", () => {
    const archive = /^ARCHIVE="([^"]+)"$/m.exec(read("scripts/package-release.sh"))?.[1];
    expect(archive).toBe(hacs.filename);
  });

  it("have a domain that is the folder of the integration, which the archive replaces", () => {
    expect(existsSync(new URL(`../custom_components/${manifest.domain}`, import.meta.url))).toBe(true);
    expect(read("scripts/package-release.sh")).toContain(`SOURCE="custom_components/${manifest.domain}"`);
  });

  it("keep the integration in a folder of the repository that HACS expects", () => {
    expect(existsSync(new URL("../custom_components/vtherm_dashboard/brand/icon.png", import.meta.url))).toBe(true);
  });
});
