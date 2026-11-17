/**
 * The configurations that the dashboard shows: the list of the thermostats and a draft for each configuration that was opened.
 *
 * A draft lives as long as the panel: it is kept when the user goes from a section to another of the same thermostat, and it is
 * dropped when the user leaves the thermostat after confirming it.
 */

import { areaSignature } from "../thermostat-areas.ts";
import type { HassRegistries } from "../thermostat-areas.ts";
import type { ConfigApi, ConfigData, ThermostatList } from "./api.ts";
import { ConfigDraft } from "./draft.ts";

/** A configuration that is open, with its draft. */
export interface OpenConfig {
  readonly data: ConfigData;
  readonly draft: ConfigDraft;
}

/** The configurations of the panel. */
export class ConfigSession {
  /** The list of the thermostats, once it was read. */
  list: ThermostatList | undefined;

  private readonly open = new Map<string, OpenConfig>();
  private readonly loading = new Map<string, Promise<OpenConfig>>();
  private readonly listeners = new Set<() => void>();
  /** The areas of the devices and of the entities of the thermostats, as `hass` gave them the last time. */
  private areas: string | undefined;

  /** The commands of the configuration. */
  readonly api: ConfigApi;

  /**
   * @param api - The commands of the configuration.
   */
  constructor(api: ConfigApi) {
    this.api = api;
  }

  /** Be told when a configuration or a draft changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify = (): void => {
    for (const listener of this.listeners) {
      listener();
    }
  };

  /**
   * Tell whether Home Assistant moved a thermostat to another area since the last call, so that the list must be read again. The server
   * gives the area of each thermostat; `hass` only tells that a device or an entity changed area. The first call after the list is read
   * only takes note of the areas.
   *
   * @param hass - The state of Home Assistant, with its registries of devices and entities.
   */
  areasMoved(hass: HassRegistries): boolean {
    if (this.list === undefined) {
      return false;
    }
    const signature = areaSignature(this.list.thermostats, hass);
    const previous = this.areas;
    this.areas = signature;
    return previous !== undefined && signature !== undefined && signature !== previous;
  }

  /** Read the list of the thermostats again. */
  async refreshList(): Promise<ThermostatList> {
    this.list = await this.api.thermostats();
    // The new list can have other thermostats: the next call of `areasMoved` takes note of their areas again.
    this.areas = undefined;
    // The sections of the general configuration and the inherited values depend on the central configuration, so it is read as soon as
    // it is known to exist, not when its page opens.
    const central = this.list.central_config_id;
    if (central !== null && this.open.get(central) === undefined) {
      this.load(central).catch(() => undefined);
    }
    this.notify();
    return this.list;
  }

  /** The identifier of the central configuration, or null when there is none. */
  get centralId(): string | null {
    return this.list?.central_config_id ?? null;
  }

  /** The configuration of an entry, when it was read. */
  get(entryId: string | null): OpenConfig | undefined {
    return entryId === null ? undefined : this.open.get(entryId);
  }

  /**
   * Read the configuration of an entry and its presets, and open a draft for it. A configuration that is open is not read again.
   *
   * @param entryId - The entry.
   */
  load(entryId: string): Promise<OpenConfig> {
    const known = this.open.get(entryId);
    if (known !== undefined) {
      return Promise.resolve(known);
    }
    let pending = this.loading.get(entryId);
    if (pending === undefined) {
      pending = (async () => {
        const [data, presets] = await Promise.all([this.api.config(entryId), this.api.presets(entryId)]);
        const draft = new ConfigDraft(entryId, data.values, Object.fromEntries(presets.map((preset) => [preset.preset, preset.value])));
        draft.subscribe(this.notify);
        const opened = { data, draft };
        this.open.set(entryId, opened);
        this.loading.delete(entryId);
        this.notify();
        return opened;
      })();
      pending.catch(() => this.loading.delete(entryId));
      this.loading.set(entryId, pending);
    }
    return pending;
  }

  /** Forget the configuration of an entry, and its draft: it is read again the next time. */
  close(entryId: string): void {
    this.open.delete(entryId);
    this.notify();
  }

  /** Save the draft of an entry, then read the configuration and the list again. */
  async save(entryId: string): Promise<Awaited<ReturnType<ConfigDraft["save"]>>> {
    const opened = this.open.get(entryId);
    if (opened === undefined) {
      throw new Error(`The configuration ${entryId} is not open`);
    }
    const outcome = await opened.draft.save(this.api);
    if (outcome.configSaved) {
      const [data, presets] = await Promise.all([this.api.config(entryId), this.api.presets(entryId)]);
      opened.draft.refresh(data.values, Object.fromEntries(presets.map((preset) => [preset.preset, preset.value])));
      this.open.set(entryId, { data, draft: opened.draft });
      await this.refreshList();
    }
    return outcome;
  }

  /** The drafts that have changes that are not saved. */
  dirtyDrafts(): ConfigDraft[] {
    return [...this.open.values()].map((opened) => opened.draft).filter((draft) => draft.dirty);
  }
}
