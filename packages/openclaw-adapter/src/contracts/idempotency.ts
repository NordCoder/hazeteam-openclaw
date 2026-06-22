import type {
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
} from './refs.js';

const ADAPTER_IDEMPOTENCY_SCOPES = [
  'inbound-message',
  'callback',
  'delivery-attempt',
] as const;
const MAX_IDEMPOTENCY_PART_LENGTH = 128;
const SAFE_IDEMPOTENCY_PART_PATTERN = /^[A-Za-z0-9._~-]+$/u;

export type AdapterIdempotencyScope = (typeof ADAPTER_IDEMPOTENCY_SCOPES)[number];

export type AdapterIdempotencyKey = `${AdapterIdempotencyScope}:${string}`;

export type AdapterIdempotencyRecordStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'duplicate';

export interface AdapterIdempotencyRecord {
  readonly key: AdapterIdempotencyKey;
  readonly scope: AdapterIdempotencyScope;
  readonly status: AdapterIdempotencyRecordStatus;
  readonly operationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly firstSeenAt?: string;
  readonly lastSeenAt?: string;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface InboundMessageIdempotencyKeyInput {
  readonly channelId: string;
  readonly chatId: string;
  readonly messageId: string;
  readonly messageThreadId?: string;
}

export interface CallbackIdempotencyKeyInput {
  readonly channelId: string;
  readonly chatId: string;
  readonly callbackId: string;
  readonly messageThreadId?: string;
}

export interface DeliveryAttemptIdempotencyKeyInput {
  readonly outboxRef: string;
  readonly claimRef: string;
  readonly attemptNumber: number;
}

function isAdapterIdempotencyScope(scope: string): scope is AdapterIdempotencyScope {
  return (ADAPTER_IDEMPOTENCY_SCOPES as readonly string[]).includes(scope);
}

function isSafeIdempotencyPart(part: string): boolean {
  return (
    part.length > 0 &&
    part.length <= MAX_IDEMPOTENCY_PART_LENGTH &&
    part.trim() === part &&
    SAFE_IDEMPOTENCY_PART_PATTERN.test(part)
  );
}

function normalizeIdempotencyPart(part: string): string {
  if (!isSafeIdempotencyPart(part)) {
    throw new TypeError(
      'Adapter idempotency key parts must be non-empty safe values without whitespace or key separators.',
    );
  }

  return part;
}

function normalizeAttemptNumber(attemptNumber: number): string {
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber < 1) {
    throw new TypeError('Delivery attempt number must be a positive safe integer.');
  }

  return String(attemptNumber);
}

function topicParts(input: { readonly messageThreadId?: string }): readonly string[] {
  if (input.messageThreadId === undefined) {
    return ['thread-none'];
  }

  return ['thread', input.messageThreadId];
}

export function createAdapterIdempotencyKey(
  scope: AdapterIdempotencyScope,
  parts: readonly string[],
): AdapterIdempotencyKey {
  if (!isAdapterIdempotencyScope(scope)) {
    throw new TypeError('Unsupported adapter idempotency scope.');
  }

  if (parts.length === 0) {
    throw new TypeError('Adapter idempotency key requires at least one key part.');
  }

  return `${scope}:${parts.map(normalizeIdempotencyPart).join(':')}` as AdapterIdempotencyKey;
}

export function createInboundMessageIdempotencyKey(
  input: InboundMessageIdempotencyKeyInput,
): AdapterIdempotencyKey {
  return createAdapterIdempotencyKey('inbound-message', [
    input.channelId,
    input.chatId,
    ...topicParts(input),
    input.messageId,
  ]);
}

export function createCallbackIdempotencyKey(
  input: CallbackIdempotencyKeyInput,
): AdapterIdempotencyKey {
  return createAdapterIdempotencyKey('callback', [
    input.channelId,
    input.chatId,
    ...topicParts(input),
    input.callbackId,
  ]);
}

export function createDeliveryAttemptIdempotencyKey(
  input: DeliveryAttemptIdempotencyKeyInput,
): AdapterIdempotencyKey {
  return createAdapterIdempotencyKey('delivery-attempt', [
    'outbox',
    input.outboxRef,
    'claim',
    input.claimRef,
    'attempt',
    normalizeAttemptNumber(input.attemptNumber),
  ]);
}

export function isAdapterIdempotencyKey(candidate: unknown): candidate is AdapterIdempotencyKey {
  if (typeof candidate !== 'string') {
    return false;
  }

  const [scope, ...parts] = candidate.split(':');
  if (scope === undefined || !isAdapterIdempotencyScope(scope) || parts.length === 0) {
    return false;
  }

  return parts.every(isSafeIdempotencyPart);
}
