/**
 * The native plugin `core_central_boiler`: its tabs of the configuration of Versatile Thermostat, the widgets of the boiler and of its power
 * on the Overview page, and the widget of the demand of a thermostat to the boiler in its overview.
 */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_central_boiler.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { boilerWidgets } from "../widgets/core_central_boiler.ts";
import { boilerDemandWidgets } from "../widgets/core_central_boiler_thermostat.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_central_boiler`. */
export const definition: UiPluginDefinition = { id: "core_central_boiler", translations, contributions: { ...nativeTabContributions("core_central_boiler", translations), global_widget: boilerWidgets(translations), thermostat_widget: boilerDemandWidgets(translations) } };

registerUiPlugin(definition);
