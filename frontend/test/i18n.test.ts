import { describe, expect, it, vi } from "vitest";

import { defineTranslations } from "@vtherm/dashboard-sdk";

import { createFormatters, createLanguageController, resolveLocalizedField, translateErrorCode, userLanguage } from "../src/i18n.ts";

const en = { "tab.title": "Smart TPI", "error.generic": "Unknown error ({code})", "error.unknown_entity": "This entity does not exist" } as const;
const fr = { "tab.title": "TPI intelligent", "error.generic": "Erreur inconnue ({code})", "error.unknown_entity": "Cette entité n'existe pas" };
const de = { "tab.title": "Intelligentes TPI", "error.generic": "Unbekannter Fehler ({code})", "error.unknown_entity": "Diese Entität existiert nicht" };

const hass = (language: string, locale?: Record<string, string>) => ({ language: "en", locale: { language, ...locale } });

describe("userLanguage", () => {
  it("uses the language of the profile, and the language of the interface when the profile has none", () => {
    expect(userLanguage({ language: "en", locale: { language: "fr" } })).toBe("fr");
    expect(userLanguage({ language: "de" })).toBe("de");
  });
});

describe("the language of the plugins", () => {
  it("shows the plugin in the language of the user, and in English for a language it does not provide", async () => {
    const translations = defineTranslations(en, { fr, de });
    const controller = createLanguageController(() => [translations], () => undefined);
    await controller.update(hass("de"));
    expect(translations.t("tab.title")).toBe("Intelligentes TPI");
    const other = defineTranslations(en, { fr });
    await createLanguageController(() => [other], () => undefined).update(hass("ja"));
    expect(other.t("tab.title")).toBe("Smart TPI");
  });

  it("updates the texts when the user changes language, without reloading, and tells the dashboard to show again", async () => {
    const translations = defineTranslations(en, { fr });
    const onChange = vi.fn();
    const controller = createLanguageController(() => [translations], onChange);
    expect(await controller.update(hass("en"))).toBe(true);
    expect(translations.t("tab.title")).toBe("Smart TPI");
    expect(await controller.update(hass("fr"))).toBe(true);
    expect(translations.t("tab.title")).toBe("TPI intelligent");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the language did not change", async () => {
    const translations = defineTranslations(en, { fr });
    const onChange = vi.fn();
    const controller = createLanguageController(() => [translations], onChange);
    await controller.update(hass("fr"));
    expect(await controller.update(hass("fr"))).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("gives the language to a plugin that registers later", async () => {
    const early = defineTranslations(en, { fr });
    const late = defineTranslations(en, { fr });
    const registered = [early];
    const controller = createLanguageController(() => registered, () => undefined);
    await controller.update(hass("fr"));
    registered.push(late);
    expect(await controller.update(hass("fr"))).toBe(true);
    expect(late.t("tab.title")).toBe("TPI intelligent");
  });

  it("falls back to English with a warning when the catalog cannot be loaded, and still shows the plugin", async () => {
    const translations = defineTranslations(en, {
      de: async () => {
        throw new Error("offline");
      },
    });
    await createLanguageController(() => [translations], () => undefined).update(hass("de"));
    expect(translations.t("tab.title")).toBe("Smart TPI");
    expect(translations.warnings).toEqual([{ code: "load_failed", language: "de", key: "", detail: "offline" }]);
  });
});

describe("regional formats", () => {
  it("uses the decimal separator of the language", () => {
    expect(createFormatters(hass("fr")).number(19.5)).toBe("19,5");
    expect(createFormatters(hass("en")).number(19.5)).toBe("19.5");
    expect(createFormatters(hass("de")).number(19.5)).toBe("19,5");
  });

  it("follows the number format that the user chose in Home Assistant", () => {
    expect(createFormatters(hass("fr", { number_format: "comma_decimal" })).number(1234.5)).toBe("1,234.5");
    expect(createFormatters(hass("en", { number_format: "decimal_comma" })).number(1234.5)).toBe("1.234,5");
    expect(createFormatters(hass("en", { number_format: "none" })).number(1234.5)).toBe("1234.5");
  });

  it("formats a temperature with the unit of Home Assistant", () => {
    expect(createFormatters(hass("fr")).temperature(19.5)).toBe("19,5 °C");
    expect(createFormatters({ ...hass("en"), config: { unit_system: { temperature: "°F" } } }).temperature(66.2)).toBe("66.2 °F");
    expect(createFormatters(hass("en")).temperature(19.46)).toBe("19.5 °C");
  });

  it("uses the 12 or 24 hours format of the user", () => {
    const evening = new Date(2026, 0, 15, 18, 5);
    expect(createFormatters(hass("en", { time_format: "12" })).time(evening)).toMatch(/6:05\s?PM/i);
    expect(createFormatters(hass("en", { time_format: "24" })).time(evening)).toBe("18:05");
    expect(createFormatters(hass("fr", { time_format: "24" })).dateTime(evening)).toContain("18:05");
  });

  it("does not fail on a language tag that is not valid", () => {
    expect(createFormatters(hass("not a tag")).number(1.5)).toBe("1.5");
  });
});

describe("the error codes of the server", () => {
  it("shows the translation of a known code", async () => {
    const translations = defineTranslations(en, { fr });
    await translations.setLanguage("fr");
    expect(translateErrorCode(translations, "unknown_entity")).toBe("Cette entité n'existe pas");
  });

  it("shows a generic translated message with the code when the code is not known", async () => {
    const translations = defineTranslations(en, { de });
    await translations.setLanguage("de");
    expect(translateErrorCode(translations, "never_seen")).toBe("Unbekannter Fehler (never_seen)");
  });
});

describe("remote content in several languages", () => {
  const entry = { description: "English text", description_fr: "Texte français", description_de: "Deutscher Text", description_pt_br: "Texto do Brasil", description_empty: "" };

  it("uses the language of the user, the base language, then English", () => {
    expect(resolveLocalizedField(entry, "description", "de")).toBe("Deutscher Text");
    expect(resolveLocalizedField(entry, "description", "fr-CA")).toBe("Texte français");
    expect(resolveLocalizedField(entry, "description", "pt-BR")).toBe("Texto do Brasil");
    expect(resolveLocalizedField(entry, "description", "pt_br")).toBe("Texto do Brasil");
    expect(resolveLocalizedField(entry, "description", "ja")).toBe("English text");
    expect(resolveLocalizedField(entry, "description", "en")).toBe("English text");
  });

  it("falls back to English when the text of the language is empty, and reports a missing text", () => {
    expect(resolveLocalizedField({ description: "English text", description_fr: "  " }, "description", "fr")).toBe("English text");
    expect(resolveLocalizedField({ name: "x" }, "description", "fr")).toBeUndefined();
    expect(resolveLocalizedField({ description_en: "From description_en" }, "description", "de")).toBe("From description_en");
  });
});
