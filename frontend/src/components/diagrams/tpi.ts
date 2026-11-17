/**
 * The diagrams of TPI: the cycle, the formula, the minimal delays, the thresholds, and the spread of several switches over the cycle.
 */

import { svg } from "lit";
import type { SVGTemplateResult } from "lit";

import { box, bracket, clamp, classes, diagramValue, dot, emphasis, label, line, path, quantity, scale, spreadLabels, stated, t } from "./model.ts";
import type { Diagram, DiagramContext } from "./model.ts";

/** The shares of the cycle that the examples of cycles show, since TPI computes them from the room. */
const EXAMPLE_SHARES = [0.7, 0.45, 0.2] as const;

/** The difference between the setpoint and the room, and between the setpoint and the outside, in the example of the formula. */
const FORMULA_ROOM_DELTA = 1;
const FORMULA_OUTSIDE_DELTA = 15;

/** The share of the cycle when the switches are on in the example of the spread. */
const STAGGER_SHARE = 0.4;

/** The number of switches drawn; the others are counted in a label. */
const STAGGER_ROWS = 4;

/**
 * The cycle of TPI: on for the computed share of each cycle, then off.
 *
 * Illustrates `prop_algo_tpi.py` (the share `on_percent`) and `cycle_scheduler.py` (`calculate_cycle_times`: on for
 * `on_percent × cycle_min`, off for the rest).
 */
export const tpiCycle: Diagram = {
  keys: ["cycle_min"],
  examples: { cycle_min: 5 },
  bounds: { cycle_min: [1, 1000] },
  source: "prop_algo_tpi.py, cycle_scheduler.py",
  title: () => t("diagram.tpi_cycle.title"),
  caption(context: DiagramContext): string {
    const cycle = diagramValue(tpiCycle, context.values, "cycle_min");
    const [first, second, third] = EXAMPLE_SHARES.map((share) => quantity(context, share * 100, "percent", 0));
    return t("diagram.tpi_cycle.caption", { cycle: stated(quantity(context, cycle.value, "min"), cycle.example), first: first ?? "", second: second ?? "", third: third ?? "" });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const cycle = diagramValue(tpiCycle, context.values, "cycle_min");
    const x0 = 12;
    const width = 72;
    const emph = emphasis(tpiCycle, context, "cycle_min");
    const first = EXAMPLE_SHARES[0];
    return svg`
      ${EXAMPLE_SHARES.map((share, index) => {
        const x = x0 + index * width;
        return svg`
          ${box(x, 24, x + width * share, 54, "d-area")}
          ${label(x + 2, 20, quantity(context, share * 100, "percent", 0))}`;
      })}
      ${[0, 1, 2, 3].map((index) => line(x0 + index * width, 16, x0 + index * width, 66, "d-grid"))}
      ${line(x0, 54, x0 + 3 * width, 54, "d-axis")}
      ${label(x0 + 3, 42, t("diagram.tpi_cycle.on"), { className: "d-text" })}
      ${label(x0 + width * (first + (1 - first) / 2), 50, t("diagram.tpi_cycle.off"), { anchor: "middle" })}
      ${bracket(x0, x0 + width, 66, classes("d-mark", emph), "cycle_min")}
      ${label(x0 + width / 2, 78, quantity(context, cycle.value, "min"), { anchor: "middle", className: classes("d-text", cycle.example && "d-example", emph), key: "cycle_min" })}`;
  },
};

/**
 * The formula of TPI: the share of the cycle is `coef_int × (setpoint − room) + coef_ext × (setpoint − outside)`, between 0 and 1.
 *
 * Illustrates `prop_algo_tpi.py` (`TpiAlgorithm.calculate`).
 */
export const tpiFormula: Diagram = {
  keys: ["tpi_coef_int", "tpi_coef_ext"],
  examples: { tpi_coef_int: 0.6, tpi_coef_ext: 0.01 },
  bounds: { tpi_coef_int: [0, 10], tpi_coef_ext: [0, 1] },
  source: "prop_algo_tpi.py",
  title: () => t("diagram.tpi_formula.title"),
  caption(context: DiagramContext): string {
    const parts = formulaParts(context);
    return t("diagram.tpi_formula.caption", {
      int: stated(context.format(parts.int.value, { maximumFractionDigits: 3 }), parts.int.example),
      ext: stated(context.format(parts.ext.value, { maximumFractionDigits: 3 }), parts.ext.example),
      dint: quantity(context, FORMULA_ROOM_DELTA, "deg"),
      dext: quantity(context, FORMULA_OUTSIDE_DELTA, "deg"),
      result: quantity(context, parts.total * 100, "percent", 0),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const parts = formulaParts(context);
    const x = scale(0, 1, 20, 220);
    const intEnd = clamp(parts.room, 0, 1);
    const extEnd = clamp(parts.room + parts.outside, 0, 1);
    const intEmph = emphasis(tpiFormula, context, "tpi_coef_int");
    const extEmph = emphasis(tpiFormula, context, "tpi_coef_ext");
    const formula = t("diagram.tpi_formula.formula", {
      int: context.format(parts.int.value, { maximumFractionDigits: 3 }),
      ext: context.format(parts.ext.value, { maximumFractionDigits: 3 }),
      dint: quantity(context, FORMULA_ROOM_DELTA, "deg"),
      dext: quantity(context, FORMULA_OUTSIDE_DELTA, "deg"),
      result: quantity(context, parts.total * 100, "percent", 0),
    });
    return svg`
      ${label(120, 14, formula, { anchor: "middle", className: classes("d-text", (parts.int.example || parts.ext.example) && "d-example") })}
      ${box(x(0), 26, x(1), 46, "d-area-ctx")}
      ${box(x(0), 26, x(intEnd), 46, classes("d-area", intEmph), "tpi_coef_int")}
      ${box(x(intEnd), 26, x(extEnd), 46, classes("d-area-warn", extEmph), "tpi_coef_ext")}
      ${parts.room + parts.outside > 1 ? line(x(1), 22, x(1), 50, "d-mark") : svg``}
      ${parts.room + parts.outside > 1 ? label(x(1), 20, t("diagram.tpi_formula.capped", { value: quantity(context, 100, "percent", 0) }), { anchor: "end" }) : svg``}
      ${box(x(0), 53, x(0) + 6, 59, classes("d-area", intEmph), "tpi_coef_int")}
      ${label(x(0) + 9, 59, t("diagram.tpi_formula.room", { value: quantity(context, parts.room * 100, "percent", 0) }), { className: classes("d-text", parts.int.example && "d-example", intEmph), key: "tpi_coef_int" })}
      ${box(x(1) - 6, 53, x(1), 59, classes("d-area-warn", extEmph), "tpi_coef_ext")}
      ${label(x(1) - 9, 59, t("diagram.tpi_formula.outside", { value: quantity(context, parts.outside * 100, "percent", 0) }), { anchor: "end", className: classes("d-text", parts.ext.example && "d-example", extEmph), key: "tpi_coef_ext" })}
      ${line(x(0), 72, x(1), 72, "d-axis")}
      ${line(x(0), 69, x(0), 75, "d-axis")}
      ${line(x(0.5), 70, x(0.5), 74, "d-axis")}
      ${line(x(1), 69, x(1), 75, "d-axis")}
      ${label(x(0), 84, quantity(context, 0, "percent", 0), { anchor: "start" })}
      ${label(x(0.5), 84, quantity(context, 50, "percent", 0), { anchor: "middle" })}
      ${label(x(1), 84, quantity(context, 100, "percent", 0), { anchor: "end" })}`;
  },
};

/** The parts of the formula of TPI for the example room and outside. */
function formulaParts(context: DiagramContext): { int: ReturnType<typeof diagramValue>; ext: ReturnType<typeof diagramValue>; room: number; outside: number; total: number } {
  const int = diagramValue(tpiFormula, context.values, "tpi_coef_int");
  const ext = diagramValue(tpiFormula, context.values, "tpi_coef_ext");
  const room = int.value * FORMULA_ROOM_DELTA;
  const outside = ext.value * FORMULA_OUTSIDE_DELTA;
  return { int, ext, room, outside, total: clamp(room + outside, 0, 1) };
}

/**
 * The minimal delays: an on time shorter than the minimal activation delay is skipped (off for the whole cycle), an off time shorter
 * than the minimal deactivation delay is skipped (on for the whole cycle).
 *
 * Illustrates `cycle_scheduler.py` (`calculate_cycle_times`).
 */
export const minOnOff: Diagram = {
  keys: ["minimal_activation_delay", "minimal_deactivation_delay", "cycle_min"],
  examples: { minimal_activation_delay: 30, minimal_deactivation_delay: 15, cycle_min: 5 },
  bounds: { minimal_activation_delay: [0, 3600], minimal_deactivation_delay: [0, 3600], cycle_min: [1, 1000] },
  source: "cycle_scheduler.py",
  title: () => t("diagram.min_on_off.title"),
  caption(context: DiagramContext): string {
    const on = diagramValue(minOnOff, context.values, "minimal_activation_delay");
    const off = diagramValue(minOnOff, context.values, "minimal_deactivation_delay");
    const cycle = diagramValue(minOnOff, context.values, "cycle_min");
    return t("diagram.min_on_off.caption", {
      cycle: stated(quantity(context, cycle.value, "min"), cycle.example),
      on: stated(quantity(context, on.value, "s", 0), on.example),
      off: stated(quantity(context, off.value, "s", 0), off.example),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const on = diagramValue(minOnOff, context.values, "minimal_activation_delay");
    const off = diagramValue(minOnOff, context.values, "minimal_deactivation_delay");
    const cycle = diagramValue(minOnOff, context.values, "cycle_min");
    const cycleSec = cycle.value * 60;
    const x = scale(0, cycleSec, 20, 220);
    const onEnd = Math.max(x(Math.min(on.value, cycleSec)), x(0) + 2);
    const offStart = Math.min(x(cycleSec - Math.min(off.value, cycleSec)), x(cycleSec) - 2);
    const onEmph = emphasis(minOnOff, context, "minimal_activation_delay");
    const offEmph = emphasis(minOnOff, context, "minimal_deactivation_delay");
    const cycleEmph = emphasis(minOnOff, context, "cycle_min");
    return svg`
      ${box(x(0), 14, x(cycleSec), 28, "d-area-ctx")}
      ${box(x(0), 14, onEnd, 28, classes("d-area-warn", onEmph), "minimal_activation_delay")}
      ${label(onEnd + 4, 24, t("diagram.min_on_off.on_rule", { value: quantity(context, on.value, "s", 0) }), { className: classes("d-text", on.example && "d-example", onEmph), key: "minimal_activation_delay" })}
      ${box(x(0), 40, x(cycleSec), 54, "d-area")}
      ${box(offStart, 40, x(cycleSec), 54, classes("d-area-warn", offEmph), "minimal_deactivation_delay")}
      ${label(offStart - 4, 50, t("diagram.min_on_off.off_rule", { value: quantity(context, off.value, "s", 0) }), { anchor: "end", className: classes("d-text", off.example && "d-example", offEmph), key: "minimal_deactivation_delay" })}
      ${bracket(x(0), x(cycleSec), 70, classes("d-mark", cycleEmph), "cycle_min")}
      ${label(x(0), 82, quantity(context, 0, "min"), { anchor: "start" })}
      ${label(x(cycleSec), 82, quantity(context, cycle.value, "min"), { anchor: "end", className: classes("d-note", cycle.example && "d-example", cycleEmph), key: "cycle_min" })}`;
  },
};

/**
 * The thresholds of TPI: while the room warms, TPI is cut above `setpoint + high`; while it cools, it stays cut above
 * `setpoint + low`. The thresholds apply only when both are not 0.
 *
 * Illustrates `prop_algo_tpi.py` (`TpiAlgorithm.calculate`, `_apply_threshold`).
 */
export const tpiThresholds: Diagram = {
  keys: ["tpi_threshold_low", "tpi_threshold_high"],
  examples: { tpi_threshold_low: 0.2, tpi_threshold_high: 0.5 },
  bounds: { tpi_threshold_low: [-10, 10], tpi_threshold_high: [-10, 10] },
  source: "prop_algo_tpi.py",
  title: () => t("diagram.tpi_thresholds.title"),
  caption(context: DiagramContext): string {
    const low = diagramValue(tpiThresholds, context.values, "tpi_threshold_low");
    const high = diagramValue(tpiThresholds, context.values, "tpi_threshold_high");
    const params = {
      low: stated(quantity(context, low.value, "deg", 2, true), low.example),
      high: stated(quantity(context, high.value, "deg", 2, true), high.example),
    };
    return low.value !== 0 && high.value !== 0 ? t("diagram.tpi_thresholds.caption", params) : t("diagram.tpi_thresholds.caption_off", params);
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const low = diagramValue(tpiThresholds, context.values, "tpi_threshold_low");
    const high = diagramValue(tpiThresholds, context.values, "tpi_threshold_high");
    const enabled = low.value !== 0 && high.value !== 0;
    const top = Math.max(low.value, high.value, 0);
    const bottom = Math.min(low.value, high.value, 0);
    const y = scale(bottom - 0.6, top + 0.4, 64, 12);
    // The plot leaves a column on the right for the labels of the lines, spread so that they never overlap.
    const right = 164;
    const xa = 64;
    const xb = 124;
    // The room warms past the high threshold, the heating is cut, the room keeps warming a little then cools past the low one.
    const curve: [number, number][] = enabled
      ? [
          [14, y(bottom - 0.5)],
          [xa, y(high.value)],
          [84, y(top + 0.15)],
          [xb, y(low.value)],
          [146, y(Math.min(low.value, high.value) - 0.1)],
          [right, y(low.value + 0.05)],
        ]
      : [
          [14, y(bottom - 0.5)],
          [80, y(0.1)],
          [124, y(-0.1)],
          [right, y(0.05)],
        ];
    const lowEmph = emphasis(tpiThresholds, context, "tpi_threshold_low");
    const highEmph = emphasis(tpiThresholds, context, "tpi_threshold_high");
    const lines = enabled
      ? [
          { y: y(high.value), text: t("diagram.tpi_thresholds.high", { value: quantity(context, high.value, "deg", 2, true) }), className: classes("d-text", high.example && "d-example", highEmph), key: "tpi_threshold_high" },
          { y: y(0), text: t("diagram.tpi_thresholds.setpoint"), className: "d-note", key: undefined },
          { y: y(low.value), text: t("diagram.tpi_thresholds.low", { value: quantity(context, low.value, "deg", 2, true) }), className: classes("d-text", low.example && "d-example", lowEmph), key: "tpi_threshold_low" },
        ]
      : [{ y: y(0), text: t("diagram.tpi_thresholds.setpoint"), className: "d-note", key: undefined }];
    const placed = spreadLabels(
      lines.map((entry) => entry.y + 3),
      9,
      8,
      70,
    );
    return svg`
      ${line(14, y(0), right, y(0), "d-ctx-dash")}
      ${
        enabled
          ? svg`
        ${line(14, y(high.value), right, y(high.value), classes("d-limit", highEmph), "tpi_threshold_high")}
        ${line(14, y(low.value), right, y(low.value), classes("d-limit", lowEmph), "tpi_threshold_low")}`
          : label(14, 10, t("diagram.tpi_thresholds.disabled"), { className: "d-text" })
      }
      ${lines.map((entry, index) => label(right + 4, placed[index] ?? entry.y, entry.text, { className: entry.className, key: entry.key }))}
      ${path(curve, "d-ctx")}
      ${
        enabled
          ? svg`
        ${box(14, 74, xa, 80, "d-area")}
        ${box(xa, 74, xb, 80, "d-area-warn")}
        ${box(xb, 74, right, 80, "d-area")}
        ${line(xa, 64, xa, 80, "d-grid")}
        ${line(xb, 64, xb, 80, "d-grid")}
        ${label((xa + xb) / 2, 90, t("diagram.tpi_thresholds.cut"), { anchor: "middle" })}`
          : box(14, 74, right, 80, "d-area")
      }`;
  },
};

/**
 * The spread of several switches: each switch starts its on time at an offset of `cycle / n` from the previous one, and an on time
 * that passes the end of the cycle goes on at its start.
 *
 * Illustrates `cycle_scheduler.py` (`_init_cycle`) and `cycle_tick_logic.py` (`compute_circular_offsets`).
 */
export const stagger: Diagram = {
  keys: ["cycle_min", "underlying_entity_ids"],
  examples: { cycle_min: 5, underlying_entity_ids: 3 },
  bounds: { cycle_min: [1, 1000], underlying_entity_ids: [1, 50] },
  source: "cycle_scheduler.py, cycle_tick_logic.py",
  title: () => t("diagram.stagger.title"),
  caption(context: DiagramContext): string {
    const cycle = diagramValue(stagger, context.values, "cycle_min");
    const count = diagramValue(stagger, context.values, "underlying_entity_ids");
    const params = {
      cycle: stated(quantity(context, cycle.value, "min"), cycle.example),
      count: stated(context.format(count.value, { maximumFractionDigits: 0 }), count.example),
      step: quantity(context, cycle.value / Math.max(1, count.value), "min"),
      share: quantity(context, STAGGER_SHARE * 100, "percent", 0),
    };
    return count.value > 1 ? t("diagram.stagger.caption", params) : t("diagram.stagger.caption_one", params);
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const cycle = diagramValue(stagger, context.values, "cycle_min");
    const count = diagramValue(stagger, context.values, "underlying_entity_ids");
    const n = Math.max(1, Math.round(count.value));
    const rows = Math.min(n, STAGGER_ROWS);
    const x = scale(0, 1, 30, 226);
    const countEmph = emphasis(stagger, context, "underlying_entity_ids");
    const cycleEmph = emphasis(stagger, context, "cycle_min");
    const rowTemplates = Array.from({ length: rows }, (_, index) => {
      const top = 10 + index * 14;
      const offset = index / n;
      const end = offset + STAGGER_SHARE;
      const bars =
        end <= 1
          ? box(x(offset), top, x(end), top + 9, classes("d-area", countEmph), "underlying_entity_ids")
          : svg`${box(x(offset), top, x(1), top + 9, classes("d-area", countEmph), "underlying_entity_ids")}${box(x(0), top, x(end - 1), top + 9, classes("d-area", countEmph), "underlying_entity_ids")}`;
      return svg`
        ${box(x(0), top, x(1), top + 9, "d-area-ctx")}
        ${bars}
        ${dot(x(offset), top + 4.5, 1.5, "d-dot")}
        ${label(4, top + 7, t("diagram.stagger.switch", { value: context.format(index + 1) }), { className: classes("d-note", count.example && "d-example", countEmph), key: "underlying_entity_ids" })}`;
    });
    const bottom = 10 + rows * 14;
    return svg`
      ${rowTemplates}
      ${n > rows ? label(4, bottom + 6, t("diagram.stagger.more", { count: context.format(n - rows) }), { className: classes("d-note", countEmph), key: "underlying_entity_ids" }) : svg``}
      ${bracket(x(0), x(1), 80, classes("d-mark", cycleEmph), "cycle_min")}
      ${label(x(0.5), 91, quantity(context, cycle.value, "min"), { anchor: "middle", className: classes("d-text", cycle.example && "d-example", cycleEmph), key: "cycle_min" })}`;
  },
};

