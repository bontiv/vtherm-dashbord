/** The native plugin `core_lock`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_lock.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_lock`. */
export const definition: UiPluginDefinition = { id: "core_lock", translations, contributions: nativeTabContributions("core_lock", translations) };

registerUiPlugin(definition);
