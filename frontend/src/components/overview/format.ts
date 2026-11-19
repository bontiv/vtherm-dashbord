/**
 * The formats of the values that the widgets show: the formatters of Home Assistant when `hass` has them, otherwise `Intl` with the
 * language of the user. A value that is missing, `unavailable` or `unknown` is "—", never 0. The widgets never convert a unit: the
 * temperatures carry the unit of Home Assistant.
 */

import type { Hass, HassState } from "@vtherm/dashboard-sdk";

/** What a widget shows for a value that it cannot read. */
export const MISSING = "—";

/** Translate a key of the catalog of the plugin of a widget. */
export type WidgetText = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** A value ready to show: its text, and whether it is a real value. */
export interface FormattedValue {
  /** The text to show: the value with its unit, or "—". */
  readonly text: string;
  /** False for a value that is missing, `unavailable` or `unknown`: show "—" and say that it is unavailable. */
  readonly available: boolean;
}

/** The value of something that cannot be read. */
const UNAVAILABLE: FormattedValue = { text: MISSING, available: false };

/** The language of the formats: the regional settings of the user, else the language of the profile. */
export function localeOf(hass: Pick<Hass, "language" | "locale"> | undefined): string {
  return hass?.locale?.language ?? hass?.language ?? "en";
}

/** Whether a state gives no value: missing, `unavailable` or `unknown`. */
export function isMissingState(state: HassState | undefined): state is undefined {
  return state === undefined || state.state === "unavailable" || state.state === "unknown" || state.state === "";
}

/** The unit of the temperatures of Home Assistant: `°C` or `°F`. */
export function temperatureUnit(hass: Pick<Hass, "config"> | undefined): string {
  return hass?.config?.unit_system?.temperature ?? "°C";
}

/** A number in the language of the user, with at most `digits` decimals. */
export function formatNumber(hass: Pick<Hass, "language" | "locale"> | undefined, value: number, digits = 1): string {
  return new Intl.NumberFormat(localeOf(hass), { maximumFractionDigits: digits }).format(value);
}

/** A number with its unit, as Home Assistant writes it: `19,5 °C`, `42 %`. */
export function withUnit(text: string, unit: string | undefined): string {
  return unit === undefined || unit === "" ? text : `${text} ${unit}`;
}

/** A number read from a state or an attribute, or undefined. */
function numberOf(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

/**
 * The state of an entity, formatted: by `hass.formatEntityState` when it exists, otherwise a number in the language of the user with the
 * unit of the entity, or the state as it is.
 *
 * @param hass - The state of Home Assistant.
 * @param entityId - The entity. Undefined when the widget found no source.
 */
export function formatEntityValue(hass: Hass | undefined, entityId: string | undefined): FormattedValue {
  const state = entityId === undefined ? undefined : hass?.states[entityId];
  if (hass === undefined || isMissingState(state)) {
    return UNAVAILABLE;
  }
  if (hass.formatEntityState !== undefined) {
    return { text: hass.formatEntityState(state), available: true };
  }
  const number = numberOf(state.state);
  if (number === undefined) {
    return { text: state.state, available: true };
  }
  const unit = state.attributes["unit_of_measurement"];
  return { text: withUnit(formatNumber(hass, number), typeof unit === "string" ? unit : undefined), available: true };
}

/** How to format an attribute without the formatters of Home Assistant. */
export interface AttributeFormat {
  /** The attribute is a temperature: it carries the unit of Home Assistant. */
  readonly temperature?: boolean;
  /** The unit of the attribute, for example `%`. */
  readonly unit?: string;
  /** The largest number of decimals. 1 by default. */
  readonly digits?: number;
}

/**
 * An attribute of an entity, formatted: by `hass.formatEntityAttributeValue` when it exists, otherwise a number in the language of the
 * user with its unit. An attribute that the state does not have is "—", and the other values of the widget stay.
 *
 * @param hass - The state of Home Assistant.
 * @param entityId - The entity.
 * @param attribute - The attribute, for example `current_temperature`.
 * @param format - The unit of the attribute without the formatters of Home Assistant.
 */
export function formatAttributeValue(hass: Hass | undefined, entityId: string | undefined, attribute: string, format: AttributeFormat = {}): FormattedValue {
  const state = entityId === undefined ? undefined : hass?.states[entityId];
  const value = state?.attributes[attribute];
  if (hass === undefined || isMissingState(state) || value === undefined || value === null || value === "") {
    return UNAVAILABLE;
  }
  if (hass.formatEntityAttributeValue !== undefined) {
    return { text: hass.formatEntityAttributeValue(state, attribute), available: true };
  }
  const number = numberOf(value);
  if (number === undefined) {
    return { text: String(value), available: true };
  }
  return { text: withUnit(formatNumber(hass, number, format.digits ?? 1), format.temperature === true ? temperatureUnit(hass) : format.unit), available: true };
}

/** An age, ready to show: the relative text and the full date of the tooltip. */
export interface FormattedAge {
  /** The relative age, for example `3 minutes ago`. */
  readonly text: string;
  /** The full date, for the tooltip. */
  readonly title: string;
  /** The date as an ISO 8601 text, for the `datetime` of a `time` element. */
  readonly iso: string;
}

/** The units of a relative age, the largest first, with their length in seconds. */
const AGE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/**
 * The age of a date in the language of the user: `3 minutes ago`, `il y a 3 minutes`, `vor 3 Minuten`, with the full date for the
 * tooltip. Undefined for a date that cannot be read.
 *
 * @param hass - The state of Home Assistant, for the language.
 * @param date - The date: an ISO 8601 text, milliseconds since the epoch, or a date.
 * @param now - The clock, replaced in the tests.
 */
export function formatAge(hass: Pick<Hass, "language" | "locale"> | undefined, date: string | number | Date | undefined, now: number = Date.now()): FormattedAge | undefined {
  const time = date === undefined ? Number.NaN : date instanceof Date ? date.getTime() : typeof date === "number" ? date : Date.parse(date);
  if (!Number.isFinite(time)) {
    return undefined;
  }
  const seconds = Math.round((time - now) / 1000);
  const [unit, length] = AGE_UNITS.find(([, size]) => Math.abs(seconds) >= size) ?? ["second", 1];
  const language = localeOf(hass);
  return {
    text: new Intl.RelativeTimeFormat(language, { numeric: "always", style: "long" }).format(Math.trunc(seconds / length), unit),
    title: new Intl.DateTimeFormat(language, { dateStyle: "full", timeStyle: "medium" }).format(new Date(time)),
    iso: new Date(time).toISOString(),
  };
}
