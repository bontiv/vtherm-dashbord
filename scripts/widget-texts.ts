/**
 * The texts of the native widgets of the overview of a thermostat, in English, French and German.
 *
 * `native-texts.ts` gives the texts of each widget to the plugin that declares it. A code of Versatile Thermostat that has no text here
 * (a newer version) is shown as it is.
 */

import type { Text } from "./native-texts.ts";

/** The texts of the widgets of `core`: the temperature, the mode and the action, and the alerts. */
export const CORE_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.temperature.title": { en: "Temperature", fr: "Température", de: "Temperatur" },
  "widget.temperature.room": { en: "Room temperature", fr: "Température de la pièce", de: "Raumtemperatur" },
  "widget.temperature.setpoint": { en: "setpoint", fr: "consigne", de: "Sollwert" },
  "widget.temperature.outdoor": { en: "Outdoor", fr: "Extérieure", de: "Außen" },
  "widget.temperature.requested": { en: "Requested → applied", fr: "Demandée → appliquée", de: "Angefordert → angewendet" },
  "widget.temperature.regulated": { en: "Regulated setpoint", fr: "Consigne régulée", de: "Geregelter Sollwert" },

  "widget.mode.title": { en: "Mode and action", fr: "Mode et action", de: "Modus und Aktion" },
  "widget.mode.hvac.heat": { en: "Heating", fr: "Chauffage", de: "Heizen" },
  "widget.mode.hvac.cool": { en: "Cooling", fr: "Climatisation", de: "Kühlen" },
  "widget.mode.hvac.off": { en: "Off", fr: "Arrêt", de: "Aus" },
  "widget.mode.hvac.auto": { en: "Auto", fr: "Auto", de: "Auto" },
  "widget.mode.hvac.heat_cool": { en: "Heat and cool", fr: "Chaud et froid", de: "Heizen und Kühlen" },
  "widget.mode.hvac.dry": { en: "Dry", fr: "Déshumidification", de: "Entfeuchten" },
  "widget.mode.hvac.fan_only": { en: "Fan only", fr: "Ventilation seule", de: "Nur Lüfter" },
  "widget.mode.action.heating": { en: "Heating now", fr: "En chauffe", de: "Heizt gerade" },
  "widget.mode.action.preheating": { en: "Preheating", fr: "En préchauffe", de: "Vorheizen" },
  "widget.mode.action.cooling": { en: "Cooling now", fr: "En climatisation", de: "Kühlt gerade" },
  "widget.mode.action.drying": { en: "Drying", fr: "En déshumidification", de: "Entfeuchtet" },
  "widget.mode.action.fan": { en: "Fan", fr: "Ventilation", de: "Lüftet" },
  "widget.mode.action.idle": { en: "Idle", fr: "Au repos", de: "Leerlauf" },
  "widget.mode.action.off": { en: "Stopped", fr: "Arrêté", de: "Gestoppt" },
  "widget.mode.sleeping": { en: "Sleep mode", fr: "En veille", de: "Schlafmodus" },
  "widget.mode.central": { en: "Central mode: {mode}", fr: "Mode central : {mode}", de: "Zentraler Modus: {mode}" },
  "widget.mode.central_mode.Auto": { en: "Auto", fr: "Auto", de: "Auto" },
  "widget.mode.central_mode.Stopped": { en: "Stopped", fr: "Arrêté", de: "Gestoppt" },
  "widget.mode.central_mode.Heat only": { en: "Heat only", fr: "Chauffage seul", de: "Nur Heizen" },
  "widget.mode.central_mode.Cool only": { en: "Cool only", fr: "Climatisation seule", de: "Nur Kühlen" },
  "widget.mode.central_mode.Frost protection": { en: "Frost protection", fr: "Hors-gel", de: "Frostschutz" },
  "widget.reason.hvac_off_manual": { en: "Turned off by hand", fr: "Arrêté à la main", de: "Von Hand ausgeschaltet" },
  "widget.reason.hvac_off_auto_start_stop": { en: "Stopped by auto start and stop", fr: "Arrêté par l'arrêt-relance automatique", de: "Durch Auto-Start/Stopp gestoppt" },
  "widget.reason.hvac_off_window_detection": { en: "Window open", fr: "Fenêtre ouverte", de: "Fenster offen" },
  "widget.reason.hvac_off_sleep_mode": { en: "Sleep mode", fr: "Mode veille", de: "Schlafmodus" },
  "widget.reason.hvac_off_safety_detection": { en: "Safety mode", fr: "Mode sécurité", de: "Sicherheitsmodus" },
  "widget.reason.hvac_off_central_mode": { en: "Central mode", fr: "Mode central", de: "Zentraler Modus" },
  "widget.reason.hvac_off_inhibition": { en: "Control withdrawn by a plugin", fr: "Contrôle retiré par un plugin", de: "Steuerung durch ein Plugin entzogen" },
  "widget.reason.hvac_fan_only_auto_start_stop": { en: "Fan only by auto start and stop", fr: "Ventilation par l'arrêt-relance automatique", de: "Nur Lüfter durch Auto-Start/Stopp" },
  "widget.reason.hvac_dry_auto_start_stop": { en: "Dry by auto start and stop", fr: "Déshumidification par l'arrêt-relance automatique", de: "Entfeuchten durch Auto-Start/Stopp" },

  "widget.alerts.title": { en: "Alerts", fr: "Alertes", de: "Warnungen" },
  "widget.alerts.none": { en: "No alert", fr: "Aucune alerte", de: "Keine Warnung" },
  "widget.alerts.not_ready": { en: "Thermostat not ready", fr: "Thermostat pas prêt", de: "Thermostat nicht bereit" },
  "widget.alerts.inhibited": { en: "Control withdrawn by a plugin", fr: "Contrôle retiré par un plugin", de: "Steuerung durch ein Plugin entzogen" },
  "widget.alerts.room_measure": { en: "Room measure", fr: "Mesure intérieure", de: "Innenmessung" },
  "widget.alerts.outdoor_measure": { en: "Outdoor measure", fr: "Mesure extérieure", de: "Außenmessung" },
  "widget.alerts.old_measure": { en: "{label}: old", fr: "{label} : ancienne", de: "{label}: veraltet" },
  "widget.alerts.message.overpowering_detected": { en: "Load shedding active", fr: "Délestage actif", de: "Lastabwurf aktiv" },
  "widget.alerts.message.safety_detected": { en: "Safety mode active", fr: "Mode sécurité actif", de: "Sicherheitsmodus aktiv" },
  "widget.alerts.message.target_temp_window_eco": { en: "Window open: eco setpoint", fr: "Fenêtre ouverte : consigne éco", de: "Fenster offen: Eco-Sollwert" },
  "widget.alerts.message.target_temp_window_frost": { en: "Window open: frost protection setpoint", fr: "Fenêtre ouverte : consigne hors-gel", de: "Fenster offen: Frostschutz-Sollwert" },
  "widget.alerts.message.target_temp_power": { en: "Setpoint lowered by load shedding", fr: "Consigne abaissée par le délestage", de: "Sollwert durch Lastabwurf gesenkt" },
  "widget.alerts.message.target_temp_central_mode": { en: "Setpoint set by the central mode", fr: "Consigne imposée par le mode central", de: "Sollwert durch den zentralen Modus vorgegeben" },
  "widget.alerts.message.target_temp_activity_detected": { en: "Motion detected", fr: "Mouvement détecté", de: "Bewegung erkannt" },
  "widget.alerts.message.target_temp_activity_not_detected": { en: "No motion", fr: "Aucun mouvement", de: "Keine Bewegung" },
  "widget.alerts.message.target_temp_absence_detected": { en: "Absence detected", fr: "Absence détectée", de: "Abwesenheit erkannt" },
  "widget.alerts.message.target_temp_timed_preset": { en: "Setpoint of a timed preset", fr: "Consigne d'un preset temporisé", de: "Sollwert einer zeitlich begrenzten Voreinstellung" },
  "widget.alerts.message.not_initialized": { en: "Thermostat not ready: equipment not initialized", fr: "Thermostat pas prêt : équipement non initialisé", de: "Thermostat nicht bereit: Gerät nicht initialisiert" },
  "widget.alerts.message.underlying_unavailable": { en: "Equipment unavailable", fr: "Équipement indisponible", de: "Gerät nicht verfügbar" },
};

/** The texts of the widget of `core_tpi`: the heating share and the cycle. */
export const TPI_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.heating.title": { en: "Heating", fr: "Chauffe", de: "Heizung" },
  "widget.heating.power": { en: "Heating share", fr: "Puissance demandée", de: "Heizanteil" },
  "widget.heating.cycle": { en: "Cycle", fr: "Cycle", de: "Zyklus" },
  "widget.heating.on": { en: "ON", fr: "ON", de: "EIN" },
  "widget.heating.off": { en: "OFF", fr: "OFF", de: "AUS" },
};

/** The texts of the widget of `core_valve_regulation`: the opening of the valves. */
export const VALVE_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.valve.title": { en: "Valve", fr: "Vanne", de: "Ventil" },
  "widget.valve.opening": { en: "Opening", fr: "Ouverture", de: "Öffnung" },
};

/** The texts of the widget of `core_presets`: the preset, the timed preset and the manual override. */
export const PRESET_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.preset.title": { en: "Preset", fr: "Preset", de: "Voreinstellung" },
  "widget.preset.name.none": { en: "No preset", fr: "Aucun preset", de: "Keine Voreinstellung" },
  "widget.preset.name.frost": { en: "Frost protection", fr: "Hors-gel", de: "Frostschutz" },
  "widget.preset.name.eco": { en: "Eco", fr: "Éco", de: "Eco" },
  "widget.preset.name.comfort": { en: "Comfort", fr: "Confort", de: "Komfort" },
  "widget.preset.name.boost": { en: "Boost", fr: "Boost", de: "Boost" },
  "widget.preset.name.safety": { en: "Safety", fr: "Sécurité", de: "Sicherheit" },
  "widget.preset.name.power": { en: "Load shedding", fr: "Délestage", de: "Lastabwurf" },
  "widget.preset.name.activity": { en: "Activity", fr: "Activité", de: "Aktivität" },
  "widget.preset.timed": { en: "Timed: {preset}", fr: "Temporisé : {preset}", de: "Zeitlich begrenzt: {preset}" },
  "widget.preset.remaining": { en: "{minutes} min left", fr: "{minutes} min restantes", de: "noch {minutes} Min." },
  "widget.preset.ends": { en: "ends at {time}", fr: "fin à {time}", de: "endet um {time}" },
  "widget.preset.manual_override": { en: "Manual override", fr: "Dérogation manuelle", de: "Manuelle Übersteuerung" },
  "widget.preset.resume": { en: "resumes: {preset}", fr: "reprise : {preset}", de: "danach: {preset}" },
};

/** The texts of the widget of `core_advanced`: the safety mode. */
export const SAFETY_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.safety.title": { en: "Safety", fr: "Sécurité", de: "Sicherheit" },
  "widget.safety.normal": { en: "Normal", fr: "Normal", de: "Normal" },
  "widget.safety.active": { en: "Safety mode active", fr: "Mode sécurité actif", de: "Sicherheitsmodus aktiv" },
  "widget.safety.imposed": { en: "Imposed heating share", fr: "Part de chauffe imposée", de: "Vorgegebener Heizanteil" },
};

/** The texts of the widgets of `core` on the Overview page: the central mode, the summary of the thermostats and the outdoor temperature. */
export const CORE_GLOBAL_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.central_mode.title": { en: "Central mode", fr: "Mode central", de: "Zentraler Modus" },

  "widget.summary.title": { en: "Thermostats", fr: "Thermostats", de: "Thermostate" },
  "widget.summary.count": { en: "{count} thermostats", fr: "{count} thermostats", de: "{count} Thermostate" },
  "widget.summary.heating": { en: "Heating", fr: "En chauffe", de: "Heizen" },
  "widget.summary.cooling": { en: "Cooling", fr: "En climatisation", de: "Kühlen" },
  "widget.summary.idle": { en: "Idle", fr: "Au repos", de: "Leerlauf" },
  "widget.summary.off": { en: "Off", fr: "Éteints", de: "Aus" },
  "widget.summary.unavailable": { en: "Unavailable", fr: "Indisponibles", de: "Nicht verfügbar" },
  "widget.summary.alerts": { en: "Thermostats in alert", fr: "Thermostats en alerte", de: "Thermostate mit Warnung" },
  "widget.summary.in_alert": { en: "In alert", fr: "En alerte", de: "Warnung" },
  "widget.summary.heating_failure": { en: "Heating failure", fr: "Panne de chauffage", de: "Heizungsausfall" },
  "widget.summary.cooling_failure": { en: "Cooling failure", fr: "Panne de refroidissement", de: "Kühlungsausfall" },

  "widget.outdoor.title": { en: "Outdoor temperature", fr: "Température extérieure", de: "Außentemperatur" },
  "widget.outdoor.curve": { en: "Outdoor temperature over 24 hours", fr: "Température extérieure sur 24 heures", de: "Außentemperatur über 24 Stunden" },
};

/** The texts of the widgets of `core_central_boiler`: the boiler and the power asked of it. */
export const BOILER_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.boiler.title": { en: "Central boiler", fr: "Chaudière centrale", de: "Zentraler Heizkessel" },
  "widget.boiler.on": { en: "Boiler on", fr: "Chaudière allumée", de: "Heizkessel an" },
  "widget.boiler.off": { en: "Boiler off", fr: "Chaudière éteinte", de: "Heizkessel aus" },
  "widget.boiler.not_ready": { en: "Boiler not ready", fr: "Chaudière non prête", de: "Heizkessel nicht bereit" },
  "widget.boiler.scheduled": { en: "Activation in {seconds} s", fr: "Activation dans {seconds} s", de: "Aktivierung in {seconds} s" },
  "widget.boiler.devices": { en: "Active devices", fr: "Équipements actifs", de: "Aktive Geräte" },
  "widget.boiler.threshold": { en: "threshold", fr: "seuil", de: "Schwelle" },
  "widget.boiler.requesters": { en: "Thermostats that call the boiler", fr: "Thermostats qui appellent la chaudière", de: "Thermostate, die den Heizkessel anfordern" },
  "widget.boiler.no_requester": { en: "No thermostat calls the boiler", fr: "Aucun thermostat n'appelle la chaudière", de: "Kein Thermostat fordert den Heizkessel an" },

  "widget.boiler_power.title": { en: "Power asked of the boiler", fr: "Puissance demandée à la chaudière", de: "Vom Heizkessel angeforderte Leistung" },
  "widget.boiler_power.power": { en: "Power asked", fr: "Puissance demandée", de: "Angeforderte Leistung" },
  "widget.boiler_power.threshold": { en: "threshold", fr: "seuil", de: "Schwelle" },
};

/** The texts of the widget of `core_power`: the power of the home. */
export const POWER_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.house_power.title": { en: "Power of the home", fr: "Puissance du logement", de: "Leistung des Hauses" },
  "widget.house_power.power": { en: "Power now", fr: "Puissance actuelle", de: "Aktuelle Leistung" },
  "widget.house_power.margin": { en: "Margin: {value}", fr: "Marge : {value}", de: "Reserve: {value}" },
  "widget.house_power.overrun": { en: "Over by {value}", fr: "Dépassement de {value}", de: "Überschreitung um {value}" },
  "widget.house_power.energy": { en: "Energy of the thermostats: {value}", fr: "Énergie des thermostats : {value}", de: "Energie der Thermostate: {value}" },
  "widget.house_power.calculated": { en: "Calculated by the dashboard", fr: "Calculé par le tableau de bord", de: "Vom Dashboard berechnet" },
};

/** The texts of the widget of `core_presence`: the presence at home. */
export const PRESENCE_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.presence.title": { en: "Presence", fr: "Présence", de: "Anwesenheit" },
  "widget.presence.present": { en: "Present", fr: "Présent", de: "Anwesend" },
  "widget.presence.absent": { en: "Absent", fr: "Absent", de: "Abwesend" },
  "widget.presence.unknown": { en: "Unknown", fr: "Inconnu", de: "Unbekannt" },
};

/** The texts of the widget of `core_window`: the window, its automatic detection, the bypass and the effect of an open window. */
export const WINDOW_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.window.title": { en: "Window", fr: "Fenêtre", de: "Fenster" },
  "widget.window.open": { en: "Open", fr: "Ouverte", de: "Offen" },
  "widget.window.closed": { en: "Closed", fr: "Fermée", de: "Geschlossen" },
  "widget.window.unknown": { en: "Unknown", fr: "Inconnu", de: "Unbekannt" },
  "widget.window.auto_open": { en: "Drop of temperature: open", fr: "Chute de température : ouverte", de: "Temperaturabfall: offen" },
  "widget.window.auto_closed": { en: "No drop of temperature", fr: "Aucune chute de température", de: "Kein Temperaturabfall" },
  "widget.window.auto_unknown": { en: "Automatic detection: unknown", fr: "Détection automatique : inconnue", de: "Automatische Erkennung: unbekannt" },
  "widget.window.bypass": { en: "Bypass active", fr: "Contournement actif", de: "Umgehung aktiv" },
  "widget.window.effect": { en: "Effect", fr: "Effet", de: "Wirkung" },
  "widget.window.effect.off": { en: "Off", fr: "Arrêt", de: "Aus" },
  "widget.window.effect.eco": { en: "Eco", fr: "Éco", de: "Eco" },
  "widget.window.effect.frost": { en: "Frost protection", fr: "Hors-gel", de: "Frostschutz" },
  "widget.window.effect.fan_only": { en: "Fan only", fr: "Ventilation", de: "Nur Lüfter" },
  "widget.window.effect.none": { en: "None", fr: "Aucun", de: "Keine" },
};

/** The texts of the widget of `core_motion`: the motion and the preset of activity. */
export const MOTION_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.motion.title": { en: "Motion", fr: "Mouvement", de: "Bewegung" },
  "widget.motion.detected": { en: "Motion", fr: "Mouvement", de: "Bewegung" },
  "widget.motion.none": { en: "No motion", fr: "Aucun mouvement", de: "Keine Bewegung" },
  "widget.motion.unknown": { en: "Unknown", fr: "Inconnu", de: "Unbekannt" },
  "widget.motion.activity": { en: "Activity preset in force", fr: "Preset d'activité en vigueur", de: "Aktivitätsvoreinstellung aktiv" },
};

/** The texts of the widget of `core_power` in the overview of a thermostat: the load shedding. */
export const OVERPOWERING_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.overpowering.title": { en: "Load shedding", fr: "Délestage", de: "Lastabwurf" },
  "widget.overpowering.active": { en: "Load shedding active", fr: "Délestage actif", de: "Lastabwurf aktiv" },
  "widget.overpowering.inactive": { en: "No load shedding", fr: "Pas de délestage", de: "Kein Lastabwurf" },
  "widget.overpowering.unknown": { en: "Unknown", fr: "Inconnu", de: "Unbekannt" },
};

/** The texts of the widget of `core_auto_start_stop`: the automatic stop, the feature and its accumulated error. */
export const AUTO_START_STOP_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.auto_start_stop.title": { en: "Auto start and stop", fr: "Arrêt et démarrage automatiques", de: "Automatischer Start und Stopp" },
  "widget.auto_start_stop.stopped": { en: "Automatic stop", fr: "Arrêt automatique", de: "Automatischer Stopp" },
  "widget.auto_start_stop.running": { en: "No automatic stop", fr: "Pas d'arrêt automatique", de: "Kein automatischer Stopp" },
  "widget.auto_start_stop.enabled": { en: "Enabled", fr: "Activée", de: "Aktiviert" },
  "widget.auto_start_stop.disabled": { en: "Disabled", fr: "Désactivée", de: "Deaktiviert" },
  "widget.auto_start_stop.error": { en: "Accumulated error", fr: "Erreur accumulée", de: "Kumulierter Fehler" },
  "widget.auto_start_stop.threshold": { en: "threshold", fr: "seuil", de: "Schwelle" },
  "widget.auto_start_stop.last_switch": { en: "Last switch", fr: "Dernier basculement", de: "Letzter Wechsel" },
};

/** The texts of the widget of `core_lock`: the lock. */
export const LOCK_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.lock.title": { en: "Lock", fr: "Verrouillage", de: "Sperre" },
  "widget.lock.locked": { en: "Locked", fr: "Verrouillé", de: "Gesperrt" },
  "widget.lock.unlocked": { en: "Unlocked", fr: "Libre", de: "Entsperrt" },
};

/** The texts of the widget of `core_heating_failure`: the failures, their cause, the checks in progress and the paused detection. */
export const FAILURE_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.failure.title": { en: "Heating failure", fr: "Panne de chauffage", de: "Heizungsausfall" },
  "widget.failure.heating": { en: "Heating failure", fr: "Panne de chauffage", de: "Heizungsausfall" },
  "widget.failure.cooling": { en: "Cooling failure", fr: "Panne de refroidissement", de: "Kühlungsausfall" },
  "widget.failure.none": { en: "No failure", fr: "Aucune panne", de: "Kein Ausfall" },
  "widget.failure.tracking.heating": { en: "Check of the heating", fr: "Vérification de la chauffe", de: "Prüfung der Heizung" },
  "widget.failure.tracking.cooling": { en: "Check of the cooling", fr: "Vérification du refroidissement", de: "Prüfung der Kühlung" },
  "widget.failure.progress": { en: "{elapsed} min elapsed, {remaining} min left", fr: "{elapsed} min écoulées, {remaining} min restantes", de: "{elapsed} Min. vergangen, noch {remaining} Min." },
  "widget.failure.cause": { en: "Probable cause: {cause}", fr: "Cause probable : {cause}", de: "Wahrscheinliche Ursache: {cause}" },
  "widget.failure.cause.not_identified": { en: "not identified", fr: "non identifiée", de: "nicht ermittelt" },
  "widget.failure.cause.valve_stuck_closed": { en: "valve stuck closed", fr: "vanne bloquée fermée", de: "Ventil klemmt geschlossen" },
  "widget.failure.cause.valve_stuck_open": { en: "valve stuck open", fr: "vanne bloquée ouverte", de: "Ventil klemmt offen" },
  "widget.failure.more_info": { en: "More info", fr: "Plus d'infos", de: "Weitere Infos" },
  "widget.failure.paused": { en: "Detection paused by the template", fr: "Détection suspendue par le modèle", de: "Erkennung durch die Vorlage pausiert" },
};

/** The texts of the widgets of details of `core`: the history of 24 hours and the equipment. */
export const CORE_DETAIL_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.history.title": { en: "Last 24 hours", fr: "Dernières 24 heures", de: "Letzte 24 Stunden" },
  "widget.history.temperatures": { en: "Temperatures over 24 hours", fr: "Températures sur 24 heures", de: "Temperaturen über 24 Stunden" },
  "widget.history.room": { en: "Room", fr: "Pièce", de: "Raum" },
  "widget.history.setpoint": { en: "Setpoint", fr: "Consigne", de: "Sollwert" },
  "widget.history.outdoor": { en: "Outdoor", fr: "Extérieure", de: "Außen" },
  "widget.history.power_chart": { en: "Heating share over 24 hours", fr: "Puissance demandée sur 24 heures", de: "Heizanteil über 24 Stunden" },
  "widget.history.power": { en: "Heating share", fr: "Puissance demandée", de: "Heizanteil" },

  "widget.devices.title": { en: "Equipment", fr: "Équipements", de: "Geräte" },
  "widget.devices.active": { en: "{count} active", fr: "{count} actif(s)", de: "{count} aktiv" },
  "widget.devices.inactive": { en: "No active equipment", fr: "Aucun équipement actif", de: "Kein aktives Gerät" },
  "widget.devices.expected": { en: "Expected active, off", fr: "Attendu actif, éteint", de: "Sollte aktiv sein, ist aus" },
  "widget.devices.fan": { en: "Fan: {mode}", fr: "Ventilation : {mode}", de: "Lüfter: {mode}" },
  "widget.devices.fan.auto": { en: "Auto", fr: "Auto", de: "Auto" },
  "widget.devices.fan.low": { en: "Low", fr: "Faible", de: "Niedrig" },
  "widget.devices.fan.medium": { en: "Medium", fr: "Moyenne", de: "Mittel" },
  "widget.devices.fan.high": { en: "High", fr: "Forte", de: "Hoch" },
  "widget.devices.fan.on": { en: "On", fr: "Marche", de: "An" },
  "widget.devices.fan.off": { en: "Off", fr: "Arrêt", de: "Aus" },
};

/** The texts of the widget of the learning of Auto TPI of `core_tpi`. */
export const AUTO_TPI_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.auto_tpi.title": { en: "Auto TPI learning", fr: "Apprentissage Auto TPI", de: "Auto-TPI-Lernen" },
  "widget.auto_tpi.state.active": { en: "Active", fr: "Actif", de: "Aktiv" },
  "widget.auto_tpi.state.bootstrap": { en: "Starting", fr: "Démarrage", de: "Start" },
  "widget.auto_tpi.state.off": { en: "Stopped", fr: "Arrêté", de: "Gestoppt" },
  "widget.auto_tpi.state.disabled": { en: "Disabled", fr: "Désactivé", de: "Deaktiviert" },
  "widget.auto_tpi.cycles": { en: "Heating cycles", fr: "Cycles de chauffe", de: "Heizzyklen" },
  "widget.auto_tpi.cycles_count": { en: "{count} cycles", fr: "{count} cycles", de: "{count} Zyklen" },
  "widget.auto_tpi.cycles_by_coef": { en: "Cycles learned", fr: "Cycles appris", de: "Gelernte Zyklen" },
  "widget.auto_tpi.cycles_value": { en: "int {int} · ext {ext}", fr: "int {int} · ext {ext}", de: "int {int} · ext {ext}" },
  "widget.auto_tpi.coefficients": { en: "Coefficients", fr: "Coefficients", de: "Koeffizienten" },
  "widget.auto_tpi.coefficients_value": { en: "coef. int {int} · coef. ext {ext}", fr: "coef. int {int} · coef. ext {ext}", de: "Koef. int {int} · Koef. ext {ext}" },
  "widget.auto_tpi.confidence": { en: "Confidence of the model", fr: "Confiance du modèle", de: "Vertrauen in das Modell" },
  "widget.auto_tpi.time_constant": { en: "Thermal time constant", fr: "Constante de temps thermique", de: "Thermische Zeitkonstante" },
  "widget.auto_tpi.capacity_learned": {
    en: "Heating capacity learned: {value} ({count} measures)",
    fr: "Capacité de chauffe apprise : {value} ({count} mesures)",
    de: "Heizleistung gelernt: {value} ({count} Messungen)",
  },
  "widget.auto_tpi.capacity_learning": {
    en: "Heating capacity being learned: {value} ({count} measures)",
    fr: "Capacité de chauffe en apprentissage : {value} ({count} mesures)",
    de: "Heizleistung wird gelernt: {value} ({count} Messungen)",
  },
  "widget.auto_tpi.last_status": { en: "Last learning", fr: "Dernier apprentissage", de: "Letztes Lernen" },
  "widget.auto_tpi.start": { en: "Started", fr: "Début", de: "Beginn" },
};

/** The texts of the widget of `core_humidity`. */
export const HUMIDITY_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.humidity.title": { en: "Humidity", fr: "Humidité", de: "Luftfeuchtigkeit" },
  "widget.humidity.room": { en: "Humidity of the room", fr: "Humidité de la pièce", de: "Raumluftfeuchtigkeit" },
};

/** The texts of the widget of `core_sync_temp`: the temperature sent to the equipment and the tracking of the setpoint. */
export const SYNC_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.sync.title": { en: "Tracking of the equipment", fr: "Suivi de l'équipement", de: "Geräteverfolgung" },
  "widget.sync.sent": { en: "{entity}: {value}", fr: "{entity} : {value}", de: "{entity}: {value}" },
  "widget.sync.synchronised": { en: "{entity} (synchronised): {value}", fr: "{entity} (synchronisé) : {value}", de: "{entity} (synchronisiert): {value}" },
  "widget.sync.suspended": { en: "Tracking suspended: {reason}, {attempts} attempts", fr: "Suivi suspendu : {reason}, {attempts} tentatives", de: "Verfolgung ausgesetzt: {reason}, {attempts} Versuche" },
  "widget.sync.gap": { en: "{entity}: sent {sent}, seen {observed} ({status})", fr: "{entity} : envoyé {sent}, constaté {observed} ({status})", de: "{entity}: gesendet {sent}, gesehen {observed} ({status})" },
  "widget.sync.reason.tracking_armed": { en: "tracking ready", fr: "suivi prêt", de: "Verfolgung bereit" },
  "widget.sync.reason.command_sent": { en: "command sent", fr: "commande envoyée", de: "Befehl gesendet" },
  "widget.sync.reason.attempt_limit_reached": { en: "too many attempts", fr: "trop de tentatives", de: "zu viele Versuche" },
  "widget.sync.reason.external_command_received": { en: "command from outside", fr: "commande extérieure", de: "Befehl von außen" },
  "widget.sync.reason.candidate_adopted": { en: "setpoint of the equipment adopted", fr: "consigne de l'équipement adoptée", de: "Sollwert des Geräts übernommen" },
};

/** The texts of the widget of `core_central_boiler` in the overview of a thermostat: its demand to the boiler. */
export const BOILER_DEMAND_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.boiler_demand.title": { en: "Central boiler", fr: "Chaudière centrale", de: "Zentraler Heizkessel" },
  "widget.boiler_demand.on": { en: "Calls the boiler", fr: "Demande la chaudière", de: "Fordert den Heizkessel an" },
  "widget.boiler_demand.off": { en: "Does not call the boiler", fr: "Ne demande pas la chaudière", de: "Fordert den Heizkessel nicht an" },
};

/** The texts of the widget of `core_power` in the overview of a thermostat: its energy. */
export const ENERGY_WIDGET_TEXTS: Readonly<Record<string, Text>> = {
  "widget.energy.title": { en: "Energy", fr: "Énergie", de: "Energie" },
  "widget.energy.mean_power": { en: "Mean power of the cycle", fr: "Puissance moyenne du cycle", de: "Mittlere Leistung des Zyklus" },
  "widget.energy.energy": { en: "Energy used", fr: "Énergie consommée", de: "Verbrauchte Energie" },
  "widget.energy.curve": { en: "Mean power over 24 hours", fr: "Puissance moyenne sur 24 heures", de: "Mittlere Leistung über 24 Stunden" },
};
