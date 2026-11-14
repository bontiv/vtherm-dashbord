/** The native plugin `core_power`: its tabs of the configuration of Versatile Thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_power.ts";
import { nativeTabContributions } from "../native-plugin.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_power`. */
export const definition: UiPluginDefinition = { id: "core_power", translations, contributions: nativeTabContributions("core_power", translations) };

registerUiPlugin(definition);
