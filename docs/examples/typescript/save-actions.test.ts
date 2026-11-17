// @vitest-environment happy-dom
import type { DraftControls, SaveResult } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import type { MockHaElement } from "@vtherm/dashboard-sdk/testing";
import { afterEach, expect, it, vi } from "vitest";

import { MyPluginSection } from "./save-actions.ts";

defineHaControlMocks();
customElements.define("my-plugin-section", MyPluginSection);

afterEach(() => document.body.replaceChildren());

function draftOf(result: SaveResult, dirty = true): DraftControls & { save: ReturnType<typeof vi.fn> } {
  return { dirty, saving: false, messages: dirty ? [{ type: "info", text: "Unsaved changes" }] : [], save: vi.fn(async () => result), discard: vi.fn() };
}

it("draws the actions at the foot of its card, off while the draft has no change", () => {
  const element = document.createElement("my-plugin-section") as MyPluginSection;
  element.draft = draftOf("success", false);
  document.body.append(element);
  const [discard, save] = [element.querySelector<MockHaElement>(".card-actions ha-button"), element.querySelector<MockHaElement>(".card-actions ha-progress-button")];
  expect([discard?.disabled, save?.disabled, save?.appearance]).toEqual([true, true, "filled"]);
});

it("saves with the progress button, and shows the result on it", async () => {
  const element = document.createElement("my-plugin-section") as MyPluginSection;
  const draft = draftOf("partial");
  element.draft = draft;
  document.body.append(element);
  const save = element.querySelector<MockHaElement>("ha-progress-button") as MockHaElement;
  save.click();
  await vi.waitFor(() => expect(save.result).toBe("error"));
  expect(draft.save).toHaveBeenCalledTimes(1);
  expect(save.progress).toBe(false);
  expect(element.querySelector<MockHaElement>("ha-alert")?.alertType).toBe("info");
});

it("draws no action when the configuration is read-only", () => {
  const element = document.createElement("my-plugin-section") as MyPluginSection;
  element.draft = undefined;
  document.body.append(element);
  expect(element.querySelector(".card-actions")).toBeNull();
});
