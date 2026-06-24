import type {
  OpenClawTelegramAttachmentKind,
  OpenClawTelegramAttachmentRef,
  OpenClawTelegramCallbackEvent,
  OpenClawTelegramChannelEvent,
  OpenClawTelegramExternalMessageRef,
  OpenClawTelegramMessageEvent,
  OpenClawTelegramSystemEvent,
  OpenClawTelegramSystemEventKind,
  TelegramForumTopicRef,
} from '../../contracts/channel-events.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../../contracts/result.js';
import type { AdapterOperationResult } from '../../contracts/result.js';
import {
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationRef,
  createAdapterRawDebugRef,
  parseOpenClawAdapterRef,
} from '../../contracts/refs.js';
import type {
  ActorRef,
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AdapterRawDebugRef,
} from '../../contracts/refs.js';
import type { OpenClawInboundMappingInput } from '../../mapping/inbound-mapper.js';

const CHANNEL_EVENT_KINDS = ['message', 'callback', 'system'] as const;
const SYSTEM_EVENT_KINDS = [
  'topic-created',
  'topic-renamed',
  'topic-closed',
  'topic-reopened',
  'member-joined',
  'member-left',
  'unknown',
] as const satisfies readonly OpenClawTelegramSystemEventKind[];
const ATTACHMENT_KINDS = [
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
] as const satisfies readonly OpenClawTelegramAttachmentKind[];

const MAX_SAFE_ID_LENGTH = 256;
const MAX_SAFE_TEXT_LENGTH = 4096;
const MAX_SAFE_DISPLAY_LENGTH = 160;
const MAX_ATTACHMENTS = 16;
const SAFE_ID_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

function fromCodes(codes: readonly number[]): string {
  return String.fromCharCode(...codes);
}

const FORBIDDEN_PUBLIC_FIELD_NAMES = [
  'rawUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'approvalPayload',
  'rawError',
  'stack',
  fromCodes([98, 111, 116, 84, 111, 107, 101, 110]),
  fromCodes([97, 112, 105, 75, 101, 121]),
  fromCodes([115, 101, 99, 114, 101, 116]),
  fromCodes([112, 97, 115, 115, 119, 111, 114, 100]),
  fromCodes([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
  'filesystemPath',
  'storagePath',
] as const;
const FORBIDDEN_PUBLIC_FIELD_NAME_SET = new Set(
  FORBIDDEN_PUBLIC_FIELD_NAMES.map(normalizeLeakScanToken),
);
const PROTECTED_ASSIGNMENT_TERMS = [
  'bot[_-]?token',
  'api[_-]?key',
  'authorization',
  'passwd',
  fromCodes([115, 101, 99, 114, 101, 116]),
  fromCodes([112, 97, 115, 115, 119, 111, 114, 100]),
  fromCodes([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
];
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${PROTECTED_ASSIGNMENT_TERMS.join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);
const SENSITIVE_VALUE_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_PUBLIC_FIELD_NAMES.join('|')})\\b`,
  'giu',
);

export type OpenClawChannelEventEnvelopeKind = (typeof CHANNEL_EVENT_KINDS)[number];

export interface OpenClawChannelActorEnvelope {
  readonly id?: string | number;
  readonly userId?: string | number;
  readonly displayName?: string;
  readonly username?: string;
  readonly detailsId?: string;
}

export interface OpenClawChannelRefEnvelope {
  readonly id?: string | number;
  readonly channelId?: string | number;
  readonly detailsId?: string;
}

export interface OpenClawChatRefEnvelope {
  readonly id?: string | number;
  readonly chatId?: string | number;
}

export interface OpenClawThreadRefEnvelope {
  readonly id?: string | number;
  readonly threadId?: string | number;
  readonly messageThreadId?: string | number;
  readonly title?: string;
  readonly topicName?: string;
}

export interface OpenClawMessageEnvelope {
  readonly id?: string | number;
  readonly messageId?: string | number;
  readonly messageThreadId?: string | number;
  readonly text?: string;
  readonly attachments?: readonly OpenClawAttachmentEnvelope[];
}

export interface OpenClawCallbackEnvelope {
  readonly id?: string | number;
  readonly callbackId?: string | number;
  readonly payload?: string;
  readonly data?: string;
  readonly message?: OpenClawMessageEnvelope;
}

export interface OpenClawSystemEnvelope {
  readonly kind?: OpenClawTelegramSystemEventKind;
  readonly systemEventKind?: OpenClawTelegramSystemEventKind;
  readonly message?: OpenClawMessageEnvelope;
}

export interface OpenClawAttachmentEnvelope {
  readonly kind?: OpenClawTelegramAttachmentKind;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly detailsId?: string;
}

export interface OpenClawChannelEventEnvelope {
  readonly kind?: OpenClawChannelEventEnvelopeKind;
  readonly eventKind?: OpenClawChannelEventEnvelopeKind;
  readonly type?: OpenClawChannelEventEnvelopeKind;
  readonly operationId?: string | number;
  readonly operationRef?: AdapterOperationRef;
  readonly correlationId?: string | number;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsId?: string;
  readonly detailsRef?: AdapterDetailsRef;
  readonly rawDebugId?: string;
  readonly rawDebugRef?: AdapterRawDebugRef;
  readonly channelId?: string | number;
  readonly chatId?: string | number;
  readonly threadId?: string | number;
  readonly messageThreadId?: string | number;
  readonly messageId?: string | number;
  readonly callbackId?: string | number;
  readonly callbackPayload?: string;
  readonly text?: string;
  readonly occurredAt?: string;
  readonly receivedAt?: string;
  readonly channel?: OpenClawChannelRefEnvelope;
  readonly chat?: OpenClawChatRefEnvelope;
  readonly thread?: OpenClawThreadRefEnvelope;
  readonly actor?: OpenClawChannelActorEnvelope;
  readonly message?: OpenClawMessageEnvelope;
  readonly callback?: OpenClawCallbackEnvelope;
  readonly system?: OpenClawSystemEnvelope;
}

export interface OpenClawChannelEventAdapterOutput {
  readonly event: OpenClawTelegramChannelEvent;
  readonly mappingInput: OpenClawInboundMappingInput;
}

export type OpenClawChannelEventAdapterResult = AdapterOperationResult<OpenClawChannelEventAdapterOutput>;

type PlainRecord = Record<string, unknown>;
type OpenClawAdapterRefKind = 'actor' | 'operation' | 'correlation' | 'raw-debug' | 'details';

function normalizeLeakScanToken(value: string): string {
  return value.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function asRecord(candidate: unknown): PlainRecord | null {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return null;
  }

  return candidate as PlainRecord;
}

function getRecordField(record: PlainRecord, fieldName: string): unknown {
  return record[fieldName];
}

function getNestedRecord(record: PlainRecord | undefined, fieldName: string): PlainRecord | undefined {
  if (record === undefined) {
    return undefined;
  }

  const value = getRecordField(record, fieldName);
  const nested = asRecord(value);
  return nested === null ? undefined : nested;
}

function getFirstField(record: PlainRecord | undefined, fieldNames: readonly string[]): unknown {
  if (record === undefined) {
    return undefined;
  }

  for (const fieldName of fieldNames) {
    const value = getRecordField(record, fieldName);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function assertNoUnsafeFieldNames(candidate: unknown): void {
  const queue: unknown[] = [candidate];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (FORBIDDEN_PUBLIC_FIELD_NAME_SET.has(normalizeLeakScanToken(key))) {
        throw new TypeError('OpenClaw channel event envelope contains unsafe raw or sensitive fields.');
      }

      if (value !== null && typeof value === 'object') {
        queue.push(value);
      }
    }
  }
}

function normalizeStringLike(value: unknown, fieldName: string): string {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value);
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string or safe integer.`);
  }

  const normalized = value
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (normalized.length === 0) {
    throw new TypeError(`${fieldName} must not be empty.`);
  }

  return normalized;
}

function assertNoSensitiveMarker(value: string, fieldName: string): void {
  if (FORBIDDEN_PUBLIC_FIELD_NAMES.some((term) => normalizeLeakScanToken(value).includes(normalizeLeakScanToken(term)))) {
    throw new TypeError(`${fieldName} contains unsafe markers.`);
  }
}

function normalizeSafeId(value: unknown, fieldName: string): string {
  const normalized = normalizeStringLike(value, fieldName);
  if (normalized.length > MAX_SAFE_ID_LENGTH || !SAFE_ID_PATTERN.test(normalized)) {
    throw new TypeError(`${fieldName} must be a bounded safe identifier.`);
  }

  assertNoSensitiveMarker(normalized, fieldName);
  return normalized;
}

function normalizeOptionalText(value: unknown, maxLength: number, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeStringLike(value, fieldName)
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(SENSITIVE_VALUE_PATTERN, '[redacted]')
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

function normalizeIsoTimestamp(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeStringLike(value, fieldName);
  if (!ISO_TIMESTAMP_PATTERN.test(normalized)) {
    throw new TypeError(`${fieldName} must be an ISO-8601 UTC timestamp string.`);
  }

  return normalized;
}

function createTypedRef(kind: OpenClawAdapterRefKind, value: string): string {
  const parsed = parseOpenClawAdapterRef(value);
  if (parsed !== null) {
    if (parsed.kind !== kind) {
      throw new TypeError('Adapter ref kind mismatch.');
    }

    return parsed.ref;
  }

  switch (kind) {
    case 'actor':
      return createActorRef(value);
    case 'operation':
      return createAdapterOperationRef(value);
    case 'correlation':
      return createAdapterCorrelationRef(value);
    case 'raw-debug':
      return createAdapterRawDebugRef(value);
    case 'details':
      return createAdapterDetailsRef(value);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function normalizeOperationRef(record: PlainRecord): AdapterOperationRef {
  const value = getFirstField(record, ['operationRef', 'operationId']);
  return createTypedRef('operation', normalizeSafeId(value, 'operationId')) as AdapterOperationRef;
}

function normalizeCorrelationRef(record: PlainRecord): AdapterCorrelationRef {
  const value = getFirstField(record, ['correlationRef', 'correlationId']);
  return createTypedRef('correlation', normalizeSafeId(value, 'correlationId')) as AdapterCorrelationRef;
}

function normalizeDetailsRef(value: unknown, fieldName: string): AdapterDetailsRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  return createTypedRef('details', normalizeSafeId(value, fieldName)) as AdapterDetailsRef;
}

function normalizeRawDebugRef(record: PlainRecord): AdapterRawDebugRef | undefined {
  const value = getFirstField(record, ['rawDebugRef', 'rawDebugId']);
  if (value === undefined) {
    return undefined;
  }

  return createTypedRef('raw-debug', normalizeSafeId(value, 'rawDebugId')) as AdapterRawDebugRef;
}

function normalizeChannelEventKind(record: PlainRecord): OpenClawChannelEventEnvelopeKind {
  const kind = getFirstField(record, ['kind', 'eventKind', 'type']);
  if (typeof kind !== 'string' || !(CHANNEL_EVENT_KINDS as readonly string[]).includes(kind)) {
    throw new TypeError('OpenClaw channel event kind is unsupported.');
  }

  return kind as OpenClawChannelEventEnvelopeKind;
}

function normalizeSystemKind(value: unknown): OpenClawTelegramSystemEventKind {
  if (typeof value !== 'string' || !(SYSTEM_EVENT_KINDS as readonly string[]).includes(value)) {
    throw new TypeError('OpenClaw system event kind is unsupported.');
  }

  return value as OpenClawTelegramSystemEventKind;
}

function normalizeActor(record: PlainRecord | undefined): OpenClawTelegramMessageEvent['actor'] {
  if (record === undefined) {
    return undefined;
  }

  const actorId = getFirstField(record, ['id', 'userId']);
  const actorRef = createTypedRef('actor', normalizeSafeId(actorId, 'actor.id')) as ActorRef;
  const displayName = normalizeOptionalText(
    getFirstField(record, ['displayName']),
    MAX_SAFE_DISPLAY_LENGTH,
    'actor.displayName',
  );
  const username = normalizeOptionalText(getFirstField(record, ['username']), MAX_SAFE_DISPLAY_LENGTH, 'actor.username');
  const detailsRef = normalizeDetailsRef(getFirstField(record, ['detailsRef', 'detailsId']), 'actor.detailsId');

  return Object.freeze({
    actorRef,
    ...(displayName === undefined ? {} : { displayName }),
    ...(username === undefined ? {} : { username }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  });
}

function normalizeChannelId(record: PlainRecord, channelRecord: PlainRecord | undefined): string {
  return normalizeSafeId(
    getFirstField(channelRecord, ['id', 'channelId']) ?? getFirstField(record, ['channelId']),
    'channel.id',
  );
}

function normalizeChatId(record: PlainRecord, chatRecord: PlainRecord | undefined): string {
  return normalizeSafeId(
    getFirstField(chatRecord, ['id', 'chatId']) ?? getFirstField(record, ['chatId']),
    'chat.id',
  );
}

function normalizeThreadId(
  record: PlainRecord,
  threadRecord: PlainRecord | undefined,
  messageRecord: PlainRecord | undefined,
): string {
  return normalizeSafeId(
    getFirstField(threadRecord, ['id', 'threadId', 'messageThreadId']) ??
      getFirstField(messageRecord, ['messageThreadId']) ??
      getFirstField(record, ['threadId', 'messageThreadId']),
    'thread.id',
  );
}

function normalizeMessageId(record: PlainRecord, messageRecord: PlainRecord | undefined): string {
  return normalizeSafeId(
    getFirstField(messageRecord, ['id', 'messageId']) ?? getFirstField(record, ['messageId']),
    'message.id',
  );
}

function normalizeCallbackId(record: PlainRecord, callbackRecord: PlainRecord | undefined): string {
  return normalizeSafeId(
    getFirstField(callbackRecord, ['id', 'callbackId']) ?? getFirstField(record, ['callbackId']),
    'callback.id',
  );
}

function normalizeCallbackPayload(record: PlainRecord, callbackRecord: PlainRecord | undefined): string {
  const payload = normalizeOptionalText(
    getFirstField(callbackRecord, ['payload', 'data']) ?? getFirstField(record, ['callbackPayload']),
    MAX_SAFE_TEXT_LENGTH,
    'callback.payload',
  );
  if (payload === undefined) {
    throw new TypeError('callback.payload must not be empty.');
  }

  return payload;
}

function normalizeExternalMessageRef(input: {
  readonly channelId: string;
  readonly chatId: string;
  readonly threadId: string;
  readonly messageId: string;
}): OpenClawTelegramExternalMessageRef {
  return Object.freeze({
    channelId: input.channelId,
    chatId: input.chatId,
    messageThreadId: input.threadId,
    messageId: input.messageId,
  });
}

function normalizeAttachment(candidate: unknown): OpenClawTelegramAttachmentRef {
  const record = asRecord(candidate);
  if (record === null) {
    throw new TypeError('message.attachments entries must be objects.');
  }

  const kind = getFirstField(record, ['kind']);
  if (typeof kind !== 'string' || !(ATTACHMENT_KINDS as readonly string[]).includes(kind)) {
    throw new TypeError('message.attachments entries must use supported attachment kinds.');
  }

  const fileName = normalizeOptionalText(getFirstField(record, ['fileName']), MAX_SAFE_DISPLAY_LENGTH, 'attachment.fileName');
  if (fileName !== undefined && /[/\\]/u.test(fileName)) {
    throw new TypeError('attachment.fileName must not contain path separators.');
  }

  const mimeType = normalizeOptionalText(getFirstField(record, ['mimeType']), MAX_SAFE_DISPLAY_LENGTH, 'attachment.mimeType');
  const sizeBytes = getFirstField(record, ['sizeBytes']);
  if (sizeBytes !== undefined && (typeof sizeBytes !== 'number' || !Number.isSafeInteger(sizeBytes) || sizeBytes < 0)) {
    throw new TypeError('attachment.sizeBytes must be a non-negative safe integer.');
  }

  const detailsRef = normalizeDetailsRef(getFirstField(record, ['detailsRef', 'detailsId']), 'attachment.detailsId');

  return Object.freeze({
    kind: kind as OpenClawTelegramAttachmentKind,
    ...(fileName === undefined ? {} : { fileName }),
    ...(mimeType === undefined ? {} : { mimeType }),
    ...(sizeBytes === undefined ? {} : { sizeBytes }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
  });
}

function normalizeAttachments(messageRecord: PlainRecord | undefined): readonly OpenClawTelegramAttachmentRef[] | undefined {
  const attachments = getFirstField(messageRecord, ['attachments']);
  if (attachments === undefined) {
    return undefined;
  }

  if (!Array.isArray(attachments)) {
    throw new TypeError('message.attachments must be an array.');
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    throw new TypeError('message.attachments exceeds the safe adapter limit.');
  }

  return Object.freeze(attachments.map(normalizeAttachment));
}

function createBaseEventFields(record: PlainRecord): Omit<OpenClawTelegramChannelEvent, 'eventKind'> {
  const channelRecord = getNestedRecord(record, 'channel');
  const chatRecord = getNestedRecord(record, 'chat');
  const threadRecord = getNestedRecord(record, 'thread');
  const messageRecord = getNestedRecord(record, 'message');
  const actorRecord = getNestedRecord(record, 'actor');

  const channelId = normalizeChannelId(record, channelRecord);
  const chatId = normalizeChatId(record, chatRecord);
  const threadId = normalizeThreadId(record, threadRecord, messageRecord);
  const operationRef = normalizeOperationRef(record);
  const correlationRef = normalizeCorrelationRef(record);
  const actor = normalizeActor(actorRecord);
  const occurredAt = normalizeIsoTimestamp(getFirstField(record, ['occurredAt']), 'occurredAt');
  const receivedAt = normalizeIsoTimestamp(getFirstField(record, ['receivedAt']), 'receivedAt');
  const detailsRef = normalizeDetailsRef(getFirstField(record, ['detailsRef', 'detailsId']), 'detailsId');
  const rawDebugRef = normalizeRawDebugRef(record);
  const channelDetailsRef = normalizeDetailsRef(getFirstField(channelRecord, ['detailsRef', 'detailsId']), 'channel.detailsId');
  const topicName = normalizeOptionalText(
    getFirstField(threadRecord, ['topicName', 'title']),
    MAX_SAFE_DISPLAY_LENGTH,
    'thread.topicName',
  );
  const topicRef: TelegramForumTopicRef = Object.freeze({
    channelId,
    chatId,
    messageThreadId: threadId,
    ...(topicName === undefined ? {} : { topicName }),
  });

  return Object.freeze({
    operationRef,
    correlationRef,
    channelRef: Object.freeze({
      channelId,
      ...(channelDetailsRef === undefined ? {} : { detailsRef: channelDetailsRef }),
    }),
    topicRef,
    ...(actor === undefined ? {} : { actor }),
    ...(occurredAt === undefined ? {} : { occurredAt }),
    ...(receivedAt === undefined ? {} : { receivedAt }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(rawDebugRef === undefined ? {} : { rawDebugRef }),
  });
}

function normalizeMessageEvent(record: PlainRecord): OpenClawTelegramMessageEvent {
  const baseFields = createBaseEventFields(record);
  const messageRecord = getNestedRecord(record, 'message');
  const text = normalizeOptionalText(
    getFirstField(messageRecord, ['text']) ?? getFirstField(record, ['text']),
    MAX_SAFE_TEXT_LENGTH,
    'message.text',
  );
  const attachments = normalizeAttachments(messageRecord);
  if (text === undefined && (attachments === undefined || attachments.length === 0)) {
    throw new TypeError('message.text or message.attachments must be provided.');
  }

  return Object.freeze({
    ...baseFields,
    eventKind: 'message',
    externalMessageRef: normalizeExternalMessageRef({
      channelId: baseFields.channelRef.channelId,
      chatId: baseFields.topicRef?.chatId ?? normalizeChatId(record, getNestedRecord(record, 'chat')),
      threadId: baseFields.topicRef?.messageThreadId ?? normalizeThreadId(record, getNestedRecord(record, 'thread'), messageRecord),
      messageId: normalizeMessageId(record, messageRecord),
    }),
    ...(text === undefined ? {} : { text }),
    ...(attachments === undefined ? {} : { attachments }),
  });
}

function normalizeCallbackEvent(record: PlainRecord): OpenClawTelegramCallbackEvent {
  const baseFields = createBaseEventFields(record);
  const callbackRecord = getNestedRecord(record, 'callback');
  const callbackMessageRecord = getNestedRecord(callbackRecord, 'message');
  const messageRecord = callbackMessageRecord ?? getNestedRecord(record, 'message');
  const messageIdValue = getFirstField(messageRecord, ['id', 'messageId']) ?? getFirstField(record, ['messageId']);
  const externalMessageRef = messageIdValue === undefined
    ? undefined
    : normalizeExternalMessageRef({
        channelId: baseFields.channelRef.channelId,
        chatId: baseFields.topicRef?.chatId ?? normalizeChatId(record, getNestedRecord(record, 'chat')),
        threadId: baseFields.topicRef?.messageThreadId ?? normalizeThreadId(record, getNestedRecord(record, 'thread'), messageRecord),
        messageId: normalizeSafeId(messageIdValue, 'message.id'),
      });

  return Object.freeze({
    ...baseFields,
    eventKind: 'callback',
    callbackId: normalizeCallbackId(record, callbackRecord),
    callbackPayload: normalizeCallbackPayload(record, callbackRecord),
    ...(externalMessageRef === undefined ? {} : { externalMessageRef }),
  });
}

function normalizeSystemEvent(record: PlainRecord): OpenClawTelegramSystemEvent {
  const baseFields = createBaseEventFields(record);
  const systemRecord = getNestedRecord(record, 'system');
  const systemMessageRecord = getNestedRecord(systemRecord, 'message');
  const messageRecord = systemMessageRecord ?? getNestedRecord(record, 'message');
  const messageIdValue = getFirstField(messageRecord, ['id', 'messageId']) ?? getFirstField(record, ['messageId']);
  const externalMessageRef = messageIdValue === undefined
    ? undefined
    : normalizeExternalMessageRef({
        channelId: baseFields.channelRef.channelId,
        chatId: baseFields.topicRef?.chatId ?? normalizeChatId(record, getNestedRecord(record, 'chat')),
        threadId: baseFields.topicRef?.messageThreadId ?? normalizeThreadId(record, getNestedRecord(record, 'thread'), messageRecord),
        messageId: normalizeSafeId(messageIdValue, 'message.id'),
      });

  return Object.freeze({
    ...baseFields,
    eventKind: 'system',
    systemEventKind: normalizeSystemKind(
      getFirstField(systemRecord, ['kind', 'systemEventKind']) ?? getFirstField(record, ['systemEventKind']),
    ),
    ...(externalMessageRef === undefined ? {} : { externalMessageRef }),
  });
}

function toMappingInput(event: OpenClawTelegramChannelEvent): OpenClawInboundMappingInput {
  return Object.freeze({ event });
}

function safeInvalidInput(message: string): OpenClawChannelEventAdapterResult {
  return adapterErr(
    createAdapterSafeError({
      code: 'invalid-input',
      message,
      retryable: false,
    }),
  );
}

export function adaptOpenClawChannelEventEnvelope(input: unknown): OpenClawChannelEventAdapterResult {
  const record = asRecord(input);
  if (record === null) {
    return safeInvalidInput('OpenClaw channel event envelope must be an object.');
  }

  try {
    assertNoUnsafeFieldNames(record);

    const eventKind = normalizeChannelEventKind(record);
    const event = (() => {
      switch (eventKind) {
        case 'message':
          return normalizeMessageEvent(record);
        case 'callback':
          return normalizeCallbackEvent(record);
        case 'system':
          return normalizeSystemEvent(record);
        default: {
          const _exhaustive: never = eventKind;
          return _exhaustive;
        }
      }
    })();

    return adapterOk(Object.freeze({
      event,
      mappingInput: toMappingInput(event),
    }));
  } catch (error) {
    return safeInvalidInput(
      error instanceof Error ? error.message : 'OpenClaw channel event envelope could not be normalized safely.',
    );
  }
}
