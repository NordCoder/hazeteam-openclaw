const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_SAFE_REF_LENGTH = 256;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;
const PROTECTED_ASSIGNMENT_PATTERN = /\b(?:bot[_-]?token|api[_-]?key|authorization|password|passwd|credential|secret|endpoint|path)\b\s*[:=]\s*\S+/giu;
const FORBIDDEN_FIELD_PARTS = [
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

export type FakeInboundIdempotencyEventKind = 'message' | 'callback';
export type FakeInboundIdempotencyStatus = 'reserved' | 'completed' | 'failed';
export type FakeInboundIdempotencySuppressedEffect =
  | 'command-intent-dispatch'
  | 'runtime-dispatch'
  | 'delivery'
  | 'callback-consume'
  | 'approval-state';

export const FAKE_INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS: readonly FakeInboundIdempotencySuppressedEffect[] = Object.freeze([
  'command-intent-dispatch',
  'runtime-dispatch',
  'delivery',
  'callback-consume',
  'approval-state',
]);

export interface FakeInboundIdempotencySafeError {
  readonly code: 'invalid-input' | 'duplicate' | 'failed-safe' | 'dependency-failed' | 'conflict';
  readonly message: string;
  readonly retryable?: boolean | undefined;
  readonly correlationRef?: string | undefined;
}

export interface FakeInboundIdempotencyRecord {
  readonly kind: 'fake-inbound-idempotency-record';
  readonly eventRef: string;
  readonly idempotencyRef: string;
  readonly eventKind: FakeInboundIdempotencyEventKind;
  readonly channelRef: string;
  readonly chatRef?: string | undefined;
  readonly threadRef?: string | undefined;
  readonly messageRef?: string | undefined;
  readonly callbackRef?: string | undefined;
  readonly firstSeenRef: string;
  readonly lastSeenRef?: string | undefined;
  readonly safeEventFingerprint: string;
  readonly status: FakeInboundIdempotencyStatus;
  readonly lastOutcomeRef?: string | undefined;
  readonly processedRef?: string | undefined;
  readonly failureRef?: string | undefined;
  readonly correlationRef?: string | undefined;
  readonly error?: FakeInboundIdempotencySafeError | undefined;
}

export interface FakeInboundIdempotencyInput {
  readonly eventRef?: string | undefined;
  readonly idempotencyRef?: string | undefined;
  readonly eventKind?: FakeInboundIdempotencyEventKind | undefined;
  readonly channelRef?: string | undefined;
  readonly chatRef?: string | undefined;
  readonly threadRef?: string | undefined;
  readonly messageRef?: string | undefined;
  readonly callbackRef?: string | undefined;
  readonly firstSeenRef?: string | undefined;
  readonly lastSeenRef?: string | undefined;
  readonly safeEventFingerprint?: string | undefined;
  readonly correlationRef?: string | undefined;
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function hasForbiddenFieldName(fieldName: string): boolean {
  const normalized = normalizeFieldName(fieldName);

  return FORBIDDEN_FIELD_PARTS.some((part) => normalized.includes(part));
}

export function rejectUnsafeFakeInboundIdempotencyFields(
  input: unknown,
  label = 'Fake inbound idempotency value',
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
      rejectUnsafeFakeInboundIdempotencyFields(item, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (hasForbiddenFieldName(fieldName)) {
      throw new TypeError(`${label} must not include unsafe field names.`);
    }
    rejectUnsafeFakeInboundIdempotencyFields(value, label, seen);
  }
}

function sanitizeText(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(PROTECTED_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim();

  if (normalized.length === 0 || normalized.length > MAX_SAFE_REF_LENGTH || !SAFE_REF_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a bounded safe ref.`);
  }

  return normalized;
}

function maybeRef(input: string | undefined, label: string): string | undefined {
  return input === undefined ? undefined : sanitizeText(input, label);
}

function defaultIdempotencyRef(kind: FakeInboundIdempotencyEventKind, index: number): string {
  if (kind === 'callback') {
    return `callback:telegram-channel-demo:telegram-chat-demo:thread-none:callback-${index}`;
  }

  return `inbound-message:telegram-channel-demo:telegram-chat-demo:thread-none:message-${index}`;
}

function defaultFingerprint(input: {
  readonly eventRef: string;
  readonly idempotencyRef: string;
  readonly eventKind: FakeInboundIdempotencyEventKind;
  readonly channelRef: string;
  readonly chatRef?: string | undefined;
  readonly threadRef?: string | undefined;
  readonly messageRef?: string | undefined;
  readonly callbackRef?: string | undefined;
}): string {
  return sanitizeText(
    [
      'fingerprint',
      input.eventKind,
      input.eventRef,
      input.idempotencyRef,
      input.channelRef,
      input.chatRef ?? 'chat-none',
      input.threadRef ?? 'thread-none',
      input.messageRef ?? 'message-none',
      input.callbackRef ?? 'callback-none',
    ].join(':'),
    'Fake inbound idempotency fingerprint',
  );
}

export function createFakeInboundIdempotencyInput(
  input: FakeInboundIdempotencyInput = {},
): Required<Pick<FakeInboundIdempotencyRecord, 'eventRef' | 'idempotencyRef' | 'eventKind' | 'channelRef' | 'firstSeenRef'>> &
  Omit<Partial<FakeInboundIdempotencyRecord>, 'kind' | 'status'> {
  rejectUnsafeFakeInboundIdempotencyFields(input, 'Fake inbound idempotency input');

  const eventKind = input.eventKind ?? 'message';
  const indexSource = input.messageRef ?? input.callbackRef ?? input.eventRef ?? '1';
  const index = indexSource.replace(/[^A-Za-z0-9._~-]/gu, '-') || '1';
  const eventRef = sanitizeText(input.eventRef ?? `inbound-event:${eventKind}-${index}`, 'Fake inbound eventRef');
  const idempotencyRef = sanitizeText(
    input.idempotencyRef ?? defaultIdempotencyRef(eventKind, 1),
    'Fake inbound idempotencyRef',
  );
  const channelRef = sanitizeText(input.channelRef ?? 'telegram-channel:demo', 'Fake inbound channelRef');
  const chatRef = maybeRef(input.chatRef ?? 'telegram-chat:demo', 'Fake inbound chatRef');
  const threadRef = maybeRef(input.threadRef, 'Fake inbound threadRef');
  const messageRef = eventKind === 'message'
    ? sanitizeText(input.messageRef ?? 'telegram-message:1', 'Fake inbound messageRef')
    : undefined;
  const callbackRef = eventKind === 'callback'
    ? sanitizeText(input.callbackRef ?? 'callback:1', 'Fake inbound callbackRef')
    : undefined;
  const firstSeenRef = sanitizeText(input.firstSeenRef ?? 'seen:1', 'Fake inbound firstSeenRef');
  const correlationRef = maybeRef(input.correlationRef, 'Fake inbound correlationRef');
  const safeEventFingerprint = sanitizeText(
    input.safeEventFingerprint ??
      defaultFingerprint({
        eventRef,
        idempotencyRef,
        eventKind,
        channelRef,
        ...(chatRef === undefined ? {} : { chatRef }),
        ...(threadRef === undefined ? {} : { threadRef }),
        ...(messageRef === undefined ? {} : { messageRef }),
        ...(callbackRef === undefined ? {} : { callbackRef }),
      }),
    'Fake inbound safeEventFingerprint',
  );

  return Object.freeze({
    eventRef,
    idempotencyRef,
    eventKind,
    channelRef,
    ...(chatRef === undefined ? {} : { chatRef }),
    ...(threadRef === undefined ? {} : { threadRef }),
    ...(messageRef === undefined ? {} : { messageRef }),
    ...(callbackRef === undefined ? {} : { callbackRef }),
    firstSeenRef,
    ...(input.lastSeenRef === undefined ? {} : { lastSeenRef: sanitizeText(input.lastSeenRef, 'Fake inbound lastSeenRef') }),
    safeEventFingerprint,
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

export function createFakeInboundIdempotencyRecord(
  input: FakeInboundIdempotencyInput & { readonly status?: FakeInboundIdempotencyStatus | undefined } = {},
): FakeInboundIdempotencyRecord {
  const prepared = createFakeInboundIdempotencyInput(input);

  return Object.freeze({
    kind: 'fake-inbound-idempotency-record',
    eventRef: prepared.eventRef,
    idempotencyRef: prepared.idempotencyRef,
    eventKind: prepared.eventKind,
    channelRef: prepared.channelRef,
    ...(prepared.chatRef === undefined ? {} : { chatRef: prepared.chatRef }),
    ...(prepared.threadRef === undefined ? {} : { threadRef: prepared.threadRef }),
    ...(prepared.messageRef === undefined ? {} : { messageRef: prepared.messageRef }),
    ...(prepared.callbackRef === undefined ? {} : { callbackRef: prepared.callbackRef }),
    firstSeenRef: prepared.firstSeenRef,
    ...(prepared.lastSeenRef === undefined ? {} : { lastSeenRef: prepared.lastSeenRef }),
    safeEventFingerprint: prepared.safeEventFingerprint,
    status: input.status ?? 'reserved',
    ...(prepared.correlationRef === undefined ? {} : { correlationRef: prepared.correlationRef }),
  });
}

export function createFakeInboundIdempotencySafeError(
  input: {
    readonly code?: FakeInboundIdempotencySafeError['code'] | undefined;
    readonly message?: string | undefined;
    readonly retryable?: boolean | undefined;
    readonly correlationRef?: string | undefined;
  } = {},
): FakeInboundIdempotencySafeError {
  rejectUnsafeFakeInboundIdempotencyFields(input, 'Fake inbound idempotency safe error input');

  return Object.freeze({
    code: input.code ?? 'failed-safe',
    message: sanitizeText(input.message ?? 'fake-inbound-idempotency-failed', 'Fake inbound idempotency error message'),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(input.correlationRef === undefined ? {} : { correlationRef: sanitizeText(input.correlationRef, 'Fake inbound idempotency error correlationRef') }),
  });
}
