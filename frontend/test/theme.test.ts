import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SOURCES, files, styles, usedVariables } from "./support/css-variables.ts";

describe("the theme", () => {
  it("uses no color of its own: only the variables of the theme of Home Assistant", () => {
    const offenders: string[] = [];
    for (const file of files(SOURCES)) {
      const css = styles(readFileSync(file, "utf8"));
      const colors = css.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(|:\s*(?:white|black|red|green|blue|gray|grey|orange|yellow|purple)\b/g);
      if (colors !== null) {
        offenders.push(`${file}: ${colors.join(", ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gives no color as the fallback of a variable", () => {
    for (const file of files(SOURCES)) {
      expect(styles(readFileSync(file, "utf8")), file).not.toMatch(/var\(--[a-z0-9_-]+,\s*(?:#|rgba?\(|hsla?\()/);
    }
  });

  it("uses a set of variables that Home Assistant defines", () => {
    const known = new Set([
      "--primary-color",
      "--primary-text-color",
      "--secondary-text-color",
      "--primary-background-color",
      "--secondary-background-color",
      "--card-background-color",
      "--divider-color",
      "--app-header-background-color",
      "--app-header-text-color",
      "--text-primary-color",
      "--error-color",
      "--warning-color",
      "--success-color",
      "--ha-card-border-radius",
      "--ha-card-box-shadow",
      "--paper-font-body1_-_font-family",
    ]);
    expect(usedVariables().filter((name) => !known.has(name))).toEqual([]);
  });
});
