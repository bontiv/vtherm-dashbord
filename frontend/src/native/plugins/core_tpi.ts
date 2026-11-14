/** The native plugin `core_tpi`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_tpi.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_tpi`. */
export const definition: UiPluginDefinition = { id: "core_tpi", translations, contributions: nativeTabContributions("core_tpi", translations) };

registerUiPlugin(definition);
