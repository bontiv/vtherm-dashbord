/**
 * Compare the ported functions of `frontend/src/insights/` to the results of the code of Versatile Thermostat, kept as fixtures by
 * `tests/test_insights_fixtures.py`. When this test fails after new fixtures, Versatile Thermostat changed a rule: update the port.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_SAFETY_DEFAULT_ON_PERCENT,
  DEFAULT_SAFETY_MIN_ON_PERCENT,
  ExponentialMovingAverage,
  MAX_DURATION_MIN,
  MAX_SLOPE_VALUE,
  MIN_DELTA_T_SEC,
  MIN_NB_POINT,
  MIN_TIME_DECAY_SEC,
  SHORT_EMA_PARAMS,
  WindowOpenDetectionAlgorithm,
  cycleTimes,
  pyRound,
  slopeHistory,
  tpiDecision,
  windowDetections,
} from "../src/insights/index.ts";
import type { Sample } from "../src/insights/index.ts";

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./fixtures/insights/${name}`, import.meta.url), "utf8")) as T;
}

/** -0 and 0 are the same value for these comparisons. */
const plain = (value: number): number => value + 0;

describe("the fixtures of Versatile Thermostat", () => {
  it("round like Python", () => {
    for (const [value, expected] of fixture<[number, number][]>("rounding.json")) {
      expect(plain(pyRound(value, 2)), String(value)).toBe(plain(expected));
    }
  });

  it("give the on and off times of calculate_cycle_times", () => {
    for (const { input, output } of fixture<{ input: [number, number, number, number]; output: [number, number, boolean] }[]>("cycle-times.json")) {
      const times = cycleTimes(...input);
      expect([times.onSec, times.offSec, times.forced], JSON.stringify(input)).toEqual(output);
    }
  });

  it("give the share and the times of TpiAlgorithm and the cycle scheduler", () => {
    interface TpiCase {
      readonly name: string;
      readonly coef_int: number;
      readonly coef_ext: number;
      readonly target: number;
      readonly room: number;
      readonly outdoor: number | null;
      readonly slope: number | null;
      readonly cycle_min: number;
      readonly min_on: number;
      readonly min_off: number;
      readonly max_on?: number | null;
      readonly low?: number;
      readonly high?: number;
      readonly cooling?: boolean;
    }
    interface TpiOutput {
      readonly on_percent: number;
      readonly on_time_sec: number;
      readonly off_time_sec: number;
      readonly forced_by_timing: boolean;
    }
    const cases = fixture<{ input: TpiCase; output: TpiOutput }[]>("tpi.json");
    expect(cases.length).toBeGreaterThan(10);
    for (const { input, output } of cases) {
      const decision = tpiDecision(
        {
          coefInt: input.coef_int,
          coefExt: input.coef_ext,
          cycleMin: input.cycle_min,
          minActivationSec: input.min_on,
          minDeactivationSec: input.min_off,
          thresholdLow: input.low ?? 0,
          thresholdHigh: input.high ?? 0,
          maxOnPercent: input.max_on ?? null,
        },
        {
          target: input.target,
          room: input.room,
          ...(input.outdoor === null ? {} : { outdoor: input.outdoor }),
          ...(input.slope === null ? {} : { slope: input.slope }),
          ...(input.cooling === true ? { cooling: true } : {}),
        },
      );
      expect(decision.onPercent, input.name).toBe(output.on_percent);
      expect([decision.onSec, decision.offSec], input.name).toEqual([output.on_time_sec, output.off_time_sec]);
      expect(decision.notes.includes("too_short") || decision.notes.includes("off_too_short"), input.name).toBe(output.forced_by_timing);
    }
  });

  it("copy the constants of Versatile Thermostat", () => {
    const constants = fixture<Record<string, unknown>>("constants.json");
    expect(constants).toEqual({
      DEFAULT_SHORT_EMA_PARAMS: { max_alpha: SHORT_EMA_PARAMS.maxAlpha, halflife_sec: SHORT_EMA_PARAMS.halflifeSec, precision: SHORT_EMA_PARAMS.precision },
      DEFAULT_SAFETY_MIN_ON_PERCENT,
      DEFAULT_SAFETY_DEFAULT_ON_PERCENT,
      MIN_TIME_DECAY_SEC,
      MIN_DELTA_T_SEC,
      MAX_SLOPE_VALUE,
      MAX_DURATION_MIN,
      MIN_NB_POINT,
    });
  });

  describe("of the slope", () => {
    interface SlopeEvent {
      readonly t: number;
      readonly kind: "measure" | "cycle";
      readonly ema: number | null;
      readonly slope: number | null;
      readonly nb_point: number;
      readonly open: boolean;
      readonly close: boolean;
    }
    interface SlopeFixture {
      readonly cycle_min: number;
      readonly open_threshold: number;
      readonly close_threshold: number;
      readonly start: number;
      readonly end: number;
      readonly room: [number, number][];
      readonly events: SlopeEvent[];
    }
    const data = fixture<SlopeFixture>("slope.json");
    const room: Sample[] = data.room.map(([t, v]) => ({ t, v }));

    it("give the EMA, the slope, the points and the open and close tests at each evaluation", () => {
      const ema = new ExponentialMovingAverage();
      const algo = new WindowOpenDetectionAlgorithm(data.open_threshold, data.close_threshold);
      const values = new Map(room.map((s) => [s.t, s.v]));
      let emaTemperature: number | undefined;
      for (const event of data.events) {
        if (event.kind === "measure") {
          emaTemperature = ema.calculate(values.get(event.t) as number, event.t);
          algo.addTempMeasurement(emaTemperature, event.t);
        }
        algo.checkAgeLastMeasurement(emaTemperature as number, event.t);
        const at = `${event.kind} at ${(event.t - data.start) / 60_000} min`;
        expect(emaTemperature, at).toBe(event.ema);
        expect(algo.lastSlope === undefined ? null : plain(algo.lastSlope), at).toBe(event.slope === null ? null : plain(event.slope));
        expect(algo.nbPoint, at).toBe(event.nb_point);
        expect(algo.isWindowOpenDetected(), at).toBe(event.open);
        expect(algo.isWindowCloseDetected(), at).toBe(event.close);
      }
      expect(data.events.some((event) => event.open)).toBe(true);
    });

    it("give the samples of slopeHistory", () => {
      const samples = slopeHistory(room, data.start, data.end, { cycleMin: data.cycle_min });
      const expected = data.events.filter((event) => event.slope !== null).map((event) => ({ t: event.t, v: plain(event.slope as number) }));
      expect(samples.map((s) => ({ t: s.t, v: plain(s.v) }))).toEqual(expected);
    });

    it("open a detection where the algorithm of Versatile Thermostat detects one", () => {
      const samples = slopeHistory(room, data.start, data.end, { cycleMin: data.cycle_min });
      const { detections } = windowDetections(samples, { openThreshold: data.open_threshold, closeThreshold: data.close_threshold, maxDurationMin: 600 }, { end: data.end });
      // The branches of manage_window_auto on the flags of the algorithm of Versatile Thermostat (no maximal duration here).
      const expected: { start: number; end: number }[] = [];
      let opened: number | undefined;
      for (const event of data.events) {
        if (event.open && opened === undefined) {
          opened = event.t;
        } else if (event.close && opened !== undefined) {
          expected.push({ start: opened, end: event.t });
          opened = undefined;
        }
      }
      expect(expected.length).toBeGreaterThan(1);
      expect(detections.filter((d) => d.endReason === "close").map((d) => ({ start: d.start, end: d.end }))).toEqual(expected);
    });
  });
});
