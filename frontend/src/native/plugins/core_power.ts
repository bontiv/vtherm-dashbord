/**
 * The native plugin `core_power`: its tabs of the configuration of Versatile Thermostat, the widget of the power of the home on the
 * Overview page, and the widgets of the load shedding and of the energy in the overview of a thermostat.
 */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_power.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { overpoweringWidgets, powerWidgets } from "../widgets/core_power.ts";
import { energyWidgets } from "../widgets/core_power_energy.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_power`. */
export const definition: UiPluginDefinition = { id: "core_power", translations, contributions: { ...nativeTabContributions("core_power", translations), global_widget: powerWidgets(translations), thermostat_widget: [...overpoweringWidgets(translations), ...energyWidgets(translations)] } };

registerUiPlugin(definition);
