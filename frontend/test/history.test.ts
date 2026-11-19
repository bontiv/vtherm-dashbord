/** The history of the entities of a thermostat: the request to the recorder, the samples, the cache and the errors. */
import { describe, expect, it, vi } from "vitest";

import { CACHE_MS, HistoryClient, PERIOD_MS, isAbortError, sharedHistory, toHistory } from "../src/native/history.ts";

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);

/** A fake hass whose recorder answers with rows, or fails. */
function fakeHass(answer: () => Record<string, unknown>) {
  const callWS = vi.fn(async (message: Record<string, unknown>) => {
    void message;
    return answer();
  });
  return { hass: { callWS } as never, callWS };
}

describe("the history of an entity", () => {
  it("asks the recorder for one entity over the period, without attributes unless some are asked for", async () => {
    const { hass, callWS } = fakeHass(() => ({ "sensor.room": [] }));
    const client = new HistoryClient(() => hass, () => NOW);
    await client.read("sensor.room", "day");
    await client.read("climate.salon", "week", ["temperature"]);
    expect(callWS.mock.calls[0]?.[0]).toEqual({
      type: "history/history_during_period",
      start_time: new Date(NOW - PERIOD_MS.day).toISOString(),
      end_time: new Date(NOW).toISOString(),
      entity_ids: ["sensor.room"],
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
    expect(callWS.mock.calls[1]?.[0]).toMatchObject({ entity_ids: ["climate.salon"], minimal_response: false, no_attributes: false, start_time: new Date(NOW - PERIOD_MS.week).toISOString() });
  });

  it("turns the numeric states and attributes into samples, keeping the attributes of the previous row", () => {
    const history = toHistory(
      [
        { s: "heat", a: { temperature: 20, current_temperature: 19.5 }, lu: 100 },
        { s: "heat", lu: 160 },
        { s: "unavailable", a: { temperature: 21 }, lu: 200 },
      ],
      ["temperature"],
      0,
      1,
    );
    expect(history.state).toEqual([]);
    expect(history.attributes["temperature"]).toEqual([
      { t: 100000, v: 20 },
      { t: 160000, v: 20 },
      { t: 200000, v: 21 },
    ]);
    expect(toHistory([{ s: "19.5", lu: 10 }, { s: "unknown", lu: 20 }, { s: "20", lc: 30 }], [], 0, 1).state).toEqual([
      { t: 10000, v: 19.5 },
      { t: 30000, v: 20 },
    ]);
  });

  it("gives a history again for five minutes, by entity and by period, without asking the recorder", async () => {
    let now = NOW;
    const { hass, callWS } = fakeHass(() => ({ "sensor.room": [{ s: "19", lu: NOW / 1000 }] }));
    const client = new HistoryClient(() => hass, () => now);
    await client.read("sensor.room", "day");
    await client.read("sensor.room", "week");
    now += CACHE_MS - 1000;
    await client.read("sensor.room", "day");
    expect(callWS).toHaveBeenCalledTimes(2);
    now += 2000;
    await client.read("sensor.room", "day");
    expect(callWS).toHaveBeenCalledTimes(3);
  });

  it("forgets a failed read, so that the next one asks again", async () => {
    let fail = true;
    const { hass, callWS } = fakeHass(() => {
      if (fail) {
        throw new Error("recorder unavailable");
      }
      return { "sensor.room": [] };
    });
    const client = new HistoryClient(() => hass, () => NOW);
    await expect(client.read("sensor.room", "day")).rejects.toThrow("recorder unavailable");
    fail = false;
    await expect(client.read("sensor.room", "day")).resolves.toMatchObject({ state: [] });
    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it("asks nothing until a history is read", () => {
    const { hass, callWS } = fakeHass(() => ({}));
    new HistoryClient(() => hass, () => NOW);
    expect(callWS).not.toHaveBeenCalled();
  });

  it("cancels the read of a reader that went away, and keeps the request for the others", async () => {
    let release: (rows: Record<string, unknown>) => void = () => undefined;
    const callWS = vi.fn(() => new Promise<Record<string, unknown>>((resolve) => (release = resolve)));
    const client = new HistoryClient(() => ({ callWS }) as never, () => NOW);
    const gone = new AbortController();
    const first = client.read("sensor.room", "day", [], gone.signal);
    const second = client.read("sensor.room", "day");
    gone.abort();
    await expect(first).rejects.toSatisfy(isAbortError);
    release({ "sensor.room": [{ s: "19", lu: NOW / 1000 }] });
    await expect(second).resolves.toMatchObject({ state: [{ t: NOW, v: 19 }] });
    // The history is in the cache: a reader that comes back gets it without a new request.
    await expect(client.read("sensor.room", "day", [], new AbortController().signal)).resolves.toMatchObject({ state: [{ v: 19 }] });
    expect(callWS).toHaveBeenCalledTimes(1);
  });

  it("asks nothing for a reader that is already cancelled", async () => {
    const { hass, callWS } = fakeHass(() => ({}));
    const client = new HistoryClient(() => hass, () => NOW);
    const gone = new AbortController();
    gone.abort();
    await expect(client.read("sensor.room", "day", [], gone.signal)).rejects.toSatisfy(isAbortError);
    expect(callWS).not.toHaveBeenCalled();
    expect(isAbortError(new Error("recorder unavailable"))).toBe(false);
  });

  it("shares one client between the readers, which reads with the last state of Home Assistant given", async () => {
    const { hass, callWS } = fakeHass(() => ({ "sensor.shared": [] }));
    const client = sharedHistory(hass);
    expect(sharedHistory(undefined)).toBe(client);
    await Promise.all([sharedHistory(hass).read("sensor.shared", "day"), sharedHistory(hass).read("sensor.shared", "day")]);
    expect(callWS).toHaveBeenCalledTimes(1);
  });
});
