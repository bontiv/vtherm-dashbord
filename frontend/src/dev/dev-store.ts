/**
 * The plugins in development: entries kept in the `localStorage` of the browser, and sent with the request for the plugin list.
 *
 * Nothing is written on the server, and another browser or another user does not see them. Only an administrator can use them.
 */
import type { DevelopmentEntry } from "../plugin-list.ts";

/** The key of the `localStorage`. */
export const DEV_STORAGE_KEY = "vtherm_dashboard.dev_plugins";

/** An entry of the page of management. */
export interface DevEntry extends DevelopmentEntry {
  /** Whether the entry is sent with the next request. A disabled entry stays in the list. */
  readonly enabled: boolean;
}

/** Why an entry was refused. */
export type DevEntryProblem = "invalid_id" | "duplicate_id" | "invalid_url" | "missing_constraint" | "invalid_list";

/** What the user typed. A list is typed as text, one identifier per line or separated by commas. */
export interface DevEntryInput {
  readonly id: string;
  readonly js_url: string;
  readonly dashboard_version?: string;
  readonly requires?: string;
  readonly load_after?: string;
  readonly load_before?: string;
}

/** The result of the validation of an entry. */
export type Validation = { readonly ok: true; readonly entry: DevEntry } | { readonly ok: false; readonly problem: DevEntryProblem };

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Split a typed list at newlines, commas and spaces. */
export function parseList(text: string | undefined): string[] {
  return (text ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

/** Whether an address is an absolute `http` or `https` URL. Any other scheme, such as `javascript:` or `data:`, is refused. */
export function isDevelopmentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host !== "";
  } catch {
    return false;
  }
}

/**
 * Check an entry before it is kept.
 *
 * @param input - What the user typed.
 * @param existing - The entries that are already kept.
 * @param installedIds - The plugins that the server knows without a development entry. An entry for any other identifier is a full
 *   declaration and must give `dashboard_version`.
 */
export function validateEntry(input: DevEntryInput, existing: readonly DevEntry[], installedIds: ReadonlySet<string>): Validation {
  const id = input.id.trim();
  const url = input.js_url.trim();
  if (!ID_PATTERN.test(id)) {
    return { ok: false, problem: "invalid_id" };
  }
  if (existing.some((entry) => entry.id === id)) {
    return { ok: false, problem: "duplicate_id" };
  }
  if (!isDevelopmentUrl(url)) {
    return { ok: false, problem: "invalid_url" };
  }
  const constraint = (input.dashboard_version ?? "").trim();
  if (!installedIds.has(id) && constraint === "") {
    return { ok: false, problem: "missing_constraint" };
  }
  const lists = { requires: parseList(input.requires), load_after: parseList(input.load_after), load_before: parseList(input.load_before) };
  if (Object.values(lists).some((list) => list.some((item) => !ID_PATTERN.test(item)))) {
    return { ok: false, problem: "invalid_list" };
  }
  return {
    ok: true,
    entry: {
      id,
      js_url: url,
      enabled: true,
      ...(constraint === "" ? {} : { dashboard_version: constraint }),
      ...(lists.requires.length === 0 ? {} : { requires: lists.requires }),
      ...(lists.load_after.length === 0 ? {} : { load_after: lists.load_after }),
      ...(lists.load_before.length === 0 ? {} : { load_before: lists.load_before }),
    },
  };
}

const isEntry = (value: unknown): value is DevEntry =>
  typeof value === "object" && value !== null && typeof (value as DevEntry).id === "string" && typeof (value as DevEntry).js_url === "string" && typeof (value as DevEntry).enabled === "boolean";

/** The entries of a browser. */
export class DevStore {
  private readonly storage: Pick<Storage, "getItem" | "setItem">;

  /**
   * @param storage - Where the entries are kept: the `localStorage` of the browser.
   */
  constructor(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage) {
    this.storage = storage;
  }

  /** The entries. Anything unreadable in the storage is ignored: it was not written by the dashboard. */
  list(): DevEntry[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(DEV_STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    } catch {
      return [];
    }
  }

  private save(entries: readonly DevEntry[]): void {
    this.storage.setItem(DEV_STORAGE_KEY, JSON.stringify(entries));
  }

  /**
   * Add an entry, enabled.
   *
   * @returns The validation: the entry was kept only when it is ok.
   */
  add(input: DevEntryInput, installedIds: ReadonlySet<string>): Validation {
    const entries = this.list();
    const result = validateEntry(input, entries, installedIds);
    if (result.ok) {
      this.save([...entries, result.entry]);
    }
    return result;
  }

  /** Enable or disable an entry. A disabled entry is not sent, and is kept. */
  setEnabled(id: string, enabled: boolean): void {
    this.save(this.list().map((entry) => (entry.id === id ? { ...entry, enabled } : entry)));
  }

  /** Remove an entry. */
  remove(id: string): void {
    this.save(this.list().filter((entry) => entry.id !== id));
  }

  /** The entries to send with the request: the enabled ones, without the `enabled` flag. */
  active(): DevelopmentEntry[] {
    return this.list()
      .filter((entry) => entry.enabled)
      .map((entry) => {
        const sent: Record<string, unknown> = { ...entry };
        delete sent["enabled"];
        return sent as unknown as DevelopmentEntry;
      });
  }
}
