// @vitest-environment happy-dom
/** The library of the diagrams of the help of the fields: drawn with the values of the draft, in the theme and the language of the user. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { DIAGRAM_IDS } from "@vtherm/dashboard-sdk";
import type { DiagramId } from "@vtherm/dashboard-sdk";
import { assertCompleteTranslations } from "@vtherm/dashboard-sdk/testing";
import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DIAGRAMS, diagramStyles, diagramValue, renderDiagram } from "../src/components/diagrams/index.ts";
import type { DiagramContext } from "../src/components/diagrams/index.ts";
import { REGULATION_MODES } from "../src/components/diagrams/regulation.ts";
import { de, diagramTexts, en, fr } from "../src/components/diagrams/texts.ts";

// The URL of the module is not a file URL under happy-dom: the paths start from the root of the repository, where Vitest runs.
const DIAGRAMS_DIR = `${resolve(process.cwd(), "frontend/src/components/diagrams")}/`;
const VT_DIR = `${resolve(process.cwd(), "external/versatile_thermostat/custom_components/versatile_thermostat")}/`;

/** A formatter of numbers in a language, as the panel gives one. */
const formatIn =
  (language: string) =>
  (value: number, options?: Intl.NumberFormatOptions): string =>
    new Intl.NumberFormat(language, options).format(value);

const english = formatIn("en");

/** Typical values of every key that the diagrams read, as a draft holds them (some as text, the lists per valve as text). */
const TYPICAL: Readonly<Record<string, unknown>> = {
  cycle_min: 10,
  tpi_coef_int: 0.5,
  tpi_coef_ext: 0.02,
  minimal_activation_delay: 20,
  minimal_deactivation_delay: 10,
  tpi_threshold_low: -0.3,
  tpi_threshold_high: 0.4,
  min_opening_degrees: "15,20",
  max_opening_degrees: "90, 95",
  opening_threshold_degree: 5,
  max_closing_degree: 95,
  auto_regulation_dtemp: "0.3",
  auto_regulation_periode_min: 3,
  auto_regulation_mode: "auto_regulation_strong",
  window_delay: 60,
  window_off_delay: "",
  window_auto_open_threshold: 5,
  window_auto_close_threshold: 1,
  window_auto_max_duration: 45,
  motion_delay: 20,
  motion_off_delay: 120,
  safety_delay_min: 30,
  safety_min_on_percent: 0.3,
  safety_default_on_percent: 0.2,
  manual_override_duration_min: 0,
  heating_failure_threshold: 0.8,
  cooling_failure_threshold: 0.1,
  heating_failure_detection_delay: 20,
  temperature_change_tolerance: 0.4,
  underlying_entity_ids: ["switch.a", "switch.b", "switch.c", "switch.d", "switch.e"],
};

function context(values: Readonly<Record<string, unknown>>, focus?: string, format = english): DiagramContext {
  return focus === undefined ? { values, format } : { values, focus, format };
}

/** Render the figure of a diagram in the document. */
function mount(id: string, values: Readonly<Record<string, unknown>> = {}, focus?: string, format = english): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const template = renderDiagram(id, context(values, focus, format));
  if (template === undefined) {
    throw new Error(`No diagram ${id}`);
  }
  render(template, host);
  return host;
}

function svgOf(host: HTMLElement): SVGSVGElement {
  const svg = host.querySelector("svg");
  if (svg === null) {
    throw new Error("No svg");
  }
  return svg;
}

function texts(host: HTMLElement): string[] {
  return [...svgOf(host).querySelectorAll("text")].map((node) => node.textContent?.trim() ?? "");
}

function keyed(host: HTMLElement, key: string): Element[] {
  return [...svgOf(host).querySelectorAll(`[data-key="${key}"]`)];
}

function attribute(element: Element | undefined, name: string): number {
  return Number(element?.getAttribute(name));
}

/** A pattern per message of a catalog, where each parameter matches any text. */
function messagePatterns(catalog: Readonly<Record<string, string>>): RegExp[] {
  return Object.values(catalog).map((message) => new RegExp(`^${message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{\w+\\\}/g, ".+")}$`, "s"));
}

afterEach(async () => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  await diagramTexts.setLanguage("en");
});

describe("the library of diagrams", () => {
  it("has the fourteen diagrams of the SDK, each citing a file of Versatile Thermostat that exists", () => {
    expect(Object.keys(DIAGRAMS).sort()).toEqual([...DIAGRAM_IDS].sort());
    for (const id of DIAGRAM_IDS) {
      const diagram = DIAGRAMS[id];
      const files = diagram.source.split(",").map((file) => file.trim());
      expect(files.length, id).toBeGreaterThan(0);
      for (const file of files) {
        expect(existsSync(`${VT_DIR}${file}`), `${id}: ${file}`).toBe(true);
      }
    }
  });

  it("declares, for each numeric key it reads, an example within bounds", () => {
    for (const id of DIAGRAM_IDS) {
      const diagram = DIAGRAMS[id];
      for (const [key, example] of Object.entries(diagram.examples)) {
        expect(diagram.keys, `${id}: ${key}`).toContain(key);
        const bounds = diagram.bounds[key];
        expect(bounds, `${id}: ${key}`).toBeDefined();
        expect(example).toBeGreaterThanOrEqual(bounds?.[0] ?? Number.NaN);
        expect(example).toBeLessThanOrEqual(bounds?.[1] ?? Number.NaN);
      }
    }
  });

  it.each(DIAGRAM_IDS)("draws %s for empty and typical values in a figure with a title, an image and its caption", (id: DiagramId) => {
    for (const values of [{}, TYPICAL]) {
      document.body.replaceChildren();
      const host = mount(id, values);
      const diagram = DIAGRAMS[id];
      const figure = host.querySelector("figure.diagram");
      expect(figure).not.toBeNull();
      expect(host.querySelector(".diagram-title")?.textContent).toContain(diagram.title());
      const image = host.querySelector('[role="img"]');
      expect(image?.getAttribute("aria-label")).toBe(diagram.caption(context(values)));
      expect(image?.getAttribute("aria-label")).not.toBe("");
      const svg = svgOf(host);
      expect(svg.getAttribute("viewBox")).toBe("0 0 240 96");
      expect(svg.getAttribute("width")).toBe("100%");
      expect(svg.closest('[role="img"]')).toBe(image);
      expect(svg.querySelectorAll("*").length).toBeGreaterThan(3);
    }
  });

  it("is styled to the width of its container", () => {
    expect(diagramStyles.cssText).toMatch(/\.diagram svg\s*\{[^}]*width: 100%/);
    expect(diagramStyles.cssText).toMatch(/\.diagram-image\s*\{[^}]*width: 100%/);
  });
});

describe("the colors and the texts of the diagrams", () => {
  it("never write a literal color in the sources", () => {
    const files = readdirSync(DIAGRAMS_DIR).filter((file) => file.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(3);
    for (const file of files) {
      const source = readFileSync(`${DIAGRAMS_DIR}${file}`, "utf8");
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1,5})?\b/);
      expect(source, file).not.toMatch(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/);
      for (const match of source.matchAll(/\b(?:fill|stroke|color)\s*[:=]\s*["'`]?([^;"'`\s>]+)/g)) {
        expect(match[1], `${file}: ${match[0]}`).toMatch(/^(?:var\(--[\w-]+\)|none|\$\{)/);
      }
    }
  });

  it("draw no color attribute and no inline style", () => {
    for (const id of DIAGRAM_IDS) {
      const host = mount(id, TYPICAL, DIAGRAMS[id].keys[0]);
      expect(svgOf(host).querySelectorAll("[fill], [stroke], [style], [color]").length, id).toBe(0);
    }
  });

  it("draw only texts of the catalog", () => {
    const placeholders = Object.entries(en).filter(([, message]) => /^\{\w+\}$/.test(message));
    expect(placeholders).toEqual([]);
    const patterns = messagePatterns(en);
    const variants: Readonly<Record<string, unknown>>[] = [{}, TYPICAL, ...REGULATION_MODES.map((mode) => ({ auto_regulation_mode: mode })), { tpi_threshold_low: 0, tpi_coef_int: 5, window_auto_open_threshold: 50, safety_min_on_percent: 0.9 }];
    for (const id of DIAGRAM_IDS) {
      for (const values of variants) {
        document.body.replaceChildren();
        const host = mount(id, values);
        const walker = document.createTreeWalker(svgOf(host), NodeFilter.SHOW_TEXT);
        let count = 0;
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          const text = node.textContent?.trim() ?? "";
          if (text === "") {
            continue;
          }
          count += 1;
          expect(node.parentElement?.tagName.toLowerCase(), `${id}: ${text}`).toBe("text");
          expect(
            patterns.some((pattern) => pattern.test(text)),
            `${id}: "${text}" is not a text of the catalog`,
          ).toBe(true);
        }
        expect(count, id).toBeGreaterThan(0);
      }
    }
  });

  it("have complete English, French and German catalogs, with a title and a caption per diagram", async () => {
    await assertCompleteTranslations(diagramTexts, ["fr", "de"]);
    for (const id of DIAGRAM_IDS) {
      for (const catalog of [en, fr, de] as Readonly<Record<string, string>>[]) {
        expect(catalog[`diagram.${id}.title`], id).toBeTruthy();
        expect(catalog[`diagram.${id}.caption`], id).toBeTruthy();
      }
    }
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });

  it("use the same parameters in every language", () => {
    const params = (message: string): string[] => [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
    for (const [key, message] of Object.entries(en)) {
      expect(params(fr[key as keyof typeof fr]), `fr ${key}`).toEqual(params(message));
      expect(params(de[key as keyof typeof de]), `de ${key}`).toEqual(params(message));
    }
  });
});

describe("the values drawn", () => {
  it("Ouverture minimale modifiée: the step of the minimal opening goes to 30% and its label shows 30%", () => {
    const values = { min_opening_degrees: "10", max_opening_degrees: "100", opening_threshold_degree: 5, max_closing_degree: 100 };
    const before = mount("valve_curve", values, "min_opening_degrees");
    const step = (host: HTMLElement): Element | undefined => keyed(host, "min_opening_degrees").find((element) => element.tagName.toLowerCase() === "circle");
    const y10 = attribute(step(before), "cy");
    expect(texts(before)).toContain("Min 10%");
    document.body.replaceChildren();
    const after = mount("valve_curve", { ...values, min_opening_degrees: "30" }, "min_opening_degrees");
    const y30 = attribute(step(after), "cy");
    // The y axis goes from 0% at 80 to 100% at 14.
    expect(y10).toBeCloseTo(80 - 0.66 * 10, 1);
    expect(y30).toBeCloseTo(80 - 0.66 * 30, 1);
    expect(texts(after)).toContain("Min 30%");
    expect(texts(after)).not.toContain("Min 10%");
  });

  it("Plusieurs réglages dans un schéma: the limit closed below moves with the opening threshold", () => {
    const values = { min_opening_degrees: 10, max_opening_degrees: 100, opening_threshold_degree: 5, max_closing_degree: 100 };
    const limit = (host: HTMLElement): Element | undefined => keyed(host, "opening_threshold_degree").find((element) => element.tagName.toLowerCase() === "line");
    const before = attribute(limit(mount("valve_curve", values, "min_opening_degrees")), "x1");
    document.body.replaceChildren();
    const host = mount("valve_curve", { ...values, opening_threshold_degree: 40 }, "min_opening_degrees");
    const after = attribute(limit(host), "x1");
    expect(before).toBeCloseTo(28 + 2 * 5, 1);
    expect(after).toBeCloseTo(28 + 2 * 40, 1);
    expect(texts(host)).toContain("Threshold 40%");
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("Below an asked opening of 40%");
  });

  it("Valeur vide ou invalide: an empty, invalid or out of bounds value falls back on the example, marked as such", () => {
    const values = { min_opening_degrees: "", max_opening_degrees: "abc", opening_threshold_degree: 150, max_closing_degree: null };
    const diagram = DIAGRAMS.valve_curve;
    for (const key of diagram.keys) {
      expect(diagramValue(diagram, values, key)).toEqual({ value: diagram.examples[key], example: true });
    }
    const host = mount("valve_curve", values);
    expect(host.querySelector(".diagram-example")?.textContent).toBe("example");
    const caption = host.querySelector('[role="img"]')?.getAttribute("aria-label") ?? "";
    expect(caption).toContain("10% (example)");
    expect(keyed(host, "min_opening_degrees").some((element) => element.classList.contains("d-example"))).toBe(true);
    document.body.replaceChildren();
    expect(() => mount("tpi_cycle", { cycle_min: -3 })).not.toThrow();
    expect(document.querySelector(".diagram-example")?.textContent).toBe("example");
  });

  it("marks no example when every value of the draft is usable", () => {
    const host = mount("valve_curve", { min_opening_degrees: 10, max_opening_degrees: 90, opening_threshold_degree: 5, max_closing_degree: 100 });
    expect(host.querySelector(".diagram-example")).toBeNull();
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).not.toContain("example");
  });

  it("reads numbers stored as text and the first value of a list per valve, and says there are several valves", () => {
    const values = { min_opening_degrees: "15, 25", max_opening_degrees: "90,95", opening_threshold_degree: "5", max_closing_degree: "100" };
    expect(diagramValue(DIAGRAMS.valve_curve, values, "min_opening_degrees")).toEqual({ value: 15, example: false });
    expect(diagramValue(DIAGRAMS.valve_curve, values, "opening_threshold_degree")).toEqual({ value: 5, example: false });
    const host = mount("valve_curve", values);
    expect(texts(host)).toContain("Min 15%");
    expect(texts(host)).toContain("Max 90%");
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("The first of 2 valves is shown.");
  });

  it("Focus sur la durée maximale: the maximal duration is highlighted, the thresholds recede but stay visible", () => {
    const host = mount("window_slope", { window_auto_open_threshold: 3, window_auto_close_threshold: 0, window_auto_max_duration: 60 }, "window_auto_max_duration");
    const max = keyed(host, "window_auto_max_duration");
    expect(max.length).toBeGreaterThan(0);
    expect(max.every((element) => element.classList.contains("focus"))).toBe(true);
    for (const key of ["window_auto_open_threshold", "window_auto_close_threshold"]) {
      const elements = keyed(host, key);
      expect(elements.length, key).toBeGreaterThan(0);
      expect(elements.every((element) => element.classList.contains("recede") && !element.classList.contains("focus")), key).toBe(true);
    }
    expect(diagramStyles.cssText).toMatch(/\.focus\s*\{[^}]*var\(--primary-color\)/);
    expect(diagramStyles.cssText).toMatch(/\.recede\s*\{[^}]*opacity/);
  });

  it("highlights nothing when the focus is on a setting that the diagram does not show", () => {
    const host = mount("window_slope", {}, "cycle_min");
    expect(svgOf(host).querySelectorAll(".focus, .recede").length).toBe(0);
  });

  it("Libellés en allemand: the formula of TPI is in German with a decimal comma", async () => {
    await diagramTexts.setLanguage("de");
    const host = mount("tpi_formula", { tpi_coef_int: 0.6, tpi_coef_ext: 0.01 }, undefined, formatIn("de"));
    expect(host.querySelector(".diagram-title")?.textContent?.trim()).toBe("TPI-Formel");
    expect(texts(host)).toContain("0,6 × 1° + 0,01 × 15° = 75 %");
    expect(texts(host)).toContain("Raum 60 %");
    expect(texts(host)).toContain("Außen 15 %");
    const caption = host.querySelector('[role="img"]')?.getAttribute("aria-label") ?? "";
    expect(caption).toContain("0,6 × 1° + 0,01 × 15° = 75 %");
    expect(caption).toMatch(/^Bei einem Raum/);
  });

  it("Schéma inconnu: an unknown identifier gives no diagram and one warning naming it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(renderDiagram("nope", context({}))).toBeUndefined();
    expect(renderDiagram("nope", context({}))).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("nope");
  });
});

describe("what each diagram shows", () => {
  it("TPI: the share of the cycle is capped at 100%", () => {
    const host = mount("tpi_formula", { tpi_coef_int: 0.8, tpi_coef_ext: 0.05 });
    expect(texts(host)).toContain("0.8 × 1° + 0.05 × 15° = 100%");
    expect(texts(host)).toContain("Max 100%");
  });

  it("TPI thresholds: a threshold at 0 turns them off", () => {
    const host = mount("tpi_thresholds", { tpi_threshold_low: 0, tpi_threshold_high: 0.5 });
    expect(texts(host)).toContain("Thresholds off");
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("the thresholds are off");
  });

  it("send threshold: a larger threshold sends fewer setpoints", () => {
    const steps = (dtemp: number): number => (svgOf(mount("send_threshold", { auto_regulation_dtemp: dtemp, auto_regulation_periode_min: 1 })).querySelector("path.d-main")?.getAttribute("d")?.match(/L/g) ?? []).length;
    expect(steps(0.2)).toBeGreaterThan(steps(1));
  });

  it("correction: draws each mode of VT, and an unknown mode as the example", () => {
    const captions = new Set<string>();
    for (const mode of REGULATION_MODES) {
      document.body.replaceChildren();
      const host = mount("correction", { auto_regulation_mode: mode });
      expect(host.querySelector(".diagram-example"), mode).toBeNull();
      captions.add(host.querySelector('[role="img"]')?.getAttribute("aria-label") ?? "");
    }
    expect(captions.size).toBe(REGULATION_MODES.length);
    document.body.replaceChildren();
    const host = mount("correction", { auto_regulation_mode: "auto_regulation_unknown" });
    expect(host.querySelector(".diagram-example")?.textContent).toBe("example");
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("Medium (example)");
  });

  it("window delays: an empty off delay uses the delay of the opening, as VT does", () => {
    const host = mount("window_delay", { window_delay: 45, window_off_delay: "" });
    expect(host.querySelector(".diagram-example")).toBeNull();
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("closed for 45 s");
  });

  it("window delays: a window open for less than the delay is ignored", () => {
    expect(texts(mount("window_delay", { window_delay: 600, window_off_delay: 30 }))).toContain("Ignored");
  });

  it("safety: no safety when the power is below the minimal share", () => {
    expect(texts(mount("safety", { safety_delay_min: 60, safety_min_on_percent: 0.9, safety_default_on_percent: 0.1 }))).toContain("No safety");
    expect(texts(mount("safety", { safety_delay_min: 60, safety_min_on_percent: 0.5, safety_default_on_percent: 0.1 }))).toContain("Safety 10%");
  });

  it("override: a duration of 0 never goes back to the preset", () => {
    const host = mount("override", { manual_override_duration_min: 0 });
    expect(texts(host)).toContain("No return");
    expect(host.querySelector(".diagram-example")).toBeNull();
  });

  it("stagger: one row per switch, at most four, and the others counted", () => {
    const host = mount("stagger", { cycle_min: 10, underlying_entity_ids: ["a", "b", "c", "d", "e", "f"] });
    expect(texts(host).filter((text) => text.startsWith("#"))).toEqual(["#1", "#2", "#3", "#4"]);
    expect(texts(host)).toContain("+2");
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("With 6 switches");
  });
});
