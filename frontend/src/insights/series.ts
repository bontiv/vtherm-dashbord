/**
 * Step series: the samples of a sensor or an attribute read from the history of Home Assistant, and the operations that the panels
 * need on them. A step series keeps its value until the next sample, as Home Assistant records a state only when it changes.
 */

/** A sample of a series: a time in milliseconds since the epoch and a value. */
export interface Sample {
  /** The time, in milliseconds since the epoch. */
  readonly t: number;
  /** The value (a temperature in the unit of Home Assistant, a fraction 0..1, a slope in degrees per hour...). */
  readonly v: number;
}

/** The index of the last sample at or before `t`, or -1. The series is sorted by time. */
export function indexAt(series: readonly Sample[], t: number): number {
  let low = 0;
  let high = series.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const sample = series[middle] as Sample;
    if (sample.t <= t) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * The value of a step series at a time: the last sample at or before `t`.
 *
 * @param series - The samples, sorted by time.
 * @param t - The time, in milliseconds since the epoch.
 * @returns The value, or undefined before the first sample.
 */
export function valueAt(series: readonly Sample[], t: number): number | undefined {
  const index = indexAt(series, t);
  return index < 0 ? undefined : (series[index] as Sample).v;
}

/** The `count` regular times between `start` and `end`, both included. */
export function regularTimes(start: number, end: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [start];
  }
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? end : start + i * step));
}

/**
 * A step series sampled at `count` regular times between start and end (about 300 for 7 days), both included.
 *
 * @param series - The samples, sorted by time.
 * @param start - The first time, in milliseconds since the epoch.
 * @param end - The last time, in milliseconds since the epoch.
 * @param count - The number of times.
 * @returns One sample per time where the series has a value; the times before its first sample are left out.
 */
export function resample(series: readonly Sample[], start: number, end: number, count: number): Sample[] {
  const samples: Sample[] = [];
  for (const t of regularTimes(start, end, count)) {
    const v = valueAt(series, t);
    if (v !== undefined) {
      samples.push({ t, v });
    }
  }
  return samples;
}

/**
 * The mean of a step series over a period, weighted by time.
 *
 * @param series - The samples, sorted by time.
 * @param start - The start of the period, in milliseconds since the epoch.
 * @param end - The end of the period, in milliseconds since the epoch.
 * @returns The mean over the part of the period where the series has a value, or undefined when it has none.
 */
export function timeMean(series: readonly Sample[], start: number, end: number): number | undefined {
  if (end <= start) {
    return end === start ? valueAt(series, start) : undefined;
  }
  let total = 0;
  let weight = 0;
  for (let i = Math.max(0, indexAt(series, start)); i < series.length; i++) {
    const sample = series[i] as Sample;
    if (sample.t >= end) {
      break;
    }
    const next = series[i + 1];
    const from = Math.max(sample.t, start);
    const to = Math.min(next === undefined ? end : next.t, end);
    if (to > from) {
      total += sample.v * (to - from);
      weight += to - from;
    }
  }
  return weight > 0 ? total / weight : undefined;
}

/** The temperature series of a thermostat for the charts, sampled at the same times. */
export interface TemperatureHistory {
  /** The temperature of the room. */
  readonly room: Sample[];
  /** The target temperature. */
  readonly target: Sample[];
  /** The outdoor temperature, when the thermostat has an outdoor sensor. */
  readonly outdoor?: Sample[];
}

/**
 * Aligned temperature series of a thermostat over a period (room, target, outdoor), for the charts.
 *
 * @param input - The recorded series; `outdoor` is left out when the thermostat has no outdoor sensor.
 * @param start - The start of the period, in milliseconds since the epoch.
 * @param end - The end of the period, in milliseconds since the epoch.
 * @param count - The number of regular times (about 300 for 7 days).
 * @returns Each series sampled at the same regular times.
 */
export function temperatureHistory(
  input: { readonly room: readonly Sample[]; readonly target: readonly Sample[]; readonly outdoor?: readonly Sample[] },
  start: number,
  end: number,
  count: number,
): TemperatureHistory {
  const room = resample(input.room, start, end, count);
  const target = resample(input.target, start, end, count);
  return input.outdoor === undefined ? { room, target } : { room, target, outdoor: resample(input.outdoor, start, end, count) };
}
