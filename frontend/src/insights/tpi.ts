/**
 * The TPI rules of Versatile Thermostat: the share of heating of a cycle (`prop_algo_tpi.py`, `prop_handler_tpi.py`,
 * `thermostat_prop.py`) and its conversion into on and off times (`cycle_scheduler.py`).
 */

import { pyRound } from "./round.ts";
import { indexAt, valueAt } from "./series.ts";
import type { Sample } from "./series.ts";
import { slopeHistory } from "./slope.ts";

/** The TPI settings of a thermostat, as the draft gives them. */
export interface TpiSettings {
  /** `tpi_coef_int`. */
  readonly coefInt: number;
  /** `tpi_coef_ext`. */
  readonly coefExt: number;
  /** `cycle_min`, in minutes (Versatile Thermostat uses at least 1). */
  readonly cycleMin: number;
  /** `minimal_activation_delay`, in seconds. */
  readonly minActivationSec: number;
  /** `minimal_deactivation_delay`, in seconds. */
  readonly minDeactivationSec: number;
  /** `tpi_threshold_low`, in degrees (0 = off, as VT). */
  readonly thresholdLow: number;
  /** `tpi_threshold_high`, in degrees (0 = off, as VT). The thresholds apply only when both are not 0. */
  readonly thresholdHigh: number;
  /** `max_on_percent` of the central configuration, 0..1, when VT has one. */
  readonly maxOnPercent?: number | null;
  /**
   * True for a thermostat over valves: the minimal delays do not change the share applied to a valve (`CycleScheduler.start_cycle`),
   * the on and off times are only informative.
   */
  readonly valve?: boolean;
}

/** The state of the thermostat at the time of the calculation. */
export interface TpiState {
  /** The target temperature. */
  readonly target: number;
  /** The temperature of the room. */
  readonly room: number;
  /** The outdoor temperature; undefined = no outdoor sensor. */
  readonly outdoor?: number;
  /** The slope of the room temperature, in degrees per hour (see `slopeHistory`); undefined = unknown, the thresholds do not apply. */
  readonly slope?: number;
  /** True in cooling mode: VT reverses the differences and the slope. */
  readonly cooling?: boolean;
}

/**
 * Why the share applied differs from the raw sum:
 * - `capped`: the sum was above 1 or under 0, VT keeps it in 0..1;
 * - `max_on`: lowered to `max_on_percent`;
 * - `too_short`: the on time is shorter than `minimal_activation_delay`, VT does not heat in this cycle;
 * - `off_too_short`: the off time is shorter than `minimal_deactivation_delay`, VT heats the whole cycle;
 * - `threshold_stop`: the room is above the target by more than `tpi_threshold_high` while its temperature rises, VT stops;
 * - `threshold_hold`: the room is above the target by more than `tpi_threshold_low` while its temperature falls, VT stays stopped
 *   (it heats again once the room is at most `tpi_threshold_low` above the target);
 * - `no_outdoor`: no outdoor sensor, VT removes the outdoor part.
 */
export type TpiNote = "capped" | "max_on" | "too_short" | "off_too_short" | "threshold_stop" | "threshold_hold" | "no_outdoor";

/** The detail of a TPI calculation. */
export interface TpiDecision {
  /** `coefInt × (target − room)` (reversed in cooling), before caps, fraction. */
  readonly roomPart: number;
  /** `coefExt × (target − outdoor)` (reversed in cooling), 0 without outdoor sensor, fraction. */
  readonly outdoorPart: number;
  /** The sum before caps. */
  readonly raw: number;
  /**
   * The share of the thermostat (`on_percent`) after the thresholds, the caps and `max_on_percent`, rounded to 2 decimals as VT does.
   * VT records it, × 100, as `power_percent`: the minimal delays do not change it.
   */
  readonly onPercent: number;
  /** The share applied, after every rule, 0..1: the on time over the cycle for a switch, `onPercent` for a valve. */
  readonly percent: number;
  /** The on time in the cycle, after the minimal delays, in whole seconds. */
  readonly onSec: number;
  /** The off time in the cycle, after the minimal delays, in whole seconds. */
  readonly offSec: number;
  /** The duration of the cycle, in seconds. */
  readonly cycleSec: number;
  /** Why the result differs from `raw`. */
  readonly notes: readonly TpiNote[];
}

/** The result of {@link cycleTimes}. */
export interface CycleTimes {
  /** The on time, in whole seconds. */
  readonly onSec: number;
  /** The off time, in whole seconds. */
  readonly offSec: number;
  /** True when a minimal delay changed the times (`forced_by_timing`). */
  readonly forced: boolean;
  /** True when the on time was under `minimal_activation_delay` and became 0. */
  readonly tooShort: boolean;
  /** True when the off time was under `minimal_deactivation_delay` and the on time became the whole cycle. */
  readonly offTooShort: boolean;
}

/**
 * Port of `calculate_cycle_times` of `cycle_scheduler.py`: convert a share into on and off times with the minimal delays.
 *
 * An on time under `minimal_activation_delay` becomes 0; then an off time under `minimal_deactivation_delay` makes the on time the
 * whole cycle (even with a share of 0 when the delay is longer than the cycle, as VT does). The times are truncated to whole seconds.
 *
 * @param onPercent - The share, kept in 0..1.
 * @param cycleMin - The cycle, in minutes.
 * @param minActivationSec - `minimal_activation_delay`, in seconds.
 * @param minDeactivationSec - `minimal_deactivation_delay`, in seconds.
 */
export function cycleTimes(onPercent: number, cycleMin: number, minActivationSec = 0, minDeactivationSec = 0): CycleTimes {
  const share = Math.max(0.0, Math.min(1.0, onPercent));
  const cycleSec = cycleMin * 60;
  let onTime = share * cycleSec;
  let tooShort = false;
  let offTooShort = false;
  if (onTime > 0 && onTime < minActivationSec) {
    onTime = 0;
    tooShort = true;
  }
  let offTime = cycleSec - onTime;
  if (onTime < cycleSec && offTime < minDeactivationSec) {
    onTime = cycleSec;
    offTime = 0;
    offTooShort = true;
  }
  return { onSec: Math.trunc(onTime), offSec: Math.trunc(offTime), forced: tooShort || offTooShort, tooShort, offTooShort };
}

/**
 * The share of heating that VT computes now, and its detail.
 *
 * Ports `TpiAlgorithm.calculate` and `TpiAlgorithm.on_percent` of `prop_algo_tpi.py` (differences, thresholds, clamp to 0..1,
 * `max_on_percent`, rounding to 2 decimals), `TPIHandler.init_algorithm` of `prop_handler_tpi.py` (no outdoor sensor = no outdoor
 * part, thresholds off unless both are set), `ThermostatProp.on_percent` of `thermostat_prop.py` (`max_on_percent` again after the
 * rounding), `BaseThermostat.post_init` (`cycle_min` at least 1) and `calculate_cycle_times` / `CycleScheduler.start_cycle` of
 * `cycle_scheduler.py` (minimal delays, share realized by a switch). The safety mode, the power shedding, the off and sleep modes and
 * the valve commands of `apply_valve_command_percent` are not replayed.
 *
 * @param settings - The TPI settings.
 * @param state - The temperatures and the slope.
 */
export function tpiDecision(settings: TpiSettings, state: TpiState): TpiDecision {
  const notes: TpiNote[] = [];
  const cooling = state.cooling === true;
  const hasOutdoor = state.outdoor !== undefined;
  if (!hasOutdoor) {
    notes.push("no_outdoor");
  }
  // TPIHandler.init_algorithm: without outdoor sensor, tpi_coef_ext = 0; TpiAlgorithm.calculate: delta_ext_temp = 0.
  const coefExt = hasOutdoor ? settings.coefExt : 0;
  let deltaTemp: number;
  let deltaExtTemp: number;
  let slope = state.slope;
  if (cooling) {
    deltaTemp = state.room - state.target;
    deltaExtTemp = state.outdoor !== undefined ? state.outdoor - state.target : 0;
    slope = slope !== undefined ? -slope : undefined;
  } else {
    deltaTemp = state.target - state.room;
    deltaExtTemp = state.outdoor !== undefined ? state.target - state.outdoor : 0;
  }
  const roomPart = settings.coefInt * deltaTemp;
  const outdoorPart = coefExt * deltaExtTemp;
  const raw = roomPart + outdoorPart;
  const maxOn = settings.maxOnPercent ?? undefined;

  // TPIHandler.init_algorithm sets both thresholds to 0 when one is 0; TpiAlgorithm applies them when both are not 0.
  const applyThreshold = settings.thresholdLow !== 0.0 && settings.thresholdHigh !== 0.0;
  let calculated: number;
  if (applyThreshold && slope !== undefined && ((slope > 0.0 && -deltaTemp > settings.thresholdHigh) || (slope < 0.0 && -deltaTemp > settings.thresholdLow))) {
    calculated = 0;
    notes.push(slope > 0.0 ? "threshold_stop" : "threshold_hold");
  } else {
    calculated = raw;
    if (calculated > 1) {
      calculated = 1;
      notes.push("capped");
    }
    if (calculated < 0) {
      calculated = 0;
      notes.push("capped");
    }
    if (maxOn !== undefined && calculated > maxOn) {
      calculated = maxOn;
      notes.push("max_on");
    }
  }
  // TpiAlgorithm.on_percent rounds to 2 decimals; ThermostatProp.on_percent clamps with max_on_percent again.
  let onPercent = pyRound(calculated, 2);
  if (maxOn !== undefined && onPercent > maxOn) {
    onPercent = maxOn;
  }

  const cycleMin = Math.max(1, settings.cycleMin);
  const cycleSec = cycleMin * 60;
  const times = cycleTimes(onPercent, cycleMin, settings.minActivationSec, settings.minDeactivationSec);
  if (times.tooShort) {
    notes.push("too_short");
  }
  if (times.offTooShort) {
    notes.push("off_too_short");
  }
  // CycleScheduler.start_cycle: a switch realizes on_time_sec / cycle; a valve applies the share itself (delays do not apply).
  const percent = settings.valve === true ? onPercent : cycleSec > 0 ? times.onSec / cycleSec : 0;
  return { roomPart, outdoorPart, raw, onPercent, percent, onSec: times.onSec, offSec: times.offSec, cycleSec, notes };
}

/** Options of {@link tpiHistory}. */
export interface TpiHistoryOptions {
  /**
   * The value of each point: `percent` (default) is the share applied after the minimal delays; `onPercent` is the share that VT
   * records as `power_percent`, to compare with the recorded one.
   */
  readonly value?: "percent" | "onPercent";
}

/**
 * The share that VT would apply over a period, one point per cycle, with the settings given.
 *
 * Applies {@link tpiDecision} at `start` and every `cycleMin` after it, with the values that the series have at that time. The
 * slope is the recorded one when given, else {@link slopeHistory} of the room. VT also recomputes the share at each measurement and
 * starts a cycle early when the running one is idle (`CycleScheduler.start_cycle`): the replay keeps one share per cycle.
 *
 * @param settings - The TPI settings to try.
 * @param input - The recorded series; `outdoor` is left out without outdoor sensor.
 * @param start - The start of the period, in milliseconds since the epoch.
 * @param end - The end of the period, in milliseconds since the epoch.
 * @param options - Which share to return.
 * @returns One sample per cycle where the room and the target temperatures are known.
 */
export function tpiHistory(
  settings: TpiSettings,
  input: { readonly room: readonly Sample[]; readonly target: readonly Sample[]; readonly outdoor?: readonly Sample[]; readonly slope?: readonly Sample[] },
  start: number,
  end: number,
  options: TpiHistoryOptions = {},
): Sample[] {
  const cycleMs = Math.max(1, settings.cycleMin) * 60_000;
  const slope = input.slope ?? slopeHistory(input.room, start, end, { cycleMin: settings.cycleMin });
  const points: Sample[] = [];
  if (indexAt(input.room, end) < 0) {
    return points;
  }
  for (let t = start; t <= end; t += cycleMs) {
    const room = valueAt(input.room, t);
    const target = valueAt(input.target, t);
    if (room === undefined || target === undefined) {
      continue;
    }
    const outdoor = input.outdoor === undefined ? undefined : valueAt(input.outdoor, t);
    const slopeNow = valueAt(slope, t);
    const decision = tpiDecision(settings, { room, target, ...(outdoor === undefined ? {} : { outdoor }), ...(slopeNow === undefined ? {} : { slope: slopeNow }) });
    points.push({ t, v: options.value === "onPercent" ? decision.onPercent : decision.percent });
  }
  return points;
}
