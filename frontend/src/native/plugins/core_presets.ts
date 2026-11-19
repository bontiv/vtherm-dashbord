/** The native plugin `core_presets`: its tabs of the configuration of Versatile Thermostat, and its widget of the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_presets.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { presetWidgets } from "../widgets/core_presets.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_presets`: its tabs, and its widget of the overview of a thermostat (the preset and the manual override). */
export const definition: UiPluginDefinition = {
  id: "core_presets",
  translations,
  contributions: { ...nativeTabContributions("core_presets", translations), thermostat_widget: presetWidgets(translations) },
};

registerUiPlugin(definition);
