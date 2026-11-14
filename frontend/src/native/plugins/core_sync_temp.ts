/** The native plugin `core_sync_temp`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_sync_temp.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_sync_temp`. */
export const definition: UiPluginDefinition = { id: "core_sync_temp", translations, contributions: nativeTabContributions("core_sync_temp", translations) };

registerUiPlugin(definition);
