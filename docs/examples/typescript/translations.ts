import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { PartialCatalog } from "@vtherm/dashboard-sdk";

/** The English catalog is required. Its keys type the function `t`. Declare it `as const`. */
export const en = {
  "tab.title": "Smart TPI",
  "tab.group": "Algorithms",
  "tab.help": "Settings of {name}",
  "tab.users": { one: "Used by {count} thermostat", other: "Used by {count} thermostats" },
} as const;

/** A catalog of another language can be partial: the missing keys are shown in English. */
const fr = {
  "tab.title": "TPI intelligent",
  "tab.users": { one: "Utilisé par {count} thermostat", other: "Utilisé par {count} thermostats" },
} satisfies PartialCatalog<typeof en>;

/** The German catalog is in its own module, which is downloaded only for a user who speaks German. */
export const translations = defineTranslations(en, { fr, de: () => import("./translations-de.ts") });

/** Use `t` in the components. A key that is not in the English catalog does not compile. */
export const { t } = translations;
