import type { Hass } from "@vtherm/dashboard-sdk";

/** A state of the history: when it was written, in milliseconds since the epoch, and its value. */
export interface HistoryPoint {
  readonly t: number;
  readonly state: string;
}

/** A row of the compact answer of the recorder: `s` the state, `lu` the time of the update in seconds, `a` the attributes. */
interface Row {
  readonly s?: string;
  readonly lu?: number;
  readonly a?: Readonly<Record<string, unknown>>;
}

/**
 * Read the states of an entity over the last hours from the recorder of Home Assistant. Read it only when your widget is visible, and keep
 * the answer a few minutes: the recorder reads its database at each call.
 */
export async function readStates(hass: Hass, entityId: string, hours: number, now: number = Date.now()): Promise<HistoryPoint[]> {
  const answer = await hass.callWS<Record<string, readonly Row[]>>({
    type: "history/history_during_period",
    start_time: new Date(now - hours * 3_600_000).toISOString(),
    end_time: new Date(now).toISOString(),
    entity_ids: [entityId],
    // The smallest answer: the state and its time, without the attributes.
    minimal_response: true,
    no_attributes: true,
  });
  return (answer[entityId] ?? []).flatMap((row) => (row.s === undefined || row.lu === undefined ? [] : [{ t: row.lu * 1000, state: row.s }]));
}

/**
 * Read an attribute of an entity over the last hours, for example `current_temperature` of the `climate` entity of a thermostat. The
 * recorder sends every attribute of each row, so ask for one entity at a time.
 */
export async function readAttribute(hass: Hass, entityId: string, attribute: string, hours: number, now: number = Date.now()): Promise<HistoryPoint[]> {
  const answer = await hass.callWS<Record<string, readonly Row[]>>({
    type: "history/history_during_period",
    start_time: new Date(now - hours * 3_600_000).toISOString(),
    end_time: new Date(now).toISOString(),
    entity_ids: [entityId],
    minimal_response: false,
    no_attributes: false,
  });
  return (answer[entityId] ?? []).flatMap((row) => {
    const value = row.a?.[attribute];
    return row.lu === undefined || value === undefined || value === null ? [] : [{ t: row.lu * 1000, state: String(value) }];
  });
}
