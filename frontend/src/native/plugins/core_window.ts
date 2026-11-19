/** The native plugin `core_window`: its tabs of the configuration of Versatile Thermostat, and the widget of the window in the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_window.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { windowWidgets } from "../widgets/core_window.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_window`. */
export const definition: UiPluginDefinition = { id: "core_window", translations, contributions: { ...nativeTabContributions("core_window", translations), thermostat_widget: windowWidgets(translations) } };

registerUiPlugin(definition);
