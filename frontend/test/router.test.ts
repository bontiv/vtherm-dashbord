import { describe, expect, it } from "vitest";

import { buildPath, EMPTY_ROUTE, parseRoute } from "../src/router.ts";

const THERMOSTATS = "core.top.thermostats";

describe("parseRoute", () => {
  it("reads the address of the panel as the empty route", () => {
    expect(parseRoute("/vtherm", THERMOSTATS)).toEqual(EMPTY_ROUTE);
    expect(parseRoute("/vtherm/", THERMOSTATS)).toEqual(EMPTY_ROUTE);
  });

  it("reads the tab and the entry", () => {
    expect(parseRoute("/vtherm/core.top.dashboard/core.page.overview", THERMOSTATS)).toEqual({ tab: "core.top.dashboard", entry: "core.page.overview", rest: [] });
    expect(parseRoute("/vtherm/core.top.dashboard", THERMOSTATS)).toEqual({ tab: "core.top.dashboard", rest: [] });
  });

  it("reads the thermostat of the Thermostats tab", () => {
    expect(parseRoute(`/vtherm/${THERMOSTATS}/climate.salon/core_tpi.tab.main`, THERMOSTATS)).toEqual({ tab: THERMOSTATS, thermostat: "climate.salon", entry: "core_tpi.tab.main", rest: [] });
    expect(parseRoute(`/vtherm/${THERMOSTATS}`, THERMOSTATS)).toEqual({ tab: THERMOSTATS, rest: [] });
    expect(parseRoute(`/vtherm/${THERMOSTATS}/climate.salon`, THERMOSTATS)).toEqual({ tab: THERMOSTATS, thermostat: "climate.salon", rest: [] });
  });

  it("keeps what follows the entry", () => {
    expect(parseRoute("/vtherm/t/e/detail/a%20b", THERMOSTATS)).toEqual({ tab: "t", entry: "e", rest: ["detail", "a b"] });
  });

  it("gives the empty route for another path, and does not fail on a bad encoding", () => {
    expect(parseRoute("/lovelace/0", THERMOSTATS)).toEqual(EMPTY_ROUTE);
    expect(parseRoute("/vtherm-other/x", THERMOSTATS)).toEqual(EMPTY_ROUTE);
    expect(parseRoute("/vtherm/%E0%A4%A", THERMOSTATS).tab).toBe("%E0%A4%A");
  });
});

describe("buildPath", () => {
  it("writes the address of a route, and parseRoute reads it back", () => {
    for (const route of [
      EMPTY_ROUTE,
      { tab: "core.top.dashboard", rest: [] },
      { tab: "core.top.dashboard", entry: "core.page.overview", rest: [] },
      { tab: THERMOSTATS, thermostat: "climate.salon", entry: "core_tpi.tab.main", rest: [] },
      { tab: "x", entry: "y", rest: ["detail", "a b/c"] },
    ]) {
      expect(parseRoute(buildPath(route), THERMOSTATS)).toEqual(route);
    }
  });

  it("uses the prefix and encodes the segments", () => {
    expect(buildPath({ tab: "a b", rest: [] })).toBe("/vtherm/a%20b");
    expect(buildPath(EMPTY_ROUTE)).toBe("/vtherm");
    expect(buildPath({ tab: "t", rest: [] }, "/other")).toBe("/other/t");
  });
});
