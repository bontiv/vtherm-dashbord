import { describe, expect, it } from "vitest";

import { CORE_MENU_GROUPS, CORE_TOP_TABS, createPlacementEngine, isCoreMenuGroup, defineTranslations, isSectionStatus, sectionStatusOf } from "../src/index.ts";
import type { PlacedEntry } from "../src/index.ts";

const entryWith = (status: unknown): PlacedEntry => {
  const engine = createPlacementEngine();
  engine.addPlugin({ id: "smartpi", translations: defineTranslations({}), contributions: { thermostat_config: [{ id: "smartpi.tab", title: "t", component: "c", status: status as never }] } });
  return engine.menu(CORE_TOP_TABS.thermostats).find((entry) => entry.id === "smartpi.tab") as PlacedEntry;
};
const context = { hass: {} as never, thermostatId: "climate.salon", thermostatType: "over_switch" as const, values: {}, centralValues: {} };

describe("the status of a section", () => {
  it("accepts complete, inherited, inherited off, off and incomplete with a number of missing values", () => {
    expect([{ kind: "complete" }, { kind: "inherited" }, { kind: "inherited", off: true }, { kind: "off" }, { kind: "incomplete", missing: 2 }].every(isSectionStatus)).toBe(true);
    expect([{ kind: "incomplete" }, { kind: "incomplete", missing: -1 }, { kind: "inherited", off: "yes" }, { kind: "refused" }, "complete", null].some(isSectionStatus)).toBe(false);
  });

  it("names the groups that the core shares", () => {
    expect(CORE_MENU_GROUPS).toEqual({ settings: "core:settings", features: "core:features" });
    expect([CORE_MENU_GROUPS.settings, CORE_MENU_GROUPS.features].every(isCoreMenuGroup)).toBe(true);
    expect([undefined, "group.vtherm", "core:other"].some(isCoreMenuGroup)).toBe(false);
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
    expect(sectionStatusOf(entryWith(() => ({ kind: "refused" })), context, (error) => errors.push(error))).toBeUndefined();
    expect(errors).toHaveLength(2);
  });
});
