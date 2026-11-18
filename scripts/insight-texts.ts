/**
 * The texts of the panels of estimation of the native tabs (TPI, window, safety), in English, French and German.
 *
 * `native-texts.ts` gives the common texts and the texts of each panel to the plugin of its tab.
 */

import type { Text } from "./native-texts.ts";

/** The texts that the three panels share. */
export const INSIGHT_COMMON: Readonly<Record<string, Text>> = {
  "insight.title": { en: "What VT would do with these settings", fr: "Ce que ferait VT avec ces réglages", de: "Was VT mit diesen Einstellungen tun würde" },
  "insight.estimation": { en: "estimation", fr: "estimation", de: "Schätzung" },
  "insight.period.label": { en: "Period", fr: "Période", de: "Zeitraum" },
  "insight.period.now": { en: "Now", fr: "Maintenant", de: "Jetzt" },
  "insight.period.day": { en: "24 h", fr: "24 h", de: "24 Std." },
  "insight.period.week": { en: "7 days", fr: "7 jours", de: "7 Tage" },
  "insight.after_creation": {
    en: "The replay over the history appears once the thermostat is created.",
    fr: "Le rejeu sur l'historique apparaîtra une fois le thermostat créé.",
    de: "Die Wiedergabe über den Verlauf erscheint, sobald das Thermostat angelegt ist.",
  },
  "insight.error": {
    en: "The history could not be read: {message}",
    fr: "L'historique n'a pas pu être lu : {message}",
    de: "Der Verlauf konnte nicht gelesen werden: {message}",
  },
  "insight.loading": { en: "Reading the history…", fr: "Lecture de l'historique…", de: "Verlauf wird gelesen…" },
  "insight.too_few": {
    en: "Too few measurements over this period to replay it.",
    fr: "Trop peu de mesures sur cette période pour la rejouer.",
    de: "Zu wenige Messwerte in diesem Zeitraum für eine Wiedergabe.",
  },
  "insight.no_room": {
    en: "Choose the temperature sensor of the room to see the estimations.",
    fr: "Choisissez le capteur de température de la pièce pour voir les estimations.",
    de: "Wählen Sie den Temperatursensor des Raums, um die Schätzungen zu sehen.",
  },
  "insight.seconds": { en: "{seconds} s", fr: "{seconds} s", de: "{seconds} s" },
  "insight.minutes": { en: "{minutes} min", fr: "{minutes} min", de: "{minutes} Min." },
  "insight.minutes_seconds": { en: "{minutes} min {seconds} s", fr: "{minutes} min {seconds} s", de: "{minutes} Min. {seconds} s" },
  "insight.series.room": { en: "Room", fr: "Pièce", de: "Raum" },
  "insight.series.target": { en: "Setpoint", fr: "Consigne", de: "Sollwert" },
};

/** The texts of the panel of TPI. */
export const INSIGHT_TPI: Readonly<Record<string, Text>> = {
  "insight.series.estimated": { en: "Share, estimation", fr: "Part de chauffe, estimation", de: "Heizanteil, Schätzung" },
  "insight.series.recorded": { en: "Share recorded by VT", fr: "Part enregistrée par VT", de: "Von VT aufgezeichneter Anteil" },
  "insight.tpi.trial_target": { en: "Setpoint to try", fr: "Consigne d'essai", de: "Sollwert zum Ausprobieren" },
  "insight.tpi.reset": { en: "Back to the current setpoint ({target})", fr: "Revenir à la consigne actuelle ({target})", de: "Zurück zum aktuellen Sollwert ({target})" },
  "insight.tpi.room_part": { en: "Room part ({room} for {target})", fr: "Partie pièce ({room} pour {target})", de: "Raumanteil ({room} für {target})" },
  "insight.tpi.outdoor_part": { en: "Outdoor part ({outdoor} outside)", fr: "Partie extérieure ({outdoor} dehors)", de: "Außenanteil ({outdoor} draußen)" },
  "insight.tpi.no_outdoor": {
    en: "Outdoor part: no outdoor sensor, so it is 0",
    fr: "Partie extérieure : pas de capteur extérieur, elle vaut donc 0",
    de: "Außenanteil: kein Außensensor, daher 0",
  },
  "insight.tpi.share": { en: "Calculated share", fr: "Part calculée", de: "Berechneter Anteil" },
  "insight.tpi.applied": { en: "Share applied by VT, rounded", fr: "Part appliquée par VT, arrondie", de: "Von VT angewendeter Anteil, gerundet" },
  "insight.tpi.cycle": { en: "In a cycle of {cycle}", fr: "Sur un cycle de {cycle}", de: "In einem Zyklus von {cycle}" },
  "insight.tpi.on_off": { en: "{on} on, {off} off", fr: "{on} allumé, {off} éteint", de: "{on} an, {off} aus" },
  "insight.tpi.note.capped": {
    en: "The share is kept between 0 and 100 %.",
    fr: "La part est maintenue entre 0 et 100 %.",
    de: "Der Anteil wird zwischen 0 und 100 % gehalten.",
  },
  "insight.tpi.note.max_on": {
    en: "The share is limited by the maximum share of Versatile Thermostat.",
    fr: "La part est limitée par la part maximale de Versatile Thermostat.",
    de: "Der Anteil wird durch den Höchstanteil von Versatile Thermostat begrenzt.",
  },
  "insight.tpi.note.too_short": {
    en: "The heating pulse would be shorter than the minimal activation delay: the heater stays off for this cycle.",
    fr: "L'impulsion de chauffe serait plus courte que le délai minimal d'activation : le radiateur reste éteint pendant ce cycle.",
    de: "Der Heizimpuls wäre kürzer als die minimale Aktivierungsverzögerung: Das Heizgerät bleibt in diesem Zyklus aus.",
  },
  "insight.tpi.note.off_too_short": {
    en: "The pause would be shorter than the minimal deactivation delay: the heater stays on for the whole cycle.",
    fr: "La pause serait plus courte que le délai minimal de désactivation : le radiateur reste allumé pendant tout le cycle.",
    de: "Die Pause wäre kürzer als die minimale Deaktivierungsverzögerung: Das Heizgerät bleibt den ganzen Zyklus an.",
  },
  "insight.tpi.note.threshold_stop": {
    en: "The room is above the setpoint plus the high threshold while it warms up: the heating stops.",
    fr: "La pièce dépasse la consigne plus le seuil haut alors qu'elle se réchauffe : le chauffage s'arrête.",
    de: "Der Raum liegt über dem Sollwert plus der oberen Schwelle, während er sich erwärmt: Das Heizen stoppt.",
  },
  "insight.tpi.note.threshold_hold": {
    en: "The heating stays stopped until the room falls below the setpoint plus the low threshold.",
    fr: "Le chauffage reste arrêté jusqu'à ce que la pièce redescende sous la consigne plus le seuil bas.",
    de: "Das Heizen bleibt aus, bis der Raum unter den Sollwert plus der unteren Schwelle fällt.",
  },
  "insight.tpi.note.no_outdoor": {
    en: "Without an outdoor sensor, only the room part counts.",
    fr: "Sans capteur extérieur, seule la partie pièce compte.",
    de: "Ohne Außensensor zählt nur der Raumanteil.",
  },
  "insight.tpi.chart": { en: "Replay of the heating share", fr: "Rejeu de la part de chauffe", de: "Wiedergabe des Heizanteils" },
  "insight.tpi.summary": {
    en: "Mean heating share over the period: {estimated} estimated with these settings, {recorded} recorded by VT.",
    fr: "Part de chauffe moyenne sur la période : {estimated} estimée avec ces réglages, {recorded} enregistrée par VT.",
    de: "Mittlerer Heizanteil im Zeitraum: {estimated} geschätzt mit diesen Einstellungen, {recorded} von VT aufgezeichnet.",
  },
  "insight.tpi.mean_estimated": { en: "Mean share with these settings", fr: "Part moyenne avec ces réglages", de: "Mittlerer Anteil mit diesen Einstellungen" },
  "insight.tpi.mean_recorded": { en: "Mean share recorded by VT", fr: "Part moyenne enregistrée par VT", de: "Mittlerer von VT aufgezeichneter Anteil" },
  "insight.tpi.no_recorded": { en: "not recorded", fr: "non enregistrée", de: "nicht aufgezeichnet" },
  "insight.tpi.rise": { en: "Mean time to reach the setpoint", fr: "Temps moyen pour atteindre la consigne", de: "Mittlere Zeit bis zum Sollwert" },
  "insight.tpi.overshoot": { en: "Largest overshoot", fr: "Plus fort dépassement", de: "Größte Überschreitung" },
  "insight.tpi.within": { en: "Time within ±0.5° of the setpoint", fr: "Temps à ±0,5° de la consigne", de: "Zeit innerhalb ±0,5° vom Sollwert" },
  "insight.tpi.differ": {
    en: "The two shares differ when the settings or the mode changed during the period: the replay uses the settings of the page for the whole period.",
    fr: "Les deux parts diffèrent quand les réglages ou le mode ont changé pendant la période : le rejeu applique les réglages de la page à toute la période.",
    de: "Die beiden Anteile weichen ab, wenn sich Einstellungen oder Modus im Zeitraum geändert haben: Die Wiedergabe wendet die Einstellungen der Seite auf den ganzen Zeitraum an.",
  },
  "insight.tpi.drops": {
    en: "Lowered setpoints ({count}) are left out of the time to reach the setpoint.",
    fr: "Les consignes abaissées ({count}) sont exclues du temps pour atteindre la consigne.",
    de: "Abgesenkte Sollwerte ({count}) zählen nicht zur Zeit bis zum Sollwert.",
  },
  "insight.tpi.limits": {
    en: "Estimations: the replay applies the rules of VT to the recorded temperatures; it does not predict how the room would have reacted to other settings.",
    fr: "Estimations : le rejeu applique les règles de VT aux températures enregistrées ; il ne prédit pas comment la pièce aurait réagi à d'autres réglages.",
    de: "Schätzungen: Die Wiedergabe wendet die Regeln von VT auf die aufgezeichneten Temperaturen an; sie sagt nicht voraus, wie der Raum auf andere Einstellungen reagiert hätte.",
  },
};

/** The texts of the panel of the window. */
export const INSIGHT_WINDOW: Readonly<Record<string, Text>> = {
  "insight.window.chart": { en: "Replay of the detection", fr: "Rejeu de la détection", de: "Wiedergabe der Erkennung" },
  "insight.window.slope": { en: "Slope, estimation", fr: "Pente, estimation", de: "Steigung, Schätzung" },
  "insight.window.slope_value": { en: "{slope} °/h", fr: "{slope} °/h", de: "{slope} °/h" },
  "insight.window.open_threshold": { en: "Opening threshold", fr: "Seuil d'ouverture", de: "Öffnungsschwelle" },
  "insight.window.close_threshold": { en: "Closing threshold", fr: "Seuil de fermeture", de: "Schließschwelle" },
  "insight.window.detection": { en: "Window detected", fr: "Fenêtre détectée", de: "Fenster erkannt" },
  "insight.window.detection_at": { en: "From {start} to {end}", fr: "Du {start} au {end}", de: "Von {start} bis {end}" },
  "insight.window.count": {
    en: "Openings that would have been detected with these thresholds: {count}.",
    fr: "Ouvertures qui auraient été détectées avec ces seuils : {count}.",
    de: "Öffnungen, die mit diesen Schwellen erkannt worden wären: {count}.",
  },
  "insight.window.none": {
    en: "No opening would have been detected over the period.",
    fr: "Aucune ouverture n'aurait été détectée sur la période.",
    de: "Im Zeitraum wäre keine Öffnung erkannt worden.",
  },
  "insight.window.strongest": { en: "Strongest drop: {slope}, {date}.", fr: "Plus forte chute : {slope}, {date}.", de: "Stärkster Abfall: {slope}, {date}." },
  "insight.window.max_duration": {
    en: "Detections stopped by the maximum duration: {count}.",
    fr: "Détections arrêtées par la durée maximale : {count}.",
    de: "Durch die Höchstdauer beendete Erkennungen: {count}.",
  },
  "insight.window.no_threshold": {
    en: "Enter an opening threshold to see the detections: only the slope is shown.",
    fr: "Saisissez un seuil d'ouverture pour voir les détections : seule la pente est tracée.",
    de: "Geben Sie eine Öffnungsschwelle ein, um die Erkennungen zu sehen: Nur die Steigung wird gezeigt.",
  },
  "insight.window.sensor_method": {
    en: "With an opening sensor, the thermostat follows the sensor: there is no detection to replay.",
    fr: "Avec un capteur d'ouverture, le thermostat suit le capteur : il n'y a pas de détection à rejouer.",
    de: "Mit einem Öffnungssensor folgt das Thermostat dem Sensor: Es gibt keine Erkennung zum Wiedergeben.",
  },
  "insight.window.limits": {
    en: "Estimations: the slope is computed from the recorded temperatures as VT computes it; a window that was really open may not show if the sensor reported rarely.",
    fr: "Estimations : la pente est calculée sur les températures enregistrées comme VT la calcule ; une fenêtre réellement ouverte peut ne pas apparaître si le capteur a peu envoyé de mesures.",
    de: "Schätzungen: Die Steigung wird aus den aufgezeichneten Temperaturen wie von VT berechnet; ein wirklich offenes Fenster erscheint eventuell nicht, wenn der Sensor selten gemeldet hat.",
  },
};

/** The texts of the panel of the safety, in the advanced tab. */
export const INSIGHT_SAFETY: Readonly<Record<string, Text>> = {
  "insight.safety.chart": { en: "Silences of the sensors", fr: "Silences des capteurs", de: "Meldepausen der Sensoren" },
  "insight.safety.room_silence": { en: "Room sensor silent", fr: "Capteur de la pièce muet", de: "Raumsensor meldet nicht" },
  "insight.safety.outdoor_silence": { en: "Outdoor sensor silent", fr: "Capteur extérieur muet", de: "Außensensor meldet nicht" },
  "insight.safety.count": {
    en: "Silences longer than {delay} min that would have started the safety mode: {count}.",
    fr: "Silences de plus de {delay} min qui auraient déclenché le mode sécurité : {count}.",
    de: "Meldepausen von mehr als {delay} Min., die den Sicherheitsmodus ausgelöst hätten: {count}.",
  },
  "insight.safety.none": {
    en: "No silence longer than {delay} min over the period.",
    fr: "Aucun silence de plus de {delay} min sur la période.",
    de: "Keine Meldepause von mehr als {delay} Min. im Zeitraum.",
  },
  "insight.safety.longest": { en: "Longest silence: {duration}, {date}.", fr: "Plus long silence : {duration}, {date}.", de: "Längste Meldepause: {duration}, {date}." },
  "insight.safety.min_on": {
    en: "VT only enters the safety mode while the heating share is at least {percent}.",
    fr: "VT ne passe en mode sécurité que si la part de chauffe est d'au moins {percent}.",
    de: "VT wechselt nur in den Sicherheitsmodus, solange der Heizanteil mindestens {percent} beträgt.",
  },
  "insight.safety.over_climate": {
    en: "VT does not enter the safety mode for a thermostat over a climate without valve regulation: these settings have no effect, so nothing is replayed.",
    fr: "VT ne passe pas en mode sécurité pour un thermostat sur climate sans régulation par vanne : ces réglages n'ont pas d'effet, rien n'est donc rejoué.",
    de: "VT wechselt bei einem Thermostat über ein Klimagerät ohne Ventilregelung nicht in den Sicherheitsmodus: Diese Einstellungen wirken nicht, daher wird nichts wiedergegeben.",
  },
  "insight.safety.limits": {
    en: "Estimations: a silence is a time without a new recorded value; a sensor that sends the same value without change can look silent, as it does for VT.",
    fr: "Estimations : un silence est une durée sans nouvelle valeur enregistrée ; un capteur qui renvoie la même valeur sans changement peut paraître muet, comme pour VT.",
    de: "Schätzungen: Eine Meldepause ist eine Zeit ohne neuen aufgezeichneten Wert; ein Sensor, der denselben Wert ohne Änderung sendet, kann wie stumm wirken, wie für VT.",
  },
};
