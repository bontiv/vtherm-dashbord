/**
 * The texts of the native plugins that the translations of Versatile Thermostat do not have, in English, French and German.
 *
 * `generate-native-catalogs.ts` adds them to the texts that it takes from Versatile Thermostat. Keep the three languages complete.
 */

/** A text in the three languages. */
export interface Text {
  readonly en: string;
  readonly fr: string;
  readonly de: string;
}

/** The texts of each plugin, by key. They come before the texts of Versatile Thermostat, so they can replace one. */
export const PLUGIN_TEXTS: Readonly<Record<string, Readonly<Record<string, Text>>>> = {
  core: {
    "top.dashboard": { en: "Dashboard", fr: "Tableau de bord", de: "Dashboard" },
    "top.thermostats": { en: "Thermostats", fr: "Thermostats", de: "Thermostate" },
    "top.configuration": { en: "Configuration", fr: "Configuration", de: "Konfiguration" },
    "page.overview": { en: "Overview", fr: "Vue d'ensemble", de: "Übersicht" },
    "page.thermostat_overview": { en: "Overview", fr: "Vue d'ensemble", de: "Übersicht" },
    "page.plugins": { en: "Plugins", fr: "Plugins", de: "Plugins" },
    "page.dev_plugins": { en: "Development", fr: "Développement", de: "Entwicklung" },
    "page.create_central": { en: "Central configuration", fr: "Configuration centrale", de: "Zentrale Konfiguration" },
    "group.dashboard": { en: "Dashboard", fr: "Tableau de bord", de: "Dashboard" },
    "option.proportional_function.tpi": { en: "TPI", fr: "TPI", de: "TPI" },
    "option.thermostat_type.thermostat_over_switch": { en: "Over a switch", fr: "Sur un interrupteur", de: "Über einen Schalter" },
    "option.thermostat_type.thermostat_over_climate": { en: "Over a climate", fr: "Sur un climate", de: "Über ein Climate" },
    "option.thermostat_type.thermostat_over_valve": { en: "Over a valve", fr: "Sur une vanne", de: "Über ein Ventil" },
    "option.thermostat_type.thermostat_central_config": { en: "Central configuration", fr: "Configuration centrale", de: "Zentrale Konfiguration" },
  },
  core_tpi: {
    "option.proportional_function.tpi": { en: "TPI", fr: "TPI", de: "TPI" },
  },
  core_valve_regulation: {
    "option.proportional_function.tpi": { en: "TPI", fr: "TPI", de: "TPI" },
  },
  core_auto_start_stop: {
    "field.auto_start_stop_level": { en: "Auto start and stop level", fr: "Niveau d'allumage et d'extinction automatiques", de: "Stufe für automatisches Ein- und Ausschalten" },
  },
};

/** The texts that every native plugin has. */
export const COMMON_TEXTS: Readonly<Record<string, Text>> = {
  "group.vtherm": { en: "Versatile Thermostat", fr: "Versatile Thermostat", de: "Versatile Thermostat" },
};

/** The messages of the error codes that the translations of Versatile Thermostat do not have, and the generic message. */
export const ERROR_TEXTS: Readonly<Record<string, Text>> = {
  generic: { en: "The value was refused ({code}).", fr: "La valeur a été refusée ({code}).", de: "Der Wert wurde abgelehnt ({code})." },
  lock_code_incorrect: { en: "The lock code must be made of four digits.", fr: "Le code de verrouillage doit comporter quatre chiffres.", de: "Der Sperrcode muss aus vier Ziffern bestehen." },
  configuration_not_complete: {
    en: "The configuration is not complete: a required element is missing.",
    fr: "La configuration est incomplète : un élément obligatoire manque.",
    de: "Die Konfiguration ist unvollständig: Ein erforderliches Element fehlt.",
  },
  required: { en: "This field is required.", fr: "Ce champ est obligatoire.", de: "Dieses Feld ist erforderlich." },
  invalid_value: { en: "This value is not valid.", fr: "Cette valeur n'est pas valide.", de: "Dieser Wert ist ungültig." },
  field_not_applicable: {
    en: "This field does not apply to this configuration and was not saved.",
    fr: "Ce champ ne s'applique pas à cette configuration et n'a pas été enregistré.",
    de: "Dieses Feld gilt nicht für diese Konfiguration und wurde nicht gespeichert.",
  },
  tab_unavailable: { en: "This section does not apply to this thermostat.", fr: "Cette section ne s'applique pas à ce thermostat.", de: "Dieser Abschnitt gilt nicht für dieses Thermostat." },
  unknown_tab: { en: "This section does not exist.", fr: "Cette section n'existe pas.", de: "Dieser Abschnitt existiert nicht." },
  not_found: { en: "This configuration no longer exists.", fr: "Cette configuration n'existe plus.", de: "Diese Konfiguration existiert nicht mehr." },
  config_version_unsupported: {
    en: "This configuration was made by a newer Versatile Thermostat and cannot be changed here.",
    fr: "Cette configuration provient d'une version plus récente de Versatile Thermostat et ne peut pas être modifiée ici.",
    de: "Diese Konfiguration stammt von einer neueren Version von Versatile Thermostat und kann hier nicht geändert werden.",
  },
  central_config_exists: { en: "A central configuration already exists.", fr: "Une configuration centrale existe déjà.", de: "Es gibt bereits eine zentrale Konfiguration." },
  unknown_thermostat_type: { en: "This type of thermostat does not exist.", fr: "Ce type de thermostat n'existe pas.", de: "Dieser Thermostattyp existiert nicht." },
  flow_failed: {
    en: "Versatile Thermostat did not accept the configuration.",
    fr: "Versatile Thermostat n'a pas accepté la configuration.",
    de: "Versatile Thermostat hat die Konfiguration nicht angenommen.",
  },
  out_of_range: { en: "The temperature is outside the allowed range.", fr: "La température est hors des limites autorisées.", de: "Die Temperatur liegt außerhalb des zulässigen Bereichs." },
  unknown_preset: { en: "This preset does not exist.", fr: "Ce pré-réglage n'existe pas.", de: "Diese Voreinstellung existiert nicht." },
  preset_rejected: { en: "Home Assistant refused this temperature.", fr: "Home Assistant a refusé cette température.", de: "Home Assistant hat diese Temperatur abgelehnt." },
  preset_not_applied: {
    en: "The thermostat was not ready and kept its previous temperature.",
    fr: "Le thermostat n'était pas prêt et a gardé sa température précédente.",
    de: "Das Thermostat war nicht bereit und hat seine vorherige Temperatur behalten.",
  },
};
