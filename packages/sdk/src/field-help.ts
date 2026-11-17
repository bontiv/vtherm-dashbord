/**
 * The contract of the help of a field: the element that the dashboard defines, its properties and the diagrams of its library.
 *
 * The SDK only gives the contract. The dashboard defines the element, so that the SDK stays without any rendering library.
 */

/** The tag name of the element of the help of a field, defined by the dashboard once it has loaded. */
export const FIELD_HELP_ELEMENT = "vtherm-field-help";

/**
 * The diagrams of the library of the dashboard, by their stable identifier.
 *
 * - `tpi_cycle`: the cycle of heating of TPI, on then off.
 * - `tpi_formula`: the part of the cycle that TPI computes from the room and the outside.
 * - `min_on_off`: the minimal delays of activation and deactivation.
 * - `tpi_thresholds`: the thresholds where TPI stops and starts again.
 * - `valve_curve`: the opening sent to a valve for the opening asked.
 * - `send_threshold`: the threshold and the period of the regulation, which decide when a setpoint is sent.
 * - `window_delay`: the delays before and after an open window.
 * - `window_slope`: the detection of an open window by a drop of the temperature.
 * - `motion`: the presets of a room with and without motion, and their delays.
 * - `safety`: what the thermostat does when its sensors stop reporting.
 * - `override`: the duration of a manual override.
 * - `failure`: the detection of a heating failure.
 * - `correction`: the correction of the setpoint by the automatic regulation.
 * - `stagger`: the start of several switches spread over the cycle.
 */
export const DIAGRAM_IDS = [
  "tpi_cycle",
  "tpi_formula",
  "min_on_off",
  "tpi_thresholds",
  "valve_curve",
  "send_threshold",
  "window_delay",
  "window_slope",
  "motion",
  "safety",
  "override",
  "failure",
  "correction",
  "stagger",
] as const;

/** The identifier of a diagram of the library. */
export type DiagramId = (typeof DIAGRAM_IDS)[number];

/**
 * The properties of the element of the help of a field (`FIELD_HELP_ELEMENT`).
 *
 * The hint is shown under the control; the button (i) opens a panel with the diagram, then the explanation. The button appears only
 * when there is an explanation or a diagram. A plugin can put its own SVG in the slot `diagram` of the element, instead of a diagram of
 * the library.
 */
export interface FieldHelpProps {
  /** The translated name of the field, which names the button (i) for the assistive technologies. */
  readonly label: string;
  /** The short hint, one sentence, shown under the control. */
  readonly hint?: string;
  /** The detailed explanation, shown in the panel. */
  readonly info?: string;
  /** The diagram of the library shown in the panel. */
  readonly diagram?: DiagramId;
  /** The values of the settings that the diagram illustrates, by key of Versatile Thermostat: the diagram is drawn with them. */
  readonly values?: Readonly<Record<string, unknown>>;
  /**
   * The key of the setting that the diagram highlights: the field that has the focus, or the field of the help. It is not named `focus`,
   * which is a method of every element.
   */
  readonly highlight?: string;
}

/**
 * Whether a text is the identifier of a diagram of the library.
 *
 * @param value - The text to check, for example an identifier read from the declaration of a plugin.
 */
export function isDiagramId(value: unknown): value is DiagramId {
  return typeof value === "string" && (DIAGRAM_IDS as readonly string[]).includes(value);
}
