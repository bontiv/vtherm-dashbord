/** The native plugin `core_advanced`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_advanced.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_advanced`. */
export const definition: UiPluginDefinition = { id: "core_advanced", translations, contributions: nativeTabContributions("core_advanced", translations) };

registerUiPlugin(definition);
