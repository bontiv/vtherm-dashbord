/**
 * A fake store of add-ons (the Marketplace of Home Assistant or HACS) and a fake server of the catalog, for the tests of the add-ons.
 *
 * HACS answers the way `external/hacs/custom_components/hacs/websocket/` does: `hacs/info`, `hacs/repositories/list`,
 * `hacs/repositories/add` (which answers without error even when it refuses the repository) and `hacs/repository/download` (which answers
 * with an error and a message).
 *
 * The Marketplace answers the way `homeassistant/components/marketplace/websocket/` of Home Assistant 2026.11 does: the same answers under
 * `marketplace/info`, `marketplace/repositories/list`, `marketplace/repositories/add` (which answers with an error when it refuses) and
 * `marketplace/repository/install`, with its guards: `not_loaded`, `warning_not_accepted` and `github_not_connected`.
 *
 * Home Assistant rejects every command of a store that is not there as `unknown_command`.
 */
import { vi } from "vitest";

/** A repository that the store knows. */
export interface FakeRepository {
  id: string;
  full_name: string;
  category: string;
  installed?: boolean;
  status?: string;
}

export interface FakeStoreOptions {
  /** The store that Home Assistant offers. HACS by default, as on Home Assistant 2026.10 and before. */
  store?: "hacs" | "marketplace";
  /** No store: the commands of both are unknown. */
  absent?: boolean;
  /** The Marketplace is in Home Assistant but its entry is not loaded. */
  notLoaded?: boolean;
  /** The user accepted the warning of the Marketplace. True by default. */
  warningAccepted?: boolean;
  /** GitHub is connected to the Marketplace. True by default. */
  githubConnected?: boolean;
  version?: string;
  disabledReason?: string | null;
  categories?: string[];
  repositories?: FakeRepository[];
  /** The repositories that the add command accepts. HACS refuses another one silently, the Marketplace with an error. */
  addable?: string[];
  /** The repositories that the Marketplace knows but does not list yet: adding them answers `repository_exists`. */
  unlisted?: FakeRepository[];
  /** The repositories whose installation fails, with the message of the store. */
  downloadErrors?: Record<string, string>;
  /** The commands that the store no longer knows. */
  unknownCommands?: string[];
  /** The answer of the list command, when it must not be a list. */
  listAnswer?: unknown;
  /** What an installation does to a repository, so that tests can choose `pending-restart` or `installed`. */
  afterDownload?: (repository: FakeRepository) => void;
}

/** The commands received, in order, and the answer function. */
export function createFakeStore(options: FakeStoreOptions = {}) {
  const store = options.store ?? "hacs";
  const repositories: FakeRepository[] = (options.repositories ?? []).map((repository) => ({ ...repository }));
  const unlisted: FakeRepository[] = (options.unlisted ?? []).map((repository) => ({ ...repository }));
  const received: Record<string, unknown>[] = [];
  let nextId = 1000;
  const reject = (code: string, message: string): never => {
    throw { code, message };
  };
  const handle = async (message: Record<string, unknown>): Promise<unknown | undefined> => {
    const type = String(message["type"]);
    const prefix = type.split("/")[0];
    if (prefix !== "hacs" && prefix !== "marketplace") {
      return undefined;
    }
    received.push(message);
    if (options.absent === true || prefix !== store || (options.unknownCommands ?? []).includes(type)) {
      return reject("unknown_command", "Unknown command.");
    }
    const marketplace = store === "marketplace";
    if (marketplace && options.notLoaded === true) {
      return reject("not_loaded", "The Marketplace is not loaded.");
    }
    const command = type.slice(prefix.length + 1);
    const accepted = options.warningAccepted !== false;
    const github = options.githubConnected !== false;
    switch (command) {
      case "info":
        return {
          version: options.version ?? (marketplace ? "2026.11.0" : "2.0.5"),
          disabled_reason: options.disabledReason ?? null,
          categories: options.categories ?? ["integration", "plugin", "theme"],
          ...(marketplace ? { warning_accepted: accepted, github_connected: github } : {}),
        };
      case "repositories/list": {
        if (options.listAnswer !== undefined) {
          return options.listAnswer;
        }
        const categories = (message["categories"] as string[] | undefined) ?? ["integration", "plugin", "theme"];
        return repositories
          .filter((repository) => categories.includes(repository.category))
          .map((repository) => ({ installed_version: repository.installed === true ? "1.0.0" : null, available_version: "1.0.0", config_flow: true, status: repository.status ?? (repository.installed === true ? "installed" : "default"), ...repository }));
      }
      case "repositories/add": {
        const repository = String(message["repository"]);
        if (marketplace && !accepted) {
          return reject("warning_not_accepted", "Accept the warning of the Marketplace first.");
        }
        if (marketplace && !github) {
          return reject("github_not_connected", "Connect GitHub first.");
        }
        const known = unlisted.findIndex((candidate) => candidate.full_name === repository);
        if (marketplace && known !== -1) {
          // Read meanwhile: the list shows it from now on.
          repositories.push(...unlisted.splice(known, 1));
          return reject("repository_exists", `${repository} is already in the Marketplace.`);
        }
        if ((options.addable ?? []).includes(repository) && !repositories.some((candidate) => candidate.full_name === repository)) {
          nextId += 1;
          repositories.push({ id: String(nextId), full_name: repository, category: String(message["category"]) });
          return marketplace ? null : {};
        }
        // HACS answers without error whatever happens: a refusal only reaches an internal event.
        return marketplace ? reject("add_failed", `Could not add ${repository}: the repository is not valid.`) : {};
      }
      case "repository/download":
      case "repository/install": {
        if ((command === "repository/install") !== marketplace) {
          return reject("unknown_command", "Unknown command.");
        }
        if (marketplace && !accepted) {
          return reject("warning_not_accepted", "Accept the warning of the Marketplace first.");
        }
        const repository = repositories.find((candidate) => candidate.id === message["repository"]);
        if (repository === undefined) {
          return reject(marketplace ? "repository_not_found" : "error", "Repository not found.");
        }
        const failure = options.downloadErrors?.[repository.full_name];
        if (failure !== undefined) {
          return reject("error", failure);
        }
        repository.installed = true;
        repository.status = "installed";
        options.afterDownload?.(repository);
        return marketplace ? null : {};
      }
      default:
        return reject("unknown_command", "Unknown command.");
    }
  };
  return { handle, received, repositories, commands: () => received.map((message) => String(message["type"])) };
}

/** Put handlers in front of the `callWS` of a fake `hass`: the first one that answers wins. */
export function withHandlers<Hass extends { callWS: ReturnType<typeof vi.fn> }>(hass: Hass, ...handlers: ((message: Record<string, unknown>) => Promise<unknown | undefined>)[]): Hass {
  const previous = hass.callWS.getMockImplementation() as ((message: Record<string, unknown>) => Promise<unknown>) | undefined;
  hass.callWS.mockImplementation(async (message: Record<string, unknown>) => {
    for (const handler of handlers) {
      const answer = await handler(message);
      if (answer !== undefined) {
        return answer;
      }
    }
    return previous === undefined ? undefined : previous(message);
  });
  return hass;
}

/** A complement of the catalog, as the server gives it. */
export function complement(fields: Record<string, unknown> = {}): Record<string, unknown> {
  const name = String(fields["name"] ?? "Add-on");
  const slug = (fields["slug"] as string | null | undefined) === undefined ? `owner/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : (fields["slug"] as string | null);
  return {
    id: slug ?? name,
    name,
    type: "integration",
    known_type: true,
    description: "<p>English text</p>",
    description_fr: "",
    description_de: "",
    certification: "official",
    family: "feature",
    slug,
    url: null,
    ha_domain: "addon_domain",
    author: "someone",
    repository: slug === null ? null : slug.toLowerCase(),
    link: slug === null ? null : `https://github.com/${slug.toLowerCase()}`,
    hacs_category: "integration",
    ha: { found: false, loaded: false, config_entries: 0, config_flow: false },
    ...fields,
  };
}

/** The answer of `vtherm_dashboard/get_complements` for some complements. */
export const catalogAnswer = (complements: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({
  complements,
  fetched_at: 1_700_000_000,
  stale: false,
  warnings: [],
  catalog_url: "https://example.org/plugins.json",
  ...extra,
});
