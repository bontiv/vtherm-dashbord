/** The native plugin `core_presence`: its tabs of the configuration of Versatile Thermostat, and the widget of the presence on the Overview page. */

import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { UiPluginDefinition } from "@vtherm/dashboard-sdk";

import { de, en, fr } from "../catalogs/core_presence.ts";
import { nativeTabContributions } from "../native-plugin.ts";
import { presenceWidgets } from "../widgets/core_presence.ts";

export const translations = defineTranslations(en, { fr, de });

/** The definition of the plugin `core_presence`. */
export const definition: UiPluginDefinition = { id: "core_presence", translations, contributions: { ...nativeTabContributions("core_presence", translations), global_widget: presenceWidgets(translations) } };

registerUiPlugin(definition);
