/** The native plugin `core_humidity`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_humidity.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_humidity`. */
export const definition: UiPluginDefinition = { id: "core_humidity", translations, contributions: nativeTabContributions("core_humidity", translations) };

registerUiPlugin(definition);
