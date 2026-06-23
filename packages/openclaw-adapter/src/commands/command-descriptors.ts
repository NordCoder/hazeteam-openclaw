import { allowPermission, type PermissionRequirement } from '../contracts/permissions.js';

const COMMAND_DESCRIPTOR_KIND = 'command-descriptor' as const;
const COMMAND_DESCRIPTOR_SET_KIND = 'command-descriptor-set' as const;

const COMMAND_SCOPES = ['global', 'workspace', 'agent', 'topic'] as const;
const COMMAND_VISIBILITIES = ['public', 'restricted', 'hidden'] as const;

const MAX_COMMAND_NAME_LENGTH = 32;
const MAX_COMMAND_TITLE_LENGTH = 80;
const MAX_COMMAND_DESCRIPTION_LENGTH = 240;
const MAX_COMMAND_ALIASES = 8;
const MAX_COMMANDS_PER_SET = 100;
const COMMAND_NAME_PATTERN = /^[a-z][a-z0-9_-]*$/u;

const UNSAFE_DESCRIPTOR_FIELD_NAMES = new Set([
  'apikey',
  'approvalpayload',
  'bottoken',
  'callbackquery',
  'credential',
  'dispatch',
  'execute',
  'handler',
  'password',
  'provider',
  'providerobject',
  'rawcallbackbody',
  'rawopenclawevent',
  'rawproviderobject',
  'rawproviderresponse',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'router',
  'secret',
  'telegramupdate',
  'toolpayload',
]);

export type CommandScope = (typeof COMMAND_SCOPES)[number];
export type CommandVisibility = (typeof COMMAND_VISIBILITIES)[number];

export interface CommandDescriptor {
  readonly kind: typeof COMMAND_DESCRIPTOR_KIND;
  readonly name: string;
  readonly title: string;
  readonly scope: CommandScope;
  readonly visibility: CommandVisibility;
  readonly description?: string;
  readonly aliases?: readonly string[];
  readonly permissionRequirement?: PermissionRequirement;
}

export interface CommandDescriptorSet {
  readonly kind: typeof COMMAND_DESCRIPTOR_SET_KIND;
  readonly commands: readonly CommandDescriptor[];
  readonly defaultCommandName?: string;
}

export interface CommandDescriptorInput {
  readonly name: string;
  readonly title: string;
  readonly scope?: CommandScope;
  readonly visibility?: CommandVisibility;
  readonly description?: string;
  readonly aliases?: readonly string[];
  readonly permissionRequirement?: PermissionRequirement;
}

export interface CommandDescriptorSetInput {
  readonly commands: readonly CommandDescriptorInput[];
  readonly defaultCommandName?: string;
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function rejectUnsafeDescriptorFields(input: Record<string, unknown>, label: string): void {
  for (const fieldName of Object.keys(input)) {
    if (UNSAFE_DESCRIPTOR_FIELD_NAMES.has(fieldName.toLowerCase())) {
      throw new TypeError(`${label} must not include router, raw provider, tool, or approval fields.`);
    }
  }
}

function normalizeBoundedString(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new TypeError(`${label} must be non-empty and bounded.`);
  }

  return normalized;
}

function normalizeCommandName(input: unknown, label = 'Command name'): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.trim().replace(/^\//u, '').toLowerCase();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_COMMAND_NAME_LENGTH ||
    !COMMAND_NAME_PATTERN.test(normalized)
  ) {
    throw new TypeError(`${label} must be a safe bounded command name.`);
  }

  return normalized;
}

function normalizeCommandScope(scope: unknown): CommandScope {
  if (typeof scope !== 'string' || !(COMMAND_SCOPES as readonly string[]).includes(scope)) {
    throw new TypeError('Unsupported command scope.');
  }

  return scope as CommandScope;
}

function normalizeCommandVisibility(visibility: unknown): CommandVisibility {
  if (
    typeof visibility !== 'string' ||
    !(COMMAND_VISIBILITIES as readonly string[]).includes(visibility)
  ) {
    throw new TypeError('Unsupported command visibility.');
  }

  return visibility as CommandVisibility;
}

function normalizeCommandAliases(aliases: unknown, commandName: string): readonly string[] | undefined {
  if (aliases === undefined) {
    return undefined;
  }

  if (!Array.isArray(aliases)) {
    throw new TypeError('Command aliases must be an array.');
  }

  if (aliases.length > MAX_COMMAND_ALIASES) {
    throw new TypeError('Command aliases must be bounded.');
  }

  const seenAliases = new Set<string>();
  const normalizedAliases: string[] = [];

  for (const alias of aliases) {
    const normalizedAlias = normalizeCommandName(alias, 'Command alias');

    if (normalizedAlias === commandName || seenAliases.has(normalizedAlias)) {
      throw new TypeError('Command aliases must be unique and distinct from the command name.');
    }

    seenAliases.add(normalizedAlias);
    normalizedAliases.push(normalizedAlias);
  }

  if (normalizedAliases.length === 0) {
    return undefined;
  }

  return Object.freeze(normalizedAliases);
}

function normalizePermissionRequirement(requirement: PermissionRequirement): PermissionRequirement {
  return allowPermission(requirement).requirement;
}

function normalizeCommandDescriptor(input: CommandDescriptorInput): CommandDescriptor {
  assertPlainObject(input, 'Command descriptor input');
  rejectUnsafeDescriptorFields(input, 'Command descriptor input');

  const name = normalizeCommandName(input.name);
  const aliases = normalizeCommandAliases(input.aliases, name);

  return Object.freeze({
    kind: COMMAND_DESCRIPTOR_KIND,
    name,
    title: normalizeBoundedString(input.title, 'Command title', MAX_COMMAND_TITLE_LENGTH),
    scope: input.scope === undefined ? 'topic' : normalizeCommandScope(input.scope),
    visibility:
      input.visibility === undefined ? 'public' : normalizeCommandVisibility(input.visibility),
    ...(input.description === undefined
      ? {}
      : {
          description: normalizeBoundedString(
            input.description,
            'Command description',
            MAX_COMMAND_DESCRIPTION_LENGTH,
          ),
        }),
    ...(aliases === undefined ? {} : { aliases }),
    ...(input.permissionRequirement === undefined
      ? {}
      : { permissionRequirement: normalizePermissionRequirement(input.permissionRequirement) }),
  });
}

function assertUniqueCommandLookupNames(commands: readonly CommandDescriptor[]): void {
  const lookupNames = new Set<string>();

  for (const command of commands) {
    const commandLookupNames = [command.name, ...(command.aliases ?? [])];

    for (const lookupName of commandLookupNames) {
      if (lookupNames.has(lookupName)) {
        throw new TypeError('Command descriptor set contains duplicate command lookup names.');
      }

      lookupNames.add(lookupName);
    }
  }
}

export function createCommandDescriptor(input: CommandDescriptorInput): CommandDescriptor {
  return normalizeCommandDescriptor(input);
}

export function isCommandDescriptor(candidate: unknown): candidate is CommandDescriptor {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return false;
  }

  if ((candidate as Record<string, unknown>).kind !== COMMAND_DESCRIPTOR_KIND) {
    return false;
  }

  try {
    normalizeCommandDescriptor(candidate as CommandDescriptorInput);
    return true;
  } catch {
    return false;
  }
}

export function createCommandDescriptorSet(input: CommandDescriptorSetInput): CommandDescriptorSet {
  assertPlainObject(input, 'Command descriptor set input');
  rejectUnsafeDescriptorFields(input, 'Command descriptor set input');

  if (!Array.isArray(input.commands)) {
    throw new TypeError('Command descriptor set commands must be an array.');
  }

  if (input.commands.length === 0 || input.commands.length > MAX_COMMANDS_PER_SET) {
    throw new TypeError('Command descriptor set commands must be non-empty and bounded.');
  }

  const commands = input.commands.map((command) => normalizeCommandDescriptor(command));
  assertUniqueCommandLookupNames(commands);

  const defaultCommandName =
    input.defaultCommandName === undefined
      ? undefined
      : normalizeCommandName(input.defaultCommandName, 'Default command name');

  if (
    defaultCommandName !== undefined &&
    !commands.some(
      (command) =>
        command.name === defaultCommandName || (command.aliases ?? []).includes(defaultCommandName),
    )
  ) {
    throw new TypeError('Default command name must reference a command in the descriptor set.');
  }

  return Object.freeze({
    kind: COMMAND_DESCRIPTOR_SET_KIND,
    commands: Object.freeze(commands),
    ...(defaultCommandName === undefined ? {} : { defaultCommandName }),
  });
}

export function findCommandDescriptor(
  commandSet: CommandDescriptorSet,
  name: string,
): CommandDescriptor | undefined {
  if (
    typeof commandSet !== 'object' ||
    commandSet === null ||
    Array.isArray(commandSet) ||
    commandSet.kind !== COMMAND_DESCRIPTOR_SET_KIND ||
    !Array.isArray(commandSet.commands)
  ) {
    return undefined;
  }

  let normalizedName: string;
  try {
    normalizedName = normalizeCommandName(name, 'Command lookup name');
  } catch {
    return undefined;
  }

  return commandSet.commands.find(
    (command) => command.name === normalizedName || (command.aliases ?? []).includes(normalizedName),
  );
}
