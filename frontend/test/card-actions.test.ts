// @vitest-environment happy-dom
/** The save actions at the foot of the card of a configuration section, as the configuration pages of Home Assistant draw them. */
import type { DraftControls, DraftMessage, SaveResult } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import type { MockHaElement } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import { RESTORE_ICON, RESULT_DURATION, VThermCardActions } from "../src/components/card-actions.ts";

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

type Draft = DraftControls & { save: Mock<() => Promise<SaveResult>>; discard: Mock<() => void> };

/** A draft whose save resolves to `result`, after `release()` when `hold` is true. */
function draftOf(options: { dirty?: boolean; saving?: boolean; result?: SaveResult; messages?: DraftMessage[]; hold?: boolean } = {}): Draft & { release(): void } {
  let release = () => undefined as void;
  const wait = new Promise<void>((resolve) => (release = resolve));
  return {
    dirty: options.dirty ?? true,
    saving: options.saving ?? false,
    messages: options.messages ?? [],
    save: vi.fn(async (): Promise<SaveResult> => {
      if (options.hold === true) {
        await wait;
      }
      return options.result ?? "success";
    }),
    discard: vi.fn((): void => undefined),
    release: () => release(),
  };
}

async function mount(draft: DraftControls | undefined): Promise<VThermCardActions> {
  const element = document.createElement("vtherm-card-actions") as VThermCardActions;
  element.draft = draft;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

const shadow = (element: VThermCardActions) => element.shadowRoot as ShadowRoot;
const status = (element: VThermCardActions) => shadow(element).querySelector('[role="status"].visually-hidden')?.textContent ?? "";

describe("without the components of Home Assistant", () => {
  it("draws plain buttons, Discard on the left and Save on the right, under a separator", async () => {
    const element = await mount(draftOf());
    const buttons = [...shadow(element).querySelectorAll<HTMLButtonElement>(".card-actions button")];
    expect(buttons.map((button) => button.className)).toEqual(["discard", "save"]);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(["Discard", "Save"]);
  });

  it("says that the save is in progress, then shows the result as a text for two seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const draft = draftOf({ result: "error" });
    const element = await mount(draft);
    shadow(element).querySelector<HTMLButtonElement>("button.save")?.click();
    element.draft = { ...draft, saving: true };
    await element.updateComplete;
    expect(shadow(element).querySelector("button.save")?.textContent?.trim()).toBe("Saving…");
    element.draft = { ...draft, saving: false };
    await vi.waitFor(() => expect(shadow(element).querySelector(".result")?.textContent).toBe("Not saved."));
    vi.advanceTimersByTime(RESULT_DURATION);
    await element.updateComplete;
    expect(shadow(element).querySelector(".result")).toBeNull();
  });

  it("draws nothing when the configuration cannot be saved", async () => {
    const element = await mount(undefined);
    expect(shadow(element).querySelector(".card-actions")).toBeNull();
  });
});

describe("with the components of Home Assistant", () => {
  beforeAll(() => defineHaControlMocks());

  const save = (element: VThermCardActions) => shadow(element).querySelector<MockHaElement>("ha-progress-button.save") as MockHaElement;
  const discard = (element: VThermCardActions) => shadow(element).querySelector<MockHaElement>("ha-button.discard") as MockHaElement;

  it("draws a plain button with the restore icon on the left, and the filled progress button on the right", async () => {
    const element = await mount(draftOf());
    const [first, second] = [...(shadow(element).querySelector(".card-actions")?.children ?? [])];
    expect([first?.localName, second?.localName]).toEqual(["ha-button", "ha-progress-button"]);
    expect(discard(element).getAttribute("appearance")).toBe("plain");
    expect((discard(element).querySelector("ha-svg-icon") as MockHaElement).path).toBe(RESTORE_ICON);
    expect(save(element).getAttribute("appearance")).toBe("filled");
  });

  it("is visible but off while the draft has no change", async () => {
    const element = await mount(draftOf({ dirty: false }));
    expect([discard(element).disabled, save(element).disabled]).toEqual([true, true]);
  });

  it("shows the unsaved changes above the actions as a text, and the other messages as alerts", async () => {
    const messages: DraftMessage[] = [
      { type: "info", text: "Unsaved changes" },
      { type: "error", text: "The configuration is not complete" },
    ];
    const element = await mount(draftOf({ messages }));
    expect(shadow(element).querySelector(".unsaved")?.textContent).toBe("Unsaved changes");
    expect((shadow(element).querySelector("ha-alert.message") as MockHaElement).getAttribute("alert-type")).toBe("error");
  });

  it("shows the progress of a save, refuses a second click, then the success on the button and to the screen readers", async () => {
    const draft = draftOf({ hold: true });
    const element = await mount(draft);
    save(element).click();
    expect(save(element).progress).toBe(true);
    save(element).click();
    expect(draft.save).toHaveBeenCalledTimes(1);
    draft.release();
    await vi.waitFor(() => expect(save(element).result).toBe("success"));
    expect(save(element).progress).toBe(false);
    await element.updateComplete;
    expect(status(element)).toBe("Saved.");
    expect(shadow(element).querySelector(".result")).toBeNull();
  });

  it("shows a refused save on the button, and tells nothing to the screen readers", async () => {
    const element = await mount(draftOf({ result: "error" }));
    save(element).click();
    await vi.waitFor(() => expect(save(element).result).toBe("error"));
    expect(status(element)).toBe("");
  });

  it("shows a partial save as a failure on the button", async () => {
    const element = await mount(draftOf({ result: "partial" }));
    save(element).click();
    await vi.waitFor(() => expect(save(element).result).toBe("error"));
  });

  it("discards with the plain button", async () => {
    const draft = draftOf();
    const element = await mount(draft);
    discard(element).click();
    expect(draft.discard).toHaveBeenCalledTimes(1);
  });
});
