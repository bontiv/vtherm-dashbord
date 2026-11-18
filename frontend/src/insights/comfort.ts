/**
 * Comfort indicators of a period, computed on the recorded temperatures: they are not rules of Versatile Thermostat.
 */

import { valueAt } from "./series.ts";
import type { Sample } from "./series.ts";

/** The half-width of the comfort band around the target, in degrees. */
export const COMFORT_BAND = 0.5;

/** Comfort indicators of a period. */
export interface ComfortStats {
  /** The mean time to reach the target after a raise of the target, in minutes; drops of target excluded. Undefined without a reached raise. */
  readonly riseMinutes?: number;
  /** The highest number of degrees above the target after the room reached it from below. Undefined when it never did. */
  readonly overshoot?: number;
  /** The share of the time within ±{@link COMFORT_BAND}° of the target, 0..1, over the time where both are known. */
  readonly withinShare: number;
  /** The number of drops of target in the period, excluded from the rise time. */
  readonly excludedDrops: number;
  /** The number of raises of target whose rise time is in the mean. */
  readonly rises: number;
}

/**
 * Comfort indicators of a period.
 *
 * - A raise of the target counts in `riseMinutes` when the room was under the new target at the raise and reached it before the next
 *   change of target and the end of the period; a drop is counted in `excludedDrops`.
 * - `overshoot`: in each stretch of constant target, once the room was under the target and then reached it, the highest excess.
 * - `withinShare`: time where `|room − target| ≤ 0.5`, over the time where both are known.
 *
 * @param room - The temperatures of the room, sorted by time.
 * @param target - The target temperatures, sorted by time.
 * @param start - The start of the period, in milliseconds since the epoch.
 * @param end - The end of the period, in milliseconds since the epoch.
 */
export function comfortStats(room: readonly Sample[], target: readonly Sample[], start: number, end: number): ComfortStats {
  // The band: integrate over the intervals between the changes of either series.
  const times = [start, ...room.map((s) => s.t), ...target.map((s) => s.t)].filter((t) => t >= start && t < end);
  times.sort((a, b) => a - b);
  let within = 0;
  let known = 0;
  for (let i = 0; i < times.length; i++) {
    const from = times[i] as number;
    const to = times[i + 1] ?? end;
    if (to <= from) {
      continue;
    }
    const r = valueAt(room, from);
    const g = valueAt(target, from);
    if (r === undefined || g === undefined) {
      continue;
    }
    known += to - from;
    if (Math.abs(r - g) <= COMFORT_BAND) {
      within += to - from;
    }
  }

  // The stretches of constant target in the period.
  const stretches: { from: number; to: number; value: number; raised: boolean }[] = [];
  let excludedDrops = 0;
  const initial = valueAt(target, start);
  let previous = initial;
  if (initial !== undefined) {
    stretches.push({ from: start, to: end, value: initial, raised: false });
  }
  for (const sample of target) {
    if (sample.t <= start || sample.t >= end || sample.v === previous) {
      continue;
    }
    const last = stretches[stretches.length - 1];
    if (last !== undefined) {
      last.to = sample.t;
    }
    if (previous !== undefined && sample.v < previous) {
      excludedDrops += 1;
    }
    stretches.push({ from: sample.t, to: end, value: sample.v, raised: previous !== undefined && sample.v > previous });
    previous = sample.v;
  }

  const riseDurations: number[] = [];
  let overshoot: number | undefined;
  for (const stretch of stretches) {
    const values: Sample[] = [];
    const first = valueAt(room, stretch.from);
    if (first !== undefined) {
      values.push({ t: stretch.from, v: first });
    }
    for (const sample of room) {
      if (sample.t > stretch.from && sample.t < stretch.to) {
        values.push(sample);
      }
    }
    let below = false;
    let reached = false;
    for (const sample of values) {
      if (!reached) {
        if (sample.v < stretch.value) {
          below = true;
        } else if (below) {
          reached = true;
          if (stretch.raised && first !== undefined && first < stretch.value) {
            riseDurations.push((sample.t - stretch.from) / 60_000);
          }
        }
      }
      if (reached) {
        const excess = sample.v - stretch.value;
        overshoot = overshoot === undefined ? excess : Math.max(overshoot, excess);
      }
    }
  }

  const riseMinutes = riseDurations.length === 0 ? undefined : riseDurations.reduce((sum, d) => sum + d, 0) / riseDurations.length;
  return {
    ...(riseMinutes === undefined ? {} : { riseMinutes }),
    ...(overshoot === undefined ? {} : { overshoot }),
    withinShare: known > 0 ? within / known : 0,
    excludedDrops,
    rises: riseDurations.length,
  };
}
