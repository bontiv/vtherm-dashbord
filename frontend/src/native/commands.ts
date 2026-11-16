/**
 * The commands that Versatile Thermostat sends to an underlying, and the services of the central boiler, as the configuration stores
 * them: `service_name[/attribute[:value]]`, and `entity_id/service_name[/attribute[:value]]` for the boiler.
 *
 * The native tabs show them with the service picker of Home Assistant and a field for the attribute. These functions read a stored
 * text into its parts and write the parts back, without changing a text that they cannot read.
 */

/** A command: the service, and the attribute with its value, as typed (`option:comfort`). */
export interface Command {
  /** The name of the service, without its domain, for example `select_option`. */
  readonly service: string;
  /** The attribute and its value, for example `option:comfort`, or an empty text. */
  readonly attribute: string;
}

/** The service of the central boiler: the entity, and the command sent to it. */
export interface BoilerService extends Command {
  /** The entity, for example `switch.boiler`. */
  readonly entity: string;
}

/** The format of a command, as Versatile Thermostat checks it. */
const COMMAND = /^(?<service>[^\s/]+)(?:\/(?<attribute>[^\s:]+(?::[^\s]+)?))?$/;

/** The format of a service of the boiler. */
const BOILER_SERVICE = /^(?<entity>[a-z_]+\.[^\s/]+)\/(?<service>[^\s/]+)(?:\/(?<attribute>[^\s:]+(?::[^\s]+)?))?$/;

/**
 * Read a stored command.
 *
 * @returns Its parts, or `undefined` when the text does not have the expected format and must be shown as it is.
 */
export function parseCommand(text: string): Command | undefined {
  const match = COMMAND.exec(text);
  return match === null ? undefined : { service: match.groups?.["service"] ?? "", attribute: match.groups?.["attribute"] ?? "" };
}

/** Write a command. Without a service, there is no command: an empty text. */
export function formatCommand(command: Command): string {
  const service = command.service.trim();
  const attribute = command.attribute.trim();
  return service === "" ? "" : attribute === "" ? service : `${service}/${attribute}`;
}

/**
 * Read a stored service of the boiler.
 *
 * @returns Its parts, or `undefined` when the text does not have the expected format and must be shown as it is.
 */
export function parseBoilerService(text: string): BoilerService | undefined {
  const match = BOILER_SERVICE.exec(text);
  return match === null ? undefined : { entity: match.groups?.["entity"] ?? "", service: match.groups?.["service"] ?? "", attribute: match.groups?.["attribute"] ?? "" };
}

/** Write a service of the boiler. Without an entity or a service, there is none: an empty text. */
export function formatBoilerService(value: BoilerService): string {
  const command = formatCommand(value);
  return value.entity.trim() === "" || command === "" ? "" : `${value.entity.trim()}/${command}`;
}

/**
 * The commands of each underlying, in the order of the underlyings: a missing command is an empty text, so that each command stays
 * in front of its entity.
 *
 * @param commands - The stored commands.
 * @param count - The number of underlyings.
 */
export function commandsByUnderlying(commands: unknown, count: number): string[] {
  const list = Array.isArray(commands) ? commands.map((command) => String(command)) : [];
  return Array.from({ length: Math.max(count, list.length) }, (_, index) => list[index] ?? "");
}

/**
 * The value stored for the commands: no command at all is an empty list, as Versatile Thermostat expects when the underlyings use
 * their default commands; otherwise one command for each underlying, which the server checks.
 */
export function storedCommands(commands: readonly string[]): string[] {
  return commands.every((command) => command.trim() === "") ? [] : [...commands];
}

/** The domains whose entities have default commands (on and off): their commands are optional. */
export const DEFAULT_COMMAND_DOMAINS: readonly string[] = ["switch", "input_boolean"];

/** Whether an underlying needs its own commands, because it is not a switch. */
export const needsCommands = (entityId: string): boolean => !DEFAULT_COMMAND_DOMAINS.includes(entityId.split(".")[0] ?? "");
