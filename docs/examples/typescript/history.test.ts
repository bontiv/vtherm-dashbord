import { createFakeHass } from "@vtherm/dashboard-sdk/testing";
import { expect, it } from "vitest";

import { readAttribute, readStates } from "./history.ts";

const NOW = Date.parse("2026-11-19T12:00:00Z");

it("asks the recorder for the smallest answer over the period, and gives the states with their time", async () => {
  const hass = createFakeHass();
  const messages: Record<string, unknown>[] = [];
  hass.setWebSocketHandler((message) => {
    messages.push({ ...message });
    return { "sensor.salon_power": [{ s: "40", lu: NOW / 1000 - 600 }, { s: "55", lu: NOW / 1000 - 300 }] };
  });
  expect(await readStates(hass, "sensor.salon_power", 1, NOW)).toEqual([
    { t: NOW - 600_000, state: "40" },
    { t: NOW - 300_000, state: "55" },
  ]);
  expect(messages).toEqual([
    {
      type: "history/history_during_period",
      start_time: "2026-11-19T11:00:00.000Z",
      end_time: "2026-11-19T12:00:00.000Z",
      entity_ids: ["sensor.salon_power"],
      minimal_response: true,
      no_attributes: true,
    },
  ]);
});

it("reads an attribute of the climate entity from the rows with attributes", async () => {
  const hass = createFakeHass();
  hass.setWebSocketHandler(() => ({ "climate.salon": [{ s: "heat", lu: NOW / 1000 - 60, a: { current_temperature: 19.5 } }, { s: "heat", lu: NOW / 1000, a: {} }] }));
  expect(await readAttribute(hass, "climate.salon", "current_temperature", 1, NOW)).toEqual([{ t: NOW - 60_000, state: "19.5" }]);
});

it("gives an empty history for an entity that the recorder does not know", async () => {
  const hass = createFakeHass();
  hass.setWebSocketHandler(() => ({}));
  expect(await readStates(hass, "sensor.unknown", 24, NOW)).toEqual([]);
});
