/**
 * A fake HACS and a fake server of the catalog, for the tests of the add-ons.
 *
 * It answers the commands the way `external/hacs/custom_components/hacs/websocket/` does: `hacs/info`, `hacs/repositories/list`, `hacs/repositories/add`
 * (which answers without error even when it refuses the repository) and `hacs/repository/download` (which answers with an error and a message).
 * Without HACS, Home Assistant rejects every command of HACS as `unknown_command`.
 */
import { vi } from "vitest";

/** A repository that HACS knows. */
export interface FakeRepository {
  id: string;
  full_name: string;
  category: string;
  installed?: boolean;
  status?: string;
}

export interface FakeHacsOptions {
  /** HACS is not installed: its commands are unknown. */
  absent?: boolean;
  version?: string;
  disabledReason?: string | null;
  categories?: string[];
  repositories?: FakeRepository[];
  /** The repositories that `hacs/repositories/add` accepts. Another one is silently refused. */
  addable?: string[];
  /** The repositories whose download fails, with the message of HACS. */
  downloadErrors?: Record<string, string>;
  /** The commands that HACS no longer knows. */
  unknownCommands?: string[];
  /** The answer of `hacs/repositories/list`, when it must not be a list. */
  listAnswer?: unknown;
  /** What a download does to a repository, so that tests can choose `pending-restart` or `installed`. */
  afterDownload?: (repository: FakeRepository) => void;
}

/** The commands received, in order, and the answer function. */
export function createFakeHacs(options: FakeHacsOptions = {}) {
  const repositories: FakeRepository[] = (options.repositories ?? []).map((repository) => ({ ...repository }));
  const received: Record<string, unknown>[] = [];
  let nextId = 1000;
  const reject = (code: string, message: string): never => {
    throw { code, message };
  };
  const handle = async (message: Record<string, unknown>): Promise<unknown | undefined> => {
    const type = String(message["type"]);
    if (!type.startsWith("hacs/")) {
      return undefined;
    }
    received.push(message);
    if (options.absent === true || (options.unknownCommands ?? []).includes(type)) {
      return reject("unknown_command", "Unknown command.");
    }
    switch (type) {
      case "hacs/info":
        return { version: options.version ?? "2.0.5", disabled_reason: options.disabledReason ?? null, categories: options.categories ?? ["integration", "plugin", "theme"] };
      case "hacs/repositories/list": {
        if (options.listAnswer !== undefined) {
          return options.listAnswer;
        }
        const categories = (message["categories"] as string[] | undefined) ?? ["integration", "plugin", "theme"];
        return repositories
          .filter((repository) => categories.includes(repository.category))
          .map((repository) => ({ installed_version: repository.installed === true ? "1.0.0" : null, available_version: "1.0.0", config_flow: true, status: repository.status ?? (repository.installed === true ? "installed" : "default"), ...repository }));
      }
      case "hacs/repositories/add": {
        // HACS answers without error whatever happens: a refusal only reaches an internal event.
        const repository = String(message["repository"]);
        if ((options.addable ?? []).includes(repository) && !repositories.some((candidate) => candidate.full_name === repository)) {
          nextId += 1;
          repositories.push({ id: String(nextId), full_name: repository, category: String(message["category"]) });
        }
        return {};
      }
      case "hacs/repository/download": {
        const repository = repositories.find((candidate) => candidate.id === message["repository"]);
        if (repository === undefined) {
          return reject("error", "Repository not found.");
        }
        const failure = options.downloadErrors?.[repository.full_name];
        if (failure !== undefined) {
          return reject("error", failure);
        }
        repository.installed = true;
        repository.status = "installed";
        options.afterDownload?.(repository);
        return {};
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
