// @vitest-environment happy-dom
/** The status of the configuration sections in the left menu. */
import type { PlacedEntry } from "@vtherm/dashboard-sdk";
import { defineHaControlMocks } from "@vtherm/dashboard-sdk/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { VThermSideMenu, statusView } from "../src/components/side-menu.ts";
import type { MenuStatus, NavItem, NavSection } from "../src/navigation.ts";

afterEach(() => document.body.replaceChildren());

const item = (title: string, status: MenuStatus | undefined, active = false): NavItem => ({
  id: title,
  title,
  icon: undefined,
  active,
  path: `/vtherm/x/${title}`,
  entry: {} as PlacedEntry,
  status,
});

const SECTIONS: NavSection[] = [
  {
    heading: undefined,
    items: [
      item("Main", { kind: "incomplete", missing: 1 }, true),
      item("TPI", { kind: "complete" }),
      item("Window", { kind: "off" }),
      item("Advanced", { kind: "inherited" }),
      item("Lock", { kind: "refused" }),
      item("Overview", undefined),
    ],
  },
];

async function mount(): Promise<ShadowRoot> {
  const menu = document.createElement("vtherm-side-menu") as VThermSideMenu;
  menu.sections = SECTIONS;
  document.body.append(menu);
  await menu.updateComplete;
  return menu.shadowRoot as ShadowRoot;
}

describe("the statuses", () => {
  it("each have an icon or a text, a tone and what a screen reader says", () => {
    expect(statusView({ kind: "complete" })).toEqual({ text: undefined, tone: "success", spoken: "complete" });
    expect(statusView({ kind: "off" })).toEqual({ text: "Off", tone: "secondary", spoken: "off" });
    expect(statusView({ kind: "inherited" })).toEqual({ text: "Central", tone: "secondary", spoken: "uses the central configuration" });
    expect(statusView({ kind: "incomplete", missing: 2 })).toEqual({ text: "2 missing", tone: "warning", spoken: "2 missing values" });
    expect(statusView({ kind: "refused" })).toEqual({ text: "Error", tone: "error", spoken: "refused" });
  });
});

describe("the menu without the components of Home Assistant", () => {
  it("shows the status at the right of each title, and says it with the title", async () => {
    const root = await mount();
    const links = [...root.querySelectorAll("a")];
    expect(links.map((link) => link.querySelector(".status")?.textContent?.trim() ?? null)).toEqual(["1 missing", "", "Off", "Central", "Error", null]);
    expect(links[1]?.querySelector(".status.success ha-icon")).not.toBeNull();
    expect(links[2]?.querySelector(".title")?.textContent?.replace(/\s+/g, " ").trim()).toBe("Window, off");
    expect(links[5]?.textContent?.trim()).toBe("Overview");
  });

  it("puts a section whose feature is off in retreat", async () => {
    const root = await mount();
    expect([...root.querySelectorAll("a.off")].map((link) => link.getAttribute("href"))).toEqual(["/vtherm/x/Window"]);
  });
});

describe("the menu with the components of Home Assistant", () => {
  beforeAll(() => defineHaControlMocks());

  it("puts the status in the slot end of the list item, and the spoken status in its headline", async () => {
    const root = await mount();
    const items = [...root.querySelectorAll("ha-md-list-item")];
    expect(items.map((entry) => entry.querySelector('[slot="end"]')?.textContent?.trim() ?? null)).toEqual(["1 missing", "", "Off", "Central", "Error", null]);
    expect(items[0]?.querySelector('[slot="headline"]')?.textContent?.replace(/\s+/g, " ").trim()).toBe("Main, 1 missing value");
    expect(items[2]?.classList.contains("off")).toBe(true);
    expect(items[0]?.classList.contains("active")).toBe(true);
  });
});
