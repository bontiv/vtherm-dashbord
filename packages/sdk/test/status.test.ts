import { describe, expect, it } from "vitest";

import { CORE_TOP_TABS, createPlacementEngine, defineTranslations, isSectionStatus, sectionStatusOf } from "../src/index.ts";
import type { PlacedEntry } from "../src/index.ts";

const entryWith = (status: unknown): PlacedEntry => {
  const engine = createPlacementEngine();
  engine.addPlugin({ id: "smartpi", translations: defineTranslations({}), contributions: { thermostat_config: [{ id: "smartpi.tab", title: "t", component: "c", status: status as never }] } });
  return engine.menu(CORE_TOP_TABS.thermostats).find((entry) => entry.id === "smartpi.tab") as PlacedEntry;
};
const context = { hass: {} as never, thermostatId: "climate.salon", thermostatType: "over_switch" as const, values: {}, centralValues: {} };

describe("the status of a section", () => {
  it("accepts complete, inherited and incomplete with a number of missing values", () => {
    expect([{ kind: "complete" }, { kind: "inherited" }, { kind: "incomplete", missing: 2 }].every(isSectionStatus)).toBe(true);
    expect([{ kind: "incomplete" }, { kind: "incomplete", missing: -1 }, { kind: "off" }, "complete", null].some(isSectionStatus)).toBe(false);
  });

  it("is read from the function of the contribution", () => {
    expect(sectionStatusOf(entryWith(() => ({ kind: "incomplete", missing: 2 })), context)).toEqual({ kind: "incomplete", missing: 2 });
    expect(sectionStatusOf(entryWith(() => undefined), context)).toBeUndefined();
  });

  it("gives no status, and reports it, when the function raises or returns something else", () => {
    const errors: unknown[] = [];
    expect(
      sectionStatusOf(
        entryWith(() => {
          throw new Error("broken");
        }),
        context,
        (error) => errors.push(error),
      ),
    ).toBeUndefined();
    expect(sectionStatusOf(entryWith(() => ({ kind: "off" })), context, (error) => errors.push(error))).toBeUndefined();
    expect(errors).toHaveLength(2);
  });
});
