/**
 * The safety mode of Versatile Thermostat (`feature_safety_manager.py`): the silences of the temperature sensors.
 *
 * VT turns the safety mode on (`FeatureSafetyManager.refresh_state`) when all these hold:
 * - the last measurement of the room sensor, or of the outdoor sensor unless the central option `check_outdoor_sensor` is false, is
 *   older than `safety_delay_min` (strictly);
 * - the thermostat is not `over_climate` (a climate is never put in safety, issue 99 of VT), it has a proportional algorithm, and the
 *   share it computes (`calculated_on_percent`) is at least `safety_min_on_percent` (default {@link DEFAULT_SAFETY_MIN_ON_PERCENT});
 * - the thermostat is not off.
 * In safety, the share becomes `safety_default_on_percent` (default {@link DEFAULT_SAFETY_DEFAULT_ON_PERCENT}).
 *
 * The panel must therefore say that a silence longer than the delay triggers the safety mode only if the thermostat was heating at
 * least at `safety_min_on_percent` at that time, and that a thermostat over climate never enters it.
 */

import type { Sample } from "./series.ts";

/** `DEFAULT_SAFETY_MIN_ON_PERCENT` of `const.py`: the share from which a silence triggers the safety mode, when not set. */
export const DEFAULT_SAFETY_MIN_ON_PERCENT = 0.5;

/** `DEFAULT_SAFETY_DEFAULT_ON_PERCENT` of `const.py`: the share applied in safety mode, when not set. */
export const DEFAULT_SAFETY_DEFAULT_ON_PERCENT = 0.1;

/** The silences shorter than this share of the delay are left out of the list (they are still candidates for the longest). */
export const NOTABLE_GAP_SHARE = 0.5;

/** A silence of a sensor. */
export interface SensorGap {
  /** The time of the last report before the silence, in milliseconds since the epoch (it can be before the period). */
  readonly start: number;
  /** The time of the next report, or the end of the period for a silence still running. */
  readonly end: number;
  /** The duration, in minutes. */
  readonly minutes: number;
  /** True when the silence is longer than the delay, as VT checks it (`delta_temp > safety_delay_min`). */
  readonly triggers: boolean;
}

/**
 * The share condition of the safety mode (`switch_cond` of `FeatureSafetyManager.refresh_state`): a silence triggers the safety mode
 * only when the share that VT computes is at least `safety_min_on_percent`.
 *
 * @param calculatedOnPercent - The share computed by VT (`calculated_on_percent`, see `TpiDecision.onPercent`), 0..1.
 * @param minOnPercent - `safety_min_on_percent`, 0..1.
 */
export function safetyShareCondition(calculatedOnPercent: number, minOnPercent: number = DEFAULT_SAFETY_MIN_ON_PERCENT): boolean {
  return calculatedOnPercent >= minOnPercent;
}

/**
 * The silences of a sensor: the gaps between its reports (the times of the samples), those longer than the delay trigger the safety mode as VT checks it.
 *
 * Ports the time condition of `FeatureSafetyManager.refresh_state` (`delta_temp > safety_delay_min`). VT measures the age from
 * `last_updated` of the sensor state, which changes when the state changes: the times of the rows of the history are what VT sees.
 * VT checks at each control cycle and each measurement, so a silence barely longer than the delay can end before a check: it is
 * still marked. The share condition is {@link safetyShareCondition}.
 *
 * @param reports - The samples of the sensor, sorted by time; the one before `start`, if any, gives the start of the first silence.
 * @param start - The start of the period, in milliseconds since the epoch.
 * @param end - The end of the period, in milliseconds since the epoch: a silence still running ends there.
 * @param delayMin - `safety_delay_min`, in minutes.
 * @returns The silences of the period at least {@link NOTABLE_GAP_SHARE} of the delay long, and the longest silence of the period.
 */
export function sensorGaps(reports: readonly Sample[], start: number, end: number, delayMin: number): { readonly gaps: readonly SensorGap[]; readonly longest?: SensorGap } {
  const gaps: SensorGap[] = [];
  let longest: SensorGap | undefined;
  for (let i = 0; i < reports.length; i++) {
    const from = (reports[i] as Sample).t;
    if (from >= end) {
      break;
    }
    const to = Math.min(reports[i + 1]?.t ?? end, end);
    if (to <= start || to <= from) {
      continue;
    }
    const minutes = (to - from) / 60_000;
    const gap: SensorGap = { start: from, end: to, minutes, triggers: minutes > delayMin };
    if (longest === undefined || minutes > longest.minutes) {
      longest = gap;
    }
    if (minutes >= delayMin * NOTABLE_GAP_SHARE) {
      gaps.push(gap);
    }
  }
  return longest === undefined ? { gaps } : { gaps, longest };
}
