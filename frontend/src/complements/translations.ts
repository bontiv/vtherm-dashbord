import { defineTranslations } from "@vtherm/dashboard-sdk";
import { de, en, fr } from "./catalogs.ts";

/** The translations of the plugin `core_complements`, shared by its pages and its definition. */
export const translations = defineTranslations(en, { fr, de });

/** The translation function of the add-ons pages. */
export const text = translations.t as (key: string, params?: Readonly<Record<string, string | number>>) => string;
