import { assertCompleteTranslations } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { shell } from "../src/shell-translations.ts";

it("has complete English, French and German catalogs", async () => {
  await assertCompleteTranslations(shell, ["fr", "de"]);
});

it("translates a text with parameters in each language", async () => {
  expect(shell.resolve("en", "status.missing", { plugins: "a, b" })).toBe("Missing: a, b");
  expect(shell.resolve("fr", "status.missing", { plugins: "a, b" })).toBe("Manquant : a, b");
  expect(shell.resolve("de", "status.missing", { plugins: "a, b" })).toBe("Fehlt: a, b");
  expect(shell.resolve("ja", "shell.title")).toBe("Versatile Thermostat");
});
