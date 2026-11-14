/**
 * Translations of the plugins.
 *
 * Every text that a plugin shows comes from its catalogs. The English catalog is the source of truth: it gives the
 * keys, and the type of the translation function is built from them, so an unknown key does not compile. The other
 * languages can be partial, or complete for the plugins that must be (the native plugins).
 *
 * A key that is missing in the language of the user falls back to English, key by key. A key that is missing everywhere
 * is shown as it is and recorded as a warning.
 */

/** The plural categories that a language can use, as named by `Intl.PluralRules`. */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * A text with one form per plural category. `other` is required. The form is chosen with the parameter `count`.
 *
 * @example
 * `{ one: "{count} thermostat", other: "{count} thermostats" }`
 */
export interface PluralMessage {
  /** The form used when no other form applies. It is the only required one. */
  readonly other: string;
  /** The form for zero, in the languages that have one. */
  readonly zero?: string;
  /** The form for one, for example `{count} thermostat`. */
  readonly one?: string;
  /** The form for two, in the languages that have one. */
  readonly two?: string;
  /** The form for a few, in the languages that have one. */
  readonly few?: string;
  /** The form for many, in the languages that have one. */
  readonly many?: string;
}

/** A translated text: a string, or one string per plural category. The parameters are written `{name}`. */
export type Message = string | PluralMessage;

/** A catalog: the messages by key. A key is a dotted name such as `tab.title`. */
export type Catalog = { readonly [key: string]: Message };

/** A catalog of another language that has exactly the keys of the English catalog `English`. Use it with `satisfies`. */
export type CompleteCatalog<English extends Catalog> = { readonly [Key in keyof English]: Message };

/** A catalog of another language that has some of the keys of the English catalog `English`. Use it with `satisfies`. */
export type PartialCatalog<English extends Catalog> = { readonly [Key in keyof English]?: Message };

/** A function that loads the catalog of one language when it is needed, for example `() => import("./de.ts")`. */
export type CatalogLoader<English extends Catalog> = () => Promise<PartialCatalog<English> | CatalogModule<English>>;

/** A module whose default export is a catalog, as a dynamic `import()` returns it. */
export interface CatalogModule<English extends Catalog> {
  /** The catalog of the language. */
  readonly default: PartialCatalog<English>;
}

/** The catalogs of the languages other than English, by language tag (`fr`, `de`, `pt-BR`). */
export type OtherCatalogs<English extends Catalog> = { readonly [language: string]: PartialCatalog<English> | CatalogLoader<English> };

/** The values of the parameters of a text, by name. */
export type TranslationParams = Readonly<Record<string, string | number>>;

/** Something that went wrong while translating. It does not stop the display. */
export interface TranslationWarning {
  /** What happened: the key exists in no catalog, a parameter is missing, or a catalog could not be loaded. */
  readonly code: "missing_key" | "missing_param" | "load_failed";
  /** The language that was asked, or the language that failed to load. */
  readonly language: string;
  /** The key concerned. Empty for a catalog that failed to load. */
  readonly key: string;
  /** More information: the name of the missing parameter, or the error of the loader. */
  readonly detail?: string;
}

/** The translations of a plugin, created by `defineTranslations`. */
export interface Translations<Key extends string = string> {
  /** The English catalog, the source of the keys. */
  readonly english: Catalog;
  /** The catalogs of the other languages, as declared. */
  readonly catalogs: OtherCatalogs<Catalog>;
  /**
   * Translate a key into the current language of the user.
   *
   * @param key - A key of the English catalog. Any other key does not compile.
   * @param params - The values of the parameters of the text, and `count` for a plural text.
   */
  readonly t: (key: Key, params?: TranslationParams) => string;
  /** The language that is currently used, as set by the dashboard. `en` until then. */
  readonly language: string;
  /** Set the language and load the catalogs that it needs. The dashboard calls it, and shows the plugin again when it is done. */
  setLanguage(language: string): Promise<void>;
  /**
   * Translate a key into a given language, without changing the current language. The catalogs must be loaded.
   *
   * @param language - A language tag such as `fr` or `pt-BR`.
   * @param key - The key to translate.
   * @param params - The values of the parameters of the text.
   */
  resolve(language: string, key: string, params?: TranslationParams): string;
  /** The warnings that were recorded, without repetition. */
  readonly warnings: readonly TranslationWarning[];
}

/**
 * The translations of any plugin, whatever its keys. `t` takes the keys of one plugin, so this type is the one
 * that accepts all of them.
 */
export type AnyTranslations = Translations<never>;

/**
 * Compare language tags without regard to case or to the difference between `-` and `_`.
 *
 * @param tag - A language tag, for example `pt_BR`.
 * @returns The normalized tag, for example `pt-br`.
 */
export function normalizeLanguage(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * List the languages to try for a user language: the full tag, then the base language, then English.
 *
 * @param language - The language of the user, for example `pt-BR`.
 * @returns The normalized tags, for example `["pt-br", "pt", "en"]`.
 */
export function languageChain(language: string): string[] {
  const full = normalizeLanguage(language);
  const base = full.split("-")[0] ?? full;
  return [...new Set([full, base, "en"].filter((tag) => tag !== ""))];
}

function isLoader(value: unknown): value is CatalogLoader<Catalog> {
  return typeof value === "function";
}

/** Tell a module namespace, which is what a dynamic `import()` returns, from a catalog that has a key named `default`. */
function isModule(value: object): value is { readonly default: object } {
  return Object.prototype.toString.call(value) === "[object Module]" && "default" in value;
}

function pluralMessage(message: PluralMessage, language: string, count: number): string {
  const category: PluralCategory = new Intl.PluralRules(language).select(count);
  return message[category] ?? message.other;
}

/**
 * Declare the translations of a plugin.
 *
 * @param english - The English catalog. Its keys type the translation function. Declare it `as const`.
 * @param others - The catalogs of the other languages, by language tag: a catalog, or a loader that loads it when it is needed.
 * @returns The translations, to give to `registerUiPlugin`, with the function `t` to use in the components.
 *
 * @example
 * ```ts
 * const en = { "tab.title": "Smart TPI", "thermostats": { one: "{count} thermostat", other: "{count} thermostats" } } as const;
 * const fr = { "tab.title": "TPI intelligent" } satisfies PartialCatalog<typeof en>;
 * export const translations = defineTranslations(en, { fr });
 * export const { t } = translations;
 * ```
 */
export function defineTranslations<const English extends Catalog>(english: English, others: OtherCatalogs<English> = {}): Translations<Extract<keyof English, string>> {
  const loaded = new Map<string, Catalog>([["en", english]]);
  const loaders = new Map<string, CatalogLoader<Catalog>>();
  for (const [tag, catalog] of Object.entries(others)) {
    if (isLoader(catalog)) {
      loaders.set(normalizeLanguage(tag), catalog as CatalogLoader<Catalog>);
    } else {
      loaded.set(normalizeLanguage(tag), catalog as Catalog);
    }
  }
  const warnings: TranslationWarning[] = [];
  const seen = new Set<string>();
  let current = "en";

  const warn = (warning: TranslationWarning): void => {
    const id = `${warning.code}|${warning.language}|${warning.key}|${warning.detail ?? ""}`;
    if (!seen.has(id)) {
      seen.add(id);
      warnings.push(warning);
    }
  };

  const resolve = (language: string, key: string, params: TranslationParams = {}): string => {
    for (const tag of languageChain(language)) {
      const message = loaded.get(tag)?.[key];
      if (message === undefined) {
        continue;
      }
      let text: string;
      if (typeof message === "string") {
        text = message;
      } else {
        const count = params["count"];
        if (typeof count !== "number") {
          warn({ code: "missing_param", language, key, detail: "count" });
        }
        text = pluralMessage(message, tag, typeof count === "number" ? count : Number.NaN);
      }
      return text.replace(/\{(\w+)\}/g, (placeholder: string, name: string) => {
        const value = params[name];
        if (value === undefined) {
          warn({ code: "missing_param", language, key, detail: name });
          return placeholder;
        }
        return String(value);
      });
    }
    warn({ code: "missing_key", language, key });
    return key;
  };

  return {
    english,
    catalogs: others as OtherCatalogs<Catalog>,
    t: (key, params) => resolve(current, key, params),
    get language() {
      return current;
    },
    async setLanguage(language: string): Promise<void> {
      current = language;
      await Promise.all(
        languageChain(language)
          .filter((tag) => loaders.has(tag) && !loaded.has(tag))
          .map(async (tag) => {
            try {
              const result = await (loaders.get(tag) as CatalogLoader<Catalog>)();
              loaded.set(tag, isModule(result) ? (result.default as Catalog) : (result as Catalog));
            } catch (error) {
              // A language that cannot be loaded falls back to English, and is not tried again.
              loaders.delete(tag);
              warn({ code: "load_failed", language: tag, key: "", detail: error instanceof Error ? error.message : String(error) });
            }
          }),
      );
    },
    resolve,
    get warnings() {
      return warnings;
    },
  };
}
