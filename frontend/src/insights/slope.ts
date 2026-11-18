/**
 * The temperature slope of Versatile Thermostat: the one of the open window detection, which the TPI thresholds also read
 * (`ThermostatProp.recalculate` passes `last_temperature_slope`, which is `FeatureWindowManager.last_slope`).
 *
 * Versatile Thermostat smooths each measurement of the room with a short exponential moving average (`ema.py`), then
 * `WindowOpenDetectionAlgorithm` (`open_window_algorithm.py`) computes a slope in degrees per hour from two smoothed values, mixed
 * 20 % / 80 % with the previous slope. At each control cycle, a measurement older than 30 minutes adds a flat point, so that the
 * slope fades when the sensor no longer changes.
 */

import { pyRound } from "./round.ts";
import type { Sample } from "./series.ts";

/** `DEFAULT_SHORT_EMA_PARAMS` of `const.py`: the smoothing of the temperature used for the slope. */
export const SHORT_EMA_PARAMS = { halflifeSec: 300, precision: 2, maxAlpha: 0.5 } as const;

/** `MIN_TIME_DECAY_SEC` of `ema.py`. */
export const MIN_TIME_DECAY_SEC = 0;

/** `MIN_DELTA_T_SEC` of `open_window_algorithm.py`: two measurements must be apart. */
export const MIN_DELTA_T_SEC = 0;

/** `MAX_SLOPE_VALUE` of `open_window_algorithm.py`, in degrees per hour: a steeper slope is an aberrant point and is ignored. */
export const MAX_SLOPE_VALUE = 120;

/** `MAX_DURATION_MIN` of `open_window_algorithm.py`: a measurement older than this adds a flat point at each cycle. */
export const MAX_DURATION_MIN = 30;

/** `MIN_NB_POINT` of `open_window_algorithm.py`: no detection before this number of points. */
export const MIN_NB_POINT = 4;

/** The default cycle of Versatile Thermostat (`cycle_min` of the config flow), in minutes: the period of the control cycles. */
export const DEFAULT_CYCLE_MIN = 5;

/**
 * Port of `ExponentialMovingAverage` of `ema.py` (`calculate_ema`), for measurements given with their time in milliseconds.
 */
export class ExponentialMovingAverage {
  private readonly halflifeSec: number;
  private readonly precision: number;
  private readonly maxAlpha: number;
  private current: number | undefined;
  private lastTime = 0;

  /**
   * @param halflifeSec - The half-life, in seconds.
   * @param precision - The number of decimals of the returned value.
   * @param maxAlpha - The upper limit of the weight of a new measurement.
   */
  constructor(halflifeSec: number = SHORT_EMA_PARAMS.halflifeSec, precision: number = SHORT_EMA_PARAMS.precision, maxAlpha: number = SHORT_EMA_PARAMS.maxAlpha) {
    this.halflifeSec = halflifeSec;
    this.precision = precision;
    this.maxAlpha = maxAlpha;
  }

  /**
   * Port of `ExponentialMovingAverage.calculate_ema`: add a measurement and return the smoothed value.
   *
   * The first measurement is returned as is; the next ones are rounded to the precision, as Versatile Thermostat does.
   */
  calculate(measurement: number, t: number): number {
    if (this.current === undefined) {
      this.current = measurement;
      this.lastTime = t;
      return this.current;
    }
    const timeDecay = (t - this.lastTime) / 1000;
    if (timeDecay < MIN_TIME_DECAY_SEC) {
      return this.current;
    }
    let alpha = 1 - Math.exp((Math.log(0.5) * timeDecay) / this.halflifeSec);
    alpha = Math.min(alpha, this.maxAlpha);
    this.current = alpha * measurement + (1 - alpha) * this.current;
    this.lastTime = t;
    return pyRound(this.current, this.precision);
  }
}

/**
 * Port of `WindowOpenDetectionAlgorithm` of `open_window_algorithm.py`: the slope of the smoothed temperature and the open and close
 * tests, for times in milliseconds.
 */
export class WindowOpenDetectionAlgorithm {
  /** The last slope, in degrees per hour (`_last_slope`). */
  lastSlope: number | undefined;
  /** The number of points taken into account (`_nb_point`). */
  nbPoint = 0;
  private readonly alertThreshold: number | undefined;
  private readonly endAlertThreshold: number | undefined;
  private lastTime: number | undefined;
  private lastTemperature: number | undefined;

  /**
   * @param alertThreshold - `window_auto_open_threshold`, in degrees per hour, positive: a slope under its opposite opens.
   * @param endAlertThreshold - `window_auto_close_threshold`, in degrees per hour: a slope at or above it closes.
   */
  constructor(alertThreshold?: number, endAlertThreshold?: number) {
    this.alertThreshold = alertThreshold;
    this.endAlertThreshold = endAlertThreshold;
  }

  /** Port of `check_age_last_measurement`: at a control cycle, add a flat point when the last measurement is 30 minutes old or more. */
  checkAgeLastMeasurement(temperature: number, now: number): number | undefined {
    if (this.lastTime === undefined) {
      return this.addTempMeasurement(temperature, now);
    }
    const deltaMin = (now - this.lastTime) / 1000 / 60.0;
    if (deltaMin >= MAX_DURATION_MIN) {
      return this.addTempMeasurement(temperature, now, false);
    }
    return this.lastSlope;
  }

  /** Port of `add_temp_measurement`: add a smoothed temperature and return the last slope. */
  addTempMeasurement(temperature: number, t: number, storeDate = true): number | undefined {
    if (this.lastTime === undefined || this.lastTemperature === undefined) {
      this.lastTime = t;
      this.lastTemperature = temperature;
      this.nbPoint += 1;
      return undefined;
    }
    const lspe = this.lastSlope;
    const deltaTSec = (t - this.lastTime) / 1000;
    const deltaT = deltaTSec / 60.0;
    if (deltaTSec <= MIN_DELTA_T_SEC) {
      return lspe;
    }
    const deltaTHour = deltaT / 60.0;
    const deltaTemp = temperature - this.lastTemperature;
    const newSlope = deltaTemp / deltaTHour;
    if (newSlope > MAX_SLOPE_VALUE || newSlope < -MAX_SLOPE_VALUE) {
      return lspe;
    }
    this.lastSlope = this.lastSlope === undefined ? pyRound(newSlope, 2) : pyRound(0.2 * this.lastSlope + 0.8 * newSlope, 2);
    // A flat point added at a cycle keeps the date of the last real measurement, as Versatile Thermostat does.
    if (storeDate) {
      this.lastTime = t;
    }
    this.lastTemperature = temperature;
    this.nbPoint += 1;
    return this.lastSlope;
  }

  /** Port of `is_window_open_detected`: the last slope is under the opposite of the open threshold. */
  isWindowOpenDetected(): boolean {
    if (this.alertThreshold === undefined || this.nbPoint < MIN_NB_POINT || this.lastSlope === undefined) {
      return false;
    }
    return this.lastSlope < -this.alertThreshold;
  }

  /** Port of `is_window_close_detected`: the last slope is at or above the close threshold. */
  isWindowCloseDetected(): boolean {
    if (this.endAlertThreshold === undefined || this.nbPoint < MIN_NB_POINT || this.lastSlope === undefined) {
      return false;
    }
    return this.lastSlope >= this.endAlertThreshold;
  }
}

/** Options of {@link slopeHistory}. */
export interface SlopeOptions {
  /** The cycle of the thermostat, in minutes: Versatile Thermostat checks the age of the last measurement at each cycle. Default 5. */
  readonly cycleMin?: number;
}

/**
 * The slope of the temperature as VT computes it for the window detection (its smoothing), in degrees per hour.
 *
 * Ports the chain of `BaseThermostat._async_update_temp` (EMA of `ema.py` with `DEFAULT_SHORT_EMA_PARAMS`, then
 * `FeatureWindowManager.manage_window_auto` → `WindowOpenDetectionAlgorithm.add_temp_measurement`) for each measurement, and of
 * `BaseThermostat.async_control_heating` (`manage_window_auto(in_cycle=True)` → `check_age_last_measurement`) after each measurement
 * and at each control cycle. The cycles are placed every `cycleMin` from the first measurement: their real phase is not recorded.
 * The checks that a change of the outdoor temperature also triggers are not replayed.
 *
 * @param room - The measurements of the room sensor, sorted by time; the ones before `start` warm the smoothing up.
 * @param start - The start of the period, in milliseconds since the epoch.
 * @param end - The end of the period, in milliseconds since the epoch.
 * @param options - The cycle of the thermostat.
 * @returns One sample at each evaluation of VT (measurement or cycle) in the period once a slope exists, and one at `start` with the
 *   slope reached before it. `windowDetections` needs every evaluation, not only the changes.
 */
export function slopeHistory(room: readonly Sample[], start: number, end: number, options: SlopeOptions = {}): Sample[] {
  const cycleMs = Math.max(1, options.cycleMin ?? DEFAULT_CYCLE_MIN) * 60_000;
  const ema = new ExponentialMovingAverage();
  const algo = new WindowOpenDetectionAlgorithm();
  const samples: Sample[] = [];
  let before: number | undefined;
  const emit = (t: number): void => {
    const slope = algo.lastSlope;
    if (slope === undefined) {
      return;
    }
    if (t < start) {
      before = slope;
      return;
    }
    if (samples.length === 0 && before !== undefined && t > start) {
      samples.push({ t: start, v: before });
    }
    samples.push({ t, v: slope });
  };
  const first = room[0];
  if (first === undefined || first.t > end) {
    return samples;
  }
  let nextTick = first.t + cycleMs;
  let emaTemperature = first.v;
  for (const measurement of room) {
    if (measurement.t > end) {
      break;
    }
    while (nextTick < measurement.t) {
      algo.checkAgeLastMeasurement(emaTemperature, nextTick);
      emit(nextTick);
      nextTick += cycleMs;
    }
    if (nextTick === measurement.t) {
      // A cycle at the time of a measurement is the check that follows the measurement.
      nextTick += cycleMs;
    }
    emaTemperature = ema.calculate(measurement.v, measurement.t);
    algo.addTempMeasurement(emaTemperature, measurement.t);
    algo.checkAgeLastMeasurement(emaTemperature, measurement.t);
    emit(measurement.t);
  }
  while (nextTick <= end) {
    algo.checkAgeLastMeasurement(emaTemperature, nextTick);
    emit(nextTick);
    nextTick += cycleMs;
  }
  if (samples.length === 0 && before !== undefined) {
    samples.push({ t: start, v: before });
  }
  return samples;
}
