import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { defineTranslations, languageChain, normalizeLanguage } from "../src/index.ts";
import type { CompleteCatalog, PartialCatalog } from "../src/index.ts";

const en = {
  "tab.title": "Smart TPI",
  "tab.help": "Help for {name}",
  "thermostats": { one: "{count} thermostat", other: "{count} thermostats" },
} as const;

describe("language resolution", () => {
  it("normalizes tags and builds the chain: full tag, base language, English", () => {
    expect(normalizeLanguage(" PT_br ")).toBe("pt-br");
    expect(languageChain("pt-BR")).toEqual(["pt-br", "pt", "en"]);
    expect(languageChain("fr")).toEqual(["fr", "en"]);
    expect(languageChain("en")).toEqual(["en"]);
    expect(languageChain("de_AT")).toEqual(["de-at", "de", "en"]);
  });

  it("uses the language of the plugin when it provides it", async () => {
    const translations = defineTranslations(en, { de: { "tab.title": "Intelligentes TPI" } });
    expect(translations.language).toBe("en");
    await translations.setLanguage("de");
    expect(translations.language).toBe("de");
    expect(translations.t("tab.title")).toBe("Intelligentes TPI");
  });

  it("falls back to the base language for a regional variant", async () => {
    const translations = defineTranslations(en, { fr: { "tab.title": "TPI intelligent" } });
    await translations.setLanguage("fr-CA");
    expect(translations.t("tab.title")).toBe("TPI intelligent");
  });

  it("prefers the full tag to the base language", async () => {
    const translations = defineTranslations(en, { pt: { "tab.title": "TPI inteligente" }, "pt-BR": { "tab.title": "TPI inteligente (Brasil)" } });
    await translations.setLanguage("pt_br");
    expect(translations.t("tab.title")).toBe("TPI inteligente (Brasil)");
    await translations.setLanguage("pt-PT");
    expect(translations.t("tab.title")).toBe("TPI inteligente");
  });

  it("shows English for a language that the plugin does not provide, or for a plugin with English only", async () => {
    const translations = defineTranslations(en, { fr: { "tab.title": "TPI intelligent" } });
    await translations.setLanguage("ja");
    expect(translations.t("tab.title")).toBe("Smart TPI");
    const englishOnly = defineTranslations(en);
    await englishOnly.setLanguage("de");
    expect(englishOnly.t("tab.title")).toBe("Smart TPI");
  });

  it("follows a change of language without reloading", async () => {
    const translations = defineTranslations(en, { fr: { "tab.title": "TPI intelligent" } });
    expect(translations.t("tab.title")).toBe("Smart TPI");
    await translations.setLanguage("fr");
    expect(translations.t("tab.title")).toBe("TPI intelligent");
    await translations.setLanguage("en");
    expect(translations.t("tab.title")).toBe("Smart TPI");
  });
});

describe("fallback by key", () => {
  it("uses the English text of a key that is missing in the language of the user", async () => {
    const translations = defineTranslations(en, { fr: { "tab.title": "TPI intelligent" } });
    await translations.setLanguage("fr");
    expect(translations.t("tab.help", { name: "Salon" })).toBe("Help for Salon");
    // The fallback is allowed, and recorded so that the dashboard can tell the author of a plugin in development.
    expect(translations.warnings).toEqual([{ code: "fallback", language: "fr", key: "tab.help" }]);
  });

  it("does not record a fallback for a language without catalog, or for English", async () => {
    const translations = defineTranslations(en, { fr: { "tab.title": "TPI intelligent" } });
    await translations.setLanguage("ja");
    translations.t("tab.title");
    await translations.setLanguage("en");
    translations.t("tab.title");
    expect(translations.warnings).toEqual([]);
  });

  it("shows an unknown key as it is and records a warning once", () => {
    const translations = defineTranslations(en);
    expect(translations.resolve("en", "no.such.key")).toBe("no.such.key");
    expect(translations.resolve("en", "no.such.key")).toBe("no.such.key");
    expect(translations.warnings).toEqual([{ code: "missing_key", language: "en", key: "no.such.key" }]);
  });
});

describe("parameters and plurals", () => {
  it("inserts the named parameters", () => {
    expect(defineTranslations(en).t("tab.help", { name: "Salon" })).toBe("Help for Salon");
    expect(defineTranslations({ n: "{a}-{b}-{a}" }).t("n", { a: 1, b: "x" })).toBe("1-x-1");
  });

  it("leaves a missing parameter as it is and records a warning", () => {
    const translations = defineTranslations(en);
    expect(translations.t("tab.help")).toBe("Help for {name}");
    expect(translations.warnings).toEqual([{ code: "missing_param", language: "en", key: "tab.help", detail: "name" }]);
  });

  it("chooses the plural form of the language", () => {
    const translations = defineTranslations(en);
    expect(translations.t("thermostats", { count: 1 })).toBe("1 thermostat");
    expect(translations.t("thermostats", { count: 2 })).toBe("2 thermostats");
    expect(translations.t("thermostats", { count: 0 })).toBe("0 thermostats");
  });

  it("uses the plural rules of the language of the catalog, with several forms", async () => {
    const pl = { thermostats: { one: "{count} termostat", few: "{count} termostaty", many: "{count} termostatów", other: "{count} termostatu" } };
    const translations = defineTranslations(en, { pl });
    await translations.setLanguage("pl");
    expect([1, 2, 5, 1.5].map((count) => translations.t("thermostats", { count }))).toEqual(["1 termostat", "2 termostaty", "5 termostatów", "1.5 termostatu"]);
  });

  it("uses the English plural rules when the text falls back to English", async () => {
    const translations = defineTranslations(en, { pl: { "tab.title": "TPI" } });
    await translations.setLanguage("pl");
    expect(translations.t("thermostats", { count: 1 })).toBe("1 thermostat");
  });

  it("uses the form `other` and records a warning when the count is missing", () => {
    const translations = defineTranslations(en);
    expect(translations.t("thermostats")).toBe("{count} thermostats");
    expect(translations.warnings.map((warning) => warning.detail)).toContain("count");
  });
});

describe("catalogs loaded on demand", () => {
  it("loads only the catalog of the language of the user, and English is always there", async () => {
    const loadFrench = vi.fn(async () => ({ "tab.title": "TPI intelligent" }));
    const loadGerman = vi.fn(async () => ({ "tab.title": "Intelligentes TPI" }));
    const translations = defineTranslations(en, { fr: loadFrench, de: loadGerman });
    expect(translations.t("tab.title")).toBe("Smart TPI");
    await translations.setLanguage("de");
    expect(translations.t("tab.title")).toBe("Intelligentes TPI");
    expect(loadGerman).toHaveBeenCalledTimes(1);
    expect(loadFrench).not.toHaveBeenCalled();
    await translations.setLanguage("de");
    expect(loadGerman).toHaveBeenCalledTimes(1);
  });

  it("accepts a module with a default export, as a dynamic import returns", async () => {
    const module = await import("./fixtures/german-module.ts");
    const translations = defineTranslations(en, { de: async () => module });
    await translations.setLanguage("de");
    expect(translations.t("tab.title")).toBe("Intelligentes TPI (module)");
  });

  it("accepts a loader that returns an object with only a default export, and a catalog that has a key named default", async () => {
    const wrapped = defineTranslations(en, { de: async () => ({ default: { "tab.title": "Intelligentes TPI (objet)" } }) });
    await wrapped.setLanguage("de");
    expect(wrapped.t("tab.title")).toBe("Intelligentes TPI (objet)");

    const withDefaultKey = defineTranslations({ default: "Default", other: "Other" }, { fr: async () => ({ default: "Par défaut" }) });
    await withDefaultKey.setLanguage("fr");
    expect(withDefaultKey.t("default")).toBe("Par défaut");
  });

  it("falls back to English when the loading fails, and records it", async () => {
    const translations = defineTranslations(en, {
      de: async () => {
        throw new Error("network down");
      },
    });
    await translations.setLanguage("de");
    expect(translations.t("tab.title")).toBe("Smart TPI");
    expect(translations.warnings).toEqual([{ code: "load_failed", language: "de", key: "", detail: "network down" }]);
  });
});

describe("types", () => {
  it("types the translation function with the keys of the English catalog", () => {
    const { t } = defineTranslations(en);
    expectTypeOf(t).parameter(0).toEqualTypeOf<"tab.title" | "tab.help" | "thermostats">();
    expect(t("tab.title")).toBe("Smart TPI");
    // @ts-expect-error this key is not in the English catalog
    expect(t("unknown.key")).toBe("unknown.key");
  });

  it("refuses an incomplete catalog declared complete, and an extra key", () => {
    // @ts-expect-error the key "thermostats" is missing
    const incomplete = { "tab.title": "a", "tab.help": "b" } satisfies CompleteCatalog<typeof en>;
    // @ts-expect-error the key "extra" is not in the English catalog
    const extra = { "tab.title": "a", "tab.help": "b", thermostats: "c", extra: "d" } satisfies CompleteCatalog<typeof en>;
    const complete = { "tab.title": "a", "tab.help": "b", thermostats: "c" } satisfies CompleteCatalog<typeof en>;
    expect([incomplete, extra, complete]).toHaveLength(3);
  });

  it("accepts a partial catalog for a third-party plugin, and refuses an unknown key in it", () => {
    const partial = { "tab.title": "a" } satisfies PartialCatalog<typeof en>;
    // @ts-expect-error the key "extra" is not in the English catalog
    const unknown = { extra: "a" } satisfies PartialCatalog<typeof en>;
    expect([partial, unknown]).toHaveLength(2);
  });

  it("refuses an unknown key in the catalogs given to defineTranslations", () => {
    // @ts-expect-error the key "extra" is not in the English catalog
    const translations = defineTranslations(en, { fr: { extra: "a" } });
    expect(translations).toBeDefined();
  });
});
