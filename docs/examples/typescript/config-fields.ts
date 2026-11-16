import { ensureHaControls, selectorOf } from "@vtherm/dashboard-sdk";
import type { FieldDefinition, HookProps } from "@vtherm/dashboard-sdk";

type Props = HookProps<"thermostat_config">;

/** The fields of the section, described with the contract of the SDK. Each type is a control of Home Assistant. */
export const FIELDS: readonly FieldDefinition[] = [
  { type: "entity", key: "my_plugin_sensor", domains: ["sensor", "input_number"], device_classes: ["temperature"] },
  { type: "entity_list", key: "my_plugin_heaters", domains: ["climate"] },
  { type: "integer", key: "my_plugin_delay", min: 0, max: 600, unit: "s" },
  { type: "boolean", key: "my_plugin_enabled" },
];

/** A section of the configuration of a thermostat, drawn with the `ha-selector` of Home Assistant. */
export class MyPluginFields extends HTMLElement implements Partial<Props> {
  hass?: Props["hass"];
  values: Props["values"] = {};
  proposeChanges: Props["proposeChanges"] = () => undefined;

  async connectedCallback(): Promise<void> {
    // The components of Home Assistant may not be defined yet when the page is opened directly: wait for them.
    const controls = await ensureHaControls();
    this.replaceChildren(...FIELDS.map((field) => (controls.loaded ? this.selector(field) : this.fallback(field))));
  }

  private selector(field: FieldDefinition): HTMLElement {
    const element = document.createElement("ha-selector") as HTMLElement & Record<string, unknown>;
    Object.assign(element, { hass: this.hass, selector: selectorOf(field), value: this.values[field.key], label: field.key });
    // Home Assistant sends the new value with `value-changed`; the dashboard saves the draft.
    element.addEventListener("value-changed", (event) => this.proposeChanges({ [field.key]: (event as CustomEvent<{ value: unknown }>).detail.value }));
    return element;
  }

  /** Without `ha-selector` (a version of Home Assistant that does not have it), a plain input keeps the value editable. */
  private fallback(field: FieldDefinition): HTMLElement {
    const input = document.createElement("input"); // fallback: ha-selector is not defined
    input.value = String(this.values[field.key] ?? "");
    input.addEventListener("change", () => this.proposeChanges({ [field.key]: input.value }));
    return input;
  }
}
