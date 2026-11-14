import { expect, it } from "vitest";

import { translations, t } from "./translations.ts";

it("shows the plugin in the language of the user, and English where a key is missing", async () => {
  expect(t("tab.title")).toBe("Smart TPI");

  await translations.setLanguage("fr-CA");
  expect(t("tab.title")).toBe("TPI intelligent");
  expect(t("tab.group")).toBe("Algorithms");
  expect(t("tab.users", { count: 3 })).toBe("Utilisé par 3 thermostats");

  await translations.setLanguage("de");
  expect(t("tab.help", { name: "Salon" })).toBe("Einstellungen von Salon");
  expect(t("tab.users", { count: 1 })).toBe("Von 1 Thermostat verwendet");

  await translations.setLanguage("ja");
  expect(t("tab.title")).toBe("Smart TPI");
  // A key that is shown in English although a catalog exists is a `fallback`. Nothing is missing everywhere.
  expect(translations.warnings.filter((warning) => warning.code !== "fallback")).toEqual([]);
});
