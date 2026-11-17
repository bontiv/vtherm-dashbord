/**
 * The library of the diagrams of the help of the fields.
 *
 * Each diagram illustrates what a setting of Versatile Thermostat does, drawn with the values of the draft (or examples, marked as
 * such), in the colors of the theme and the language of the user. The help component shows one with `renderDiagram`.
 */

import { isDiagramId } from "@vtherm/dashboard-sdk";
import type { DiagramId } from "@vtherm/dashboard-sdk";
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";

import { failure, motion, override, safety, windowDelay, windowSlope } from "./features.ts";
import { showsExample, t } from "./model.ts";
import type { Diagram, DiagramContext } from "./model.ts";
import { correction, sendThreshold, valveCurve } from "./regulation.ts";
import { minOnOff, stagger, tpiCycle, tpiFormula, tpiThresholds } from "./tpi.ts";

export { diagramValue } from "./model.ts";
export type { Diagram, DiagramContext, DiagramValue } from "./model.ts";
export { diagramStyles } from "./styles.ts";
export { diagramTexts } from "./texts.ts";

/** The diagrams of the library, by identifier. */
export const DIAGRAMS: Readonly<Record<DiagramId, Diagram>> = {
  tpi_cycle: tpiCycle,
  tpi_formula: tpiFormula,
  min_on_off: minOnOff,
  tpi_thresholds: tpiThresholds,
  valve_curve: valveCurve,
  send_threshold: sendThreshold,
  window_delay: windowDelay,
  window_slope: windowSlope,
  motion,
  safety,
  override,
  failure,
  correction,
  stagger,
};

/** The unknown identifiers already reported, so that each one is reported once. */
const reported = new Set<string>();

/**
 * The figure of a diagram: a visible title (with "example" when the diagram shows an example), then the image, `role="img"` with the
 * caption as `aria-label`, which holds the svg with the viewBox `0 0 240 96` and a width of 100%.
 *
 * The title is outside the image so that the assistive technologies read it as well as the caption.
 *
 * @param id - The identifier of the diagram.
 * @param context - The values of the draft, the setting in focus and the formatter of numbers.
 * @returns The figure, or `undefined` with a warning (once per identifier) for an unknown identifier.
 */
export function renderDiagram(id: string, context: DiagramContext): TemplateResult | undefined {
  if (!isDiagramId(id)) {
    if (!reported.has(id)) {
      reported.add(id);
      console.warn(`The diagram ${id} is not in the library of the dashboard: the help shows no diagram.`);
    }
    return undefined;
  }
  const diagram = DIAGRAMS[id];
  const example = showsExample(diagram, context);
  return html`<figure class="diagram" data-diagram=${id}>
    <figcaption class="diagram-title">${diagram.title()}${example ? html` <span class="diagram-example">${t("diagram.example")}</span>` : nothing}</figcaption>
    <div class="diagram-image" role="img" aria-label=${diagram.caption(context)}>
      <svg viewBox="0 0 240 96" width="100%" aria-hidden="true" focusable="false">${diagram.draw(context)}</svg>
    </div>
  </figure>`;
}
