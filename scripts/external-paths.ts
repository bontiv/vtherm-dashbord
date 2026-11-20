/**
 * Locate the External_Projects (Versatile Thermostat, `vtherm_api`, HACS) that the dashboard reads but does not own.
 *
 * The folder of a project is the value of its Location_Variable, or its Default_Location when the variable is blank (unset, empty or
 * only whitespace). A relative value is resolved against the root of the project, never against the working directory. The value is
 * not trimmed, and the path is normalized lexically, without following symbolic links.
 *
 * This is the TypeScript twin of `tests/external_paths.py` and `scripts/external-paths.sh`. The three must return the same path.
 * This file is the one place of the TypeScript code where the default `external/` may be written.
 */
import { statSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

export type ProjectName = "versatile_thermostat" | "vtherm_api" | "hacs";

export interface Location {
  readonly name: ProjectName;
  readonly variable: string;
  /** Default_Location, relative to the root of the project. */
  readonly default: string;
}

/**
 * The root of the Dashboard_Project, the parent of `scripts/`. The path is taken from the file of the module, not built with
 * `new URL("..", import.meta.url)`, which Vite rewrites and which fails under happy-dom.
 */
export const ROOT: string = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

export const LOCATIONS: Readonly<Record<ProjectName, Location>> = {
  versatile_thermostat: { name: "versatile_thermostat", variable: "VTHERM_VERSATILE_THERMOSTAT_DIR", default: "external/versatile_thermostat" },
  vtherm_api: { name: "vtherm_api", variable: "VTHERM_API_DIR", default: "external/vtherm_api" },
  hacs: { name: "hacs", variable: "VTHERM_HACS_DIR", default: "external/hacs" },
};

/** Raised when the folder of a project does not exist. The message names the variable and the path. */
export class ExternalProjectError extends Error {
  override name = "ExternalProjectError";
}

type Env = Readonly<Record<string, string | undefined>>;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/** The absolute normalized path of a project, without checking that it exists. */
export function locate(name: ProjectName, env: Env = process.env, root: string = ROOT): string {
  const location = LOCATIONS[name];
  const value = env[location.variable];
  return resolvePath(root, isBlank(value) ? location.default : (value as string));
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Like `locate`, but throws `ExternalProjectError` when the folder is missing or is not a folder. There is no fallback to the default. */
export function resolve(name: ProjectName, env: Env = process.env, root: string = ROOT): string {
  const location = LOCATIONS[name];
  const path = locate(name, env, root);
  if (!isDirectory(path)) {
    const origin = isBlank(env[location.variable]) ? "default of" : "set to";
    throw new ExternalProjectError(`${location.variable}: ${path} is not a folder (${origin} ${location.variable})`);
  }
  return path;
}
