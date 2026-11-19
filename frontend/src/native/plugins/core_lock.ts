/** The native plugin `core_lock`: its tabs of the configuration of Versatile Thermostat, and the widget of the lock in the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_lock.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { lockWidgets } from "../widgets/core_lock.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_lock`. */
export const definition: UiPluginDefinition = { id: "core_lock", translations, contributions: { ...nativeTabContributions("core_lock", translations), thermostat_widget: lockWidgets(translations) } };

registerUiPlugin(definition);
