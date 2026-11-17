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
    "feature_intro.use_auto_start_stop_feature": {
      en: "Turns the device off when the room is warm enough and on again when it needs heat, to save energy.",
      fr: "Éteint l'appareil quand la pièce est assez chaude et le rallume quand elle a besoin de chaleur, pour économiser de l'énergie.",
      de: "Schaltet das Gerät aus, wenn der Raum warm genug ist, und wieder ein, wenn er Wärme braucht, um Energie zu sparen.",
    },
    "field.auto_start_stop_level": { en: "Auto start and stop level", fr: "Niveau d'allumage et d'extinction automatiques", de: "Stufe für automatisches Ein- und Ausschalten" },
  },
  core_window: {
    "feature_intro.use_window_feature": {
      en: "Turns the heating off, or lowers it, while a window is open: with a window sensor, or by detecting the fast drop of the temperature.",
      fr: "Coupe ou réduit le chauffage pendant qu'une fenêtre est ouverte : avec un capteur d'ouverture, ou en détectant la baisse rapide de la température.",
      de: "Schaltet die Heizung aus oder senkt sie ab, solange ein Fenster offen ist: mit einem Fenstersensor oder durch Erkennen des schnellen Temperaturabfalls.",
    },
  },
  core_motion: {
    "feature_intro.use_motion_feature": {
      en: "Changes the preset when someone moves in the room: comfort while there is activity, eco after a while without it.",
      fr: "Change de pré-réglage selon les mouvements dans la pièce : confort tant qu'il y a de l'activité, éco après un moment sans.",
      de: "Wechselt die Voreinstellung je nach Bewegung im Raum: Komfort bei Aktivität, Eco nach einer Weile ohne.",
    },
  },
  core_power: {
    "feature_intro.use_power_feature": {
      en: "Sheds the heating when the power of the home would go above its limit, so that the main switch does not trip.",
      fr: "Déleste le chauffage quand la puissance du logement dépasserait sa limite, pour éviter que le disjoncteur ne saute.",
      de: "Wirft die Heizung ab, wenn die Leistung des Hauses ihre Grenze überschreiten würde, damit die Hauptsicherung nicht auslöst.",
    },
  },
  core_presence: {
    "feature_intro.use_presence_feature": {
      en: "Uses the away temperatures of the presets while nobody is at home.",
      fr: "Utilise les températures d'absence des pré-réglages quand personne n'est à la maison.",
      de: "Verwendet die Abwesenheitstemperaturen der Voreinstellungen, wenn niemand zu Hause ist.",
    },
  },
  core_central_boiler: {
    "feature_intro.use_central_boiler_feature": {
      en: "Starts the central boiler when a thermostat needs heat and stops it when none does.",
      fr: "Démarre la chaudière centrale quand un thermostat a besoin de chauffer et l'arrête quand aucun n'en a besoin.",
      de: "Startet den zentralen Heizkessel, wenn ein Thermostat Wärme braucht, und stoppt ihn, wenn keiner sie braucht.",
    },
  },
  core_heating_failure: {
    "feature_intro.use_heating_failure_detection_feature": {
      en: "Warns when the temperature does not rise while the thermostat heats, or rises while it does not, as a broken heater would.",
      fr: "Prévient quand la température ne monte pas alors que le thermostat chauffe, ou monte alors qu'il ne chauffe pas, comme le ferait un radiateur en panne.",
      de: "Warnt, wenn die Temperatur nicht steigt, obwohl das Thermostat heizt, oder steigt, obwohl es nicht heizt, wie bei einem defekten Heizkörper.",
    },
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
