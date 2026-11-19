/** The native plugin `core_motion`: its tabs of the configuration of Versatile Thermostat, and the widget of the motion in the overview of a thermostat. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_motion.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { motionWidgets } from "../widgets/core_motion.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_motion`. */
export const definition: UiPluginDefinition = { id: "core_motion", translations, contributions: { ...nativeTabContributions("core_motion", translations), thermostat_widget: motionWidgets(translations) } };

registerUiPlugin(definition);
