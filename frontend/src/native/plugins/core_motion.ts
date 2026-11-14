/** The native plugin `core_motion`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_motion.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_motion`. */
export const definition: UiPluginDefinition = { id: "core_motion", translations, contributions: nativeTabContributions("core_motion", translations) };

registerUiPlugin(definition);
