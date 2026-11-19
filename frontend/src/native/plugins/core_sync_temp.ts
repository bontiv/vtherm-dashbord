/** The native plugin `core_sync_temp`: its tabs of the configuration of Versatile Thermostat, and the widget of the temperature sent to the equipment in the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_sync_temp.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { syncWidgets } from "../widgets/core_sync_temp.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_sync_temp`. */
export const definition: UiPluginDefinition = { id: "core_sync_temp", translations, contributions: { ...nativeTabContributions("core_sync_temp", translations), thermostat_widget: syncWidgets(translations) } };

registerUiPlugin(definition);
