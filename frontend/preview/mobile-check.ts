/**
 * Check the native pages of the dashboard on a phone: no element wider than the screen, and no control with a touch target under
 * 44 px.
 *
 * The tests of the frontend run without layout (happy-dom), so the sizes are checked in a real browser. With the development server
 * running (`npm run dev`) and Home Assistant started with `--dev-frontend`, open the dashboard at the width of a phone (360 or 375 px,
 * with the device mode of the browser), then run in the console of the page:
 *
 *     await (await import("http://localhost:5198/preview/mobile-check.ts")).checkMobile()
 *
 * It opens each page in turn and returns, for each one, the elements that overflow and the touch targets that are too small. An
 * empty list means that the page is fine. Pass other paths to check other pages, for example the configuration of a thermostat.
 */

import { TOUCH_TARGET } from "../src/components/narrow-styles.ts";
import { PANEL_PATH } from "../src/router.ts";

/** The native pages, under the path of the panel. */
export const NATIVE_PAGES: readonly string[] = [
  "core.top.dashboard",
  "core.top.thermostats",
  "core.top.thermostats/new",
  "core.top.configuration",
  "core.top.configuration/core.page.plugins",
  "core.top.configuration/core.page.dev_plugins",
  "core_complements.top.complements",
  "core_complements.top.complements/core_complements.page.installed",
];

/** What the check found on one page. */
export interface PageReport {
  readonly path: string;
  /** The elements whose right edge is beyond the width of the panel, outside the tabs of the top bar, which scroll. */
  readonly overflow: readonly string[];
  /** The controls whose touch target is lower than 44 px. */
  readonly smallTargets: readonly string[];
}

/** The controls that must be large enough to be touched. A link inside a paragraph is part of the text, not a control. */
const CONTROLS = 'button, select, textarea, input:not([type="hidden"]), [role="tab"], a:not(p a)';

function allElements(root: ParentNode, out: Element[] = []): Element[] {
  for (const element of root.querySelectorAll("*")) {
    out.push(element);
    if (element.shadowRoot !== null) {
      allElements(element.shadowRoot, out);
    }
  }
  return out;
}

function findPanel(root: ParentNode = document): HTMLElement | undefined {
  return allElements(root).find((element): element is HTMLElement => element.localName === "vtherm-dashboard-panel");
}

function describe(element: Element): string {
  const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  const label = element.getAttribute("aria-label") ?? "";
  return `<${element.localName}${element.className !== "" && typeof element.className === "string" ? `.${element.className.split(/\s+/).join(".")}` : ""}> ${label || text}`;
}

/** Whether an element is inside the scrolling tabs of the top bar, which may go beyond the screen. */
function inScrollingTabs(element: Element): boolean {
  for (let node: Node | null = element; node !== null; node = node instanceof ShadowRoot ? node.host : node.parentNode) {
    if (node instanceof Element && node.matches("nav.start")) {
      return true;
    }
  }
  return false;
}

/** The touch target of a control: a checkbox or a radio button is touched through its label. */
function targetOf(element: Element): Element {
  if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
    return element.closest("label") ?? (element.id !== "" ? ((element.getRootNode() as ParentNode).querySelector(`label[for="${element.id}"]`) ?? element) : element);
  }
  return element;
}

/** Check the page that is shown. */
export function checkPage(path = window.location.pathname): PageReport {
  const panel = findPanel();
  if (panel === undefined) {
    throw new Error("The dashboard is not in this page.");
  }
  const width = panel.getBoundingClientRect().right;
  const elements = allElements(panel.shadowRoot ?? panel).filter((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
  const overflow = elements.filter((element) => element.getBoundingClientRect().right > width + 1 && !inScrollingTabs(element)).map(describe);
  const smallTargets = elements
    .filter((element) => element.matches(CONTROLS))
    .filter((element) => targetOf(element).getBoundingClientRect().height < TOUCH_TARGET - 0.5)
    .map((element) => `${describe(element)} (${Math.round(targetOf(element).getBoundingClientRect().height)} px)`);
  return { path, overflow: [...new Set(overflow)], smallTargets: [...new Set(smallTargets)] };
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Open each page in turn and check it.
 *
 * @param paths - The pages, under the path of the panel. The native pages by default.
 * @param delay - How long to wait for a page to draw, in milliseconds.
 */
export async function checkMobile(paths: readonly string[] = NATIVE_PAGES, delay = 1500): Promise<PageReport[]> {
  const reports: PageReport[] = [];
  for (const path of paths) {
    const full = `${PANEL_PATH}/${path}`;
    window.history.pushState(null, "", full);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    await wait(delay);
    reports.push(checkPage(full));
  }
  return reports;
}
