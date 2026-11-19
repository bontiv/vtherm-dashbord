/** The native plugin `core_valve_regulation`: its tabs of the configuration of Versatile Thermostat, and its widget of the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_valve_regulation.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { valveWidgets } from "../widgets/core_valve_regulation.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_valve_regulation`: its tabs, and its widget of the overview of a thermostat (the opening of the valve). */
export const definition: UiPluginDefinition = {
  id: "core_valve_regulation",
  translations,
  contributions: { ...nativeTabContributions("core_valve_regulation", translations), thermostat_widget: valveWidgets(translations) },
};

registerUiPlugin(definition);
