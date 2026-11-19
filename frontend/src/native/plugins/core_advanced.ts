/** The native plugin `core_advanced`: its tabs of the configuration of Versatile Thermostat, and its widget of the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_advanced.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { advancedWidgets } from "../widgets/core_advanced.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_advanced`: its tabs, and its widget of the overview of a thermostat (the safety mode). */
export const definition: UiPluginDefinition = {
  id: "core_advanced",
  translations,
  contributions: { ...nativeTabContributions("core_advanced", translations), thermostat_widget: advancedWidgets(translations) },
};

registerUiPlugin(definition);
