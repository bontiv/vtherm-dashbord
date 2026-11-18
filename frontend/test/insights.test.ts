import { describe, expect, it } from "vitest";

import {
  DEFAULT_SAFETY_MIN_ON_PERCENT,
  comfortStats,
  cycleTimes,
  resample,
  safetyShareCondition,
  sensorGaps,
  slopeHistory,
  temperatureHistory,
  timeMean,
  tpiDecision,
  tpiHistory,
  valueAt,
  windowDetections,
} from "../src/insights/index.ts";
import type { Sample, TpiSettings } from "../src/insights/index.ts";

const MIN = 60_000;
const T0 = Date.UTC(2026, 0, 5, 8, 0, 0);
/** A series from [minute, value] pairs counted from T0. */
const series = (points: [number, number][]): Sample[] => points.map(([minute, v]) => ({ t: T0 + minute * MIN, v }));

const SETTINGS: TpiSettings = { coefInt: 0.6, coefExt: 0.01, cycleMin: 5, minActivationSec: 0, minDeactivationSec: 0, thresholdLow: 0, thresholdHigh: 0 };

describe("tpiDecision", () => {
  it("details the calculation (Calcul détaillé)", () => {
    const decision = tpiDecision(SETTINGS, { room: 19.5, target: 20.5, outdoor: 5 });
    expect(decision.roomPart).toBeCloseTo(0.6, 10);
    expect(decision.outdoorPart).toBeCloseTo(0.155, 10);
    expect(decision.raw).toBeCloseTo(0.755, 10);
    // VT rounds on_percent to 2 decimals (TpiAlgorithm.on_percent) and truncates the on time to whole seconds.
    expect(decision.onPercent).toBe(0.76);
    expect(decision.onSec).toBe(228);
    expect(decision.offSec).toBe(72);
    expect(decision.cycleSec).toBe(300);
    expect(decision.percent).toBe(0.76);
    expect(decision.notes).toEqual([]);
    expect(tpiDecision({ ...SETTINGS, cycleMin: 10 }, { room: 19.5, target: 20.5, outdoor: 5 }).onSec).toBe(456);
  });

  it("removes the outdoor part without outdoor sensor (Sans capteur extérieur)", () => {
    const decision = tpiDecision(SETTINGS, { room: 19.5, target: 20.5 });
    expect(decision.outdoorPart).toBe(0);
    expect(decision.raw).toBeCloseTo(0.6, 10);
    expect(decision.percent).toBe(0.6);
    expect(decision.notes).toEqual(["no_outdoor"]);
  });

  it("does not heat for an impulse shorter than the minimal activation delay (Temps minimal d'activation)", () => {
    // 20 s of heat in a cycle of 5 minutes for a minimal activation of 30 s.
    expect(cycleTimes(20 / 300, 5, 30, 0)).toEqual({ onSec: 0, offSec: 300, forced: true, tooShort: true, offTooShort: false });
    // 0.07 of 5 minutes is 21 s.
    const decision = tpiDecision({ ...SETTINGS, minActivationSec: 30 }, { room: 20.39, target: 20.5 });
    expect(decision.onPercent).toBe(0.07);
    expect(decision.onSec).toBe(0);
    expect(decision.offSec).toBe(300);
    expect(decision.percent).toBe(0);
    expect(decision.notes).toContain("too_short");
  });

  it("heats the whole cycle when the off time is shorter than the minimal deactivation delay", () => {
    const decision = tpiDecision({ ...SETTINGS, minDeactivationSec: 60 }, { room: 19.9, target: 21, outdoor: 5 });
    expect(decision.onPercent).toBe(0.82);
    expect(decision.onSec).toBe(300);
    expect(decision.percent).toBe(1);
    expect(decision.notes).toContain("off_too_short");
  });

  it("stops above the target plus the high threshold while the room warms (Seuil d'arrêt)", () => {
    const settings = { ...SETTINGS, thresholdLow: 0.2, thresholdHigh: 0.5 };
    const decision = tpiDecision(settings, { room: 20.6, target: 20, outdoor: -20, slope: 0.3 });
    expect(decision.raw).toBeGreaterThan(0);
    expect(decision.percent).toBe(0);
    expect(decision.onSec).toBe(0);
    expect(decision.notes).toContain("threshold_stop");
  });

  it("stays stopped above the low threshold while the room cools, and heats again under it", () => {
    const settings = { ...SETTINGS, thresholdLow: 0.2, thresholdHigh: 0.5 };
    expect(tpiDecision(settings, { room: 20.3, target: 20, outdoor: 5, slope: -0.3 }).notes).toContain("threshold_hold");
    const resumed = tpiDecision(settings, { room: 20.1, target: 20, outdoor: 5, slope: -0.3 });
    expect(resumed.percent).toBe(0.09);
    expect(resumed.notes).toEqual([]);
  });

  it("applies the thresholds only when both are set and the slope is known", () => {
    const state = { room: 20.6, target: 20, outdoor: -20, slope: 0.3 };
    expect(tpiDecision({ ...SETTINGS, thresholdLow: 0, thresholdHigh: 0.5 }, state).percent).toBe(0.04);
    expect(tpiDecision({ ...SETTINGS, thresholdLow: 0.2, thresholdHigh: 0.5 }, { room: 20.6, target: 20, outdoor: -20 }).percent).toBe(0.04);
  });

  it("caps the share to 0..1 and to max_on_percent", () => {
    expect(tpiDecision(SETTINGS, { room: 19, target: 22, outdoor: -5 })).toMatchObject({ percent: 1, notes: ["capped"] });
    expect(tpiDecision(SETTINGS, { room: 21, target: 19, outdoor: 10 })).toMatchObject({ percent: 0, notes: ["capped"] });
    expect(tpiDecision({ ...SETTINGS, maxOnPercent: 0.5 }, { room: 20, target: 21, outdoor: 0 })).toMatchObject({ onPercent: 0.5, notes: ["max_on"] });
    expect(tpiDecision({ ...SETTINGS, maxOnPercent: null }, { room: 20, target: 21, outdoor: 0 }).onPercent).toBe(0.81);
  });

  it("reverses the differences and the slope in cooling", () => {
    expect(tpiDecision(SETTINGS, { room: 25, target: 24, outdoor: 32, slope: 0.5, cooling: true }).onPercent).toBe(0.68);
    const settings = { ...SETTINGS, thresholdLow: 0.2, thresholdHigh: 0.5 };
    expect(tpiDecision(settings, { room: 23, target: 24, outdoor: 32, slope: -0.5, cooling: true }).notes).toContain("threshold_stop");
  });

  it("keeps the share of a valve whatever the minimal delays", () => {
    const decision = tpiDecision({ ...SETTINGS, minActivationSec: 30, valve: true }, { room: 20.39, target: 20.5 });
    expect(decision.percent).toBe(0.07);
    expect(decision.onSec).toBe(0);
  });
});

describe("tpiHistory", () => {
  it("gives one share per cycle with the values of the series at that time", () => {
    const room = series([[0, 19.5], [30, 20.5]]);
    const target = series([[0, 20.5]]);
    const outdoor = series([[0, 5]]);
    const slope = series([[0, 0.2]]);
    const points = tpiHistory(SETTINGS, { room, target, outdoor, slope }, T0, T0 + 60 * MIN);
    expect(points).toHaveLength(13);
    expect(points[0]).toEqual({ t: T0, v: 0.76 });
    expect(points[6]).toEqual({ t: T0 + 30 * MIN, v: 0.15 });
    const recorded = tpiHistory({ ...SETTINGS, minActivationSec: 60 }, { room: series([[0, 20.4]]), target, outdoor, slope }, T0, T0 + 10 * MIN, { value: "onPercent" });
    expect(recorded.map((p) => p.v)).toEqual([0.22, 0.22, 0.22]);
  });

  it("computes the slope from the room when none is given, and skips the times without temperature", () => {
    const room = series([[10, 19.5], [17, 19.6], [24, 19.7]]);
    const points = tpiHistory({ ...SETTINGS, thresholdLow: 0.2, thresholdHigh: 0.5 }, { room, target: series([[0, 20]]) }, T0, T0 + 30 * MIN);
    expect(points[0]?.t).toBe(T0 + 10 * MIN);
    expect(points.every((p) => p.v >= 0 && p.v <= 1)).toBe(true);
    expect(tpiHistory(SETTINGS, { room: [], target: [] }, T0, T0 + 30 * MIN)).toEqual([]);
  });
});

describe("series", () => {
  const steps = series([[0, 10], [10, 20], [20, 30]]);

  it("reads the value of a step series at a time", () => {
    expect(valueAt(steps, T0 - 1)).toBeUndefined();
    expect(valueAt(steps, T0)).toBe(10);
    expect(valueAt(steps, T0 + 9 * MIN)).toBe(10);
    expect(valueAt(steps, T0 + 10 * MIN)).toBe(20);
    expect(valueAt(steps, T0 + 99 * MIN)).toBe(30);
    expect(valueAt([], T0)).toBeUndefined();
  });

  it("samples a series at regular times", () => {
    expect(resample(steps, T0, T0 + 20 * MIN, 3)).toEqual(series([[0, 10], [10, 20], [20, 30]]));
    expect(resample(steps, T0 - 10 * MIN, T0 + 10 * MIN, 3)).toEqual(series([[0, 10], [10, 20]]));
    expect(resample(steps, T0, T0 + 20 * MIN, 1)).toEqual([{ t: T0, v: 10 }]);
    expect(resample(steps, T0, T0 + 20 * MIN, 0)).toEqual([]);
  });

  it("averages a series by time", () => {
    expect(timeMean(steps, T0, T0 + 20 * MIN)).toBe(15);
    expect(timeMean(steps, T0 + 5 * MIN, T0 + 15 * MIN)).toBe(15);
    expect(timeMean(steps, T0 + 15 * MIN, T0 + 30 * MIN)).toBeCloseTo(26.667, 3);
    expect(timeMean(steps, T0 - 10 * MIN, T0 + 10 * MIN)).toBe(10);
    expect(timeMean(steps, T0 - 10 * MIN, T0 - 5 * MIN)).toBeUndefined();
    expect(timeMean(steps, T0 + 5 * MIN, T0 + 5 * MIN)).toBe(10);
  });

  it("aligns the temperatures of a thermostat", () => {
    const history = temperatureHistory({ room: steps, target: series([[0, 20]]) }, T0, T0 + 20 * MIN, 3);
    expect(history.room.map((s) => s.v)).toEqual([10, 20, 30]);
    expect(history.target.map((s) => s.t)).toEqual(history.room.map((s) => s.t));
    expect(history.outdoor).toBeUndefined();
    expect(temperatureHistory({ room: steps, target: steps, outdoor: steps }, T0, T0 + 20 * MIN, 2).outdoor).toHaveLength(2);
  });
});

describe("comfortStats", () => {
  const target = series([[0, 19], [60, 21], [180, 18]]);
  const room = series([[0, 19], [60, 19], [70, 19.8], [80, 20.5], [90, 21], [100, 21.4], [120, 21], [180, 21], [200, 19.5], [220, 18.2]]);

  it("measures the rise after a raise of the target, excluding the drops", () => {
    const stats = comfortStats(room, target, T0, T0 + 240 * MIN);
    expect(stats.riseMinutes).toBe(30);
    expect(stats.rises).toBe(1);
    expect(stats.excludedDrops).toBe(1);
  });

  it("measures the overshoot after the target is reached and the time within ±0.5°", () => {
    const stats = comfortStats(room, target, T0, T0 + 240 * MIN);
    expect(stats.overshoot).toBeCloseTo(0.4, 10);
    expect(stats.withinShare).toBeCloseTo(0.75, 10);
  });

  it("has no rise time when no raise reaches its target", () => {
    const stats = comfortStats(series([[0, 18]]), target, T0, T0 + 240 * MIN);
    expect(stats.riseMinutes).toBeUndefined();
    expect(stats.overshoot).toBeUndefined();
    expect(comfortStats([], [], T0, T0 + MIN).withinShare).toBe(0);
  });
});

describe("slopeHistory", () => {
  it("gives a negative slope during a fall and fades it with flat points after 30 minutes without measurement", () => {
    const room = series([[0, 20], [5, 20], [10, 20], [15, 19.5], [20, 19]]);
    const slope = slopeHistory(room, T0, T0 + 70 * MIN);
    expect(valueAt(slope, T0 + 20 * MIN)).toBeLessThan(-3);
    const atFall = valueAt(slope, T0 + 20 * MIN) as number;
    // The first flat point comes at the first cycle 30 minutes or more after the last measurement, and divides the slope by 5.
    expect(valueAt(slope, T0 + 45 * MIN)).toBe(atFall);
    expect(valueAt(slope, T0 + 50 * MIN)).toBeCloseTo(atFall * 0.2, 2);
    expect(slope[slope.length - 1]?.t).toBe(T0 + 70 * MIN);
  });

  it("starts the period with the slope reached before it", () => {
    const room = series([[0, 20], [5, 19.8], [10, 19.6]]);
    const slope = slopeHistory(room, T0 + 12 * MIN, T0 + 14 * MIN, { cycleMin: 60 });
    expect(slope).toHaveLength(1);
    expect(slope[0]?.t).toBe(T0 + 12 * MIN);
    expect(slopeHistory([], T0, T0 + MIN)).toEqual([]);
  });
});

describe("windowDetections", () => {
  const settings = { openThreshold: 3, closeThreshold: 0, maxDurationMin: 30 };

  it("detects an aeration and its end", () => {
    const slope = series([[0, 0], [5, -1], [10, -4], [15, -5], [20, -2], [25, 0.5], [30, 1]]);
    const result = windowDetections(slope, settings);
    expect(result.configured).toBe(true);
    expect(result.detections).toEqual([{ start: T0 + 10 * MIN, end: T0 + 25 * MIN, endReason: "close", minSlope: -5 }]);
    expect(result.strongestDrop).toEqual({ t: T0 + 15 * MIN, v: -5 });
  });

  it("detects nothing for a fall weaker than the threshold, and gives the strongest drop", () => {
    const result = windowDetections(series([[0, 0], [5, -1], [10, -2.9], [15, 0]]), settings);
    expect(result.detections).toEqual([]);
    expect(result.strongestDrop).toEqual({ t: T0 + 10 * MIN, v: -2.9 });
  });

  it("ends a detection at the maximal duration, and opens again if the slope stays under the threshold", () => {
    const slope = series(Array.from({ length: 13 }, (_, i): [number, number] => [i * 5, i === 0 ? 0 : -4]));
    const { detections } = windowDetections(slope, settings, { end: T0 + 70 * MIN });
    expect(detections[0]).toEqual({ start: T0 + 5 * MIN, end: T0 + 35 * MIN, endReason: "max_duration", minSlope: -4 });
    expect(detections[1]).toMatchObject({ start: T0 + 35 * MIN, endReason: "max_duration", end: T0 + 65 * MIN });
  });

  it("ends a detection still open at the end of the period", () => {
    const { detections } = windowDetections(series([[0, 0], [5, -4], [10, -4]]), settings, { end: T0 + 20 * MIN });
    expect(detections).toEqual([{ start: T0 + 5 * MIN, end: T0 + 20 * MIN, endReason: "period_end", minSlope: -4 }]);
  });

  it("ignores an opening while the thermostat does not heat", () => {
    const slope = series([[0, 0], [5, -4], [10, -4]]);
    const { detections } = windowDetections(slope, settings, { onPercent: series([[0, 0], [8, 0.3]]) });
    expect(detections.map((d) => d.start)).toEqual([T0 + 10 * MIN]);
  });

  it("does not detect without threshold or maximal duration", () => {
    const slope = series([[0, 0], [5, -6]]);
    expect(windowDetections(slope, {})).toEqual({ detections: [], strongestDrop: { t: T0 + 5 * MIN, v: -6 }, configured: false });
    expect(windowDetections(slope, { openThreshold: 3, closeThreshold: 0 }).configured).toBe(false);
    expect(windowDetections(series([[0, 1]]), {})).toEqual({ detections: [], configured: false });
  });
});

describe("sensorGaps", () => {
  const reports = series([[-20, 19], [0, 19], [10, 19.1], [20, 19.2], [90, 19.3], [100, 19.4], [110, 19.5]]);

  it("marks a silence of 70 minutes as triggering the safety mode with a delay of 60 minutes", () => {
    const { gaps, longest } = sensorGaps(reports, T0, T0 + 120 * MIN, 60);
    expect(gaps).toEqual([{ start: T0 + 20 * MIN, end: T0 + 90 * MIN, minutes: 70, triggers: true }]);
    expect(longest).toEqual(gaps[0]);
  });

  it("does not trigger for a silence equal to the delay, and ends a running silence at the end of the period", () => {
    expect(sensorGaps(reports, T0, T0 + 120 * MIN, 70).gaps[0]?.triggers).toBe(false);
    const running = sensorGaps(series([[0, 19]]), T0, T0 + 90 * MIN, 60);
    expect(running.gaps).toEqual([{ start: T0, end: T0 + 90 * MIN, minutes: 90, triggers: true }]);
    expect(sensorGaps([], T0, T0 + MIN, 60)).toEqual({ gaps: [] });
  });

  it("keeps the longest silence even when it is short", () => {
    const { gaps, longest } = sensorGaps(series([[0, 19], [10, 19], [25, 19], [30, 19]]), T0, T0 + 30 * MIN, 60);
    expect(gaps).toEqual([]);
    expect(longest?.minutes).toBe(15);
  });

  it("gives the share condition of the safety mode", () => {
    expect(DEFAULT_SAFETY_MIN_ON_PERCENT).toBe(0.5);
    expect(safetyShareCondition(0.5)).toBe(true);
    expect(safetyShareCondition(0.49)).toBe(false);
    expect(safetyShareCondition(0.2, 0.1)).toBe(true);
  });
});
