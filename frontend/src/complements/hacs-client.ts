/**
 * The only place that talks to HACS.
 *
 * HACS has no public API. The dashboard calls the administration commands that its own interface calls, through the WebSocket of Home
 * Assistant. They can change with a version of HACS, so every call goes through this adapter, which checks the version of HACS, checks
 * the shape of the answers, and tells the page when to fall back on a link that opens the repository in HACS.
 */
import type { Hass } from "@vtherm/dashboard-sdk";
import type { Complement, HacsRepository } from "./types.ts";

/** The oldest version of HACS that the commands were checked against (`external/hacs`, the 2.x line). An older one gets the link to HACS. */
export const MIN_HACS_VERSION = "2.0.0";

/** The documentation of HACS, for a user who does not have it. */
export const HACS_DOCUMENTATION = "https://hacs.xyz/docs/use/";

/** The steps of an installation. */
export type InstallStep = "checking" | "adding" | "verifying" | "downloading" | "done";

/** Why a call to HACS failed. */
export type HacsErrorCode =
  /** HACS answered with an error and a message, for example a download that failed. */
  | "hacs_error"
  /** A command of HACS is rejected as unknown: its interface changed. */
  | "interface_changed"
  /** The answer of HACS is not the one that was expected. */
  | "unexpected_response"
  /** HACS answered without error but did not add the repository. */
  | "add_refused"
  /** HACS does not offer the category of the add-on. */
  | "category_unsupported";

/** An error of HACS, with the message that HACS gave. */
export class HacsError extends Error {
  readonly code: HacsErrorCode;

  constructor(code: HacsErrorCode, message: string) {
    super(message);
    this.name = "HacsError";
    this.code = code;
  }
}

/** What the dashboard knows about HACS. */
export type HacsStatus =
  | { readonly kind: "ready"; readonly version: string; readonly categories: readonly string[] }
  /** HACS is not installed or not loaded. */
  | { readonly kind: "absent" }
  /** HACS is installed and says that it is disabled. */
  | { readonly kind: "disabled"; readonly reason: string }
  /** The version of HACS is older than the one that was checked. */
  | { readonly kind: "unsupported"; readonly version: string }
  /** HACS answered in a way that the dashboard does not understand. */
  | { readonly kind: "broken"; readonly message: string };

/** What an installation did. */
export interface InstallOutcome {
  /** Home Assistant must restart before the add-on works. */
  readonly restartRequired: boolean;
  /** The add-on is for the interface: the page of the browser must be reloaded. */
  readonly reloadPage: boolean;
  /** The repository in HACS. */
  readonly repository: HacsRepository;
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

/** The address, in Home Assistant, of the page of a repository in HACS. Without the repository, the page of HACS. */
export function hacsLink(repository: Pick<HacsRepository, "id"> | undefined): string {
  return repository === undefined ? "/hacs" : `/hacs/repository/${encodeURIComponent(repository.id)}`;
}

/** Whether a repository of HACS is the repository of an add-on. */
export const isRepositoryOf = (repository: HacsRepository, complement: Complement): boolean =>
  complement.repository !== null && repository.full_name.toLowerCase() === complement.repository;

function toRepository(raw: unknown): HacsRepository {
  if (!isRecord(raw) || typeof raw["full_name"] !== "string" || raw["id"] === undefined || typeof raw["category"] !== "string") {
    throw new HacsError("unexpected_response", "A repository of HACS has no full_name, id or category.");
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

/** The commands of HACS. */
export class HacsClient {
  private readonly hass: Pick<Hass, "callWS">;

  /**
   * @param hass - The connection to Home Assistant.
   */
  constructor(hass: Pick<Hass, "callWS">) {
    this.hass = hass;
  }

  private async call<Result>(message: Record<string, unknown>): Promise<Result> {
    try {
      return await this.hass.callWS<Result>(message);
    } catch (error) {
      const failure = (isRecord(error) ? error : {}) as WsFailure;
      if (failure.code === "unknown_command") {
        throw new HacsError("interface_changed", `HACS does not know the command ${String(message["type"])}.`);
      }
      throw new HacsError("hacs_error", failure.message ?? (error instanceof Error ? error.message : String(error)));
    }
  }

  /** Whether HACS is there, enabled, and recent enough. */
  async status(): Promise<HacsStatus> {
    let info: unknown;
    try {
      info = await this.call<unknown>({ type: "hacs/info" });
    } catch (error) {
      // Without HACS, Home Assistant does not know the command at all.
      return error instanceof HacsError && error.code === "interface_changed" ? { kind: "absent" } : { kind: "broken", message: (error as Error).message };
    }
    if (!isRecord(info) || typeof info["version"] !== "string") {
      return { kind: "broken", message: "The answer of hacs/info has no version." };
    }
    if (typeof info["disabled_reason"] === "string" && info["disabled_reason"] !== "") {
      return { kind: "disabled", reason: info["disabled_reason"] };
    }
    if (compareVersions(info["version"], MIN_HACS_VERSION) < 0) {
      return { kind: "unsupported", version: info["version"] };
    }
    const categories = Array.isArray(info["categories"]) ? info["categories"].filter((category): category is string => typeof category === "string") : [];
    return { kind: "ready", version: info["version"], categories };
  }

  /** The repositories of HACS in some categories. */
  async list(categories: readonly string[]): Promise<HacsRepository[]> {
    const raw = await this.call<unknown>({ type: "hacs/repositories/list", categories });
    if (!Array.isArray(raw)) {
      throw new HacsError("unexpected_response", "The answer of hacs/repositories/list is not a list.");
    }
    return raw.map(toRepository);
  }

  /**
   * Install an add-on: add its repository to HACS when it is not there, then download it.
   *
   * HACS answers `hacs/repositories/add` without error even when it refuses the repository, so the list is read again to check.
   *
   * @param complement - The add-on, which comes from the catalog.
   * @param categories - The categories that HACS offers.
   * @param onStep - Told at each step.
   * @throws HacsError - HACS refused, or did not behave as expected.
   */
  async install(complement: Complement, categories: readonly string[], onStep: (step: InstallStep) => void = () => undefined): Promise<InstallOutcome> {
    const category = complement.hacs_category;
    if (category === null || complement.repository === null) {
      throw new HacsError("unexpected_response", `${complement.name} cannot be installed by the dashboard.`);
    }
    if (!categories.includes(category)) {
      throw new HacsError("category_unsupported", `HACS does not offer the category ${category}.`);
    }
    onStep("checking");
    let repository = (await this.list([category])).find((candidate) => isRepositoryOf(candidate, complement));
    if (repository === undefined) {
      onStep("adding");
      await this.call({ type: "hacs/repositories/add", repository: complement.repository, category });
      onStep("verifying");
      repository = (await this.list([category])).find((candidate) => isRepositoryOf(candidate, complement));
      if (repository === undefined) {
        throw new HacsError("add_refused", `HACS did not add ${complement.repository}.`);
      }
    }
    onStep("downloading");
    await this.call({ type: "hacs/repository/download", repository: repository.id });
    const after = (await this.list([category])).find((candidate) => isRepositoryOf(candidate, complement)) ?? repository;
    onStep("done");
    return { restartRequired: after.status === "pending-restart", reloadPage: complement.type === "interface", repository: after };
  }
}
