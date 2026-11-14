/** The native plugin `core_valve_regulation`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_valve_regulation.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_valve_regulation`. */
export const definition: UiPluginDefinition = { id: "core_valve_regulation", translations, contributions: nativeTabContributions("core_valve_regulation", translations) };

registerUiPlugin(definition);
