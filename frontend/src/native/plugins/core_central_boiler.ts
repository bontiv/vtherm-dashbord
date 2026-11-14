/** The native plugin `core_central_boiler`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_central_boiler.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_central_boiler`. */
export const definition: UiPluginDefinition = { id: "core_central_boiler", translations, contributions: nativeTabContributions("core_central_boiler", translations) };

registerUiPlugin(definition);
