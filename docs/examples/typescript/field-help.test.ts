// @vitest-environment happy-dom
import { FIELD_HELP_ELEMENT } from "@vtherm/dashboard-sdk";
import { defineFieldHelpMock, defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import type { MockFieldHelpElement } from "@vtherm/dashboard-sdk/testing";
import { afterEach, expect, it } from "vitest";

import { MyPluginCycle } from "./field-help.ts";

customElements.define("my-plugin-cycle", MyPluginCycle);

afterEach(() => document.body.replaceChildren());

it("gives the explanation and the diagram of its field to the help of the dashboard", () => {
  // The simulated help keeps what the section gave it, without the dashboard.
  defineHaControlMocks();
  defineFieldHelpMock();
  const section = document.createElement("my-plugin-cycle") as MyPluginCycle;
  section.values = { my_plugin_cycle: 10 };
  document.body.append(section);

  const help = section.querySelector(FIELD_HELP_ELEMENT) as MockFieldHelpElement;
  expect([help.label, help.diagram, help.highlight]).toEqual(["Cycle", "tpi_cycle", "cycle_min"]);
  expect(help.values).toEqual({ cycle_min: 10 });
  expect(help.info).toContain("A longer cycle");
});
