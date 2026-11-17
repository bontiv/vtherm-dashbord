/**
 * The diagrams of the features of a thermostat: the delays of a window sensor, the detection of an open window by the temperature,
 * the delays of motion, safety, the manual override and the detection of a heating failure.
 */

import { svg } from "lit";
import type { SVGTemplateResult } from "lit";

import { box, bracket, classes, diagramValue, dot, emphasis, label, line, path, quantity, scale, stated, t } from "./model.ts";
import type { Diagram, DiagramContext, DiagramValue } from "./model.ts";

/** Whether a value of the draft is empty, so that VT uses another setting in its place. */
function isEmpty(raw: unknown): boolean {
  return raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");
}

/** How long the window stays open in the example of the delays, in seconds. */
const WINDOW_OPEN_S = 300;

/**
 * The delay after the window closes: its own value, or the delay of the opening when it is empty.
 *
 * feature_window_manager.py: `entry_infos.get(CONF_WINDOW_OFF_DELAY, self._window_delay_sec)`.
 */
function windowOffDelay(context: DiagramContext): DiagramValue {
  return isEmpty(context.values["window_off_delay"]) ? diagramValue(windowDelay, context.values, "window_delay") : diagramValue(windowDelay, context.values, "window_off_delay");
}

/**
 * The delays of a window sensor: the window must stay open for the delay before the heating stops, and closed for the off delay
 * before it starts again; a window open for less than the delay is ignored.
 *
 * Illustrates `feature_window_manager.py` (`_window_sensor_changed`, `try_window_condition`).
 */
export const windowDelay: Diagram = {
  keys: ["window_delay", "window_off_delay"],
  examples: { window_delay: 30, window_off_delay: 30 },
  bounds: { window_delay: [0, 7200], window_off_delay: [0, 7200] },
  source: "feature_window_manager.py",
  title: () => t("diagram.window_delay.title"),
  usesExample: (context: DiagramContext) => diagramValue(windowDelay, context.values, "window_delay").example || windowOffDelay(context).example,
  caption(context: DiagramContext): string {
    const delay = diagramValue(windowDelay, context.values, "window_delay");
    const off = windowOffDelay(context);
    return t("diagram.window_delay.caption", {
      delay: stated(quantity(context, delay.value, "s", 0), delay.example),
      off: stated(quantity(context, off.value, "s", 0), off.example),
      open: quantity(context, WINDOW_OPEN_S / 60, "min", 0),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const delay = diagramValue(windowDelay, context.values, "window_delay");
    const off = windowOffDelay(context);
    return eventDelays(context, windowDelay, {
      duration: WINDOW_OPEN_S,
      delay,
      off,
      delayKey: "window_delay",
      offKey: "window_off_delay",
      sensorRow: t("diagram.window_delay.window"),
      sensorOn: t("diagram.window_delay.open"),
      resultRow: t("diagram.window_delay.heating"),
      before: { text: "", className: "d-area" },
      during: { text: t("diagram.window_delay.off"), className: "d-area-warn" },
      ignored: t("diagram.window_delay.ignored"),
    });
  },
};

/** How long motion lasts in the example of the motion, in seconds. */
const MOTION_S = 600;

/** The delay after the motion stops: its own value, or the delay of the motion when it is empty (`feature_motion_manager.py`). */
function motionOffDelay(context: DiagramContext): DiagramValue {
  const raw = context.values["motion_off_delay"];
  // feature_motion_manager.py: "if not self._motion_off_delay_sec: self._motion_off_delay_sec = self._motion_delay_sec".
  return isEmpty(raw) || raw === 0 ? diagramValue(motion, context.values, "motion_delay") : diagramValue(motion, context.values, "motion_off_delay");
}

/**
 * The delays of motion: motion must last the delay before the motion preset is used, and stop for the off delay before the
 * no-motion preset comes back.
 *
 * Illustrates `feature_motion_manager.py` (`_motion_sensor_changed`, `try_motion_condition`).
 */
export const motion: Diagram = {
  keys: ["motion_delay", "motion_off_delay"],
  examples: { motion_delay: 30, motion_off_delay: 300 },
  bounds: { motion_delay: [0, 7200], motion_off_delay: [0, 7200] },
  source: "feature_motion_manager.py",
  title: () => t("diagram.motion.title"),
  usesExample: (context: DiagramContext) => diagramValue(motion, context.values, "motion_delay").example || motionOffDelay(context).example,
  caption(context: DiagramContext): string {
    const delay = diagramValue(motion, context.values, "motion_delay");
    const off = motionOffDelay(context);
    return t("diagram.motion.caption", {
      delay: stated(quantity(context, delay.value, "s", 0), delay.example),
      off: stated(quantity(context, off.value, "s", 0), off.example),
      presence: quantity(context, MOTION_S / 60, "min", 0),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const delay = diagramValue(motion, context.values, "motion_delay");
    const off = motionOffDelay(context);
    return eventDelays(context, motion, {
      duration: MOTION_S,
      delay,
      off,
      delayKey: "motion_delay",
      offKey: "motion_off_delay",
      sensorRow: t("diagram.motion.sensor"),
      sensorOn: t("diagram.motion.active"),
      resultRow: t("diagram.motion.preset"),
      before: { text: t("diagram.motion.idle"), className: "d-area-ctx" },
      during: { text: t("diagram.motion.active"), className: "d-area" },
      ignored: t("diagram.motion.ignored"),
    });
  },
};

/** What the diagram of the delays of an event draws. */
interface EventDelays {
  /** How long the event lasts, in seconds. */
  readonly duration: number;
  readonly delay: DiagramValue;
  readonly off: DiagramValue;
  readonly delayKey: string;
  readonly offKey: string;
  readonly sensorRow: string;
  readonly sensorOn: string;
  readonly resultRow: string;
  /** The state of the result outside the event, and while the event is taken into account. */
  readonly before: { readonly text: string; readonly className: string };
  readonly during: { readonly text: string; readonly className: string };
  /** The label shown when the event is shorter than the delay. */
  readonly ignored: string;
}

/**
 * The delays of an event (a window, motion): a sensor row with the event, a result row that changes once the event lasted the delay
 * and changes back once its end lasted the off delay.
 */
function eventDelays(context: DiagramContext, diagram: Diagram, spec: EventDelays): SVGTemplateResult {
  const { duration, delay, off } = spec;
  // The state must last the delay: an event shorter than the delay is ignored (condition.state with a duration).
  const taken = delay.value < duration;
  const start = -duration * 0.2;
  const end = Math.max(duration + off.value, delay.value) + duration * 0.2;
  const x = scale(start, end, 44, 232);
  const delayEmph = emphasis(diagram, context, spec.delayKey);
  const offEmph = emphasis(diagram, context, spec.offKey);
  const resultEnd = duration + off.value;
  const segment = (from: number, to: number, state: { readonly text: string; readonly className: string }): SVGTemplateResult => svg`
    ${box(x(from), 46, x(to), 58, state.className)}
    ${state.text !== "" && x(to) - x(from) > 34 ? label((x(from) + x(to)) / 2, 55, state.text, { anchor: "middle" }) : svg``}`;
  return svg`
    ${label(2, 25, spec.sensorRow)}
    ${label(2, 55, spec.resultRow)}
    ${line(x(start), 28, x(end), 28, "d-axis")}
    ${box(x(0), 16, x(duration), 28, "d-area-ctx")}
    ${label((x(0) + x(duration)) / 2, 25, spec.sensorOn, { anchor: "middle" })}
    ${line(x(0), 16, x(0), 70, "d-grid")}
    ${line(x(duration), 16, x(duration), 70, "d-grid")}
    ${
      taken
        ? svg`
      ${segment(start, delay.value, spec.before)}
      ${segment(delay.value, resultEnd, spec.during)}
      ${segment(resultEnd, end, spec.before)}`
        : svg`
      ${segment(start, end, spec.before)}
      ${label((x(start) + x(end)) / 2, 66, spec.ignored, { anchor: "middle", className: "d-text" })}`
    }
    ${bracket(x(0), x(Math.min(delay.value, end)), 76, classes("d-mark", delayEmph), spec.delayKey)}
    ${label(x(0), 87, quantity(context, delay.value, "s", 0), { className: classes("d-text", delay.example && "d-example", delayEmph), key: spec.delayKey })}
    ${bracket(x(duration), x(resultEnd), 76, classes("d-mark", offEmph), spec.offKey)}
    ${label(x(duration), 87, quantity(context, off.value, "s", 0), { className: classes("d-text", off.example && "d-example", offEmph), key: spec.offKey })}`;
}

/** The example of the detection by the temperature: a window that makes the room lose this much, then gain this much once closed. */
const SLOPE_DROP = 6;
const SLOPE_RISE = 3;
/** The times of the example, in minutes: the window opens, the slope is detected, the window closes, the slope rises again. */
const SLOPE_OPEN_AT = 10;
const SLOPE_DETECTION_AT = 13;
const SLOPE_CLOSE_AT = 30;
const SLOPE_RECOVERY = 3;

/**
 * The detection of an open window by the temperature: the heating stops when the slope of the temperature is below `−open threshold`,
 * and starts again when the slope is at least the close threshold, or at the latest after the maximal duration.
 *
 * Illustrates `open_window_algorithm.py` (`is_window_open_detected`, `is_window_close_detected`) and `feature_window_manager.py`
 * (`_check_window_auto`, the timer of `window_auto_max_duration`).
 */
export const windowSlope: Diagram = {
  keys: ["window_auto_open_threshold", "window_auto_close_threshold", "window_auto_max_duration"],
  examples: { window_auto_open_threshold: 3, window_auto_close_threshold: 0, window_auto_max_duration: 30 },
  bounds: { window_auto_open_threshold: [0.1, 60], window_auto_close_threshold: [-20, 20], window_auto_max_duration: [1, 1440] },
  source: "open_window_algorithm.py, feature_window_manager.py",
  title: () => t("diagram.window_slope.title"),
  caption(context: DiagramContext): string {
    const open = diagramValue(windowSlope, context.values, "window_auto_open_threshold");
    const close = diagramValue(windowSlope, context.values, "window_auto_close_threshold");
    const max = diagramValue(windowSlope, context.values, "window_auto_max_duration");
    return t("diagram.window_slope.caption", {
      open: stated(quantity(context, open.value, "deg_h"), open.example),
      close: stated(quantity(context, close.value, "deg_h"), close.example),
      max: stated(quantity(context, max.value, "min", 0), max.example),
      drop: quantity(context, SLOPE_DROP, "deg_h"),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const open = diagramValue(windowSlope, context.values, "window_auto_open_threshold");
    const close = diagramValue(windowSlope, context.values, "window_auto_close_threshold");
    const max = diagramValue(windowSlope, context.values, "window_auto_max_duration");
    const detected = open.value < SLOPE_DROP;
    const recovered = close.value <= SLOPE_RISE ? SLOPE_CLOSE_AT + SLOPE_RECOVERY : undefined;
    const maxEnd = SLOPE_DETECTION_AT + max.value;
    const pauseEnd = Math.min(recovered ?? Number.POSITIVE_INFINITY, maxEnd);
    const span = Math.max(SLOPE_CLOSE_AT + 15, Math.min(maxEnd, 3 * (SLOPE_CLOSE_AT + 15)) + 5);
    const x = scale(0, span, 40, 232);
    const lowest = (-SLOPE_DROP * (SLOPE_CLOSE_AT - SLOPE_OPEN_AT)) / 60;
    const y = scale(lowest - 0.3, 0.4, 56, 14);
    const temperature = (time: number): number =>
      time <= SLOPE_OPEN_AT ? 0 : time <= SLOPE_CLOSE_AT ? (-SLOPE_DROP * (time - SLOPE_OPEN_AT)) / 60 : Math.min(0, lowest + (SLOPE_RISE * (time - SLOPE_CLOSE_AT)) / 60);
    const curve: [number, number][] = [0, SLOPE_OPEN_AT, SLOPE_CLOSE_AT, (SLOPE_CLOSE_AT + span) / 2, span].map((time) => [x(time), y(temperature(time))]);
    const openEmph = emphasis(windowSlope, context, "window_auto_open_threshold");
    const closeEmph = emphasis(windowSlope, context, "window_auto_close_threshold");
    const maxEmph = emphasis(windowSlope, context, "window_auto_max_duration");
    const openText = detected ? t("diagram.window_slope.drop", { value: quantity(context, open.value, "deg_h") }) : t("diagram.window_slope.missed");
    const closeText = t("diagram.window_slope.rise", { value: quantity(context, close.value, "deg_h") });
    return svg`
      ${label(2, 22, t("diagram.window_slope.room"))}
      ${label(2, 69, t("diagram.window_slope.heating"))}
      ${path(curve, "d-ctx")}
      ${line(x(SLOPE_DETECTION_AT), 14, x(SLOPE_DETECTION_AT), 72, classes("d-limit", openEmph), "window_auto_open_threshold")}
      ${label(x(SLOPE_DETECTION_AT) + 3, 14, openText, { className: classes("d-text", open.example && "d-example", openEmph), key: "window_auto_open_threshold" })}
      ${
        detected && recovered !== undefined
          ? line(x(recovered), 22, x(recovered), 72, classes("d-limit", closeEmph), "window_auto_close_threshold")
          : svg``
      }
      ${label(recovered !== undefined ? x(recovered) + 3 : x(span), 30, closeText, {
        anchor: recovered !== undefined ? "start" : "end",
        className: classes("d-text", close.example && "d-example", closeEmph),
        key: "window_auto_close_threshold",
      })}
      ${box(x(0), 62, x(span), 72, "d-area")}
      ${
        detected
          ? svg`
        ${box(x(SLOPE_DETECTION_AT), 62, x(Math.min(pauseEnd, span)), 72, "d-area-warn")}
        ${label((x(SLOPE_DETECTION_AT) + x(Math.min(pauseEnd, span))) / 2, 70, t("diagram.window_slope.off"), { anchor: "middle" })}`
          : svg``
      }
      ${bracket(x(SLOPE_DETECTION_AT), x(Math.min(maxEnd, span)), 82, classes("d-mark", maxEmph), "window_auto_max_duration")}
      ${label(x(SLOPE_DETECTION_AT), 92, t("diagram.window_slope.max", { value: quantity(context, max.value, "min", 0) }), {
        className: classes("d-text", max.example && "d-example", maxEmph),
        key: "window_auto_max_duration",
      })}`;
  },
};

/** The power of the heater in the example of safety, as a share of the time. */
const SAFETY_POWER = 0.7;

/**
 * Safety: when no temperature has arrived for the delay and the heater is on at least the minimal share, the thermostat goes into
 * safety and heats the default share.
 *
 * Illustrates `feature_safety_manager.py` (`refresh_state`: `temp_cond`, `switch_cond`, `set_safety(safety_default_on_percent)`).
 */
export const safety: Diagram = {
  keys: ["safety_delay_min", "safety_min_on_percent", "safety_default_on_percent"],
  examples: { safety_delay_min: 60, safety_min_on_percent: 0.5, safety_default_on_percent: 0.1 },
  bounds: { safety_delay_min: [1, 1440], safety_min_on_percent: [0, 1], safety_default_on_percent: [0, 1] },
  source: "feature_safety_manager.py",
  title: () => t("diagram.safety.title"),
  caption(context: DiagramContext): string {
    const delay = diagramValue(safety, context.values, "safety_delay_min");
    const min = diagramValue(safety, context.values, "safety_min_on_percent");
    const fallback = diagramValue(safety, context.values, "safety_default_on_percent");
    return t("diagram.safety.caption", {
      delay: stated(quantity(context, delay.value, "min", 0), delay.example),
      min: stated(quantity(context, min.value * 100, "percent", 0), min.example),
      default: stated(quantity(context, fallback.value * 100, "percent", 0), fallback.example),
      power: quantity(context, SAFETY_POWER * 100, "percent", 0),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const delay = diagramValue(safety, context.values, "safety_delay_min");
    const min = diagramValue(safety, context.values, "safety_min_on_percent");
    const fallback = diagramValue(safety, context.values, "safety_default_on_percent");
    const start = -delay.value * 0.6;
    const end = delay.value * 1.6;
    const x = scale(start, end, 44, 232);
    const y = scale(0, 1, 82, 44);
    const triggered = SAFETY_POWER >= min.value;
    const delayEmph = emphasis(safety, context, "safety_delay_min");
    const minEmph = emphasis(safety, context, "safety_min_on_percent");
    const fallbackEmph = emphasis(safety, context, "safety_default_on_percent");
    const after = triggered ? fallback.value : SAFETY_POWER;
    return svg`
      ${label(2, 16, t("diagram.safety.sensor"))}
      ${label(2, 66, t("diagram.safety.power"))}
      ${[-0.5, -0.35, -0.2, 0].map((share) => dot(x(share * delay.value), 13, 2, "d-dot-ctx"))}
      ${line(x(delay.value), 8, x(delay.value), 82, "d-grid")}
      ${bracket(x(0), x(delay.value), 26, classes("d-mark", delayEmph), "safety_delay_min")}
      ${label((x(0) + x(delay.value)) / 2, 35, quantity(context, delay.value, "min", 0), {
        anchor: "middle",
        className: classes("d-text", delay.example && "d-example", delayEmph),
        key: "safety_delay_min",
      })}
      ${line(x(start), 82, x(end), 82, "d-axis")}
      ${line(x(start), y(min.value), x(end), y(min.value), classes("d-limit", minEmph), "safety_min_on_percent")}
      ${label(x(end), y(min.value) - 2, t("diagram.safety.min", { value: quantity(context, min.value * 100, "percent", 0) }), {
        anchor: "end",
        className: classes("d-text", min.example && "d-example", minEmph),
        key: "safety_min_on_percent",
      })}
      ${path(
        [
          [x(start), y(SAFETY_POWER)],
          [x(delay.value), y(SAFETY_POWER)],
        ],
        "d-main",
      )}
      ${label(x(start) + 2, y(SAFETY_POWER) - 3, quantity(context, SAFETY_POWER * 100, "percent", 0))}
      ${line(x(delay.value), y(SAFETY_POWER), x(delay.value), y(after), "d-main")}
      ${line(x(delay.value), y(after), x(end), y(after), classes("d-main", triggered && fallbackEmph), triggered ? "safety_default_on_percent" : undefined)}
      ${
        triggered
          ? label(x(delay.value) + 3, y(after) - 3, t("diagram.safety.safety", { value: quantity(context, fallback.value * 100, "percent", 0) }), {
              className: classes("d-text", fallback.example && "d-example", fallbackEmph),
              key: "safety_default_on_percent",
            })
          : label(x(delay.value) + 3, y(after) - 3, t("diagram.safety.none"), { className: "d-text" })
      }`;
  },
};

/** The setpoints of the example of the manual override, in degrees. */
const OVERRIDE_PRESET = 19;
const OVERRIDE_MANUAL = 21;

/**
 * The manual override: after a manual change of the setpoint, the thermostat goes back to its preset after the duration; 0 turns the
 * return off.
 *
 * Illustrates `feature_timed_preset_manager.py` (`can_start_manual_override`, `start_manual_override`).
 */
export const override: Diagram = {
  keys: ["manual_override_duration_min"],
  examples: { manual_override_duration_min: 60 },
  bounds: { manual_override_duration_min: [0, 10080] },
  source: "feature_timed_preset_manager.py",
  title: () => t("diagram.override.title"),
  caption(context: DiagramContext): string {
    const duration = diagramValue(override, context.values, "manual_override_duration_min");
    const params = { duration: stated(quantity(context, duration.value, "min", 0), duration.example) };
    return duration.value > 0 ? t("diagram.override.caption", params) : t("diagram.override.caption_off", params);
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const duration = diagramValue(override, context.values, "manual_override_duration_min");
    const drawn = duration.value > 0 ? duration.value : 60;
    const start = -drawn * 0.4;
    const end = drawn * 1.5;
    const x = scale(start, end, 20, 232);
    const y = scale(OVERRIDE_PRESET - 0.5, OVERRIDE_MANUAL + 0.8, 62, 14);
    const emph = emphasis(override, context, "manual_override_duration_min");
    const points: [number, number][] =
      duration.value > 0
        ? [
            [x(start), y(OVERRIDE_PRESET)],
            [x(0), y(OVERRIDE_PRESET)],
            [x(0), y(OVERRIDE_MANUAL)],
            [x(duration.value), y(OVERRIDE_MANUAL)],
            [x(duration.value), y(OVERRIDE_PRESET)],
            [x(end), y(OVERRIDE_PRESET)],
          ]
        : [
            [x(start), y(OVERRIDE_PRESET)],
            [x(0), y(OVERRIDE_PRESET)],
            [x(0), y(OVERRIDE_MANUAL)],
            [x(end), y(OVERRIDE_MANUAL)],
          ];
    return svg`
      ${line(x(0), 10, x(0), 74, "d-grid")}
      ${path(points, "d-main")}
      ${label(x(start) + 2, y(OVERRIDE_PRESET) + 10, t("diagram.override.preset"))}
      ${label(x(0) + 3, y(OVERRIDE_MANUAL) - 4, t("diagram.override.manual"))}
      ${duration.value > 0 ? label(x(duration.value) + 3, y(OVERRIDE_PRESET) + 10, t("diagram.override.preset")) : svg``}
      ${
        duration.value > 0
          ? bracket(x(0), x(duration.value), 78, classes("d-mark", emph), "manual_override_duration_min")
          : svg``
      }
      ${label(duration.value > 0 ? (x(0) + x(duration.value)) / 2 : x(0) + 3, 89, duration.value > 0 ? quantity(context, duration.value, "min", 0) : t("diagram.override.disabled"), {
        anchor: duration.value > 0 ? "middle" : "start",
        className: classes("d-text", duration.example && "d-example", emph),
        key: "manual_override_duration_min",
      })}`;
  },
};

/**
 * The detection of a heating failure: with the heater on at least the heating threshold for the delay, a rise of the room below the
 * tolerance is a heating failure; with the heater on at most the cooling threshold, a rise above the tolerance is a cooling failure.
 *
 * Illustrates `feature_heating_failure_detection_manager.py` (`_check_heating_failure`, `_check_cooling_failure`).
 */
export const failure: Diagram = {
  keys: ["heating_failure_threshold", "cooling_failure_threshold", "heating_failure_detection_delay", "temperature_change_tolerance"],
  examples: { heating_failure_threshold: 0.9, cooling_failure_threshold: 0, heating_failure_detection_delay: 15, temperature_change_tolerance: 0.5 },
  bounds: { heating_failure_threshold: [0, 1], cooling_failure_threshold: [0, 1], heating_failure_detection_delay: [1, 1440], temperature_change_tolerance: [0, 5] },
  source: "feature_heating_failure_detection_manager.py",
  title: () => t("diagram.failure.title"),
  caption(context: DiagramContext): string {
    const heat = diagramValue(failure, context.values, "heating_failure_threshold");
    const cool = diagramValue(failure, context.values, "cooling_failure_threshold");
    const delay = diagramValue(failure, context.values, "heating_failure_detection_delay");
    const tolerance = diagramValue(failure, context.values, "temperature_change_tolerance");
    return t("diagram.failure.caption", {
      heat: stated(quantity(context, heat.value * 100, "percent", 0), heat.example),
      cool: stated(quantity(context, cool.value * 100, "percent", 0), cool.example),
      delay: stated(quantity(context, delay.value, "min", 0), delay.example),
      tolerance: stated(quantity(context, tolerance.value, "deg"), tolerance.example),
    });
  },
  draw(context: DiagramContext): SVGTemplateResult {
    const heat = diagramValue(failure, context.values, "heating_failure_threshold");
    const cool = diagramValue(failure, context.values, "cooling_failure_threshold");
    const delay = diagramValue(failure, context.values, "heating_failure_detection_delay");
    const tolerance = diagramValue(failure, context.values, "temperature_change_tolerance");
    const delayEmph = emphasis(failure, context, "heating_failure_detection_delay");
    const toleranceEmph = emphasis(failure, context, "temperature_change_tolerance");
    // The panel of one detection: the power and its threshold, the room and the tolerance, the delay and the alert at its end.
    const panel = (left: number, title: string, power: number, threshold: DiagramValue, thresholdKey: string, rise: number): SVGTemplateResult => {
      const x0 = left + 6;
      const x1 = left + 112;
      const powerY = scale(0, 1, 34, 16);
      const toleranceY = scale(0, Math.max(tolerance.value * 2, 0.2), 74, 44);
      const thresholdEmph = emphasis(failure, context, thresholdKey);
      const riseEnd = toleranceY(Math.min(rise, Math.max(tolerance.value * 2, 0.2)));
      return svg`
        ${label(x0, 9, title, { className: "d-text" })}
        ${line(x0, 34, x1, 34, "d-axis")}
        ${line(x0, powerY(power), x1, powerY(power), "d-main")}
        ${line(x0, powerY(threshold.value), x1, powerY(threshold.value), classes("d-limit", thresholdEmph), thresholdKey)}
        ${label(x1, powerY(threshold.value) + (threshold.value > 0.5 ? 9 : -2), quantity(context, threshold.value * 100, "percent", 0), {
          anchor: "end",
          className: classes("d-note", threshold.example && "d-example", thresholdEmph),
          key: thresholdKey,
        })}
        ${box(x0, toleranceY(tolerance.value), x1, toleranceY(0), classes("d-area-warn", toleranceEmph), "temperature_change_tolerance")}
        ${label(x0 + 2, toleranceY(tolerance.value) - 2, quantity(context, tolerance.value, "deg"), {
          className: classes("d-note", tolerance.example && "d-example", toleranceEmph),
          key: "temperature_change_tolerance",
        })}
        ${path(
          [
            [x0, toleranceY(0)],
            [x1, riseEnd],
          ],
          "d-ctx",
        )}
        ${dot(x1, riseEnd, 3, "d-dot-warn")}
        ${label(x1 - 5, riseEnd + (rise > tolerance.value ? 9 : -4), t("diagram.failure.alert"), { anchor: "end", className: "d-text" })}
        ${bracket(x0, x1, 82, classes("d-mark", delayEmph), "heating_failure_detection_delay")}
        ${label((x0 + x1) / 2, 92, quantity(context, delay.value, "min", 0), {
          anchor: "middle",
          className: classes("d-text", delay.example && "d-example", delayEmph),
          key: "heating_failure_detection_delay",
        })}`;
    };
    return svg`
      ${panel(0, t("diagram.failure.heating"), 1, heat, "heating_failure_threshold", tolerance.value * 0.4)}
      ${line(120, 4, 120, 92, "d-grid")}
      ${panel(122, t("diagram.failure.cooling"), 0, cool, "cooling_failure_threshold", Math.max(tolerance.value * 1.6, 0.15))}`;
  },
};
