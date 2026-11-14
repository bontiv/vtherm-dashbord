import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { PartialCatalog } from "@vtherm/dashboard-sdk";

// The English catalog gives the keys, and a plugin that is in the dashboard must have it. Titles and groups are keys too.
const en = {
  "tab.title": "Sample",
  "tab.cycle": "Cycle of {name}: {minutes} minutes",
  "tab.no_cycle": "{name} has no cycle.",
  "sync.title": "Sync (sample)",
  "sync.text": "This section replaces the native section 'Sync device internal temperature'.",
  "widget.state": "{name} is {state}",
  "widget.unknown": "unknown",
  "promo.text": "A widget that the sample plugin removes.",
} as const;

// French and German can be partial: a missing key is shown in English.
const fr = {
  "tab.title": "Exemple",
  "tab.cycle": "Cycle de {name} : {minutes} minutes",
  "tab.no_cycle": "{name} n'a pas de cycle.",
  "sync.title": "Synchronisation (exemple)",
  "sync.text": "Cette section remplace la section native « Synchronisation de la température interne ».",
  "widget.state": "{name} est {state}",
  "widget.unknown": "inconnu",
  "promo.text": "Un widget que le plugin d'exemple retire.",
} satisfies PartialCatalog<typeof en>;

const de = {
  "tab.title": "Beispiel",
  "tab.cycle": "Zyklus von {name}: {minutes} Minuten",
  "tab.no_cycle": "{name} hat keinen Zyklus.",
  "sync.title": "Synchronisierung (Beispiel)",
  "sync.text": "Dieser Abschnitt ersetzt den nativen Abschnitt „Interne Gerätetemperatur synchronisieren“.",
  "widget.state": "{name} ist {state}",
  "widget.unknown": "unbekannt",
  "promo.text": "Ein Widget, das das Beispiel-Plugin entfernt.",
} satisfies PartialCatalog<typeof en>;

export const translations = defineTranslations(en, { fr, de });
export const { t } = translations;
