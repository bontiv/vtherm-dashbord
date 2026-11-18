/**
 * The status that a configuration section declares for the menu, read the same way by the dashboard and by the fake host.
 */

import type { PlacedEntry } from "./placement.js";
import type { HookName, SectionStatus, VisibilityContext } from "./types.js";

/**
 * Tell whether a value is a status that a section can declare.
 *
 * @param value - The value that the status function returned.
 */
export function isSectionStatus(value: unknown): value is SectionStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "complete" || kind === "off") {
    return true;
  }
  if (kind === "inherited") {
    const off = (value as { off?: unknown }).off;
    return off === undefined || typeof off === "boolean";
  }
  const missing = (value as { missing?: unknown }).missing;
  return kind === "incomplete" && typeof missing === "number" && Number.isInteger(missing) && missing >= 0;
}

/**
 * Call the status function of a configuration section. A section without a function, a function that returns `undefined`, a function
 * that raises and a value that is not a status all give no status; the last two are reported to `onError`.
 *
 * @param entry - The contribution, as the placement engine resolved it.
 * @param context - The context of its hook, the one its visibility condition receives.
 * @param onError - Told when the function raises or returns a value that is not a status.
 */
export function sectionStatusOf(entry: PlacedEntry, context: VisibilityContext<HookName>, onError: (error: unknown) => void = () => undefined): SectionStatus | undefined {
  const status = (entry.contribution as { status?: unknown }).status;
  if (typeof status !== "function") {
    return undefined;
  }
  let value: unknown;
  try {
    value = (status as (context: VisibilityContext<HookName>) => unknown)(context);
  } catch (error) {
    onError(error);
    return undefined;
  }
  if (value === undefined) {
    return undefined;
  }
  if (!isSectionStatus(value)) {
    onError(new TypeError(`The status of ${entry.id} is not a status: ${JSON.stringify(value)}`));
    return undefined;
  }
  return value;
}
