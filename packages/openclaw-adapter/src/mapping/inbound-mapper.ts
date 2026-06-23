import { createAdapterOperationContext } from '../contracts/context.js';
import type { AdapterOperationContext } from '../contracts/context.js';
import {
  createCallbackIdempotencyKey,
  createInboundMessageIdempotencyKey,
} from '../contracts/idempotency.js';
import type { AdapterIdempotencyKey } from '../contracts/idempotency.js';
import type { PermissionRequirement } from '../contracts/permissions.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
} from '../contracts/result.js';
import type { AdapterOperationResult } from '../contracts/result.js';
import {
  createAgentRef,
  createWorkspaceRef,
} from '../contracts/refs.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AdapterRawDebugRef,
  AgentRef,
  WorkspaceRef,
} from '../contracts/refs.js';
import type {
  OpenClawTelegramActorRef,
  OpenClawTelegramAttachmentKind,
  OpenClawTelegramAttachmentRef,
  OpenClawTelegramCallbackEvent,
  OpenClawTelegramChannelEvent,
  OpenClawTelegramExternalMessageRef,
  OpenClawTelegramMessageEvent,
  OpenClawTelegramSystemEvent,
  TelegramForumTopicRef,
} from '../contracts/channel-events.js';
import {
  cloneTopicBindingSnapshot,
  serializeTopicBindingKey,
} from '../binding/topic-binding.js';
import type { TopicBindingKey, TopicBindingSnapshot } from '../binding/topic-binding.js';

const MAPPED_INBOUND_SOURCE = 'openclaw-telegram' as const;
const HOST_DISPATCH_TARGET = 'host-inbound-action' as const;
const CALLBACK_DISPATCH_TARGET = 'callback-token' as const;
const SYSTEM_DISPATCH_TARGET = 'system-event' as const;
const MAX_INBOUND_TEXT_LENGTH = 4096;
const MAX_DISPLAY_TEXT_LENGTH = 160;
const MAX_ATTACHMENTS = 16;
const SAFE_HOST_SESSION_REF_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const SAFE_CALLBACK_TOKEN_REF_PATTERN = /^[A-Za-z0-9._~-]+$/u;

const ATTACHMENT_KINDS = new Set<OpenClawTelegramAttachmentKind>([
  'photo',
  'video',
  'audio',
  'voice',
  'document',
  'sticker',
  'animation',
  'contact',
  'location',
  'poll',
  'unknown',
]);

export type OpenClawMappedHostSessionRef = `host-session:${string}`;
export type OpenClawMappedInboundSource = typeof MAPPED_INBOUND_SOURCE;
export type OpenClawMappedInboundDispatchTarget =
  | typeof HOST_DISPATCH_TARGET
  | typeof CALLBACK_DISPATCH_TARGET
  | typeof SYSTEM_DISPATCH_TARGET;

export interface OpenClawInboundMappingInput {
  readonly event: OpenClawTelegramChannelEvent;
  /** Trusted binding resolved before calling the mapper. Missing or inactive bindings fail safely. */
  readonly binding?: TopicBindingSnapshot;
}

export interface OpenClawMappedInboundRoutingContext {
  readonly workspaceRef: WorkspaceRef;
  readonly agentRef: AgentRef;
  readonly hostSessionRef: OpenClawMappedHostSessionRef;
  readonly bindingKey: TopicBindingKey;
  readonly bindingRef: string;
  readonly telegramTopic: {
    readonly channelId: string;
    readonly chatId: string;
    readonly messageThreadId: string;
  };
}

export interface OpenClawMappedInboundActor {
  readonly actorRef: ActorRef;
  readonly displayName?: string;
  readonly username?: string;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface OpenClawMappedInboundAttachmentRef {
  readonly kind: OpenClawTelegramAttachmentKind;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface OpenClawMappedInboundBase {
  readonly source: OpenClawMappedInboundSource;
  readonly eventKind: OpenClawTelegramChannelEvent['eventKind'];
  readonly operationRef: AdapterOperationRef;
  readonly correlationRef: AdapterCorrelationRef;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly routing: OpenClawMappedInboundRoutingContext;
  readonly actor?: OpenClawMappedInboundActor;
  readonly occurredAt?: string;
  readonly receivedAt?: string;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface OpenClawMappedInboundMessage extends OpenClawMappedInboundBase {
  readonly eventKind: 'message';
  readonly dispatch: {
    readonly target: typeof HOST_DISPATCH_TARGET;
    readonly actionKind: 'telegram-message';
    readonly text?: string;
    readonly attachments: readonly OpenClawMappedInboundAttachmentRef[];
    readonly externalMessageRef: OpenClawTelegramExternalMessageRef;
  };
  readonly permissionRequirement: PermissionRequirement;
}

export interface OpenClawMappedInboundCallback extends OpenClawMappedInboundBase {
  readonly eventKind: 'callback';
  readonly dispatch: {
    readonly target: typeof CALLBACK_DISPATCH_TARGET;
    readonly actionKind: 'telegram-callback-token';
    readonly callbackId: string;
    readonly opaqueCallbackPayload: `hz:${string}`;
    readonly tokenRef: string;
    readonly externalMessageRef?: OpenClawTelegramExternalMessageRef;
  };
  readonly permissionRequirement: PermissionRequirement;
}

export interface OpenClawMappedInboundSystemEvent extends OpenClawMappedInboundBase {
  readonly eventKind: 'system';
  readonly dispatch: {
    readonly target: typeof SYSTEM_DISPATCH_TARGET;
    readonly actionKind: 'telegram-system-event';
    readonly systemEventKind: OpenClawTelegramSystemEvent['systemEventKind'];
    readonly externalMessageRef?: OpenClawTelegramExternalMessageRef;
  };
}

export type OpenClawMappedInboundEvent =
  | OpenClawMappedInboundMessage
  | OpenClawMappedInboundCallback
  | OpenClawMappedInboundSystemEvent;

export type OpenClawInboundMappingResult = AdapterOperationResult<OpenClawMappedInboundEvent>;

function normalizeSafeHostSessionRef(sessionId: string): OpenClawMappedHostSessionRef {
  const normalized = sessionId.trim();
  if (normalized.length === 0 || normalized.length > 256 || !SAFE_HOST_SESSION_REF_PATTERN.test(normalized)) {
    throw new TypeError('Topic binding sessionId must be a bounded safe value.');
  }

  return `host-session:${normalized}` as OpenClawMappedHostSessionRef;
}

function normalizeOptionalText(value: string | undefined, maxLength: number, fieldName: string): string | undefined {
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

function cloneActor(actor: OpenClawTelegramActorRef | undefined): OpenClawMappedInboundActor | undefined {
  if (actor === undefined) {
    return undefined;
  }

  const displayName = normalizeOptionalText(actor.displayName, MAX_DISPLAY_TEXT_LENGTH, 'actor.displayName');
  const username = normalizeOptionalText(actor.username, MAX_DISPLAY_TEXT_LENGTH, 'actor.username');

  return Object.freeze({
    actorRef: actor.actorRef,
    ...(displayName === undefined ? {} : { displayName }),
    ...(username === undefined ? {} : { username }),
    ...(actor.detailsRef === undefined ? {} : { detailsRef: actor.detailsRef }),
  });
}

function cloneExternalMessageRefForRouting(
  externalMessageRef: OpenClawTelegramExternalMessageRef,
  routing: OpenClawMappedInboundRoutingContext,
): OpenClawTelegramExternalMessageRef {
  if (externalMessageRef.channelId !== routing.telegramTopic.channelId) {
    throw new TypeError('External message channel must match trusted routing context.');
  }

  if (externalMessageRef.chatId !== routing.telegramTopic.chatId) {
    throw new TypeError('External message chat must match trusted routing context.');
  }

  if (
    externalMessageRef.messageThreadId !== undefined &&
    externalMessageRef.messageThreadId !== routing.telegramTopic.messageThreadId
  ) {
    throw new TypeError('External message thread must match trusted routing context.');
  }

  return Object.freeze({
    channelId: externalMessageRef.channelId,
    chatId: externalMessageRef.chatId,
    messageId: externalMessageRef.messageId,
    ...(externalMessageRef.messageThreadId === undefined
      ? {}
      : { messageThreadId: externalMessageRef.messageThreadId }),
    ...(externalMessageRef.detailsRef === undefined ? {} : { detailsRef: externalMessageRef.detailsRef }),
  });
}

function normalizeAttachment(attachment: OpenClawTelegramAttachmentRef): OpenClawMappedInboundAttachmentRef {
  if (!ATTACHMENT_KINDS.has(attachment.kind)) {
    throw new TypeError('Unsupported OpenClaw Telegram attachment kind.');
  }

  const fileName = normalizeOptionalText(attachment.fileName, MAX_DISPLAY_TEXT_LENGTH, 'attachment.fileName');
  if (fileName !== undefined && /[/\\]/u.test(fileName)) {
    throw new TypeError('Attachment fileName must not contain path separators.');
  }

  const mimeType = normalizeOptionalText(attachment.mimeType, MAX_DISPLAY_TEXT_LENGTH, 'attachment.mimeType');
  const sizeBytes = attachment.sizeBytes;
  if (
    sizeBytes !== undefined &&
    (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
  ) {
    throw new TypeError('Attachment sizeBytes must be a non-negative safe integer.');
  }

  return Object.freeze({
    kind: attachment.kind,
    ...(fileName === undefined ? {} : { fileName }),
    ...(mimeType === undefined ? {} : { mimeType }),
    ...(sizeBytes === undefined ? {} : { sizeBytes }),
    ...(attachment.detailsRef === undefined ? {} : { detailsRef: attachment.detailsRef }),
  });
}

function normalizeAttachments(
  attachments: readonly OpenClawTelegramAttachmentRef[] | undefined,
): readonly OpenClawMappedInboundAttachmentRef[] {
  if (attachments === undefined) {
    return Object.freeze([]);
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    throw new TypeError('Inbound message attachments exceed the safe mapper limit.');
  }

  return Object.freeze(attachments.map(normalizeAttachment));
}

function createEventContext(event: OpenClawTelegramChannelEvent): AdapterOperationContext {
  return createAdapterOperationContext({
    operationRef: event.operationRef,
    correlationRef: event.correlationRef,
    ...(event.actor === undefined ? {} : { actorRef: event.actor.actorRef }),
    ...(event.detailsRef === undefined ? {} : { detailsRef: event.detailsRef }),
    ...(event.rawDebugRef === undefined ? {} : { rawDebugRef: event.rawDebugRef }),
  });
}

function safeFailure(
  code: 'invalid-input' | 'dependency-missing' | 'conflict',
  message: string,
  context: AdapterOperationContext,
): OpenClawInboundMappingResult {
  return adapterErr(
    createAdapterSafeError({
      code,
      message,
      retryable: code === 'dependency-missing',
      correlationRef: context.correlationRef,
      ...(context.detailsRef === undefined ? {} : { detailsRef: context.detailsRef }),
    }),
    context,
  );
}

function assertTopicPresent(
  event: OpenClawTelegramChannelEvent,
  context: AdapterOperationContext,
): TelegramForumTopicRef | OpenClawInboundMappingResult {
  if (event.topicRef === undefined) {
    return safeFailure(
      'invalid-input',
      'Inbound mapping requires a trusted Telegram topic reference.',
      context,
    );
  }

  return event.topicRef;
}

function resolveRouting(
  event: OpenClawTelegramChannelEvent,
  binding: TopicBindingSnapshot | undefined,
  context: AdapterOperationContext,
): OpenClawMappedInboundRoutingContext | OpenClawInboundMappingResult {
  const topicRef = assertTopicPresent(event, context);
  if ('ok' in topicRef) {
    return topicRef;
  }

  if (binding === undefined) {
    return safeFailure(
      'dependency-missing',
      'No topic binding was provided for inbound mapping.',
      context,
    );
  }

  const trustedBinding = cloneTopicBindingSnapshot(binding);
  if (trustedBinding.status !== 'active') {
    return safeFailure(
      'conflict',
      `Topic binding is ${trustedBinding.status}.`,
      context,
    );
  }

  if (trustedBinding.key.channelId !== topicRef.channelId) {
    return safeFailure(
      'conflict',
      'Inbound event channel does not match the trusted topic binding.',
      context,
    );
  }

  if (trustedBinding.key.topicId !== topicRef.messageThreadId) {
    return safeFailure(
      'conflict',
      'Inbound event thread does not match the trusted topic binding.',
      context,
    );
  }

  try {
    return Object.freeze({
      workspaceRef: createWorkspaceRef(trustedBinding.key.workspaceId),
      agentRef: createAgentRef(trustedBinding.agentId),
      hostSessionRef: normalizeSafeHostSessionRef(trustedBinding.sessionId),
      bindingKey: trustedBinding.key,
      bindingRef: serializeTopicBindingKey(trustedBinding.key),
      telegramTopic: Object.freeze({
        channelId: topicRef.channelId,
        chatId: topicRef.chatId,
        messageThreadId: topicRef.messageThreadId,
      }),
    });
  } catch (error) {
    return safeFailure(
      'invalid-input',
      error instanceof Error ? error.message : 'Invalid trusted topic binding.',
      context,
    );
  }
}

function createBaseMappedFields(
  event: OpenClawTelegramChannelEvent,
  routing: OpenClawMappedInboundRoutingContext,
): Omit<OpenClawMappedInboundBase, 'eventKind'> {
  const actor = cloneActor(event.actor);

  return Object.freeze({
    source: MAPPED_INBOUND_SOURCE,
    operationRef: event.operationRef,
    correlationRef: event.correlationRef,
    routing,
    ...(actor === undefined ? {} : { actor }),
    ...(event.occurredAt === undefined ? {} : { occurredAt: event.occurredAt }),
    ...(event.receivedAt === undefined ? {} : { receivedAt: event.receivedAt }),
    ...(event.detailsRef === undefined ? {} : { detailsRef: event.detailsRef }),
  });
}

function createTopicPermissionRequirement(input: {
  readonly event: OpenClawTelegramChannelEvent;
  readonly routing: OpenClawMappedInboundRoutingContext;
  readonly action: PermissionRequirement['action'];
  readonly resourceKind: PermissionRequirement['resourceKind'];
  readonly resourceRef: string;
}): PermissionRequirement {
  return Object.freeze({
    action: input.action,
    resourceKind: input.resourceKind,
    ...(input.event.actor === undefined ? {} : { actorRef: input.event.actor.actorRef }),
    workspaceRef: input.routing.workspaceRef,
    agentRef: input.routing.agentRef,
    resourceRef: input.resourceRef,
    correlationRef: input.event.correlationRef,
    ...(input.event.detailsRef === undefined ? {} : { detailsRef: input.event.detailsRef }),
  });
}

function mapMessageEvent(
  event: OpenClawTelegramMessageEvent,
  routing: OpenClawMappedInboundRoutingContext,
): OpenClawMappedInboundMessage {
  const text = normalizeOptionalText(event.text, MAX_INBOUND_TEXT_LENGTH, 'message.text');
  const attachments = normalizeAttachments(event.attachments);

  if (text === undefined && attachments.length === 0) {
    throw new TypeError('Inbound message must contain bounded text or attachment refs.');
  }

  const externalMessageRef = cloneExternalMessageRefForRouting(event.externalMessageRef, routing);
  const idempotencyKey = createInboundMessageIdempotencyKey({
    channelId: routing.telegramTopic.channelId,
    chatId: routing.telegramTopic.chatId,
    messageId: externalMessageRef.messageId,
    messageThreadId: routing.telegramTopic.messageThreadId,
  });

  return Object.freeze({
    ...createBaseMappedFields(event, routing),
    eventKind: 'message',
    idempotencyKey,
    dispatch: Object.freeze({
      target: HOST_DISPATCH_TARGET,
      actionKind: 'telegram-message',
      ...(text === undefined ? {} : { text }),
      attachments,
      externalMessageRef,
    }),
    permissionRequirement: createTopicPermissionRequirement({
      event,
      routing,
      action: 'send-message',
      resourceKind: 'topic',
      resourceRef: routing.bindingRef,
    }),
  });
}

function parseOpaqueCallbackPayload(payload: string): { readonly opaqueCallbackPayload: `hz:${string}`; readonly tokenRef: string } {
  const trimmedPayload = payload.trim();
  if (!trimmedPayload.startsWith('hz:')) {
    throw new TypeError('Callback payload must be an opaque hz token reference.');
  }

  const tokenRef = trimmedPayload.slice('hz:'.length);
  if (tokenRef.length === 0 || tokenRef.length > 256 || !SAFE_CALLBACK_TOKEN_REF_PATTERN.test(tokenRef)) {
    throw new TypeError('Callback token ref must be a bounded safe value.');
  }

  return Object.freeze({
    opaqueCallbackPayload: trimmedPayload as `hz:${string}`,
    tokenRef,
  });
}

function mapCallbackEvent(
  event: OpenClawTelegramCallbackEvent,
  routing: OpenClawMappedInboundRoutingContext,
): OpenClawMappedInboundCallback {
  const callbackEnvelope = parseOpaqueCallbackPayload(event.callbackPayload);
  const externalMessageRef = event.externalMessageRef === undefined
    ? undefined
    : cloneExternalMessageRefForRouting(event.externalMessageRef, routing);
  const idempotencyKey = createCallbackIdempotencyKey({
    channelId: routing.telegramTopic.channelId,
    chatId: routing.telegramTopic.chatId,
    callbackId: event.callbackId,
    messageThreadId: routing.telegramTopic.messageThreadId,
  });

  return Object.freeze({
    ...createBaseMappedFields(event, routing),
    eventKind: 'callback',
    idempotencyKey,
    dispatch: Object.freeze({
      target: CALLBACK_DISPATCH_TARGET,
      actionKind: 'telegram-callback-token',
      callbackId: event.callbackId,
      opaqueCallbackPayload: callbackEnvelope.opaqueCallbackPayload,
      tokenRef: callbackEnvelope.tokenRef,
      ...(externalMessageRef === undefined ? {} : { externalMessageRef }),
    }),
    permissionRequirement: createTopicPermissionRequirement({
      event,
      routing,
      action: 'consume-callback',
      resourceKind: 'callback',
      resourceRef: callbackEnvelope.opaqueCallbackPayload,
    }),
  });
}

function mapSystemEvent(
  event: OpenClawTelegramSystemEvent,
  routing: OpenClawMappedInboundRoutingContext,
): OpenClawMappedInboundSystemEvent {
  const externalMessageRef = event.externalMessageRef === undefined
    ? undefined
    : cloneExternalMessageRefForRouting(event.externalMessageRef, routing);

  return Object.freeze({
    ...createBaseMappedFields(event, routing),
    eventKind: 'system',
    dispatch: Object.freeze({
      target: SYSTEM_DISPATCH_TARGET,
      actionKind: 'telegram-system-event',
      systemEventKind: event.systemEventKind,
      ...(externalMessageRef === undefined ? {} : { externalMessageRef }),
    }),
  });
}

export function mapOpenClawTelegramInboundEvent(
  input: OpenClawInboundMappingInput,
): OpenClawInboundMappingResult {
  const context = createEventContext(input.event);
  const routing = resolveRouting(input.event, input.binding, context);
  if ('ok' in routing) {
    return routing;
  }

  try {
    switch (input.event.eventKind) {
      case 'message':
        return adapterOk(mapMessageEvent(input.event, routing), context);
      case 'callback':
        return adapterOk(mapCallbackEvent(input.event, routing), context);
      case 'system':
        return adapterOk(mapSystemEvent(input.event, routing), context);
      default: {
        const _exhaustive: never = input.event;
        return _exhaustive;
      }
    }
  } catch (error) {
    return safeFailure(
      'invalid-input',
      error instanceof Error ? error.message : 'Inbound event could not be mapped safely.',
      context,
    );
  }
}

export function getInboundMappingRawDebugRef(
  event: OpenClawTelegramChannelEvent,
): AdapterRawDebugRef | undefined {
  return event.rawDebugRef;
}
