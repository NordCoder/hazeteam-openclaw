import { createAdapterOperationContext } from '../contracts/context.js';
import type { AdapterOperationContext } from '../contracts/context.js';
import type { AdapterIdempotencyKey } from '../contracts/idempotency.js';
import type { PermissionRequirement } from '../contracts/permissions.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../contracts/result.js';
import type { AdapterOperationResult, AdapterSafeErrorCode } from '../contracts/result.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AgentRef,
  WorkspaceRef,
} from '../contracts/refs.js';
import type {
  OpenClawMappedHostSessionRef,
  OpenClawMappedInboundAttachmentRef,
  OpenClawMappedInboundCallback,
  OpenClawMappedInboundEvent,
  OpenClawMappedInboundMessage,
  OpenClawMappedInboundSystemEvent,
} from '../mapping/inbound-mapper.js';
import { findCommandDescriptor } from './command-descriptors.js';
import type { CommandDescriptor, CommandDescriptorSet } from './command-descriptors.js';

const ADAPTER_COMMAND_INTENT_KIND = 'adapter-command-intent' as const;
const ADAPTER_COMMAND_INTENT_SOURCE = 'openclaw-adapter-inbound' as const;
const CORE_HOST_ACTION_TARGET = 'core-host-action' as const;
const ADAPTER_CALLBACK_ACTION_TARGET = 'adapter-callback-action' as const;
const ADAPTER_SYSTEM_EVENT_TARGET = 'adapter-system-event' as const;
const SUBMIT_HOST_ACTION_METHOD = 'submitHostAction' as const;
const NO_FACADE_METHOD = 'none' as const;
const MAX_COMMAND_ARGUMENTS_LENGTH = 2_048;
const SAFE_COMMAND_LOOKUP_PATTERN = /^[a-z][a-z0-9_-]*$/u;

export type AdapterCommandIntentRef = `command-intent:${string}`;
export type AdapterCommandIntentKind = typeof ADAPTER_COMMAND_INTENT_KIND;
export type AdapterCommandIntentSource = typeof ADAPTER_COMMAND_INTENT_SOURCE;
export type AdapterCommandIntentTarget =
  | typeof CORE_HOST_ACTION_TARGET
  | typeof ADAPTER_CALLBACK_ACTION_TARGET
  | typeof ADAPTER_SYSTEM_EVENT_TARGET;
export type AdapterCommandIntentFacadeMethod =
  | typeof SUBMIT_HOST_ACTION_METHOD
  | typeof NO_FACADE_METHOD;

export interface AdapterCommandIntentCompositionInput {
  readonly mappedEvent: OpenClawMappedInboundEvent;
  readonly commandSet?: CommandDescriptorSet;
}

export interface AdapterCommandIntentBase {
  readonly kind: AdapterCommandIntentKind;
  readonly intentRef: AdapterCommandIntentRef;
  readonly source: AdapterCommandIntentSource;
  readonly sourceEventKind: OpenClawMappedInboundEvent['eventKind'];
  readonly operationRef: AdapterOperationRef;
  readonly correlationRef: AdapterCorrelationRef;
  readonly workspaceRef: WorkspaceRef;
  readonly agentRef: AgentRef;
  readonly hostSessionRef: OpenClawMappedHostSessionRef;
  readonly routingRef: string;
  readonly target: AdapterCommandIntentTarget;
  readonly facadeMethod: AdapterCommandIntentFacadeMethod;
  readonly actionKind: string;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly actorRef?: ActorRef;
  readonly occurredAt?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly permissionRequirement?: PermissionRequirement;
}

export interface AdapterMessageIntentPayload {
  readonly text?: string;
  readonly attachments: readonly OpenClawMappedInboundAttachmentRef[];
  readonly sourceMessageRef: string;
}

export interface AdapterParsedCommandIntent {
  readonly commandName: string;
  readonly argumentsText?: string;
  readonly descriptor?: CommandDescriptor;
}

export interface AdapterHostMessageIntent extends AdapterCommandIntentBase {
  readonly sourceEventKind: 'message';
  readonly target: typeof CORE_HOST_ACTION_TARGET;
  readonly facadeMethod: typeof SUBMIT_HOST_ACTION_METHOD;
  readonly actionKind: 'message';
  readonly message: AdapterMessageIntentPayload;
}

export interface AdapterHostCommandIntent extends AdapterCommandIntentBase {
  readonly sourceEventKind: 'message';
  readonly target: typeof CORE_HOST_ACTION_TARGET;
  readonly facadeMethod: typeof SUBMIT_HOST_ACTION_METHOD;
  readonly actionKind: 'command';
  readonly message: AdapterMessageIntentPayload;
  readonly command: AdapterParsedCommandIntent;
}

export interface AdapterCallbackActionIntent extends AdapterCommandIntentBase {
  readonly sourceEventKind: 'callback';
  readonly target: typeof ADAPTER_CALLBACK_ACTION_TARGET;
  readonly facadeMethod: typeof NO_FACADE_METHOD;
  readonly actionKind: 'callback-action';
  readonly callback: {
    readonly callbackRef: string;
    readonly permissionRequired: true;
  };
  readonly permissionRequirement: PermissionRequirement;
}

export interface AdapterSystemEventIntent extends AdapterCommandIntentBase {
  readonly sourceEventKind: 'system';
  readonly target: typeof ADAPTER_SYSTEM_EVENT_TARGET;
  readonly facadeMethod: typeof NO_FACADE_METHOD;
  readonly actionKind: 'system-event';
  readonly system: {
    readonly systemEventKind: OpenClawMappedInboundSystemEvent['dispatch']['systemEventKind'];
  };
}

export type AdapterCommandIntent =
  | AdapterHostMessageIntent
  | AdapterHostCommandIntent
  | AdapterCallbackActionIntent
  | AdapterSystemEventIntent;

export type AdapterCommandIntentCompositionResult = AdapterOperationResult<AdapterCommandIntent>;

function createIntentRef(operationRef: AdapterOperationRef): AdapterCommandIntentRef {
  return `command-intent:${operationRef.slice('operation:'.length)}` as AdapterCommandIntentRef;
}

function normalizeOptionalCommandText(
  value: string | undefined,
  maxLength: number,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new TypeError(`${fieldName} must be bounded safe text.`);
  }

  return normalized;
}

function parseSlashCommand(text: string | undefined): Omit<AdapterParsedCommandIntent, 'descriptor'> | undefined {
  const normalizedText = normalizeOptionalCommandText(
    text,
    MAX_COMMAND_ARGUMENTS_LENGTH,
    'message.text',
  );

  if (normalizedText === undefined || !normalizedText.startsWith('/')) {
    return undefined;
  }

  const commandLine = normalizedText.slice(1);
  const separatorIndex = commandLine.search(/\s/u);
  const lookupToken = separatorIndex === -1 ? commandLine : commandLine.slice(0, separatorIndex);
  const commandName = (lookupToken.split('@', 1)[0] ?? '').toLowerCase();

  if (!SAFE_COMMAND_LOOKUP_PATTERN.test(commandName)) {
    throw new TypeError('Inbound command name must be a safe bounded command lookup name.');
  }

  const argumentsText = separatorIndex === -1
    ? undefined
    : normalizeOptionalCommandText(
        commandLine.slice(separatorIndex + 1),
        MAX_COMMAND_ARGUMENTS_LENGTH,
        'command.argumentsText',
      );

  return Object.freeze({
    commandName,
    ...(argumentsText === undefined ? {} : { argumentsText }),
  });
}

function createIntentContext(event: OpenClawMappedInboundEvent): AdapterOperationContext {
  return createAdapterOperationContext({
    operationRef: event.operationRef,
    correlationRef: event.correlationRef,
    workspaceRef: event.routing.workspaceRef,
    agentRef: event.routing.agentRef,
    ...(event.actor === undefined ? {} : { actorRef: event.actor.actorRef }),
    ...(event.detailsRef === undefined ? {} : { detailsRef: event.detailsRef }),
  });
}

function getPermissionRequirement(event: OpenClawMappedInboundEvent): PermissionRequirement | undefined {
  switch (event.eventKind) {
    case 'message':
    case 'callback':
      return event.permissionRequirement;
    case 'system':
      return undefined;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function createBaseIntentFields(
  event: OpenClawMappedInboundEvent,
): Omit<AdapterCommandIntentBase, 'sourceEventKind' | 'target' | 'facadeMethod' | 'actionKind'> {
  const permissionRequirement = getPermissionRequirement(event);

  return Object.freeze({
    kind: ADAPTER_COMMAND_INTENT_KIND,
    intentRef: createIntentRef(event.operationRef),
    source: ADAPTER_COMMAND_INTENT_SOURCE,
    operationRef: event.operationRef,
    correlationRef: event.correlationRef,
    workspaceRef: event.routing.workspaceRef,
    agentRef: event.routing.agentRef,
    hostSessionRef: event.routing.hostSessionRef,
    routingRef: event.routing.bindingRef,
    ...(event.idempotencyKey === undefined ? {} : { idempotencyKey: event.idempotencyKey }),
    ...(event.actor === undefined ? {} : { actorRef: event.actor.actorRef }),
    ...(event.occurredAt === undefined ? {} : { occurredAt: event.occurredAt }),
    ...(event.detailsRef === undefined ? {} : { detailsRef: event.detailsRef }),
    ...(permissionRequirement === undefined ? {} : { permissionRequirement }),
  });
}

function createMessagePayload(event: OpenClawMappedInboundMessage): AdapterMessageIntentPayload {
  return Object.freeze({
    ...(event.dispatch.text === undefined ? {} : { text: event.dispatch.text }),
    attachments: Object.freeze([...event.dispatch.attachments]),
    sourceMessageRef: event.dispatch.externalMessageRef.messageId,
  });
}

function safeFailure(
  code: AdapterSafeErrorCode,
  message: string,
  context?: AdapterOperationContext,
): AdapterCommandIntentCompositionResult {
  const detailsRef = context?.detailsRef;
  const correlationRef = context?.correlationRef;

  return adapterErr(
    createAdapterSafeError({
      code,
      message,
      retryable: code === 'dependency-missing',
      ...(detailsRef === undefined ? {} : { detailsRef }),
      ...(correlationRef === undefined ? {} : { correlationRef }),
    }),
    context,
  );
}

function composeMessageIntent(
  event: OpenClawMappedInboundMessage,
  commandSet: CommandDescriptorSet | undefined,
  context: AdapterOperationContext,
): AdapterCommandIntentCompositionResult {
  const message = createMessagePayload(event);
  const parsedCommand = parseSlashCommand(event.dispatch.text);

  if (parsedCommand === undefined) {
    return adapterOk(
      Object.freeze({
        ...createBaseIntentFields(event),
        sourceEventKind: 'message',
        target: CORE_HOST_ACTION_TARGET,
        facadeMethod: SUBMIT_HOST_ACTION_METHOD,
        actionKind: 'message',
        message,
      }),
      context,
    );
  }

  const descriptor = commandSet === undefined
    ? undefined
    : findCommandDescriptor(commandSet, parsedCommand.commandName);

  if (commandSet !== undefined && descriptor === undefined) {
    return safeFailure('not-found', 'Command descriptor was not found for inbound command.', context);
  }

  return adapterOk(
    Object.freeze({
      ...createBaseIntentFields(event),
      sourceEventKind: 'message',
      target: CORE_HOST_ACTION_TARGET,
      facadeMethod: SUBMIT_HOST_ACTION_METHOD,
      actionKind: 'command',
      message,
      command: Object.freeze({
        commandName: parsedCommand.commandName,
        ...(parsedCommand.argumentsText === undefined
          ? {}
          : { argumentsText: parsedCommand.argumentsText }),
        ...(descriptor === undefined ? {} : { descriptor }),
      }),
    }),
    context,
  );
}

function composeCallbackActionIntent(
  event: OpenClawMappedInboundCallback,
  context: AdapterOperationContext,
): AdapterCommandIntentCompositionResult {
  return adapterOk(
    Object.freeze({
      ...createBaseIntentFields(event),
      sourceEventKind: 'callback',
      target: ADAPTER_CALLBACK_ACTION_TARGET,
      facadeMethod: NO_FACADE_METHOD,
      actionKind: 'callback-action',
      callback: Object.freeze({
        callbackRef: event.dispatch.callbackId,
        permissionRequired: true,
      }),
    }),
    context,
  );
}

function composeSystemEventIntent(
  event: OpenClawMappedInboundSystemEvent,
  context: AdapterOperationContext,
): AdapterCommandIntentCompositionResult {
  return adapterOk(
    Object.freeze({
      ...createBaseIntentFields(event),
      sourceEventKind: 'system',
      target: ADAPTER_SYSTEM_EVENT_TARGET,
      facadeMethod: NO_FACADE_METHOD,
      actionKind: 'system-event',
      system: Object.freeze({
        systemEventKind: event.dispatch.systemEventKind,
      }),
    }),
    context,
  );
}

export function composeAdapterCommandIntent(
  input: AdapterCommandIntentCompositionInput,
): AdapterCommandIntentCompositionResult {
  const context = createIntentContext(input.mappedEvent);

  try {
    switch (input.mappedEvent.eventKind) {
      case 'message':
        return composeMessageIntent(input.mappedEvent, input.commandSet, context);
      case 'callback':
        return composeCallbackActionIntent(input.mappedEvent, context);
      case 'system':
        return composeSystemEventIntent(input.mappedEvent, context);
      default: {
        const _exhaustive: never = input.mappedEvent;
        return _exhaustive;
      }
    }
  } catch (error) {
    return safeFailure(
      'invalid-input',
      error instanceof Error ? error.message : 'Inbound command intent could not be composed safely.',
      context,
    );
  }
}
