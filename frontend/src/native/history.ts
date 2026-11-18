/**
 * The history of the entities of a thermostat, read from the recorder of Home Assistant for the panels of estimation.
 *
 * One request for each entity and each period, through the WebSocket command `history/history_during_period`, kept a few minutes.
 * Nothing is read until a panel asks for it, and nothing is written.
 */

import type { Hass } from "@vtherm/dashboard-sdk";

/** A value at a time: milliseconds since the epoch. */
export interface Sample {
  readonly t: number;
  readonly v: number;
}

/** The periods of the replays. */
export type Period = "day" | "week";

/** The length of each period. */
export const PERIOD_MS: Readonly<Record<Period, number>> = { day: 24 * 3600 * 1000, week: 7 * 24 * 3600 * 1000 };

/** How long a history stays in the cache. */
export const CACHE_MS = 5 * 60 * 1000;

/** The history of an entity over a period: its numeric states, and the numeric attributes that were asked for. */
export interface EntityHistory {
  /** The start and the end of the period. */
  readonly start: number;
  readonly end: number;
  /** The states that are numbers, at the time of each change. */
  readonly state: readonly Sample[];
  /** The attributes that were asked for, when they are numbers, by name. */
  readonly attributes: Readonly<Record<string, readonly Sample[]>>;
}

/** A row of the compressed answer of the recorder. */
interface CompressedState {
  readonly s?: string;
  readonly a?: Readonly<Record<string, unknown>>;
  /** The time of the last update, in seconds. */
  readonly lu?: number;
  /** The time of the last change, in seconds, when it differs from the last update. */
  readonly lc?: number;
}

const toNumber = (value: unknown): number | undefined => {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
};

/**
 * Turn the answer of the recorder for an entity into samples.
 *
 * @param rows - The rows of the entity, oldest first.
 * @param attributes - The attributes to read.
 */
export function toHistory(rows: readonly CompressedState[], attributes: readonly string[], start: number, end: number): EntityHistory {
  const state: Sample[] = [];
  const byAttribute: Record<string, Sample[]> = Object.fromEntries(attributes.map((name) => [name, []]));
  let last: Readonly<Record<string, unknown>> = {};
  for (const row of rows) {
    const seconds = row.lu ?? row.lc;
    if (seconds === undefined) {
      continue;
    }
    const t = seconds * 1000;
    const value = toNumber(row.s);
    if (value !== undefined) {
      state.push({ t, v: value });
    }
    // With minimal_response, a row without attributes keeps those of the previous row.
    last = row.a ?? last;
    for (const name of attributes) {
      const attribute = toNumber(last[name]);
      if (attribute !== undefined) {
        (byAttribute[name] as Sample[]).push({ t, v: attribute });
      }
    }
  }
  return { start, end, state, attributes: byAttribute };
}

/** Reads and keeps the history of the entities of a thermostat. */
export class HistoryClient {
  private readonly cache = new Map<string, { readonly at: number; readonly value: Promise<EntityHistory> }>();
  private readonly hass: () => Hass | undefined;
  private readonly now: () => number;

  /**
   * @param hass - Gives the state of Home Assistant at the time of a request.
   * @param now - The clock, replaced in the tests.
   */
  constructor(hass: () => Hass | undefined, now: () => number = Date.now) {
    this.hass = hass;
    this.now = now;
  }

  /**
   * The history of an entity over a period that ends now. A history read less than `CACHE_MS` ago is given again; a failed read is
   * forgotten, so that the next call reads again.
   *
   * @param entityId - The entity.
   * @param period - The period.
   * @param attributes - The attributes to read; without any, the recorder sends no attribute.
   */
  read(entityId: string, period: Period, attributes: readonly string[] = []): Promise<EntityHistory> {
    const key = `${entityId}|${period}|${[...attributes].sort().join(",")}`;
    const now = this.now();
    const cached = this.cache.get(key);
    if (cached !== undefined && now - cached.at < CACHE_MS) {
      return cached.value;
    }
    const value = this.request(entityId, now - PERIOD_MS[period], now, attributes);
    this.cache.set(key, { at: now, value });
    value.catch(() => {
      if (this.cache.get(key)?.value === value) {
        this.cache.delete(key);
      }
    });
    return value;
  }

  private async request(entityId: string, start: number, end: number, attributes: readonly string[]): Promise<EntityHistory> {
    const hass = this.hass();
    if (hass === undefined) {
      throw new Error("Home Assistant is not available");
    }
    const withAttributes = attributes.length > 0;
    const answer = await hass.callWS<Record<string, CompressedState[]>>({
      type: "history/history_during_period",
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      entity_ids: [entityId],
      minimal_response: !withAttributes,
      no_attributes: !withAttributes,
      significant_changes_only: false,
    });
    return toHistory(answer[entityId] ?? [], attributes, start, end);
  }
}
