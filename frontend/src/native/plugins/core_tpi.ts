/** The native plugin `core_tpi`: its tabs of the configuration of Versatile Thermostat, and its widget of the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_tpi.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { tpiWidgets } from "../widgets/core_tpi.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_tpi`: its tabs, and its widget of the overview of a thermostat (the heating share of tpi). */
export const definition: UiPluginDefinition = {
  id: "core_tpi",
  translations,
  contributions: { ...nativeTabContributions("core_tpi", translations), thermostat_widget: tpiWidgets(translations) },
};

registerUiPlugin(definition);
