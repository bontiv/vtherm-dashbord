/** The types of the add-ons feature: the catalog that the server gives, and what HACS says. */

/** What Home Assistant knows about the integration of an add-on. */
export interface ComplementHa {
  /** The integration is in `custom_components`. */
  readonly found: boolean;
  /** The integration is loaded by Home Assistant. */
  readonly loaded: boolean;
  /** The number of configuration entries of the integration. */
  readonly config_entries: number;
  /** The manifest of the integration declares a config flow. */
  readonly config_flow: boolean;
}

/** An add-on of the catalog, as `vtherm_dashboard/get_complements` gives it. */
export interface Complement {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  /** False for a type that the dashboard does not know: the add-on is shown as a link. */
  readonly known_type: boolean;
  readonly description: string;
  readonly description_fr: string;
  readonly description_de: string;
  readonly certification: string;
  readonly family: string;
  readonly slug: string | null;
  readonly url: string | null;
  readonly ha_domain: string | null;
  readonly author: string | null;
  /** The GitHub repository `owner/name`, in lower case. */
  readonly repository: string | null;
  /** Where the add-on is described. */
  readonly link: string | null;
  /** The category of HACS to install it, or null when the dashboard does not install it. */
  readonly hacs_category: string | null;
  readonly ha: ComplementHa;
}

/** The answer of `vtherm_dashboard/get_complements`. */
export interface ComplementsResponse {
  readonly complements: readonly Complement[];
  readonly fetched_at: number;
  readonly stale: boolean;
  readonly warnings: readonly string[];
  readonly catalog_url: string;
}

/** The states of an add-on, deduced from Home Assistant and HACS. */
export type ComplementState = "not_installed" | "installed" | "restart_required" | "to_configure" | "configured" | "link_only";

/** The states, in the order of the filter. */
export const COMPLEMENT_STATES: readonly ComplementState[] = ["not_installed", "installed", "restart_required", "to_configure", "configured", "link_only"];

/** A repository of HACS, as far as the dashboard reads it. */
export interface HacsRepository {
  /** The identifier of HACS, which `hacs/repository/download` takes. */
  readonly id: string;
  /** The `owner/name`, as HACS writes it. */
  readonly full_name: string;
  readonly category: string;
  readonly installed: boolean;
  /** `new`, `pending-restart`, `pending-upgrade`, `installed` or `default`. */
  readonly status: string;
  readonly installed_version: string | null;
  readonly available_version: string | null;
  readonly config_flow: boolean;
}
