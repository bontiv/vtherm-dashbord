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
export { CORE_MENU_GROUPS, CORE_TOP_TABS, createPlacementEngine, groupMenu, isCoreMenuGroup, resolveWidgetSize } from "./placement.js";
export type { CoreMenuGroups, CoreTopTabs, EngineIssue, MenuSection, PlacedEntry, PlacementEngine, PluginRelations, ResolvedWidgetSize, ShownContribution, TopTabZones } from "./placement.js";
export { VTHERM_DOMAIN, getEntryEntities } from "./entities.js";
export type { EntryEntities, EntryEntity } from "./entities.js";
export { selectorOf } from "./fields.js";
export type {
  BooleanField,
  DurationField,
  EntityField,
  EntityListField,
  FieldBase,
  FieldDefinition,
  FieldType,
  HaEmptySelector,
  HaEntityFilter,
  HaEntitySelector,
  HaNumberSelector,
  HaSelectSelector,
  HaSelector,
  HaTextSelector,
  NumberField,
  SelectField,
  SelectOption,
  TemplateField,
  TextField,
  TextListField,
  TimeField,
} from "./fields.js";
export { HA_CONTROLS, HA_SPINNERS, ensureHaControls, haControlsStatus } from "./ha-controls.js";
export { isSectionStatus, sectionStatusOf } from "./status.js";
export { DIAGRAM_IDS, FIELD_HELP_ELEMENT, isDiagramId } from "./field-help.js";
export type { DiagramId, FieldHelpProps } from "./field-help.js";
export type { ElementRegistry, HaControl, HaControlsOptions, HaControlsResult } from "./ha-controls.js";
