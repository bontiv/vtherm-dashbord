/** The state of an add-on, deduced from what Home Assistant and the store (the Marketplace or HACS) say. The dashboard stores nothing, so the states stay right after a restart. */
import type { Complement, ComplementState, StoreRepository, UpdateInfo } from "./types.ts";

/**
 * Deduce the state of an add-on.
 *
 * - An add-on that the dashboard does not install is `link_only`.
 * - An integration that the store installed and that waits for a restart is `restart_required`.
 * - An integration with a configuration entry is `configured`.
 * - An integration that can be configured and has no entry is `to_configure`. It can be configured once Home Assistant knows its
 *   config flow, which is after a restart, or at once when the store reloaded the custom components: the Marketplace does it for an integration that is new to this run.
 * - Any other integration that is loaded or downloaded is `installed`, whether the store installed it or not.
 * - An interface add-on is `installed` once the store installed it.
 *
 * @param complement - The add-on, with what Home Assistant knows.
 * @param repository - Its repository in the store, when the store is available and knows it.
 */
export function deduceState(complement: Complement, repository: StoreRepository | undefined): ComplementState {
  if (complement.hacs_category === null) {
    return "link_only";
  }
  if (complement.type !== "integration") {
    return repository?.installed === true ? "installed" : "not_installed";
  }
  const downloaded = repository?.installed === true;
  if (repository?.status === "pending-restart") {
    return "restart_required";
  }
  if (complement.ha.config_entries > 0) {
    return "configured";
  }
  if ((complement.ha.loaded || downloaded) && complement.ha.config_flow) {
    return "to_configure";
  }
  return complement.ha.loaded || downloaded ? "installed" : "not_installed";
}

/** The address of the page of Home Assistant that starts the config flow of an integration. */
export const configFlowPath = (domain: string): string => `/config/integrations/dashboard/add?domain=${encodeURIComponent(domain)}`;

/**
 * The update that the store offers for a repository, or undefined. The repository must be installed, and the store must say `pending-upgrade` or
 * give an available version that differs from the installed one. An update is not a state: it comes on top of the state.
 */
export function updateOf(repository: StoreRepository | undefined): UpdateInfo | undefined {
  if (repository?.installed !== true) {
    return undefined;
  }
  const installed = repository.installed_version ?? "";
  const available = repository.available_version ?? "";
  if (repository.status !== "pending-upgrade" && (available === "" || available === installed)) {
    return undefined;
  }
  return { installed, available };
}
