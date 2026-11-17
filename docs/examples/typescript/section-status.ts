import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { SectionStatus, UiPluginDefinition, VisibilityContext } from "@vtherm/dashboard-sdk";

/** The values that the section needs before the thermostat can use it. */
const REQUIRED = ["my_plugin_sensor", "my_plugin_target"];

/**
 * The status of the section in the menu: the dashboard shows `Off` while `use_my_plugin` is false and `Error` after a refused save; the
 * section says the rest. The function is pure and quick: it is called at each drawing of the menu.
 */
export function myPluginStatus(context: VisibilityContext<"thermostat_config">): SectionStatus {
  const missing = REQUIRED.filter((key) => context.values[key] === undefined || context.values[key] === null || context.values[key] === "").length;
  return missing > 0 ? { kind: "incomplete", missing } : { kind: "complete" };
}

export const definition: UiPluginDefinition = {
  id: "my_plugin",
  translations: defineTranslations({
    "tab.title": "My plugin",
    // Shown with the switch of the dashboard while the feature is off.
    "feature_intro.use_my_plugin": "My plugin adapts the setpoint to the forecast. Turn it on to set it up.",
  }),
  contributions: {
    thermostat_config: [{ id: "my_plugin.tab", title: "tab.title", component: "my-plugin-tab", feature: "use_my_plugin", status: myPluginStatus }],
  },
};
