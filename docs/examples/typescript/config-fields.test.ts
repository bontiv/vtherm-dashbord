// @vitest-environment happy-dom
import { selectorOf } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks, resetHaControls } from "@vtherm/dashboard-sdk/testing";
import type { MockHaElement } from "@vtherm/dashboard-sdk/testing";
import { afterEach, expect, it, vi } from "vitest";

import { FIELDS, MyPluginFields } from "./config-fields.ts";

customElements.define("my-plugin-fields", MyPluginFields);

afterEach(() => {
  document.body.replaceChildren();
  resetHaControls();
});

it("draws each field with ha-selector, and proposes the value that the user chose", async () => {
  // The page of the test has no Home Assistant: the simulated components stand for it.
  defineHaControlMocks();
  const proposed: Record<string, unknown>[] = [];
  const element = document.createElement("my-plugin-fields") as MyPluginFields;
  element.values = { my_plugin_heaters: ["climate.salon"] };
  element.proposeChanges = (changes) => void proposed.push(changes);
  document.body.append(element);
  await vi.waitFor(() => expect(element.querySelectorAll("ha-selector")).toHaveLength(FIELDS.length));

  const heaters = element.querySelectorAll<MockHaElement>("ha-selector")[1] as MockHaElement;
  expect(heaters.selector).toEqual(selectorOf(FIELDS[1]!));
  expect(heaters.value).toEqual(["climate.salon"]);
  heaters.change(["climate.salon", "climate.chambre"]);
  expect(proposed).toEqual([{ my_plugin_heaters: ["climate.salon", "climate.chambre"] }]);
});
