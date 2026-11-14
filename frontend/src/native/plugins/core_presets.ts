/** The native plugin `core_presets`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_presets.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_presets`. */
export const definition: UiPluginDefinition = { id: "core_presets", translations, contributions: nativeTabContributions("core_presets", translations) };

registerUiPlugin(definition);
