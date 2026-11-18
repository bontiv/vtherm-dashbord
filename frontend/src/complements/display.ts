/** Pure helpers that decide how the name and the description of an add-on are shown. */

const EXPERIMENTAL_PREFIX = /^\s*\[experimental\]\s*/i;

/** A name as it is shown. */
export interface DisplayName {
  /** The name without the `[EXPERIMENTAL]` prefix. */
  readonly name: string;
  /** The name had the prefix, whatever its case. */
  readonly experimental: boolean;
}

/**
 * Take the `[EXPERIMENTAL]` prefix off the name of an add-on. The search keeps comparing with the full name.
 *
 * @param name - The name of the catalog.
 */
export function displayName(name: string): DisplayName {
  const stripped = name.replace(EXPERIMENTAL_PREFIX, "");
  return { name: stripped, experimental: stripped !== name };
}

/**
 * Whether a text of the catalog is shown in English although the user reads another language.
 *
 * @param language - The tag of the chosen text.
 * @param userTag - The language tag of the user.
 */
export function isEnglishFallback(language: string, userTag: string): boolean {
  return language.toLowerCase().split(/[-_]/)[0] === "en" && userTag.toLowerCase().split(/[-_]/)[0] !== "en";
}
