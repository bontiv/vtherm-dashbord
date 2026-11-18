/**
 * The automatic open window detection of Versatile Thermostat, replayed on a slope series (`feature_window_manager.py`,
 * `open_window_algorithm.py`).
 */

import { valueAt } from "./series.ts";
import type { Sample } from "./series.ts";

/** The settings of the automatic detection, as the draft gives them. */
export interface WindowSettings {
  /** `window_auto_open_threshold`, in degrees per hour, positive: a slope under its opposite opens. */
  readonly openThreshold?: number;
  /** `window_auto_close_threshold`, in degrees per hour: a slope at or above it closes. */
  readonly closeThreshold?: number;
  /** `window_auto_max_duration`, in minutes: a detection ends after it. */
  readonly maxDurationMin?: number;
}

/** A period where VT would have detected an open window. */
export interface WindowDetection {
  /** The start, in milliseconds since the epoch. */
  readonly start: number;
  /** The end, in milliseconds since the epoch. */
  readonly end: number;
  /** `close`: the slope came back to the close threshold; `max_duration`: the maximal duration expired; `period_end`: still open. */
  readonly endReason: "close" | "max_duration" | "period_end";
  /** The lowest slope during the detection, in degrees per hour. */
  readonly minSlope: number;
}

/** Options of {@link windowDetections}. */
export interface WindowDetectionOptions {
  /** The end of the period, for a detection still open; default the time of the last slope sample. */
  readonly end?: number;
  /**
   * The share of heating of the thermostat (`on_percent`, 0..1), for a proportional thermostat: VT ignores an opening while the
   * share is 0. Without it, this rule is not applied.
   */
  readonly onPercent?: readonly Sample[];
}

/** The result of {@link windowDetections}. */
export interface WindowDetections {
  /** The periods of detection, in time order. */
  readonly detections: readonly WindowDetection[];
  /** The most negative slope of the series, when one is negative. */
  readonly strongestDrop?: Sample;
  /**
   * False when VT would not run the detection with these settings (`FeatureWindowManager.post_init`: an open threshold above 0, a
   * close threshold and a maximal duration above 0 are all required); there is no detection then.
   */
  readonly configured: boolean;
}

/**
 * Replay the automatic open window detection of VT on a slope series.
 *
 * Ports `FeatureWindowManager.post_init` (when the detection is configured) and `FeatureWindowManager.manage_window_auto` with
 * `WindowOpenDetectionAlgorithm.is_window_open_detected` / `is_window_close_detected`: at each evaluation, a slope under
 * `-openThreshold` opens when no detection is running (and, with `options.onPercent`, when the share is above 0), a slope at or above
 * `closeThreshold` closes a running detection, and the timer of `maxDurationMin` ends it; a slope still under the threshold at the next
 * evaluation opens a new one. The rule of 4 points before any detection (`MIN_NB_POINT`) applies only at the start of the history,
 * which `slopeHistory` warms up; it is not replayed here. The window bypass and the off mode are not replayed.
 *
 * @param slope - The slope at each evaluation of VT, from {@link slopeHistory}.
 * @param settings - The thresholds and the maximal duration to try.
 * @param options - The end of the period and the share of heating.
 */
export function windowDetections(slope: readonly Sample[], settings: WindowSettings, options: WindowDetectionOptions = {}): WindowDetections {
  let strongestDrop: Sample | undefined;
  for (const sample of slope) {
    if (sample.v < 0 && (strongestDrop === undefined || sample.v < strongestDrop.v)) {
      strongestDrop = sample;
    }
  }
  const strongest = strongestDrop === undefined ? {} : { strongestDrop };
  const { openThreshold, closeThreshold, maxDurationMin } = settings;
  if (openThreshold === undefined || !(openThreshold > 0.0) || closeThreshold === undefined || maxDurationMin === undefined || !(maxDurationMin > 0)) {
    return { detections: [], ...strongest, configured: false };
  }
  const maxMs = maxDurationMin * 60_000;
  const detections: WindowDetection[] = [];
  let current: { start: number; minSlope: number } | undefined;
  for (const sample of slope) {
    if (current !== undefined && sample.t >= current.start + maxMs) {
      // The timer armed at the opening (async_call_later of window_auto_max_duration) fired before this evaluation.
      detections.push({ start: current.start, end: current.start + maxMs, endReason: "max_duration", minSlope: current.minSlope });
      current = undefined;
    }
    if (current !== undefined) {
      current.minSlope = Math.min(current.minSlope, sample.v);
    }
    const open = sample.v < -openThreshold;
    const close = sample.v >= closeThreshold;
    if (open && current === undefined) {
      const share = options.onPercent === undefined ? undefined : valueAt(options.onPercent, sample.t);
      if (share !== undefined && share <= 0.0) {
        continue;
      }
      current = { start: sample.t, minSlope: sample.v };
    } else if (close && current !== undefined) {
      detections.push({ start: current.start, end: sample.t, endReason: "close", minSlope: current.minSlope });
      current = undefined;
    }
  }
  if (current !== undefined) {
    const last = slope[slope.length - 1] as Sample;
    const end = options.end ?? last.t;
    if (current.start + maxMs <= end) {
      detections.push({ start: current.start, end: current.start + maxMs, endReason: "max_duration", minSlope: current.minSlope });
    } else {
      detections.push({ start: current.start, end: Math.max(end, current.start), endReason: "period_end", minSlope: current.minSlope });
    }
  }
  return { detections, ...strongest, configured: true };
}
