/**
 * What the add-ons pages share: the catalog, what the store says, the installations that run, and the restart.
 *
 * The store is the Marketplace of Home Assistant, or HACS on the versions before 2026.11 (`store-client.ts`). The pages come and go as
 * the user navigates, so this state lives outside them. Nothing is persisted: every state of an add-on is deduced again from Home
 * Assistant and the store.
 */
import type { Hass } from "@vtherm/dashboard-sdk";
import { StoreError, detectStore } from "./store-client.ts";
import type { InstallOutcome, InstallStep, StoreClient, StoreKind, StoreStatus } from "./store-client.ts";
import { deduceState, updateOf } from "./states.ts";
import type { Complement, ComplementReadme, ComplementState, ComplementsResponse, ListCriteria, ReadmeState, StoreRepository, UpdateInfo } from "./types.ts";

/** What an installation is doing. */
export interface InstallProgress {
  readonly running: boolean;
  readonly step: InstallStep | undefined;
  /** Why the installation stopped, when it did. */
  readonly error: { readonly code: string; readonly message: string } | undefined;
  readonly outcome: InstallOutcome | undefined;
}

/** What the restart is doing. */
export type RestartPhase = "idle" | "restarting" | "timeout";

/** How the restart watches Home Assistant. The defaults are for a real instance, tests give short ones. */
export interface RestartOptions {
  readonly intervalMs: number;
  readonly timeoutMs: number;
  readonly sleep: (ms: number) => Promise<void>;
}

const DEFAULT_RESTART: RestartOptions = { intervalMs: 2000, timeoutMs: 300_000, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) };

const IDLE: InstallProgress = { running: false, step: undefined, error: undefined, outcome: undefined };

/** The state shared by the pages of the add-ons. */
export class ComplementsModel {
  /** The catalog, once it was read. */
  response: ComplementsResponse | undefined;
  /** The code of the error of the last read of the catalog, when it failed. */
  loadError: string | undefined;
  loading = false;
  /** The store is being read. The catalog is already shown meanwhile. */
  storeLoading = false;
  /** The last criteria of each list, by page, so that coming back to a list finds it as it was. */
  readonly criteria = new Map<string, ListCriteria>();
  store: StoreStatus = { kind: "absent" };
  repositories: readonly StoreRepository[] = [];
  /** The repositories of the store could not be read, with the reason. */
  storeFailure: StoreError | undefined;
  /** The client of the store that was found, undefined without store. */
  private client: StoreClient | undefined;
  restart: RestartPhase = "idle";
  restartOptions: RestartOptions = DEFAULT_RESTART;
  private hass: Hass | undefined;
  private readonly installs = new Map<string, InstallProgress>();
  /** The README read in this session of the page, by add-on and language, so that coming back to an add-on does not ask again. */
  private readonly readmes = new Map<string, ReadmeState>();
  private readonly listeners = new Set<() => void>();

  /** Be told when anything changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Give the latest connection to Home Assistant. A page calls it each time it receives `hass`. */
  attach(hass: Hass | undefined): void {
    this.hass = hass;
  }

  /** Forget everything. Used by tests, and when the panel starts over. */
  reset(): void {
    this.response = undefined;
    this.loadError = undefined;
    this.loading = false;
    this.storeLoading = false;
    this.criteria.clear();
    this.store = { kind: "absent" };
    this.client = undefined;
    this.repositories = [];
    this.storeFailure = undefined;
    this.restart = "idle";
    this.restartOptions = DEFAULT_RESTART;
    this.installs.clear();
    this.readmes.clear();
    this.notify();
  }

  /**
   * The README of an add-on. The first call starts the reading, and the model tells its subscribers when it is done. An add-on without
   * a repository has none, and no command is sent for it.
   *
   * @param complement - The add-on.
   * @param language - The language of the user.
   */
  readmeOf(complement: Complement, language: string): ReadmeState {
    if (complement.repository === null) {
      return { status: "none" };
    }
    const key = `${complement.id}\u0000${language}`;
    const known = this.readmes.get(key);
    if (known !== undefined) {
      return known;
    }
    const hass = this.hass;
    if (hass === undefined) {
      return { status: "loading" };
    }
    this.readmes.set(key, { status: "loading" });
    hass.callWS<ComplementReadme>({ type: "vtherm_dashboard/get_complement_readme", complement_id: complement.id, language }).then(
      (readme) => {
        this.readmes.set(key, { status: "ready", readme });
        this.notify();
      },
      () => {
        this.readmes.set(key, { status: "error" });
        this.notify();
      },
    );
    return { status: "loading" };
  }

  /**
   * Read the catalog and what the store knows.
   *
   * @param refresh - Ask the server of the catalog again, ignoring its cache.
   */
  async load(refresh = false): Promise<void> {
    const hass = this.hass;
    if (hass === undefined || this.loading) {
      return;
    }
    this.loading = true;
    this.notify();
    try {
      // The catalog is shown as soon as it answers; the store has 6 000 repositories to list and comes later.
      const catalogRead = hass
        .callWS<ComplementsResponse>({ type: "vtherm_dashboard/get_complements", refresh })
        .then(
          (value) => {
            this.response = value;
            this.loadError = undefined;
          },
          (reason: unknown) => {
            this.loadError = String((reason as { code?: string } | undefined)?.code ?? "unknown");
          },
        )
        .then(() => {
          this.notify();
        });
      await catalogRead;
      this.storeLoading = true;
      this.notify();
      try {
        await this.readStore(hass);
      } catch (reason) {
        this.store = { kind: "broken", store: this.storeKind ?? "marketplace", message: String(reason) };
      }
    } finally {
      this.loading = false;
      this.storeLoading = false;
      this.notify();
    }
  }

  private async readStore(hass: Hass): Promise<void> {
    const { status, client } = await detectStore(hass);
    this.store = status;
    this.client = client;
    this.storeFailure = undefined;
    this.repositories = [];
    if (status.kind !== "ready" || client === undefined) {
      return;
    }
    try {
      const wanted = [...new Set((this.response?.complements ?? []).map((complement) => complement.hacs_category).filter((category): category is string => category !== null))];
      const categories = (wanted.length === 0 ? ["integration", "plugin"] : wanted).filter((category) => status.categories.includes(category));
      this.repositories = categories.length === 0 ? [] : await client.list(categories);
    } catch (error) {
      this.storeFailure = error instanceof StoreError ? error : new StoreError("store_error", String(error));
    }
  }

  /** The store that answered, even when it cannot be used, or undefined when there is none. */
  get storeKind(): StoreKind | undefined {
    return this.store.kind === "absent" ? undefined : this.store.store;
  }

  /** The repository of an add-on in the store, if the store knows it. */
  repositoryOf(complement: Complement): StoreRepository | undefined {
    return this.repositories.find((repository) => complement.repository !== null && repository.full_name.toLowerCase() === complement.repository);
  }

  /** The state of an add-on. */
  stateOf(complement: Complement): ComplementState {
    return deduceState(complement, this.repositoryOf(complement));
  }

  /** The update that the store offers for an add-on, if any. */
  updateOf(complement: Complement): UpdateInfo | undefined {
    return updateOf(this.repositoryOf(complement));
  }

  /** Whether an add-on waits for the user: to configure, to restart, or to update. */
  needsAction(complement: Complement): boolean {
    const state = this.stateOf(complement);
    return state === "to_configure" || state === "restart_required" || this.updateOf(complement) !== undefined;
  }

  /**
   * What the Marketplace needs before it installs an add-on that is not installed: the warning accepted by the user, and GitHub connected
   * when the repository must be added. Undefined when nothing is missing, or when the add-on is not one that the dashboard installs now.
   */
  installBlocker(complement: Complement): "warning_not_accepted" | "github_not_connected" | undefined {
    const store = this.store;
    if (this.storeLoading || store.kind !== "ready" || complement.hacs_category === null || this.stateOf(complement) !== "not_installed") {
      return undefined;
    }
    if (!store.warningAccepted) {
      return "warning_not_accepted";
    }
    return !store.githubConnected && this.repositoryOf(complement) === undefined ? "github_not_connected" : undefined;
  }

  /**
   * Whether the dashboard can install an add-on now: the store is read and ready, it is not installed, the add-on is of an installable
   * kind, and the Marketplace has what it needs (`installBlocker`).
   */
  canInstall(complement: Complement): boolean {
    return (
      !this.storeLoading &&
      this.store.kind === "ready" &&
      this.storeFailure === undefined &&
      complement.hacs_category !== null &&
      this.stateOf(complement) === "not_installed" &&
      this.installBlocker(complement) === undefined
    );
  }

  /** What the installation of an add-on is doing. */
  progressOf(complement: Complement): InstallProgress {
    return this.installs.get(complement.id) ?? IDLE;
  }

  /**
   * Install an add-on with the store. The user has confirmed. Other add-ons can be installed meanwhile.
   *
   * @param complement - The add-on, which must come from the catalog.
   */
  async install(complement: Complement): Promise<void> {
    const hass = this.hass;
    const client = this.client;
    const store = this.store;
    if (hass === undefined || client === undefined || store.kind !== "ready" || this.progressOf(complement).running) {
      return;
    }
    const set = (progress: Partial<InstallProgress>): void => {
      this.installs.set(complement.id, { ...this.progressOf(complement), ...progress });
      this.notify();
    };
    set({ running: true, step: "checking", error: undefined, outcome: undefined });
    try {
      const outcome = await client.install(complement, store.categories, (step) => set({ step }));
      set({ running: false, outcome });
    } catch (error) {
      const failure = error instanceof StoreError ? error : new StoreError("store_error", String(error));
      set({ running: false, error: { code: failure.code, message: failure.message } });
    }
    // The catalog says what Home Assistant knows now, which changed with the installation.
    this.loading = false;
    await this.load();
  }

  /** Forget what an installation did, once the user has read it. */
  dismissOutcome(complement: Complement): void {
    this.installs.delete(complement.id);
    this.notify();
  }

  /**
   * Restart Home Assistant. The user has confirmed. The model watches the connection until Home Assistant answers again, then reads
   * everything again, so the states are the ones of the new instance.
   */
  async restartHomeAssistant(): Promise<void> {
    const hass = this.hass;
    if (hass === undefined || this.restart === "restarting") {
      return;
    }
    const { intervalMs, timeoutMs, sleep } = this.restartOptions;
    this.restart = "restarting";
    this.notify();
    // The call ends when the connection is lost, which is not a failure.
    void Promise.resolve(hass.callService("homeassistant", "restart")).catch(() => undefined);
    let down = false;
    for (let waited = 0; waited < timeoutMs; waited += intervalMs) {
      await sleep(intervalMs);
      try {
        // A connection that does not answer is as good as a closed one.
        await Promise.race([(this.hass ?? hass).callWS({ type: "get_config" }), sleep(intervalMs * 2).then(() => Promise.reject(new Error("no answer")))]);
        if (down) {
          this.restart = "idle";
          this.installs.clear();
          await this.load();
          return;
        }
      } catch {
        down = true;
      }
    }
    this.restart = "timeout";
    this.notify();
  }
}

/** The model of the panel. */
export const complementsModel = new ComplementsModel();
