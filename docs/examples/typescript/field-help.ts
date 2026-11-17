import { FIELD_HELP_ELEMENT, selectorOf } from "@vtherm/dashboard-sdk";
import type { FieldDefinition, FieldHelpProps, HookProps } from "@vtherm/dashboard-sdk";

type Props = HookProps<"thermostat_config">;

/** The field of the section: the length of the cycle of the plugin, in minutes. */
export const CYCLE: FieldDefinition = { type: "integer", key: "my_plugin_cycle", min: 1, max: 60, unit: "min" };

/** A section with one field, its hint under the control, and its help: an explanation and a diagram of the library of the dashboard. */
export class MyPluginCycle extends HTMLElement implements Partial<Props> {
  hass?: Props["hass"];
  values: Props["values"] = {};
  proposeChanges: Props["proposeChanges"] = () => undefined;

  connectedCallback(): void {
    const selector = document.createElement("ha-selector") as HTMLElement & Record<string, unknown>;
    // The hint is the helper of the control, as in the native tabs.
    Object.assign(selector, { hass: this.hass, selector: selectorOf(CYCLE), value: this.values[CYCLE.key], label: "Cycle", helper: "How long one cycle of heating lasts." });
    selector.addEventListener("value-changed", (event) => this.proposeChanges({ [CYCLE.key]: (event as CustomEvent<{ value: unknown }>).detail.value }));
    // The element of the dashboard draws the button (i) and the panel. The diagram reads `cycle_min`, the key of Versatile Thermostat.
    const help = document.createElement(FIELD_HELP_ELEMENT) as HTMLElement & FieldHelpProps;
    const props: FieldHelpProps = {
      label: "Cycle",
      info: "A longer cycle switches the heater less often, a shorter one follows the room more closely.",
      diagram: "tpi_cycle",
      values: { cycle_min: this.values[CYCLE.key] },
      highlight: "cycle_min",
    };
    Object.assign(help, props);
    this.replaceChildren(selector, help);
  }
}
