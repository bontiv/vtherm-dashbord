/**
 * Estimations of the effect of the settings being edited, computed on the recorded history of a thermostat with the rules of
 * Versatile Thermostat ported from the reference version of `external-refs.txt`. Pure functions: no DOM, no Lit, no Home Assistant.
 *
 * Times are milliseconds since the epoch; temperatures are in the unit of Home Assistant; shares are fractions 0..1.
 * The table of the ported functions is in `docs/contributing/setting-insights.md`.
 */

export { pyRound } from "./round.ts";
export { indexAt, regularTimes, resample, temperatureHistory, timeMean, valueAt } from "./series.ts";
export type { Sample, TemperatureHistory } from "./series.ts";
export { cycleTimes, tpiDecision, tpiHistory } from "./tpi.ts";
export type { CycleTimes, TpiDecision, TpiHistoryOptions, TpiNote, TpiSettings, TpiState } from "./tpi.ts";
export {
  DEFAULT_CYCLE_MIN,
  ExponentialMovingAverage,
  MAX_DURATION_MIN,
  MAX_SLOPE_VALUE,
  MIN_DELTA_T_SEC,
  MIN_NB_POINT,
  MIN_TIME_DECAY_SEC,
  SHORT_EMA_PARAMS,
  WindowOpenDetectionAlgorithm,
  slopeHistory,
} from "./slope.ts";
export type { SlopeOptions } from "./slope.ts";
export { windowDetections } from "./window.ts";
export type { WindowDetection, WindowDetectionOptions, WindowDetections, WindowSettings } from "./window.ts";
export { DEFAULT_SAFETY_DEFAULT_ON_PERCENT, DEFAULT_SAFETY_MIN_ON_PERCENT, NOTABLE_GAP_SHARE, safetyShareCondition, sensorGaps } from "./safety.ts";
export type { SensorGap } from "./safety.ts";
export { COMFORT_BAND, comfortStats } from "./comfort.ts";
export type { ComfortStats } from "./comfort.ts";
