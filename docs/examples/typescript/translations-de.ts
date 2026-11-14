import type { en } from "./translations.ts";
import type { CompleteCatalog } from "@vtherm/dashboard-sdk";

/** `satisfies CompleteCatalog` makes a missing or an extra key a compile error. */
export default {
  "tab.title": "Intelligentes TPI",
  "tab.group": "Algorithmen",
  "tab.help": "Einstellungen von {name}",
  "tab.users": { one: "Von {count} Thermostat verwendet", other: "Von {count} Thermostaten verwendet" },
} satisfies CompleteCatalog<typeof en>;
