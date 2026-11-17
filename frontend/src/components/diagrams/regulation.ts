/**
 * The diagrams of the regulation of a thermostat over a climate or a valve: the curve of the opening of a valve, the sending of the
 * regulated setpoint, and the correction of the setpoint by the self-regulation.
 */

import { svg } from "lit";
import type { SVGTemplateResult } from "lit";

import { box, bracket, classes, clamp, diagramValue, dot, emphasis, label, line, path, quantity, scale, stated, t, valueCount } from "./model.ts";
import type { Diagram, DiagramContext, DiagramValue } from "./model.ts";

/**
 * The opening sent to a valve for an opening asked, as VT computes it.
 *
 * Mirrors `OpeningClosingDegreeCalculation.calculate_opening_closing_degree`: below the threshold (or at 0) the valve gets
 * `100 − max_closing_degree`; from the threshold, a line from the minimal to the maximal opening; never below `100 − max_closing_degree`.
 *
 * @param asked - The opening asked, 0 to 100.
 * @returns The opening sent, 0 to 100.
 */
export function valveOpening(asked: number, min: number, max: number, threshold: number, maxClosing: number): number {
  const closed = 100 - maxClosing;
  const value = clamp(asked, 0, 100);
  let sent: number;
  if (value >= threshold && value > 0) {
    sent = threshold >= 100 ? max : min + ((max - min) / (100 - threshold)) * (value - threshold);
  } else {
    sent = closed;
  }
  return Math.max(sent, closed);
}

/** The values of the valve, with the rule of VT: a minimal opening that is not below the maximal one falls back on the threshold. */
function valveValues(context: DiagramContext): { min: DiagramValue; max: DiagramValue; threshold: DiagramValue; maxClosing: DiagramValue; effectiveMin: number } {
  const min = diagramValue(valveCurve, context.values, "min_opening_degrees");
  const max = diagramValue(valveCurve, context.values, "max_opening_degrees");
  const threshold = diagramValue(valveCurve, context.values, "opening_threshold_degree");
  const maxClosing = diagramValue(valveCurve, context.values, "max_closing_degree");
  // underlyings.py: "if self._min_opening_degree >= self._max_opening_degree: self._min_opening_degree = self._opening_threshold".
  const effectiveMin = min.value >= max.value ? threshold.value : min.value;
  return { min, max, threshold, maxClosing, effectiveMin };
}

/**
 * The curve of the opening of a valve: closed (to `100 − max_closing_degree`) below the threshold, then a step to the minimal opening
 * and a line up to the maximal opening.
 *
 * Illustrates `opening_degree_algorithm.py` and `underlyings.py` (`UnderlyingValveRegulation`).
 */
export const valveCurve: Diagram = {
  keys: ["min_opening_degrees", "max_opening_degrees", "opening_threshold_degree", "max_closing_degree"],
  examples: { min_opening_degrees: 10, max_opening_degrees: 100, opening_threshold_degree: 10, max_closing_degree: 100 },
  bounds: { min_opening_degrees: [0, 100], max_opening_degrees: [1, 100], opening_threshold_degree: [0, 100], max_closing_degree: [0, 100] },
  source: "opening_degree_algorithm.py, underlyings.py",
  title: () => t("diagram.valve_curve.title"),
  caption(context: DiagramContext): string {
    const { min, max, threshold, maxClosing, effectiveMin } = valveValues(context);
    const text = t("diagram.valve_curve.caption", {
      threshold: stated(quantity(context, threshold.value, "percent", 0), threshold.example),
      closed: stated(quantity(context, 100 - maxClosing.value, "percent", 0), maxClosing.example),
      min: stated(quantity(context, Math.max(effectiveMin, 100 - maxClosing.value), "percent", 0), min.example),
      max: stated(quantity(context, Math.max(max.value, 100 - maxClosing.value), "percent", 0), max.example),
    });
    const count = Math.max(valueCount(context.values, "min_opening_degrees"), valueCount(context.values, "max_opening_degrees"));
    return count > 1 ? `${text} ${t("diagram.valve_curve.several", { count: context.format(count) })}` : text;
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const { min, max, threshold, maxClosing, effectiveMin } = valveValues(context);
    const x = scale(0, 100, 28, 228);
    const y = scale(0, 100, 80, 14);
    const closed = 100 - maxClosing.value;
    const opening = (asked: number): number => valveOpening(asked, effectiveMin, max.value, threshold.value, maxClosing.value);
    const points: [number, number][] = [[x(0), y(opening(0))]];
    if (threshold.value > 0) {
      points.push([x(threshold.value), y(closed)]);
    }
    for (let asked = Math.max(threshold.value, 0.5); asked <= 100; asked += 1) {
      points.push([x(asked), y(opening(asked))]);
    }
    points.push([x(100), y(opening(100))]);
    const stepY = y(opening(Math.max(threshold.value, 0.01)));
    const maxY = y(opening(100));
    const minEmph = emphasis(valveCurve, context, "min_opening_degrees");
    const maxEmph = emphasis(valveCurve, context, "max_opening_degrees");
    const thresholdEmph = emphasis(valveCurve, context, "opening_threshold_degree");
    const closingEmph = emphasis(valveCurve, context, "max_closing_degree");
    const thresholdRight = threshold.value > 70;
    // The label of the closed level sits at the top left of the closed zone, where the rising curve never passes.
    return svg`
      ${box(x(0), y(100), x(threshold.value), y(0), classes("d-area-ctx", thresholdEmph), "opening_threshold_degree")}
      ${line(x(0), y(0), x(100), y(0), "d-axis")}
      ${line(x(0), y(0), x(0), y(100), "d-axis")}
      ${line(x(threshold.value), y(100), x(threshold.value), y(0), classes("d-limit", thresholdEmph), "opening_threshold_degree")}
      ${label(x(threshold.value) + (thresholdRight ? -2 : 2), 10, t("diagram.valve_curve.threshold", { value: quantity(context, threshold.value, "percent", 0) }), {
        anchor: thresholdRight ? "end" : "start",
        className: classes("d-text", threshold.example && "d-example", thresholdEmph),
        key: "opening_threshold_degree",
      })}
      ${line(x(0), y(closed), x(threshold.value), y(closed), classes("d-mark", closingEmph), "max_closing_degree")}
      ${label(x(0) + 2, 24, t("diagram.valve_curve.closed", { value: quantity(context, closed, "percent", 0) }), {
        className: classes("d-note", maxClosing.example && "d-example", closingEmph),
        key: "max_closing_degree",
      })}
      ${path(points, "d-main")}
      ${dot(x(threshold.value), stepY, 2.5, classes("d-dot", minEmph), "min_opening_degrees")}
      ${label(x(threshold.value) + 5, stepY + (stepY < 24 ? 9 : -3), t("diagram.valve_curve.min", { value: quantity(context, Math.max(effectiveMin, closed), "percent", 0) }), {
        className: classes("d-text", min.example && "d-example", minEmph),
        key: "min_opening_degrees",
      })}
      ${dot(x(100), maxY, 2.5, classes("d-dot", maxEmph), "max_opening_degrees")}
      ${label(x(100) - 4, maxY + (maxY < 24 ? 10 : -4), t("diagram.valve_curve.max", { value: quantity(context, Math.max(max.value, closed), "percent", 0) }), {
        anchor: "end",
        className: classes("d-text", max.example && "d-example", maxEmph),
        key: "max_opening_degrees",
      })}
      ${label(x(0), 89, quantity(context, 0, "percent", 0), { anchor: "middle" })}
      ${label(x(100), 89, quantity(context, 100, "percent", 0), { anchor: "middle" })}
      ${label(x(50), 92, t("diagram.valve_curve.asked"), { anchor: "middle" })}
      ${label(2, 8, t("diagram.valve_curve.sent"))}`;
  },
};

/** The time drawn by the diagram of the sending, in minutes, and the rise of the correction computed over that time, in degrees. */
const SEND_SPAN_MIN = 30;
const SEND_RISE = 2;

/** The step used to round the setpoint when the threshold is 0 (VT then rounds to the step of the target temperature). */
const SEND_DEFAULT_STEP = 0.1;

/** The sends of the regulated setpoint over the example, minute by minute. */
export function regulatedSends(dtemp: number, periodMin: number): { readonly time: number; readonly value: number }[] {
  const step = dtemp > 0 ? dtemp : SEND_DEFAULT_STEP;
  const sends = [{ time: 0, value: 0 }];
  let last = sends[0] ?? { time: 0, value: 0 };
  for (let minute = 1; minute <= SEND_SPAN_MIN; minute += 1) {
    const computed = SEND_RISE * (1 - Math.exp(-minute / 8));
    const candidate = Math.round(computed / step) * step;
    // thermostat_climate.py: no send before the period since the last change, nor for a change smaller than the threshold.
    if (minute - last.time >= periodMin && Math.abs(candidate - last.value) >= Math.max(dtemp, 1e-9)) {
      last = { time: minute, value: candidate };
      sends.push(last);
    }
  }
  return sends;
}

/**
 * The sending of the regulated setpoint: a new setpoint goes to the device only after the minimal period since the last change and
 * when it differs from the last sent one by the threshold or more.
 *
 * Illustrates `thermostat_climate.py` (`_send_regulated_temperature`, `check_auto_regulation_period_min`).
 */
export const sendThreshold: Diagram = {
  keys: ["auto_regulation_dtemp", "auto_regulation_periode_min"],
  examples: { auto_regulation_dtemp: 0.5, auto_regulation_periode_min: 5 },
  bounds: { auto_regulation_dtemp: [0, 5], auto_regulation_periode_min: [0, 60] },
  source: "thermostat_climate.py",
  title: () => t("diagram.send_threshold.title"),
  caption(context: DiagramContext): string {
    const dtemp = diagramValue(sendThreshold, context.values, "auto_regulation_dtemp");
    const period = diagramValue(sendThreshold, context.values, "auto_regulation_periode_min");
    return t("diagram.send_threshold.caption", {
      dtemp: stated(quantity(context, dtemp.value, "deg", 2), dtemp.example),
      period: stated(quantity(context, period.value, "min", 0), period.example),
      rise: quantity(context, SEND_RISE, "deg"),
      span: quantity(context, SEND_SPAN_MIN, "min", 0),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const dtemp = diagramValue(sendThreshold, context.values, "auto_regulation_dtemp");
    const period = diagramValue(sendThreshold, context.values, "auto_regulation_periode_min");
    const x = scale(0, SEND_SPAN_MIN, 20, 228);
    const y = scale(0, SEND_RISE + 0.3, 70, 16);
    const computed: [number, number][] = Array.from({ length: SEND_SPAN_MIN + 1 }, (_, minute) => [x(minute), y(SEND_RISE * (1 - Math.exp(-minute / 8)))]);
    const sends = regulatedSends(dtemp.value, period.value);
    const staircase: [number, number][] = [];
    sends.forEach((send, index) => {
      const next = sends[index + 1];
      staircase.push([x(send.time), y(send.value)], [x(next?.time ?? SEND_SPAN_MIN), y(send.value)]);
    });
    const last = sends[sends.length - 1] ?? { time: 0, value: 0 };
    const bandTop = clamp(last.value + dtemp.value, 0, SEND_RISE + 0.3);
    const bandBottom = clamp(last.value - dtemp.value, 0, SEND_RISE + 0.3);
    const periodTicks = period.value > 0 ? Array.from({ length: Math.floor(SEND_SPAN_MIN / period.value) + 1 }, (_, index) => index * period.value) : [];
    const dtempEmph = emphasis(sendThreshold, context, "auto_regulation_dtemp");
    const periodEmph = emphasis(sendThreshold, context, "auto_regulation_periode_min");
    const firstPeriod = Math.min(period.value, SEND_SPAN_MIN);
    return svg`
      ${periodTicks.map((time) => line(x(time), 16, x(time), 70, classes("d-grid", periodEmph), "auto_regulation_periode_min"))}
      ${box(x(last.time), y(bandTop), x(SEND_SPAN_MIN), y(bandBottom), classes("d-area-warn", dtempEmph), "auto_regulation_dtemp")}
      ${label(x(last.time) + 2, y(bandTop) - 2, t("diagram.send_threshold.band", { value: quantity(context, dtemp.value, "deg", 2) }), {
        className: classes("d-text", dtemp.example && "d-example", dtempEmph),
        key: "auto_regulation_dtemp",
      })}
      ${line(x(0), 70, x(SEND_SPAN_MIN), 70, "d-axis")}
      ${path(computed, "d-ctx-dash")}
      ${path(staircase, "d-main")}
      ${line(20, 8, 30, 8, "d-ctx-dash")}
      ${label(33, 10, t("diagram.send_threshold.computed"))}
      ${line(78, 8, 88, 8, "d-main")}
      ${label(91, 10, t("diagram.send_threshold.sent"))}
      ${firstPeriod > 0 ? bracket(x(0), x(firstPeriod), 78, classes("d-mark", periodEmph), "auto_regulation_periode_min") : svg``}
      ${label(x(0), 89, quantity(context, period.value, "min", 0), { className: classes("d-text", period.example && "d-example", periodEmph), key: "auto_regulation_periode_min" })}`;
  },
};

/** The self-regulation modes of VT. */
export const REGULATION_MODES = [
  "auto_regulation_none",
  "auto_regulation_valve",
  "auto_regulation_light",
  "auto_regulation_medium",
  "auto_regulation_strong",
  "auto_regulation_slow",
  "auto_regulation_expert",
] as const;

/** A self-regulation mode of VT. */
export type RegulationMode = (typeof REGULATION_MODES)[number];

/** The parameters of the regulator of a mode, from `const.py` (`RegulationParamLight`, `…Medium`, `…Strong`, `…Slow`). */
interface RegulationParams {
  readonly kp: number;
  readonly ki: number;
  readonly kExt: number;
  readonly offsetMax: number;
  readonly accumulatedErrorThreshold: number;
}

const REGULATION_PARAMS: Readonly<Partial<Record<RegulationMode, RegulationParams>>> = {
  auto_regulation_light: { kp: 0.2, ki: 0.05, kExt: 0.05, offsetMax: 1.5, accumulatedErrorThreshold: 10 },
  auto_regulation_medium: { kp: 0.3, ki: 0.05, kExt: 0.1, offsetMax: 2, accumulatedErrorThreshold: 20 },
  auto_regulation_strong: { kp: 0.4, ki: 0.08, kExt: 0, offsetMax: 5, accumulatedErrorThreshold: 50 },
  auto_regulation_slow: { kp: 0.2, ki: 0.8 / 288, kExt: 1 / 25, offsetMax: 2, accumulatedErrorThreshold: 2 * 288 },
};

/** The example of the correction: the room starts this far below the setpoint, the outside is this much colder, over these periods. */
const ROOM_BELOW = 2;
const OUTSIDE_COLDER = 15;
const CORRECTION_PERIODS = 12;

/** The mode drawn: the mode of the draft, or the example. */
function regulationMode(context: DiagramContext): { readonly mode: RegulationMode; readonly example: boolean } {
  const raw = context.values["auto_regulation_mode"];
  const known = REGULATION_MODES.find((mode) => mode === raw);
  return known !== undefined ? { mode: known, example: false } : { mode: "auto_regulation_medium", example: true };
}

/**
 * The room and the setpoint sent over the example, relative to the setpoint, period by period.
 *
 * Mirrors `PITemperatureRegulator.calculate_regulated_temperature` with a time delta of one period: the error, its sum (halved when
 * its sign changes, capped), the offset `kp × error + ki × sum`, the outside offset `k_ext × (room − outside)`, the total capped to
 * `±offset_max`.
 */
export function regulatedSetpoints(params: RegulationParams): { readonly room: number; readonly sent: number }[] {
  const outside = -OUTSIDE_COLDER;
  let accumulated = 0;
  return Array.from({ length: CORRECTION_PERIODS + 1 }, (_, period) => {
    const room = -ROOM_BELOW * Math.exp(-period / 3);
    const error = 0 - room;
    if (error * accumulated < 0) {
      accumulated /= 2;
    }
    accumulated = clamp(accumulated + error, -params.accumulatedErrorThreshold, params.accumulatedErrorThreshold);
    const offset = params.kp * error + params.ki * accumulated + params.kExt * (room - outside);
    return { room, sent: clamp(offset, -params.offsetMax, params.offsetMax) };
  });
}

/**
 * The correction of the setpoint by the self-regulation: with a mode of the regulator, the device gets the setpoint plus a correction
 * capped by the mode; with no regulation or the direct valve, it gets the setpoint unchanged; with the expert mode, the parameters
 * come from `configuration.yaml`.
 *
 * Illustrates `thermostat_climate.py` (`choose_auto_regulation_mode`), `pi_algorithm.py` and `const.py` (`RegulationParam…`).
 */
export const correction: Diagram = {
  keys: ["auto_regulation_mode"],
  examples: {},
  bounds: {},
  source: "thermostat_climate.py, pi_algorithm.py, const.py",
  title: () => t("diagram.correction.title"),
  usesExample: (context: DiagramContext) => regulationMode(context).example,
  caption(context: DiagramContext): string {
    const { mode, example } = regulationMode(context);
    const name = stated(t(`diagram.correction.${mode}`), example);
    const params = REGULATION_PARAMS[mode];
    if (params !== undefined) {
      return t("diagram.correction.caption", {
        mode: name,
        max: quantity(context, params.offsetMax, "deg"),
        room: quantity(context, ROOM_BELOW, "deg"),
        outside: quantity(context, OUTSIDE_COLDER, "deg"),
      });
    }
    if (mode === "auto_regulation_valve") {
      return t("diagram.correction.caption_valve", { mode: name });
    }
    if (mode === "auto_regulation_expert") {
      return t("diagram.correction.caption_expert", { mode: name });
    }
    return t("diagram.correction.caption_none", { mode: name });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const { mode, example } = regulationMode(context);
    const params = REGULATION_PARAMS[mode];
    const points = params !== undefined ? regulatedSetpoints(params) : Array.from({ length: CORRECTION_PERIODS + 1 }, (_, period) => ({ room: -ROOM_BELOW * Math.exp(-period / 3), sent: 0 }));
    const highest = Math.max(0, ...points.map((point) => point.sent));
    const x = scale(0, CORRECTION_PERIODS, 20, 200);
    const y = scale(-ROOM_BELOW - 0.3, highest + 0.6, 80, 16);
    const emph = classes(emphasis(correction, context, "auto_regulation_mode"), example && "d-example");
    const sentEnd = points[points.length - 1]?.sent ?? 0;
    const note = mode === "auto_regulation_valve" ? t("diagram.correction.valve_note") : mode === "auto_regulation_expert" ? t("diagram.correction.expert_note") : undefined;
    return svg`
      ${label(20, 9, t("diagram.correction.mode", { mode: t(`diagram.correction.${mode}`) }), { className: classes("d-text", emph), key: "auto_regulation_mode" })}
      ${params !== undefined && params.offsetMax <= highest + 0.6 ? svg`
        ${line(x(0), y(params.offsetMax), x(CORRECTION_PERIODS), y(params.offsetMax), "d-limit")}
        ${label(x(CORRECTION_PERIODS), y(params.offsetMax) - 2, t("diagram.correction.limit", { value: quantity(context, params.offsetMax, "deg", 1, true) }), { anchor: "end" })}` : svg``}
      ${line(x(0), y(0), x(CORRECTION_PERIODS), y(0), "d-ctx-dash")}
      ${label(x(CORRECTION_PERIODS) + 3, y(0) + 3, t("diagram.correction.setpoint"))}
      ${path(points.map((point, period) => [x(period), y(point.room)] as [number, number]), "d-ctx")}
      ${label(x(0) + 2, y(-ROOM_BELOW) + 9, t("diagram.correction.room"))}
      ${path(points.map((point, period) => [x(period), y(point.sent)] as [number, number]), classes("d-main", emph), "auto_regulation_mode")}
      ${label(x(CORRECTION_PERIODS) + 3, y(sentEnd) - (Math.abs(y(sentEnd) - y(0)) < 8 ? 7 : -3), t("diagram.correction.sent"), { className: classes("d-text", emph), key: "auto_regulation_mode" })}
      ${note !== undefined ? label(120, 9, note, { className: "d-note" }) : svg``}`;
  },
};
