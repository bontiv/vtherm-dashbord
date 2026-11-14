/**
 * Public entry point of the SDK for the plugins of the Versatile Thermostat dashboard.
 *
 * @packageDocumentation
 */

export * from "./types.js";
export { UiPluginValidationError, assertValidDefinition, validateDefinition } from "./validation.js";
export type { ValidationIssue } from "./validation.js";
export { DashboardNotFoundError, getDashboardVersion, registerUiPlugin } from "./registry.js";
export type { UiPluginRegistry } from "./registry.js";
export { defineTranslations, languageChain, normalizeLanguage } from "./translations.js";
export type {
  AnyTranslations,
  Catalog,
  CatalogLoader,
  CatalogModule,
  CompleteCatalog,
  Message,
  OtherCatalogs,
  PartialCatalog,
  PluralCategory,
  PluralMessage,
  TranslationParams,
  TranslationWarning,
  Translations,
} from "./translations.js";
