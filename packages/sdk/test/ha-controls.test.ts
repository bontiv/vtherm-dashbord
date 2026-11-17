import { afterEach, describe, expect, it, vi } from "vitest";

import { HA_CONTROLS, ensureHaControls, haControlsStatus } from "../src/index.ts";
import type { ElementRegistry } from "../src/index.ts";
import { resetHaControls } from "../src/ha-controls.ts";

/** The class of a defined element. The loader only checks that there is one. */
const ELEMENT = class {} as unknown as CustomElementConstructor;

/** A registry of custom elements, where a test decides what is defined and when. */
function fakeRegistry(initial: readonly string[]) {
  const defined = new Set(initial);
  const waiting = new Map<string, (() => void)[]>();
  const registry: ElementRegistry = {
    get: (tag: string) => (defined.has(tag) ? ELEMENT : undefined),
    whenDefined: vi.fn((tag: string) =>
      defined.has(tag)
        ? Promise.resolve(ELEMENT)
        : new Promise<CustomElementConstructor>((resolve) => waiting.set(tag, [...(waiting.get(tag) ?? []), () => resolve(ELEMENT)])),
    ),
  };
  const define = (...tags: string[]) => {
    for (const tag of tags) {
      defined.add(tag);
      waiting.get(tag)?.forEach((resolve) => resolve());
    }
  };
  return { registry, define };
}

afterEach(() => resetHaControls());

describe("the loader of the components of Home Assistant", () => {
  it("loads nothing when every component is already defined", async () => {
    const { registry } = fakeRegistry(["home-assistant", ...HA_CONTROLS, "ha-spinner"]);
    const result = await ensureHaControls({ registry });
    expect(result.loaded).toBe(true);
    expect(result.spinner).toBe("ha-spinner");
    expect(registry.whenDefined).not.toHaveBeenCalled();
  });

  it("does not wait for the progress button, which only some versions of Home Assistant define, and reports it", async () => {
    const { registry } = fakeRegistry(["home-assistant", ...HA_CONTROLS.filter((tag) => tag !== "ha-progress-button"), "ha-spinner"]);
    const result = await ensureHaControls({ registry, timeout: 60_000 });
    expect(result.loaded).toBe(true);
    expect(result.defined["ha-progress-button"]).toBe(false);
    expect(registry.whenDefined).not.toHaveBeenCalled();
  });

  it("answers at once out of Home Assistant, so that the fields use their fallback", async () => {
    const { registry } = fakeRegistry([]);
    const result = await ensureHaControls({ registry, timeout: 60_000 });
    expect(result.loaded).toBe(false);
    expect(Object.values(result.defined).every((value) => !value)).toBe(true);
  });

  it("waits for the components that Home Assistant defines later, and tells which spinner it has", async () => {
    const { registry, define } = fakeRegistry(["home-assistant", "ha-icon", "ha-circular-progress"]);
    const pending = ensureHaControls({ registry, timeout: 60_000 });
    define(...HA_CONTROLS);
    const result = await pending;
    expect(result.loaded).toBe(true);
    expect(result.spinner).toBe("ha-circular-progress");
    expect(result.defined["ha-spinner"]).toBe(false);
  });

  it("shares one load between the callers", async () => {
    const { registry, define } = fakeRegistry(["home-assistant"]);
    const first = ensureHaControls({ registry, timeout: 60_000 });
    const second = ensureHaControls({ registry, timeout: 60_000 });
    expect(second).toBe(first);
    define(...HA_CONTROLS, "ha-spinner");
    expect(await second).toBe(await first);
  });

  it("gives up after its time limit without raising, and reports what is missing", async () => {
    const { registry } = fakeRegistry(["home-assistant", "ha-icon"]);
    const result = await ensureHaControls({ registry, timeout: 20 });
    expect(result.loaded).toBe(false);
    expect(result.defined["ha-icon"]).toBe(true);
    expect(result.defined["ha-selector"]).toBe(false);
  });

  it("reads the components that are defined now, without waiting", () => {
    const { registry } = fakeRegistry(["ha-selector", "ha-spinner"]);
    expect(haControlsStatus(registry)).toMatchObject({ loaded: true, spinner: "ha-spinner", defined: { "ha-selector": true, "ha-switch": false } });
  });
});
