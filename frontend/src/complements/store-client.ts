/**
 * The only place that talks to the store of add-ons: the Marketplace of Home Assistant (2026.11 and later) or HACS (older versions).
 *
 * Neither has a public API. The dashboard calls the administration commands that their own interface calls, through the WebSocket of
 * Home Assistant. They can change with a version, so every call goes through this adapter, which finds the store, checks the shape of the
 * answers, and tells the page when to fall back on a link that opens the repository in the store.
 *
 * The Marketplace is HACS built into Home Assistant: its commands have other names, but the answers that the dashboard reads have the same
 * fields and the same values. One client therefore serves both, with the names of the commands of each store.
 */
import type { Hass } from "@vtherm/dashboard-sdk";
import type { Complement, StoreRepository } from "./types.ts";

/** The stores that the dashboard knows. */
export type StoreKind = "marketplace" | "hacs";

/** The commands and the page of a store. */
export interface StoreBackend {
  readonly kind: StoreKind;
  readonly info: string;
  readonly list: string;
  readonly add: string;
  /** Installs the latest version of a repository that the store knows. */
  readonly install: string;
  /** The page of the store in Home Assistant. */
  readonly panel: string;
}

/** The Marketplace of Home Assistant 2026.11 (`homeassistant/components/marketplace/websocket/`). */
export const MARKETPLACE: StoreBackend = {
  kind: "marketplace",
  info: "marketplace/info",
  list: "marketplace/repositories/list",
  add: "marketplace/repositories/add",
  install: "marketplace/repository/install",
  panel: "/marketplace",
};

/** HACS 2.x, the custom integration (`external/hacs`). */
export const HACS: StoreBackend = {
  kind: "hacs",
  info: "hacs/info",
  list: "hacs/repositories/list",
  add: "hacs/repositories/add",
  install: "hacs/repository/download",
  panel: "/hacs",
};

const BACKENDS: Readonly<Record<StoreKind, StoreBackend>> = { marketplace: MARKETPLACE, hacs: HACS };

/** The oldest version of HACS that the commands were checked against (`external/hacs`, the 2.x line). An older one gets the link to HACS. */
export const MIN_HACS_VERSION = "2.0.0";

/** The documentation of the Marketplace, for a user who has no store. */
export const MARKETPLACE_DOCUMENTATION = "https://www.home-assistant.io/integrations/marketplace/";

/** The documentation of HACS, for a user whose HACS is disabled, too old or does not answer. */
export const HACS_DOCUMENTATION = "https://hacs.xyz/docs/use/";

/** The steps of an installation. */
export type InstallStep = "checking" | "adding" | "verifying" | "downloading" | "done";

/** Why a call to the store failed. */
export type StoreErrorCode =
  /** The store answered with an error and a message, for example a download that failed. */
  | "store_error"
  /** A command of the store is rejected as unknown: its interface changed. */
  | "interface_changed"
  /** The answer of the store is not the one that was expected. */
  | "unexpected_response"
  /** The store answered without error but did not add the repository. */
  | "add_refused"
  /** The store does not offer the category of the add-on. */
  | "category_unsupported"
  /** The Marketplace is in Home Assistant, but its configuration entry is not loaded. */
  | "not_loaded"
  /** The user has not accepted the warning of the Marketplace. */
  | "warning_not_accepted"
  /** Adding a repository to the Marketplace needs GitHub, which is not connected. */
  | "github_not_connected";

/** The codes of the Marketplace that the dashboard explains with its own message. */
const EXPLAINED_CODES: readonly StoreErrorCode[] = ["not_loaded", "warning_not_accepted", "github_not_connected"];

/** An error of the store, with the message that the store gave. */
export class StoreError extends Error {
  readonly code: StoreErrorCode;
  /** The code that Home Assistant answered with, when there is one. */
  readonly remoteCode: string | undefined;

  constructor(code: StoreErrorCode, message: string, remoteCode?: string) {
    super(message);
    this.name = "StoreError";
    this.code = code;
    this.remoteCode = remoteCode;
  }
}

/** What the dashboard knows about the store. */
export type StoreStatus =
  | {
      readonly kind: "ready";
      readonly store: StoreKind;
      readonly version: string;
      readonly categories: readonly string[];
      /** The user accepted the warning of the Marketplace. Always true for HACS. */
      readonly warningAccepted: boolean;
      /** GitHub is connected to the Marketplace, which adding a repository needs. Always true for HACS. */
      readonly githubConnected: boolean;
    }
  /** Neither the Marketplace nor HACS is there. */
  | { readonly kind: "absent" }
  /** The Marketplace is in Home Assistant but not loaded. */
  | { readonly kind: "not_loaded"; readonly store: "marketplace" }
  /** The store is there and says that it is disabled. */
  | { readonly kind: "disabled"; readonly store: StoreKind; readonly reason: string }
  /** The version of HACS is older than the one that was checked. */
  | { readonly kind: "unsupported"; readonly store: "hacs"; readonly version: string }
  /** The store answered in a way that the dashboard does not understand. */
  | { readonly kind: "broken"; readonly store: StoreKind; readonly message: string };

/** What an installation did. */
export interface InstallOutcome {
  /** Home Assistant must restart before the add-on works. */
  readonly restartRequired: boolean;
  /** The add-on is for the interface: the page of the browser must be reloaded. */
  readonly reloadPage: boolean;
  /** The repository in the store. */
  readonly repository: StoreRepository;
}

/** The shape of an error that `hass.callWS` rejects with. */
interface WsFailure {
  readonly code?: string;
  readonly message?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Compare two dotted versions by their numbers: negative when `left` is older. Anything after a dash or a letter is ignored. */
export function compareVersions(left: string, right: string): number {
  const numbers = (version: string): number[] =>
    version
      .replace(/^v/i, "")
      .split(/[-+]/)[0]!
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = numbers(left);
  const b = numbers(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** The address, in Home Assistant, of the page of a repository in a store. Without the repository, the page of the store. */
export function storeLink(store: StoreKind, repository: Pick<StoreRepository, "id"> | undefined): string {
  const { panel } = BACKENDS[store];
  return repository === undefined ? panel : `${panel}/repository/${encodeURIComponent(repository.id)}`;
}

/** Whether a repository of the store is the repository of an add-on. */
export const isRepositoryOf = (repository: StoreRepository, complement: Complement): boolean =>
  complement.repository !== null && repository.full_name.toLowerCase() === complement.repository;

function toRepository(raw: unknown): StoreRepository {
  if (!isRecord(raw) || typeof raw["full_name"] !== "string" || raw["id"] === undefined || typeof raw["category"] !== "string") {
    throw new StoreError("unexpected_response", "A repository of the store has no full_name, id or category.");
  }
  const version = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
  return {
    id: String(raw["id"]),
    full_name: raw["full_name"],
    category: raw["category"],
    installed: raw["installed"] === true,
    status: typeof raw["status"] === "string" ? raw["status"] : "default",
    installed_version: version(raw["installed_version"]),
    available_version: version(raw["available_version"]),
    config_flow: raw["config_flow"] === true,
  };
}

/** The commands of one store. */
export class StoreClient {
  private readonly hass: Pick<Hass, "callWS">;
  readonly backend: StoreBackend;

  /**
   * @param hass - The connection to Home Assistant.
   * @param backend - The store to talk to.
   */
  constructor(hass: Pick<Hass, "callWS">, backend: StoreBackend) {
    this.hass = hass;
    this.backend = backend;
  }

  private async call<Result>(message: Record<string, unknown>): Promise<Result> {
    try {
      return await this.hass.callWS<Result>(message);
    } catch (error) {
      const failure = (isRecord(error) ? error : {}) as WsFailure;
      const message_ = failure.message ?? (error instanceof Error ? error.message : String(error));
      if (failure.code === "unknown_command") {
        throw new StoreError("interface_changed", `The store does not know the command ${String(message["type"])}.`, failure.code);
      }
      if (EXPLAINED_CODES.includes(failure.code as StoreErrorCode)) {
        throw new StoreError(failure.code as StoreErrorCode, message_, failure.code);
      }
      throw new StoreError("store_error", message_, failure.code);
    }
  }

  /** Whether the store is there, enabled, and recent enough. Home Assistant does not know the commands of a store that is not there. */
  async status(): Promise<StoreStatus> {
    const store = this.backend.kind;
    let info: unknown;
    try {
      info = await this.call<unknown>({ type: this.backend.info });
    } catch (error) {
      if (error instanceof StoreError && error.code === "interface_changed") {
        return { kind: "absent" };
      }
      if (store === "marketplace" && error instanceof StoreError && error.code === "not_loaded") {
        return { kind: "not_loaded", store };
      }
      return { kind: "broken", store, message: (error as Error).message };
    }
    if (!isRecord(info) || typeof info["version"] !== "string") {
      return { kind: "broken", store, message: `The answer of ${this.backend.info} has no version.` };
    }
    if (typeof info["disabled_reason"] === "string" && info["disabled_reason"] !== "") {
      return { kind: "disabled", store, reason: info["disabled_reason"] };
    }
    if (store === "hacs" && compareVersions(info["version"], MIN_HACS_VERSION) < 0) {
      return { kind: "unsupported", store, version: info["version"] };
    }
    const categories = Array.isArray(info["categories"]) ? info["categories"].filter((category): category is string => typeof category === "string") : [];
    return {
      kind: "ready",
      store,
      version: info["version"],
      categories,
      // HACS has neither: it is the Marketplace that asks for them.
      warningAccepted: store === "hacs" || info["warning_accepted"] === true,
      githubConnected: store === "hacs" || info["github_connected"] === true,
    };
  }

  /** The repositories of the store in some categories. */
  async list(categories: readonly string[]): Promise<StoreRepository[]> {
    const raw = await this.call<unknown>({ type: this.backend.list, categories });
    if (!Array.isArray(raw)) {
      throw new StoreError("unexpected_response", `The answer of ${this.backend.list} is not a list.`);
    }
    return raw.map(toRepository);
  }

  /**
   * Install an add-on: add its repository to the store when it is not there, then install its latest version.
   *
   * HACS answers `hacs/repositories/add` without error even when it refuses the repository, and the Marketplace lists only the
   * repositories that it has read, so the list is read again after an addition to check.
   *
   * @param complement - The add-on, which comes from the catalog.
   * @param categories - The categories that the store offers.
   * @param onStep - Told at each step.
   * @throws StoreError - The store refused, or did not behave as expected.
   */
  async install(complement: Complement, categories: readonly string[], onStep: (step: InstallStep) => void = () => undefined): Promise<InstallOutcome> {
    const category = complement.hacs_category;
    if (category === null || complement.repository === null) {
      throw new StoreError("unexpected_response", `${complement.name} cannot be installed by the dashboard.`);
    }
    if (!categories.includes(category)) {
      throw new StoreError("category_unsupported", `The store does not offer the category ${category}.`);
    }
    const find = async (): Promise<StoreRepository | undefined> => (await this.list([category])).find((candidate) => isRepositoryOf(candidate, complement));
    onStep("checking");
    let repository = await find();
    if (repository === undefined) {
      onStep("adding");
      try {
        await this.call({ type: this.backend.add, repository: complement.repository, category });
      } catch (error) {
        // The Marketplace knows the repository but has not read it yet, so its list does not show it: the list read again decides.
        // Any other refusal of the Marketplace is an error with its own message, which the page shows.
        if (!(error instanceof StoreError && error.remoteCode === "repository_exists")) {
          throw error;
        }
      }
      onStep("verifying");
      repository = await find();
      if (repository === undefined) {
        throw new StoreError("add_refused", `The store did not add ${complement.repository}.`);
      }
    }
    onStep("downloading");
    await this.call({ type: this.backend.install, repository: repository.id });
    const after = (await find()) ?? repository;
    onStep("done");
    return { restartRequired: after.status === "pending-restart", reloadPage: complement.type === "interface", repository: after };
  }
}

/** The store that Home Assistant offers, and the client that talks to it. */
export interface DetectedStore {
  readonly status: StoreStatus;
  /** Undefined when there is no store. */
  readonly client: StoreClient | undefined;
}

/**
 * Find the store: the Marketplace first, then HACS when Home Assistant does not know the commands of the Marketplace. Nothing is
 * stored: the store is found again each time the page reads it.
 *
 * @param hass - The connection to Home Assistant.
 */
export async function detectStore(hass: Pick<Hass, "callWS">): Promise<DetectedStore> {
  const marketplace = new StoreClient(hass, MARKETPLACE);
  const status = await marketplace.status();
  if (status.kind !== "absent") {
    return { status, client: marketplace };
  }
  const hacs = new StoreClient(hass, HACS);
  const hacsStatus = await hacs.status();
  return { status: hacsStatus, client: hacsStatus.kind === "absent" ? undefined : hacs };
}
