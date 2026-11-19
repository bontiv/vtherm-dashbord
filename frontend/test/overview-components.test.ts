// @vitest-environment happy-dom
/** The components of presentation of the native widgets, their formats, and the rules that keep a widget cheap. */
import { defineTranslations } from "@vtherm/dashboard-sdk";
import type { Hass, HassState } from "@vtherm/dashboard-sdk";
import { createFakeHass } from "@vtherm/dashboard-sdk/testing";
import { html } from "lit";
import type { TemplateResult } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  VThermOverviewWidget,
  formatAge,
  formatAttributeValue,
  formatEntityValue,
  readEntitiesChanged,
} from "../src/components/overview/index.ts";
import type { VThermBar, VThermGauge, VThermStateIcon, VThermValueRow, VThermWidgetCard, WidgetText } from "../src/components/overview/index.ts";
import { sharedHistory } from "../src/native/history.ts";
import { de, en, fr } from "../src/native/catalogs/core.ts";

/** The translations of a native plugin, with the common texts of the widgets, in a language. */
async function textIn(language: "en" | "fr" | "de"): Promise<WidgetText> {
  const translations = defineTranslations(en, { fr, de });
  await translations.setLanguage(language);
  return translations.t as unknown as WidgetText;
}

/** A hass in a language, with the unit of the temperatures of Home Assistant. */
function hassIn(language: string, unit = "°C"): Hass {
  return { language, locale: { language }, config: { unit_system: { temperature: unit } }, states: {}, callService: async () => undefined, callWS: async <R>() => undefined as R };
}

async function mount<Element extends HTMLElement>(tag: string, props: Record<string, unknown>): Promise<Element> {
  const element = document.createElement(tag) as Element & { updateComplete: Promise<unknown> };
  Object.assign(element, props);
  document.body.append(element);
  await element.updateComplete;
  return element;
}

const root = (element: HTMLElement): ShadowRoot => element.shadowRoot as ShadowRoot;

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("the gauge", () => {
  it("shows the value on its range and marks the setpoint, and says them all in its accessible name", async () => {
    const gauge = await mount<VThermGauge>("vtherm-gauge", { hass: hassIn("fr"), value: 19.5, min: 7, max: 35, marker: 21, markerLabel: "consigne", unit: "°C", text: await textIn("fr") });
    const meter = root(gauge).querySelector("[role=meter]") as HTMLElement;
    expect(meter.getAttribute("aria-label")).toBe("19,5 sur une plage de 7 à 35, consigne 21");
    expect(meter.getAttribute("aria-valuenow")).toBe("19.5");
    expect(meter.getAttribute("aria-valuetext")).toBe("19,5 °C");
    expect(root(gauge).querySelector(".value")?.textContent).toBe("19,5 °C");
    expect(root(gauge).querySelector(".detail")?.textContent?.replace(/\s+/g, " ").trim()).toBe("consigne 21 °C");
    // The fallback drawing: the arc of the range, the level reached, and the marker.
    expect(root(gauge).querySelector("svg .track")).not.toBeNull();
    expect(root(gauge).querySelector("svg .level")).not.toBeNull();
    expect(root(gauge).querySelector("svg .marker")).not.toBeNull();
  });

  it("is drawn by its own arc when ha-gauge is not defined, and by ha-gauge when it is, with the same accessible name", async () => {
    const props = { hass: hassIn("en"), value: 19.5, min: 7, max: 35, marker: 21, markerLabel: "setpoint", unit: "°C", text: await textIn("en") };
    const fallback = await mount<VThermGauge>("vtherm-gauge", props);
    expect(customElements.get("ha-gauge")).toBeUndefined();
    const name = root(fallback).querySelector("[role=meter]")?.getAttribute("aria-label");
    expect(name).toBe("19.5 on a range of 7 to 35, setpoint 21");
    customElements.define("ha-gauge", class extends HTMLElement {});
    const native = await mount<VThermGauge>("vtherm-gauge", props);
    const gauge = root(native).querySelector("ha-gauge") as HTMLElement & { min: number; max: number; value: number; valueText: string };
    expect(gauge).not.toBeNull();
    expect([gauge.min, gauge.max, gauge.value, gauge.valueText]).toEqual([7, 35, 19.5, "19.5 °C"]);
    expect(root(native).querySelector("svg")).toBeNull();
    expect(root(native).querySelector("[role=meter]")?.getAttribute("aria-label")).toBe(name);
  });

  it("shows a dash, never a 0, for a value that cannot be read", async () => {
    const gauge = await mount<VThermGauge>("vtherm-gauge", { hass: hassIn("de"), value: undefined, min: 7, max: 35, markerLabel: "Temperatur", unit: "°C", text: await textIn("de") });
    expect(root(gauge).querySelector(".value")?.textContent).toBe("—");
    expect(root(gauge).querySelector("[role=meter]")?.getAttribute("aria-label")).toBe("Temperatur: nicht verfügbar");
  });
});

describe("the bars", () => {
  it("draws the parts of a segmented bar in proportion, each with its label and its value in text", async () => {
    const bar = await mount<VThermBar>("vtherm-bar", {
      hass: hassIn("fr"),
      label: "Cycle",
      segments: [
        { label: "actif", value: 186, display: "3 min 6 s" },
        { label: "arrêt", value: 114, display: "1 min 54 s", tone: "inactive" },
      ],
      text: await textIn("fr"),
    });
    const parts = [...root(bar).querySelectorAll<HTMLElement>(".segment")];
    expect(parts.map((part) => part.style.width)).toEqual(["62%", "38%"]);
    expect(parts[0]?.style.backgroundColor).toBe("var(--primary-color)");
    expect([...root(bar).querySelectorAll("li")].map((item) => item.textContent?.replace(/\s+/g, " ").trim())).toEqual(["actif 3 min 6 s", "arrêt 1 min 54 s"]);
    expect(root(bar).querySelector("[role=group]")?.getAttribute("aria-label")).toBe("Cycle");
  });

  it("shows a simple bar with its value, or a dash when the value cannot be read", async () => {
    const text = await textIn("en");
    const bar = await mount<VThermBar>("vtherm-bar", { hass: hassIn("en"), label: "Heating share", value: 42.5, max: 100, unit: "%", text });
    expect(root(bar).querySelector<HTMLElement>(".fill")?.style.width).toBe("42.5%");
    expect(root(bar).querySelector("[role=meter]")?.getAttribute("aria-label")).toBe("Heating share 42.5 %");
    const missing = await mount<VThermBar>("vtherm-bar", { hass: hassIn("en"), label: "Heating share", value: undefined, unit: "%", text });
    expect(root(missing).querySelector(".value")?.textContent).toBe("—");
    expect(root(missing).querySelector("[role=meter]")?.getAttribute("aria-label")).toBe("Heating share: unavailable");
  });
});

describe("the card of a widget", () => {
  it("shows the title that the catalog of the plugin gives in the language of the user", async () => {
    const translations = defineTranslations({ "widget.window.title": "Window" }, { fr: { "widget.window.title": "Fenêtre" } });
    await translations.setLanguage("fr");
    const card = await mount<VThermWidgetCard>("vtherm-widget-card", { heading: translations.t("widget.window.title"), text: await textIn("fr") });
    expect(root(card).querySelector("h3")?.textContent).toBe("Fenêtre");
  });

  it("shows the title and an indicator of progress while it waits, without any value", async () => {
    const card = await mount<VThermWidgetCard>("vtherm-widget-card", { heading: "History", status: "loading", text: await textIn("fr") });
    card.innerHTML = "<span class='value'>19.5</span>";
    await card.updateComplete;
    expect(root(card).querySelector("h3")?.textContent).toBe("History");
    expect(root(card).querySelector("[role=status]")?.textContent).toContain("Chargement…");
    expect(root(card).querySelector("slot")).toBeNull();
    expect(root(card).querySelector("section")?.getAttribute("aria-busy")).toBe("true");
  });

  it("says why it is empty, and that its source is unavailable", async () => {
    const text = await textIn("de");
    const empty = await mount<VThermWidgetCard>("vtherm-widget-card", { heading: "Verlauf", status: "empty", text });
    expect(root(empty).querySelector(".state")?.textContent).toBe("Keine Daten");
    const unavailable = await mount<VThermWidgetCard>("vtherm-widget-card", { heading: "Verlauf", status: "unavailable", text });
    expect(root(unavailable).querySelector(".state")?.textContent?.replace(/\s+/g, " ").trim()).toBe("— nicht verfügbar");
    const ready = await mount<VThermWidgetCard>("vtherm-widget-card", { heading: "Verlauf", text });
    expect(root(ready).querySelector("slot")).not.toBeNull();
  });
});

describe("the icon of a state", () => {
  it("gives a state with an icon and a text, and announces an alert", async () => {
    const icon = await mount<VThermStateIcon>("vtherm-state-icon", { icon: "mdi:window-open", label: "Window open", tone: "warning" });
    const state = root(icon).querySelector(".state") as HTMLElement;
    expect(state.getAttribute("role")).toBe("alert");
    expect(state.textContent?.trim()).toBe("Window open");
    expect(root(icon).querySelector("ha-icon")).not.toBeNull();
    const normal = await mount<VThermStateIcon>("vtherm-state-icon", { icon: "mdi:window-closed", label: "Window closed" });
    expect(root(normal).querySelector(".state")?.getAttribute("role")).toBe("status");
  });

  it("can be reached with the keyboard, and shows its tooltip on the focus", async () => {
    const icon = await mount<VThermStateIcon>("vtherm-state-icon", { icon: "mdi:shield", label: "Safety", tooltip: "No measure for 70 minutes" });
    const state = root(icon).querySelector(".state") as HTMLElement;
    expect(state.getAttribute("tabindex")).toBe("0");
    expect(state.getAttribute("aria-describedby")).toBe("tooltip");
    expect(root(icon).querySelector("#tooltip")?.textContent).toBe("No measure for 70 minutes");
    const css = (icon.constructor as unknown as { styles: { cssText: string } }).styles.cssText;
    expect(css).toMatch(/\.state:focus \+ \.tooltip\s*\{[^}]*display: block/);
  });
});

describe("the formats of the values", () => {
  const climate = (attributes: Record<string, unknown>, state = "heat"): HassState => ({ entity_id: "climate.salon", state, attributes });

  it("uses the formatter of Home Assistant when it exists, without formatting again", () => {
    const formatEntityAttributeValue = vi.fn(() => "19,5 °C");
    const hass = { ...hassIn("fr"), states: { "climate.salon": climate({ current_temperature: 19.5 }) }, formatEntityAttributeValue };
    expect(formatAttributeValue(hass, "climate.salon", "current_temperature", { temperature: true })).toEqual({ text: "19,5 °C", available: true });
    expect(formatEntityAttributeValue).toHaveBeenCalledWith(hass.states["climate.salon"], "current_temperature");
    const formatEntityState = vi.fn(() => "42 %");
    expect(formatEntityValue({ ...hass, states: { "sensor.power": { state: "42", attributes: {} } }, formatEntityState }, "sensor.power").text).toBe("42 %");
  });

  it("formats with the language of the user and the unit of Home Assistant without a formatter, as in the test harness", () => {
    const states = { "climate.salon": climate({ current_temperature: 19.5 }) };
    expect(formatAttributeValue({ ...hassIn("en"), states }, "climate.salon", "current_temperature", { temperature: true }).text).toBe("19.5 °C");
    expect(formatAttributeValue({ ...hassIn("fr"), states }, "climate.salon", "current_temperature", { temperature: true }).text).toBe("19,5 °C");
    expect(formatAttributeValue({ ...hassIn("de"), states }, "climate.salon", "current_temperature", { temperature: true }).text).toBe("19,5 °C");
    const hass = createFakeHass({ language: "fr" });
    hass.setState("sensor.power", "42.5", { unit_of_measurement: "%" });
    expect(formatEntityValue(hass, "sensor.power").text).toBe("42,5 %");
  });

  it("writes the unit °F of Home Assistant, without converting the value", () => {
    const states = { "climate.salon": climate({ current_temperature: 67.1 }) };
    expect(formatAttributeValue({ ...hassIn("en", "°F"), states }, "climate.salon", "current_temperature", { temperature: true }).text).toBe("67.1 °F");
  });

  it("gives a dash for a sensor that is unavailable or unknown, and for an attribute that is missing", () => {
    const hass = { ...hassIn("fr"), states: { "sensor.power": { state: "unavailable", attributes: {} }, "sensor.unknown": { state: "unknown", attributes: {} }, "climate.salon": climate({}) } };
    expect(formatEntityValue(hass, "sensor.power")).toEqual({ text: "—", available: false });
    expect(formatEntityValue(hass, "sensor.unknown")).toEqual({ text: "—", available: false });
    expect(formatEntityValue(hass, undefined)).toEqual({ text: "—", available: false });
    expect(formatAttributeValue(hass, "climate.salon", "current_temperature")).toEqual({ text: "—", available: false });
    expect(formatAttributeValue({ ...hass, states: { "climate.salon": climate({ current_temperature: 0 }) } }, "climate.salon", "current_temperature").text).toBe("0");
  });

  it("writes an age in the language of the user, with the full date for the tooltip", () => {
    const now = Date.UTC(2026, 10, 19, 12, 0, 0);
    const date = new Date(now - 3 * 60_000).toISOString();
    expect(formatAge(hassIn("en"), date, now)?.text).toBe("3 minutes ago");
    expect(formatAge(hassIn("fr"), date, now)?.text).toBe("il y a 3 minutes");
    expect(formatAge(hassIn("de"), date, now)?.text).toBe("vor 3 Minuten");
    expect(formatAge(hassIn("en"), now - 2 * 3_600_000, now)?.text).toBe("2 hours ago");
    expect(formatAge(hassIn("en"), date, now)?.title).toContain("2026");
    expect(formatAge(hassIn("en"), "not a date", now)).toBeUndefined();
  });
});

describe("the row of a value and the age", () => {
  it("shows a dash for a value that cannot be read, said unavailable, and keeps the other rows", async () => {
    const text = await textIn("fr");
    const missing = await mount<VThermValueRow>("vtherm-value-row", { label: "Température", value: { text: "—", available: false }, text });
    expect(root(missing).querySelector(".value")?.textContent).toBe("—");
    expect(root(missing).querySelector("[role=group]")?.getAttribute("aria-label")).toBe("Température : indisponible");
    const known = await mount<VThermValueRow>("vtherm-value-row", { label: "Consigne", value: { text: "21 °C", available: true }, text });
    expect(root(known).querySelector(".value")?.textContent).toBe("21 °C");
  });

  it("shows an age with the full date in its tooltip, reachable with the keyboard", async () => {
    const now = Date.UTC(2026, 10, 19, 12, 0, 0);
    const age = await mount<HTMLElement>("vtherm-age", { hass: hassIn("fr"), date: now - 3 * 60_000, now: () => now });
    const time = root(age).querySelector("time") as HTMLElement;
    expect(time.textContent).toBe("il y a 3 minutes");
    expect(time.getAttribute("title")).toContain("2026");
    expect(time.getAttribute("tabindex")).toBe("0");
  });
});

/** A widget that reads one entity, counts its drawings, and reads its history once visible. */
class CountingWidget extends VThermOverviewWidget {
  renders = 0;
  protected readEntities(): readonly string[] {
    return ["sensor.mine"];
  }
  protected override updated(): void {
    if (this.visible && this.hass !== undefined) {
      void sharedHistory(this.hass).read("sensor.mine", "day").catch(() => undefined);
    }
  }
  protected override render(): TemplateResult {
    this.renders += 1;
    return html`${this.hass?.states["sensor.mine"]?.state}`;
  }
}
customElements.define("counting-widget", CountingWidget);

describe("the cost of a widget", () => {
  // Home Assistant keeps the same objects for the language and the units while they do not change.
  const base = hassIn("en");
  const withStates = (states: Hass["states"]): Hass => ({ ...base, states });

  it("tells which new states change what a widget reads", () => {
    const mine = { state: "1", attributes: {} };
    const other = { state: "a", attributes: {} };
    const before = withStates({ "sensor.mine": mine, "sensor.other": other });
    expect(readEntitiesChanged(before, { ...before, states: { "sensor.mine": mine, "sensor.other": { state: "b", attributes: {} } } }, ["sensor.mine"])).toBe(false);
    expect(readEntitiesChanged(before, { ...before, states: { "sensor.mine": { state: "2", attributes: {} }, "sensor.other": other } }, ["sensor.mine"])).toBe(true);
    expect(readEntitiesChanged(before, { ...before, locale: { language: "fr" } }, ["sensor.mine"])).toBe(true);
  });

  it("does not draw a widget again when an entity that it does not read changes", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const mine = { state: "1", attributes: {} };
    const widget = await mount<CountingWidget>("counting-widget", { hass: withStates({ "sensor.mine": mine, "sensor.other": { state: "a", attributes: {} } }) });
    const drawn = widget.renders;
    widget.hass = withStates({ "sensor.mine": mine, "sensor.other": { state: "b", attributes: {} } });
    await widget.updateComplete;
    expect(widget.renders).toBe(drawn);
    widget.hass = withStates({ "sensor.mine": { state: "2", attributes: {} }, "sensor.other": { state: "b", attributes: {} } });
    await widget.updateComplete;
    expect(widget.renders).toBe(drawn + 1);
    expect(root(widget).textContent).toContain("2");
  });

  it("reads no history while its card is under the visible part of the page", async () => {
    let enter: (() => void) | undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (records: { isIntersecting: boolean }[]) => void) {
          enter = () => callback([{ isIntersecting: true }]);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    const callWS = vi.fn(async () => ({ "sensor.mine": [] }));
    const widget = await mount<CountingWidget>("counting-widget", { hass: { ...withStates({}), callWS } });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(widget.visible).toBe(false);
    expect(callWS).not.toHaveBeenCalled();
    enter?.();
    await widget.updateComplete;
    expect(widget.visible).toBe(true);
    expect(callWS).toHaveBeenCalledTimes(1);
  });
});
