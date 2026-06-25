import type { AdapterIdempotencyKey } from '../contracts/idempotency.js';
import { isAdapterIdempotencyKey } from '../contracts/idempotency.js';
import {
  parseOpenClawAdapterRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
} from '../contracts/refs.js';
import {
  createAdapterSafeError,
  type AdapterSafeError,
} from '../contracts/result.js';

export const INBOUND_IDEMPOTENCY_RECORD_KIND = 'openclaw-inbound-idempotency-record' as const;

const INBOUND_EVENT_KINDS = ['message', 'callback'] as const;
const INBOUND_IDEMPOTENCY_RECORD_STATUSES = ['reserved', 'completed', 'failed'] as const;
const MAX_SAFE_INBOUND_REF_LENGTH = 256;
const MAX_SAFE_INBOUND_FINGERPRINT_LENGTH = 320;
const SAFE_INBOUND_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const PROTECTED_ASSIGNMENT_PATTERN = /\b(?:bot[_-]?token|api[_-]?key|authorization|password|passwd|credential|secret|endpoint|path)\b\s*[:=]\s*\S+/giu;
const FORBIDDEN_PUBLIC_FIELD_NAME_PARTS = [
  'raw',
  'payload',
  'secret',
  'credential',
  'password',
  'authorization',
  'endpoint',
  'stack',
  'sdk',
  'client',
] as const;
const FORBIDDEN_STRING_PARTS = [
  'bot-token',
  'bottoken',
  'api-key',
  'apikey',
  'authorization',
  'password',
  'credential',
  'secret',
  'endpoint',
  'stacktrace',
] as const;

export type InboundIdempotencyEventKind = (typeof INBOUND_EVENT_KINDS)[number];
export type InboundIdempotencyRecordStatus = (typeof INBOUND_IDEMPOTENCY_RECORD_STATUSES)[number];

export type InboundIdempotencyEventRef = `inbound-event:${string}`;
export type InboundIdempotencyChannelRef = `channel:${string}` | `telegram-channel:${string}` | string;
export type InboundIdempotencyChatRef = `chat:${string}` | `telegram-chat:${string}` | string;
export type InboundIdempotencyThreadRef = `thread:${string}` | `telegram-thread:${string}` | string;
export type InboundIdempotencyMessageRef = `message:${string}` | `telegram-message:${string}` | string;
export type InboundIdempotencyCallbackRef = `callback:${string}` | string;
export type InboundIdempotencySeenRef = `seen:${string}` | string;
export type InboundIdempotencyOutcomeRef = `outcome:${string}` | string;
export type InboundIdempotencyProcessedRef = `processed:${string}` | string;
export type InboundIdempotencyFailureRef = `failure:${string}` | string;
export type InboundIdempotencyFingerprint = `fingerprint:${string}` | string;

export type InboundIdempotencySuppressedEffect =
  | 'command-intent-dispatch'
  | 'runtime-dispatch'
  | 'delivery'
  | 'callback-consume'
  | 'approval-state';

export const INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS: readonly InboundIdempotencySuppressedEffect[] = Object.freeze([
  'command-intent-dispatch',
  'runtime-dispatch',
  'delivery',
  'callback-consume',
  'approval-state',
]);

export interface InboundIdempotencyRecord {
  readonly kind: typeof INBOUND_IDEMPOTENCY_RECORD_KIND;
  readonly eventRef: InboundIdempotencyEventRef;
  readonly idempotencyRef: AdapterIdempotencyKey;
  readonly eventKind: InboundIdempotencyEventKind;
  readonly channelRef: InboundIdempotencyChannelRef;
  readonly chatRef?: InboundIdempotencyChatRef;
  readonly threadRef?: InboundIdempotencyThreadRef;
  readonly messageRef?: InboundIdempotencyMessageRef;
  readonly callbackRef?: InboundIdempotencyCallbackRef;
  readonly firstSeenRef: InboundIdempotencySeenRef;
  readonly lastSeenRef?: InboundIdempotencySeenRef;
  readonly safeEventFingerprint: InboundIdempotencyFingerprint;
  readonly status: InboundIdempotencyRecordStatus;
  readonly lastOutcomeRef?: InboundIdempotencyOutcomeRef;
  readonly processedRef?: InboundIdempotencyProcessedRef;
  readonly failureRef?: InboundIdempotencyFailureRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly error?: AdapterSafeError;
}

export interface InboundIdempotencyRecordInput {
  readonly eventRef: InboundIdempotencyEventRef;
  readonly idempotencyRef: AdapterIdempotencyKey;
  readonly eventKind: InboundIdempotencyEventKind;
  readonly channelRef: InboundIdempotencyChannelRef;
  readonly chatRef?: InboundIdempotencyChatRef;
  readonly threadRef?: InboundIdempotencyThreadRef;
  readonly messageRef?: InboundIdempotencyMessageRef;
  readonly callbackRef?: InboundIdempotencyCallbackRef;
  readonly firstSeenRef: InboundIdempotencySeenRef;
  readonly lastSeenRef?: InboundIdempotencySeenRef;
  readonly safeEventFingerprint?: InboundIdempotencyFingerprint;
  readonly status?: InboundIdempotencyRecordStatus;
  readonly lastOutcomeRef?: InboundIdempotencyOutcomeRef;
  readonly processedRef?: InboundIdempotencyProcessedRef;
  readonly failureRef?: InboundIdempotencyFailureRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly error?: AdapterSafeError;
}

function isOneOf<T extends readonly string[]>(values: T, candidate: string): candidate is T[number] {
  return values.includes(candidate);
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function hasForbiddenPublicFieldName(fieldName: string): boolean {
  const normalized = normalizeFieldName(fieldName);

  return FORBIDDEN_PUBLIC_FIELD_NAME_PARTS.some((part) => normalized.includes(part));
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function assertPlainRecord(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (!isPlainRecord(input)) {
    throw new TypeError(`${label} must be a plain record.`);
  }
}

export function rejectUnsafeInboundIdempotencyFields(
  input: unknown,
  label = 'Inbound idempotency value',
  seen = new Set<object>(),
): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const item of input) {
      rejectUnsafeInboundIdempotencyFields(item, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (hasForbiddenPublicFieldName(fieldName)) {
      throw new TypeError(`${label} must not include unsafe public field names.`);
    }
    rejectUnsafeInboundIdempotencyFields(value, label, seen);
  }
}

function containsForbiddenStringPart(input: string): boolean {
  const normalized = input.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();

  return FORBIDDEN_STRING_PARTS.some((part) => normalized.includes(part.replace(/[^A-Za-z0-9]/gu, '')));
}

function sanitizeSafeInboundText(input: string): string {
  return input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(PROTECTED_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeSafeInboundRef<T extends string>(input: unknown, label: string, maxLength = MAX_SAFE_INBOUND_REF_LENGTH): T {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = sanitizeSafeInboundText(input);
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    normalized !== input.trim() ||
    !SAFE_INBOUND_REF_PATTERN.test(normalized) ||
    containsForbiddenStringPart(normalized)
  ) {
    throw new TypeError(`${label} must be a bounded safe ref.`);
  }

  return normalized as T;
}

function normalizeOptionalSafeInboundRef<T extends string>(input: unknown, label: string): T | undefined {
  return input === undefined ? undefined : normalizeSafeInboundRef<T>(input, label);
}

function normalizeCorrelationRef(input: unknown, label: string): AdapterCorrelationRef | undefined {
  if (input === undefined) {
    return undefined;
  }

  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== 'correlation' || containsForbiddenStringPart(parsed.ref)) {
    throw new TypeError(`${label} must be a safe correlation ref.`);
  }

  return parsed.ref as AdapterCorrelationRef;
}

function normalizeDetailsRef(input: unknown, label: string): AdapterDetailsRef | undefined {
  if (input === undefined) {
    return undefined;
  }

  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== 'details' || containsForbiddenStringPart(parsed.ref)) {
    throw new TypeError(`${label} must be a safe details ref.`);
  }

  return parsed.ref as AdapterDetailsRef;
}

function normalizeInboundIdempotencyRef(input: unknown, eventKind: InboundIdempotencyEventKind): AdapterIdempotencyKey {
  if (!isAdapterIdempotencyKey(input)) {
    throw new TypeError('Inbound idempotency idempotencyRef must be a safe adapter idempotency ref.');
  }

  const [scope] = input.split(':');
  if (eventKind === 'message' && scope !== 'inbound-message') {
    throw new TypeError('Message inbound idempotency records require an inbound-message idempotency scope.');
  }
  if (eventKind === 'callback' && scope !== 'callback') {
    throw new TypeError('Callback inbound idempotency records require a callback idempotency scope.');
  }

  if (containsForbiddenStringPart(input)) {
    throw new TypeError('Inbound idempotency idempotencyRef must not contain protected terms.');
  }

  return input;
}

function normalizeEventKind(input: unknown): InboundIdempotencyEventKind {
  if (typeof input !== 'string' || !isOneOf(INBOUND_EVENT_KINDS, input)) {
    throw new TypeError('Inbound idempotency eventKind must be message or callback.');
  }

  return input;
}

function normalizeRecordStatus(input: unknown): InboundIdempotencyRecordStatus {
  if (typeof input !== 'string' || !isOneOf(INBOUND_IDEMPOTENCY_RECORD_STATUSES, input)) {
    throw new TypeError('Inbound idempotency status must be reserved, completed, or failed.');
  }

  return input;
}

function normalizeSafeError(input: AdapterSafeError): AdapterSafeError {
  assertPlainRecord(input, 'Inbound idempotency safe error');
  rejectUnsafeInboundIdempotencyFields(input, 'Inbound idempotency safe error');

  if (typeof input.code !== 'string' || typeof input.message !== 'string') {
    throw new TypeError('Inbound idempotency safe error requires safe code and message fields.');
  }
  if (input.retryable !== undefined && typeof input.retryable !== 'boolean') {
    throw new TypeError('Inbound idempotency safe error retryable must be a boolean.');
  }

  const detailsRef = normalizeDetailsRef(input.detailsRef, 'Inbound idempotency safe error detailsRef');
  const correlationRef = normalizeCorrelationRef(input.correlationRef, 'Inbound idempotency safe error correlationRef');

  return createAdapterSafeError({
    code: input.code as AdapterSafeError['code'],
    message: sanitizeSafeInboundText(input.message),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function validateEventSpecificRefs(input: {
  readonly eventKind: InboundIdempotencyEventKind;
  readonly messageRef?: InboundIdempotencyMessageRef;
  readonly callbackRef?: InboundIdempotencyCallbackRef;
}): void {
  if (input.eventKind === 'message') {
    if (input.messageRef === undefined || input.callbackRef !== undefined) {
      throw new TypeError('Message inbound idempotency records require messageRef only.');
    }
    return;
  }

  if (input.callbackRef === undefined || input.messageRef !== undefined) {
    throw new TypeError('Callback inbound idempotency records require callbackRef only.');
  }
}

function createFingerprintFromSafeRefs(input: {
  readonly eventRef: InboundIdempotencyEventRef;
  readonly idempotencyRef: AdapterIdempotencyKey;
  readonly eventKind: InboundIdempotencyEventKind;
  readonly channelRef: InboundIdempotencyChannelRef;
  readonly chatRef?: InboundIdempotencyChatRef;
  readonly threadRef?: InboundIdempotencyThreadRef;
  readonly messageRef?: InboundIdempotencyMessageRef;
  readonly callbackRef?: InboundIdempotencyCallbackRef;
}): InboundIdempotencyFingerprint {
  const fingerprint = [
    'fingerprint',
    input.eventKind,
    input.eventRef,
    input.idempotencyRef,
    input.channelRef,
    input.chatRef ?? 'chat-none',
    input.threadRef ?? 'thread-none',
    input.messageRef ?? 'message-none',
    input.callbackRef ?? 'callback-none',
  ].join(':');

  return normalizeSafeInboundRef<InboundIdempotencyFingerprint>(
    fingerprint,
    'Inbound idempotency safeEventFingerprint',
    MAX_SAFE_INBOUND_FINGERPRINT_LENGTH,
  );
}

export function createInboundIdempotencyFingerprint(
  input: Pick<
    InboundIdempotencyRecordInput,
    'eventRef' | 'idempotencyRef' | 'eventKind' | 'channelRef' | 'chatRef' | 'threadRef' | 'messageRef' | 'callbackRef'
  >,
): InboundIdempotencyFingerprint {
  const eventKind = normalizeEventKind(input.eventKind);
  const eventRef = normalizeSafeInboundRef<InboundIdempotencyEventRef>(input.eventRef, 'Inbound idempotency eventRef');
  const idempotencyRef = normalizeInboundIdempotencyRef(input.idempotencyRef, eventKind);
  const channelRef = normalizeSafeInboundRef<InboundIdempotencyChannelRef>(input.channelRef, 'Inbound idempotency channelRef');
  const chatRef = normalizeOptionalSafeInboundRef<InboundIdempotencyChatRef>(input.chatRef, 'Inbound idempotency chatRef');
  const threadRef = normalizeOptionalSafeInboundRef<InboundIdempotencyThreadRef>(input.threadRef, 'Inbound idempotency threadRef');
  const messageRef = normalizeOptionalSafeInboundRef<InboundIdempotencyMessageRef>(input.messageRef, 'Inbound idempotency messageRef');
  const callbackRef = normalizeOptionalSafeInboundRef<InboundIdempotencyCallbackRef>(input.callbackRef, 'Inbound idempotency callbackRef');

  validateEventSpecificRefs({ eventKind, messageRef, callbackRef });

  return createFingerprintFromSafeRefs({
    eventRef,
    idempotencyRef,
    eventKind,
    channelRef,
    ...(chatRef === undefined ? {} : { chatRef }),
    ...(threadRef === undefined ? {} : { threadRef }),
    ...(messageRef === undefined ? {} : { messageRef }),
    ...(callbackRef === undefined ? {} : { callbackRef }),
  });
}

export function normalizeInboundIdempotencyRecord(
  input: unknown,
  label = 'Inbound idempotency record',
): InboundIdempotencyRecord {
  assertPlainRecord(input, label);
  rejectUnsafeInboundIdempotencyFields(input, label);

  if (input.kind !== INBOUND_IDEMPOTENCY_RECORD_KIND) {
    throw new TypeError(`${label} kind is unsupported.`);
  }

  const eventKind = normalizeEventKind(input.eventKind);
  const status = normalizeRecordStatus(input.status);
  const eventRef = normalizeSafeInboundRef<InboundIdempotencyEventRef>(input.eventRef, `${label} eventRef`);
  const idempotencyRef = normalizeInboundIdempotencyRef(input.idempotencyRef, eventKind);
  const channelRef = normalizeSafeInboundRef<InboundIdempotencyChannelRef>(input.channelRef, `${label} channelRef`);
  const chatRef = normalizeOptionalSafeInboundRef<InboundIdempotencyChatRef>(input.chatRef, `${label} chatRef`);
  const threadRef = normalizeOptionalSafeInboundRef<InboundIdempotencyThreadRef>(input.threadRef, `${label} threadRef`);
  const messageRef = normalizeOptionalSafeInboundRef<InboundIdempotencyMessageRef>(input.messageRef, `${label} messageRef`);
  const callbackRef = normalizeOptionalSafeInboundRef<InboundIdempotencyCallbackRef>(input.callbackRef, `${label} callbackRef`);
  const firstSeenRef = normalizeSafeInboundRef<InboundIdempotencySeenRef>(input.firstSeenRef, `${label} firstSeenRef`);
  const lastSeenRef = normalizeOptionalSafeInboundRef<InboundIdempotencySeenRef>(input.lastSeenRef, `${label} lastSeenRef`);
  const safeEventFingerprint = normalizeSafeInboundRef<InboundIdempotencyFingerprint>(
    input.safeEventFingerprint,
    `${label} safeEventFingerprint`,
    MAX_SAFE_INBOUND_FINGERPRINT_LENGTH,
  );
  const lastOutcomeRef = normalizeOptionalSafeInboundRef<InboundIdempotencyOutcomeRef>(input.lastOutcomeRef, `${label} lastOutcomeRef`);
  const processedRef = normalizeOptionalSafeInboundRef<InboundIdempotencyProcessedRef>(input.processedRef, `${label} processedRef`);
  const failureRef = normalizeOptionalSafeInboundRef<InboundIdempotencyFailureRef>(input.failureRef, `${label} failureRef`);
  const correlationRef = normalizeCorrelationRef(input.correlationRef, `${label} correlationRef`);
  const error = input.error === undefined ? undefined : normalizeSafeError(input.error as AdapterSafeError);

  validateEventSpecificRefs({ eventKind, messageRef, callbackRef });

  if (status === 'reserved' && (lastOutcomeRef !== undefined || processedRef !== undefined || failureRef !== undefined || error !== undefined)) {
    throw new TypeError(`${label} reserved records must not include terminal outcome fields.`);
  }
  if (status === 'completed' && (lastOutcomeRef === undefined || processedRef === undefined || failureRef !== undefined || error !== undefined)) {
    throw new TypeError(`${label} completed records require safe outcome and processed refs only.`);
  }
  if (status === 'failed' && (lastOutcomeRef === undefined || failureRef === undefined || error === undefined || processedRef !== undefined)) {
    throw new TypeError(`${label} failed records require safe failure outcome fields only.`);
  }

  return Object.freeze({
    kind: INBOUND_IDEMPOTENCY_RECORD_KIND,
    eventRef,
    idempotencyRef,
    eventKind,
    channelRef,
    ...(chatRef === undefined ? {} : { chatRef }),
    ...(threadRef === undefined ? {} : { threadRef }),
    ...(messageRef === undefined ? {} : { messageRef }),
    ...(callbackRef === undefined ? {} : { callbackRef }),
    firstSeenRef,
    ...(lastSeenRef === undefined ? {} : { lastSeenRef }),
    safeEventFingerprint,
    status,
    ...(lastOutcomeRef === undefined ? {} : { lastOutcomeRef }),
    ...(processedRef === undefined ? {} : { processedRef }),
    ...(failureRef === undefined ? {} : { failureRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(error === undefined ? {} : { error }),
  });
}

export function createInboundIdempotencyRecord(
  input: InboundIdempotencyRecordInput,
): InboundIdempotencyRecord {
  rejectUnsafeInboundIdempotencyFields(input, 'Inbound idempotency record input');

  const eventKind = normalizeEventKind(input.eventKind);
  const eventRef = normalizeSafeInboundRef<InboundIdempotencyEventRef>(input.eventRef, 'Inbound idempotency eventRef');
  const idempotencyRef = normalizeInboundIdempotencyRef(input.idempotencyRef, eventKind);
  const channelRef = normalizeSafeInboundRef<InboundIdempotencyChannelRef>(input.channelRef, 'Inbound idempotency channelRef');
  const chatRef = normalizeOptionalSafeInboundRef<InboundIdempotencyChatRef>(input.chatRef, 'Inbound idempotency chatRef');
  const threadRef = normalizeOptionalSafeInboundRef<InboundIdempotencyThreadRef>(input.threadRef, 'Inbound idempotency threadRef');
  const messageRef = normalizeOptionalSafeInboundRef<InboundIdempotencyMessageRef>(input.messageRef, 'Inbound idempotency messageRef');
  const callbackRef = normalizeOptionalSafeInboundRef<InboundIdempotencyCallbackRef>(input.callbackRef, 'Inbound idempotency callbackRef');
  const safeEventFingerprint = input.safeEventFingerprint === undefined
    ? createFingerprintFromSafeRefs({
        eventRef,
        idempotencyRef,
        eventKind,
        channelRef,
        ...(chatRef === undefined ? {} : { chatRef }),
        ...(threadRef === undefined ? {} : { threadRef }),
        ...(messageRef === undefined ? {} : { messageRef }),
        ...(callbackRef === undefined ? {} : { callbackRef }),
      })
    : normalizeSafeInboundRef<InboundIdempotencyFingerprint>(
        input.safeEventFingerprint,
        'Inbound idempotency safeEventFingerprint',
        MAX_SAFE_INBOUND_FINGERPRINT_LENGTH,
      );

  return normalizeInboundIdempotencyRecord({
    kind: INBOUND_IDEMPOTENCY_RECORD_KIND,
    eventRef,
    idempotencyRef,
    eventKind,
    channelRef,
    ...(chatRef === undefined ? {} : { chatRef }),
    ...(threadRef === undefined ? {} : { threadRef }),
    ...(messageRef === undefined ? {} : { messageRef }),
    ...(callbackRef === undefined ? {} : { callbackRef }),
    firstSeenRef: input.firstSeenRef,
    ...(input.lastSeenRef === undefined ? {} : { lastSeenRef: input.lastSeenRef }),
    safeEventFingerprint,
    status: input.status ?? 'reserved',
    ...(input.lastOutcomeRef === undefined ? {} : { lastOutcomeRef: input.lastOutcomeRef }),
    ...(input.processedRef === undefined ? {} : { processedRef: input.processedRef }),
    ...(input.failureRef === undefined ? {} : { failureRef: input.failureRef }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
    ...(input.error === undefined ? {} : { error: input.error }),
  });
}
