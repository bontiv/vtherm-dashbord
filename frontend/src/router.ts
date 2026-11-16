/**
 * The routes of the dashboard.
 *
 * Every page has its own address, under the path of the panel: `/vtherm/<tab>/<entry>`. The Thermostats tab has one
 * more level, the thermostat: `/vtherm/<thermostats tab>/<thermostat>/<entry>`. The segments are the identifiers of the
 * contributions, so a plugin can be linked to.
 */

/** The page that an address designates. */
export interface Route {
  /** The identifier of the top tab. Absent for the address of the panel itself. */
  readonly tab?: string;
  /** The identifier of the thermostat, only in the Thermostats tab. */
  readonly thermostat?: string;
  /** The identifier of the entry of the left menu. */
  readonly entry?: string;
  /** What follows, for a page that has sub-pages, such as the detail of an add-on. */
  readonly rest: readonly string[];
}

/** The path of the panel in Home Assistant. */
export const PANEL_PATH = "/vtherm";

/** The route of the address of the panel. */
export const EMPTY_ROUTE: Route = { rest: [] };

/**
 * Read a route from an address.
 *
 * @param pathname - The path of the address, for example `/vtherm/core.top.dashboard/core.page.overview`.
 * @param thermostatsTab - The identifier of the Thermostats tab, whose routes have a thermostat.
 * @param prefix - The path of the panel. A path that does not start with it gives the empty route.
 */
export function parseRoute(pathname: string, thermostatsTab: string, prefix: string = PANEL_PATH): Route {
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
    return EMPTY_ROUTE;
  }
  const segments = pathname
    .slice(prefix.length)
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  const [tab, ...others] = segments;
  if (tab === undefined) {
    return EMPTY_ROUTE;
  }
  if (tab === thermostatsTab) {
    const [thermostat, entry, ...rest] = others;
    return { tab, ...(thermostat === undefined ? {} : { thermostat }), ...(entry === undefined ? {} : { entry }), rest };
  }
  const [entry, ...rest] = others;
  return { tab, ...(entry === undefined ? {} : { entry }), rest };
}

/**
 * Write the address of a route.
 *
 * @param route - The route.
 * @param prefix - The path of the panel.
 */
export function buildPath(route: Route, prefix: string = PANEL_PATH): string {
  const segments = [route.tab, route.thermostat, route.entry, ...route.rest].filter((segment): segment is string => segment !== undefined && segment !== "");
  return [prefix, ...segments.map((segment) => encodeURIComponent(segment))].join("/");
}
