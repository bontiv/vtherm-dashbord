/**
 * Language of the dashboard: the language of the user, the texts of the plugins, the regional formats and the errors of the server.
 *
 * The language is the one of the profile of the user in Home Assistant. The plugins translate their own texts with their
 * catalogs (see the SDK). This module gives them the language, keeps them up to date when it changes, and formats the numbers,
 * the times and the temperatures with the regional settings of the user.
 */

import { languageChain } from "@vtherm/dashboard-sdk";
import type { AnyTranslations, Hass } from "@vtherm/dashboard-sdk";

/** What of the state of Home Assistant the language depends on. */
export type LanguageSource = Pick<Hass, "language" | "locale">;

/**
 * Return the language of the user.
 *
 * @param hass - The state of Home Assistant.
 * @returns The language of the profile, and the language of the interface when the profile has none.
 */
export function userLanguage(hass: LanguageSource): string {
  return hass.locale?.language ?? hass.language;
}

/** Keeps the translations of the plugins in the language of the user. */
export interface LanguageController {
  /**
   * Give the current language to the translations that do not have it yet, and load their catalogs.
   *
   * @param hass - The state of Home Assistant.
   * @returns Whether a text may have changed. The caller shows the dashboard again when it is true.
   */
  update(hass: LanguageSource): Promise<boolean>;
}

/**
 * Create the controller of the language.
 *
 * @param translations - Returns the translations of the registered plugins. It is read at each update, because plugins register over time.
 * @param onChange - Called when the language was applied to at least one plugin, to show the dashboard again without reloading the page.
 */
export function createLanguageController(translations: () => readonly AnyTranslations[], onChange: () => void): LanguageController {
  const applied = new WeakMap<AnyTranslations, string>();
  return {
    async update(hass: LanguageSource): Promise<boolean> {
      const language = userLanguage(hass);
      const pending = translations().filter((candidate) => applied.get(candidate) !== language);
      if (pending.length === 0) {
        return false;
      }
      for (const candidate of pending) {
        applied.set(candidate, language);
      }
      // A catalog that cannot be loaded does not reject: the plugin falls back to English and records a warning.
      await Promise.all(pending.map((candidate) => candidate.setLanguage(language)));
      onChange();
      return true;
    },
  };
}

/** The formats of the numbers, the times and the temperatures, as the user wants them. */
export interface Formatters {
  /** Format a number with the decimal separator of the user. */
  number(value: number, options?: Intl.NumberFormatOptions): string;
  /** Format a temperature with at most one decimal and the unit of Home Assistant. */
  temperature(value: number): string;
  /** Format a time of day with the 12 or 24 hours format of the user. */
  time(value: Date): string;
  /** Format a date and a time. */
  dateTime(value: Date): string;
}

/** The number formats of Home Assistant, and the language that gives each its separators. `undefined` is the language of the user. */
const NUMBER_LOCALES: Readonly<Record<string, string | undefined>> = {
  comma_decimal: "en-US",
  decimal_comma: "de",
  space_comma: "fr",
};

function validLocale(tag: string): string {
  try {
    return Intl.getCanonicalLocales(tag)[0] ?? "en";
  } catch {
    return "en";
  }
}

/**
 * Create the formatters of the user.
 *
 * @param hass - The state of Home Assistant: the language, the regional settings and the unit of the temperatures.
 */
export function createFormatters(hass: Pick<Hass, "language" | "locale" | "config">): Formatters {
  const language = validLocale(userLanguage(hass));
  const numberFormat = hass.locale?.number_format ?? "language";
  const numberLocale = numberFormat === "system" ? undefined : validLocale(NUMBER_LOCALES[numberFormat] ?? language);
  const useGrouping = numberFormat !== "none";
  const timeFormat = hass.locale?.time_format;
  const hour12 = timeFormat === "12" ? true : timeFormat === "24" ? false : undefined;
  const unit = hass.config?.unit_system?.temperature ?? "°C";

  const number = (value: number, options: Intl.NumberFormatOptions = {}): string => new Intl.NumberFormat(numberLocale, { useGrouping, ...options }).format(value);
  return {
    number,
    temperature: (value) => `${number(value, { maximumFractionDigits: 1 })} ${unit}`,
    time: (value) => new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit", ...(hour12 === undefined ? {} : { hour12 }) }).format(value),
    dateTime: (value) => new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short", ...(hour12 === undefined ? {} : { hour12 }) }).format(value),
  };
}

/** The key that holds the generic message for an error code that has no translation. */
export const GENERIC_ERROR_KEY = "error.generic";

/** The prefix of the keys that translate the error codes of the server: the code `unknown_entity` is the key `error.unknown_entity`. */
export const ERROR_KEY_PREFIX = "error.";

/**
 * Translate an error code of the server for the user.
 *
 * The server never sends text for the user, only stable codes. A code that has no key is shown with a generic translated message
 * and the code, so the user can report it.
 *
 * @param translations - The translations of the plugin whose form shows the error. They must have the key `error.generic`.
 * @param code - The error code, for example `unknown_entity`.
 */
export function translateErrorCode(translations: AnyTranslations, code: string): string {
  const key = `${ERROR_KEY_PREFIX}${code}`;
  const translate = translations.t as (key: string, params?: Readonly<Record<string, string | number>>) => string;
  return key in translations.english ? translate(key) : translate(GENERIC_ERROR_KEY, { code });
}

/**
 * Pick the text of a remote entry in the language of the user.
 *
 * A remote entry, such as one of the catalog of add-ons, has the English text in `field` and the other languages in
 * `field_<language>` (`description_fr`, `description_pt_br`). The chain is the same as for the catalogs of the plugins: the full
 * tag, the base language, then English.
 *
 * @param entry - The remote entry.
 * @param field - The name of the field, for example `description`.
 * @param language - The language of the user.
 * @returns The text, or undefined when the entry has no text in any language of the chain.
 */
export function resolveLocalizedField(entry: Readonly<Record<string, unknown>>, field: string, language: string): string | undefined {
  for (const tag of languageChain(language)) {
    const value = entry[tag === "en" ? field : `${field}_${tag.replace(/-/g, "_")}`];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  const english = entry[`${field}_en`];
  return typeof english === "string" && english.trim() !== "" ? english : undefined;
}
