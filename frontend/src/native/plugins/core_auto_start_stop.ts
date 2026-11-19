/** The native plugin `core_auto_start_stop`: its tabs of the configuration of Versatile Thermostat, and the widget of the automatic stop in the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_auto_start_stop.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { autoStartStopWidgets } from "../widgets/core_auto_start_stop.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_auto_start_stop`. */
export const definition: UiPluginDefinition = { id: "core_auto_start_stop", translations, contributions: { ...nativeTabContributions("core_auto_start_stop", translations), thermostat_widget: autoStartStopWidgets(translations) } };

registerUiPlugin(definition);
