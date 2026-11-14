/** The native plugin `core_heating_failure`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_heating_failure.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_heating_failure`. */
export const definition: UiPluginDefinition = { id: "core_heating_failure", translations, contributions: nativeTabContributions("core_heating_failure", translations) };

registerUiPlugin(definition);
