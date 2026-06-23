import type { AdapterOperationContext } from '../../contracts/context.js';
import {
  createTelegramDeliverySafeError,
  createTelegramExternalMessageRef,
  type TelegramDeliveryFailure,
  type TelegramDeliveryRequest,
  type TelegramDeliverySafeError,
  type TelegramDeliverySafeErrorCode,
  type TelegramDeliverySuccess,
  type TelegramDeliveryTarget,
  type TelegramDeliveryTextContent,
  type TelegramExternalMessageRef,
} from '../../contracts/delivery.js';
import {
  isAdapterIdempotencyKey,
  type AdapterIdempotencyKey,
} from '../../contracts/idempotency.js';
import {
  parseOpenClawAdapterRef,
  type ActorRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
  type AdapterOperationRef,
  type AdapterRawDebugRef,
  type AgentRef,
  type OpenClawAdapterRefKind,
  type WorkspaceRef,
} from '../../contracts/refs.js';
import type {
  TelegramDeliveryPumpDeliveredDecision,
  TelegramDeliveryPumpFailedDecision,
} from '../../delivery/delivery-pump.js';

const DURABLE_DELIVERY_STORE_SCHEMA_VERSION = 1;
const TELEGRAM_DELIVERY_STORE_KEY_PREFIX = 'telegram-delivery-store';
const TELEGRAM_MESSAGE_VALIDATION_ID = 'telegram-message:store-validation';
const SAFE_TEXT_MAX_LENGTH = 240;

const FORBIDDEN_SERIALIZED_FIELD_NAMES = new Set([
  'apikey',
  'approvalpayload',
  'bottoken',
  'credential',
  'password',
  'rawdeliveryresponse',
  'rawerror',
  'rawopenclawevent',
  'rawproviderresponse',
  'rawruntimepayload',
  'rawtelegramupdate',
  'rawtoolpayload',
  'rawupdate',
  'secret',
  'stack',
  'telegramupdate',
  'toolpayload',
]);
const FORBIDDEN_SERIALIZED_TERMS = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawDeliveryResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawError',
  'stack',
  ['bot', 'Token'].join(''),
  ['api', 'Key'].join(''),
  ['sec', 'ret'].join(''),
  ['pass', 'word'].join(''),
  ['cred', 'ential'].join(''),
];
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_SERIALIZED_TERMS.map(escapeRegExp).join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);
const FORBIDDEN_TERM_PATTERN = new RegExp(
  `\\b(?:${FORBIDDEN_SERIALIZED_TERMS.map(escapeRegExp).join('|')})\\b`,
  'giu',
);

type MaybePromise<T> = T | Promise<T>;

export type DurableDeliveryRecordKey = `${typeof TELEGRAM_DELIVERY_STORE_KEY_PREFIX}:${string}`;
export type DurableDeliveryRecordPrefix = DurableDeliveryRecordKey;
export type DurableDeliveryAttemptStatus = 'created' | 'delivered' | 'failed';

export interface DurableDeliveryRecordBoundary {
  readonly read: (key: DurableDeliveryRecordKey) => MaybePromise<unknown | null | undefined>;
  readonly write: (
    key: DurableDeliveryRecordKey,
    record: DurableDeliveryStoredRecord,
  ) => MaybePromise<void>;
  readonly list?: (prefix: DurableDeliveryRecordPrefix) => MaybePromise<readonly unknown[]>;
}

export interface DurableDeliveryAttemptRecord {
  readonly schemaVersion: typeof DURABLE_DELIVERY_STORE_SCHEMA_VERSION;
  readonly recordKind: 'delivery-attempt';
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly status: DurableDeliveryAttemptStatus;
  readonly target: TelegramDeliveryTarget;
  readonly content: TelegramDeliveryTextContent;
  readonly attemptNumber?: number;
  readonly context?: AdapterOperationContext;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface DurableDeliverySuccessResultRecord {
  readonly schemaVersion: typeof DURABLE_DELIVERY_STORE_SCHEMA_VERSION;
  readonly recordKind: 'delivery-success-result';
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly deliveryResult: TelegramDeliverySuccess;
  readonly externalMessageRef: TelegramExternalMessageRef;
  readonly retryable: false;
  readonly shouldMarkDelivered: true;
  readonly shouldMarkFailed: false;
  readonly shouldRetry: false;
  readonly recordedAtIso: string;
}

export interface DurableDeliveryFailureResultRecord {
  readonly schemaVersion: typeof DURABLE_DELIVERY_STORE_SCHEMA_VERSION;
  readonly recordKind: 'delivery-failure-result';
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly deliveryResult: TelegramDeliveryFailure;
  readonly error: TelegramDeliverySafeError;
  readonly retryable: boolean;
  readonly shouldMarkDelivered: false;
  readonly shouldMarkFailed: true;
  readonly shouldRetry: boolean;
  readonly recordedAtIso: string;
}

export interface DurableDeliveryExternalMessageRecord {
  readonly schemaVersion: typeof DURABLE_DELIVERY_STORE_SCHEMA_VERSION;
  readonly recordKind: 'external-message-ref';
  readonly deliveryRef: AdapterOperationRef;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly externalMessageRef: TelegramExternalMessageRef;
  readonly recordedAtIso: string;
}

export interface DurableDeliveryIdempotencyIndexRecord {
  readonly schemaVersion: typeof DURABLE_DELIVERY_STORE_SCHEMA_VERSION;
  readonly recordKind: 'delivery-idempotency-index';
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly deliveryRef: AdapterOperationRef;
  readonly createdAtIso: string;
}

export type DurableDeliveryResultRecord =
  | DurableDeliverySuccessResultRecord
  | DurableDeliveryFailureResultRecord;

export type DurableDeliveryStoredRecord =
  | DurableDeliveryAttemptRecord
  | DurableDeliveryResultRecord
  | DurableDeliveryExternalMessageRecord
  | DurableDeliveryIdempotencyIndexRecord;

export interface RegisterDurableDeliveryAttemptInput {
  readonly request: TelegramDeliveryRequest;
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly attemptNumber?: number;
  readonly createdAtIso?: string;
}

export interface DurableDeliveryAttemptRegistration {
  readonly status: 'created' | 'duplicate';
  readonly record: DurableDeliveryAttemptRecord;
}

export interface MarkDurableDeliverySuccessInput {
  readonly result: TelegramDeliverySuccess | TelegramDeliveryPumpDeliveredDecision;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly recordedAtIso?: string;
}

export interface MarkDurableDeliveryFailureInput {
  readonly result: TelegramDeliveryFailure | TelegramDeliveryPumpFailedDecision;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly recordedAtIso?: string;
}

export interface RecordDurableDeliveryPumpDecisionInput {
  readonly decision: TelegramDeliveryPumpDeliveredDecision | TelegramDeliveryPumpFailedDecision;
  readonly idempotencyKey?: AdapterIdempotencyKey;
  readonly recordedAtIso?: string;
}

export interface DurableDeliveryStore {
  readonly registerAttempt: (
    input: RegisterDurableDeliveryAttemptInput,
  ) => Promise<DurableDeliveryAttemptRegistration>;
  readonly markDelivered: (
    input: MarkDurableDeliverySuccessInput,
  ) => Promise<DurableDeliverySuccessResultRecord>;
  readonly markFailed: (
    input: MarkDurableDeliveryFailureInput,
  ) => Promise<DurableDeliveryFailureResultRecord>;
  readonly recordPumpDecision: (
    input: RecordDurableDeliveryPumpDecisionInput,
  ) => Promise<DurableDeliveryResultRecord>;
  readonly getAttemptByDeliveryRef: (
    deliveryRef: AdapterOperationRef,
  ) => Promise<DurableDeliveryAttemptRecord | undefined>;
  readonly getAttemptByIdempotencyKey: (
    idempotencyKey: AdapterIdempotencyKey,
  ) => Promise<DurableDeliveryAttemptRecord | undefined>;
  readonly getResultByDeliveryRef: (
    deliveryRef: AdapterOperationRef,
  ) => Promise<DurableDeliveryResultRecord | undefined>;
  readonly getResultByIdempotencyKey: (
    idempotencyKey: AdapterIdempotencyKey,
  ) => Promise<DurableDeliveryResultRecord | undefined>;
  readonly getExternalMessageRefByDeliveryRef: (
    deliveryRef: AdapterOperationRef,
  ) => Promise<TelegramExternalMessageRef | undefined>;
  readonly listAttempts: () => Promise<readonly DurableDeliveryAttemptRecord[]>;
  readonly listResults: () => Promise<readonly DurableDeliveryResultRecord[]>;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function recordKey(segment: string, value: string): DurableDeliveryRecordKey {
  return `${TELEGRAM_DELIVERY_STORE_KEY_PREFIX}:${segment}:${value}` as DurableDeliveryRecordKey;
}

function attemptKey(deliveryRef: AdapterOperationRef): DurableDeliveryRecordKey {
  return recordKey('attempt', deliveryRef);
}

function resultKey(deliveryRef: AdapterOperationRef): DurableDeliveryRecordKey {
  return recordKey('result', deliveryRef);
}

function externalMessageKey(deliveryRef: AdapterOperationRef): DurableDeliveryRecordKey {
  return recordKey('external-message', deliveryRef);
}

function idempotencyIndexKey(idempotencyKey: AdapterIdempotencyKey): DurableDeliveryRecordKey {
  return recordKey('idempotency', idempotencyKey);
}

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function rejectForbiddenSerializedFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectForbiddenSerializedFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (FORBIDDEN_SERIALIZED_FIELD_NAMES.has(normalizeFieldName(fieldName))) {
      throw new TypeError(`${label} must not include raw provider, raw payload, stack, or sensitive fields.`);
    }
    rejectForbiddenSerializedFields(value, label, seen);
  }
}

function sanitizeSafeText(input: unknown): string {
  if (typeof input !== 'string') {
    return 'Telegram delivery failed';
  }

  const normalized = input
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(FORBIDDEN_TERM_PATTERN, '[redacted]')
    .trim();

  if (normalized.length === 0) {
    return 'Telegram delivery failed';
  }

  if (normalized.length <= SAFE_TEXT_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, SAFE_TEXT_MAX_LENGTH - 3)}...`;
}

function normalizeIsoTimestamp(input: unknown, label: string): string {
  const value = input ?? new Date().toISOString();
  if (typeof value !== 'string' || value.trim() !== value || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be an ISO timestamp string.`);
  }

  return value;
}

function normalizeAdapterRef<T extends string>(input: unknown, kind: OpenClawAdapterRefKind, label: string): T {
  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== kind) {
    throw new TypeError(`${label} must be a safe adapter ref.`);
  }

  return parsed.ref as T;
}

function normalizeOperationRef(input: unknown, label: string): AdapterOperationRef {
  return normalizeAdapterRef<AdapterOperationRef>(input, 'operation', label);
}

function normalizeCorrelationRef(input: unknown, label: string): AdapterCorrelationRef {
  return normalizeAdapterRef<AdapterCorrelationRef>(input, 'correlation', label);
}

function normalizeOptionalCorrelationRef(input: unknown, label: string): AdapterCorrelationRef | undefined {
  return input === undefined ? undefined : normalizeCorrelationRef(input, label);
}

function normalizeOptionalDetailsRef(input: unknown, label: string): AdapterDetailsRef | undefined {
  return input === undefined ? undefined : normalizeAdapterRef<AdapterDetailsRef>(input, 'details', label);
}

function normalizeOptionalBoolean(input: unknown, label: string): boolean | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (typeof input !== 'boolean') {
    throw new TypeError(`${label} must be a boolean.`);
  }

  return input;
}

function normalizeIdempotencyKey(input: unknown): AdapterIdempotencyKey {
  if (!isAdapterIdempotencyKey(input)) {
    throw new TypeError('Delivery store idempotencyKey must be a safe adapter idempotency key.');
  }

  return input;
}

function normalizeAttemptNumber(input: unknown): number | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!Number.isSafeInteger(input) || input < 1) {
    throw new TypeError('Delivery store attemptNumber must be a positive safe integer.');
  }

  return input;
}

function normalizeOperationContext(input: AdapterOperationContext): AdapterOperationContext {
  assertPlainObject(input, 'Delivery store operation context');
  rejectForbiddenSerializedFields(input, 'Delivery store operation context');

  return Object.freeze({
    operationRef: normalizeOperationRef(input.operationRef, 'Delivery store context operationRef'),
    correlationRef: normalizeCorrelationRef(input.correlationRef, 'Delivery store context correlationRef'),
    ...(input.workspaceRef === undefined
      ? {}
      : {
          workspaceRef: normalizeAdapterRef<WorkspaceRef>(
            input.workspaceRef,
            'workspace',
            'Delivery store context workspaceRef',
          ),
        }),
    ...(input.agentRef === undefined
      ? {}
      : {
          agentRef: normalizeAdapterRef<AgentRef>(
            input.agentRef,
            'agent',
            'Delivery store context agentRef',
          ),
        }),
    ...(input.actorRef === undefined
      ? {}
      : {
          actorRef: normalizeAdapterRef<ActorRef>(
            input.actorRef,
            'actor',
            'Delivery store context actorRef',
          ),
        }),
    ...(input.detailsRef === undefined
      ? {}
      : {
          detailsRef: normalizeAdapterRef<AdapterDetailsRef>(
            input.detailsRef,
            'details',
            'Delivery store context detailsRef',
          ),
        }),
    ...(input.rawDebugRef === undefined
      ? {}
      : {
          rawDebugRef: normalizeAdapterRef<AdapterRawDebugRef>(
            input.rawDebugRef,
            'raw-debug',
            'Delivery store context rawDebugRef',
          ),
        }),
  });
}

function cloneSafeJson<T>(input: T, label: string): T {
  rejectForbiddenSerializedFields(input, label);

  let serialized: string;
  try {
    const candidate = JSON.stringify(input);
    if (candidate === undefined) {
      throw new TypeError('JSON serialization returned undefined.');
    }
    serialized = candidate;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON serialization failed';
    throw new TypeError(`${label} must be JSON serializable: ${message}`);
  }

  const parsed = JSON.parse(serialized) as T;
  rejectForbiddenSerializedFields(parsed, label);
  return parsed;
}

function deepFreeze<T>(input: T, seen = new Set<object>()): T {
  if (typeof input !== 'object' || input === null || seen.has(input)) {
    return input;
  }

  seen.add(input);
  Object.freeze(input);
  for (const value of Object.values(input as Record<string, unknown>)) {
    deepFreeze(value, seen);
  }

  return input;
}

function safeRecord<T>(input: T, label: string): T {
  return deepFreeze(cloneSafeJson(input, label));
}

function normalizeDeliveryTarget(input: TelegramDeliveryTarget): TelegramDeliveryTarget {
  assertPlainObject(input, 'Delivery store target');
  rejectForbiddenSerializedFields(input, 'Delivery store target');

  const externalRef = createTelegramExternalMessageRef({
    target: input,
    messageId: TELEGRAM_MESSAGE_VALIDATION_ID,
  });

  return Object.freeze({
    channelId: externalRef.channelId,
    chatId: externalRef.chatId,
    messageThreadId: externalRef.messageThreadId,
    ...(externalRef.workspaceRef === undefined ? {} : { workspaceRef: externalRef.workspaceRef }),
    ...(externalRef.agentRef === undefined ? {} : { agentRef: externalRef.agentRef }),
  });
}

function normalizeDeliveryContent(input: TelegramDeliveryTextContent): TelegramDeliveryTextContent {
  assertPlainObject(input, 'Delivery store content');
  if (input.format !== 'plain' && input.format !== 'markdown' && input.format !== 'html') {
    throw new TypeError('Delivery store content format must be plain, markdown, or html.');
  }
  if (typeof input.text !== 'string') {
    throw new TypeError('Delivery store content text must be a string.');
  }

  return deepFreeze(cloneSafeJson(input, 'Delivery store content'));
}

function normalizeExternalMessageRef(input: TelegramExternalMessageRef): TelegramExternalMessageRef {
  assertPlainObject(input, 'Delivery store external message ref');
  rejectForbiddenSerializedFields(input, 'Delivery store external message ref');

  return createTelegramExternalMessageRef({
    target: {
      channelId: input.channelId,
      chatId: input.chatId,
      messageThreadId: input.messageThreadId,
      ...(input.workspaceRef === undefined ? {} : { workspaceRef: input.workspaceRef }),
      ...(input.agentRef === undefined ? {} : { agentRef: input.agentRef }),
    },
    messageId: input.messageId,
    ...(input.correlationRef === undefined
      ? {}
      : {
          correlationRef: normalizeCorrelationRef(
            input.correlationRef,
            'Delivery store external correlationRef',
          ),
        }),
  });
}

function normalizeDeliveryError(input: TelegramDeliverySafeError, fallbackRetryable?: boolean): TelegramDeliverySafeError {
  assertPlainObject(input, 'Delivery store delivery error');
  rejectForbiddenSerializedFields(input, 'Delivery store delivery error');

  const retryable = normalizeOptionalBoolean(input.retryable, 'Delivery store error retryable') ?? fallbackRetryable;
  const detailsRef = normalizeOptionalDetailsRef(input.detailsRef, 'Delivery store error detailsRef');
  const correlationRef = normalizeOptionalCorrelationRef(
    input.correlationRef,
    'Delivery store error correlationRef',
  );

  return createTelegramDeliverySafeError({
    code: input.code as TelegramDeliverySafeErrorCode,
    message: sanitizeSafeText(input.message),
    ...(retryable === undefined ? {} : { retryable }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeSuccessResult(input: TelegramDeliverySuccess): TelegramDeliverySuccess {
  assertPlainObject(input, 'Delivery store success result');
  rejectForbiddenSerializedFields(input, 'Delivery store success result');
  if (input.ok !== true) {
    throw new TypeError('Delivery store success result must have ok=true.');
  }

  const deliveryRef = normalizeOperationRef(input.deliveryRef, 'Delivery store success deliveryRef');
  const externalMessageRef = normalizeExternalMessageRef(input.externalMessageRef);
  const context = input.context === undefined ? undefined : normalizeOperationContext(input.context);
  const correlationRef = normalizeOptionalCorrelationRef(
    input.correlationRef ?? externalMessageRef.correlationRef,
    'Delivery store success correlationRef',
  );

  return Object.freeze({
    ok: true,
    deliveryRef,
    externalMessageRef,
    ...(context === undefined ? {} : { context }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeFailureResult(input: TelegramDeliveryFailure): TelegramDeliveryFailure {
  assertPlainObject(input, 'Delivery store failure result');
  rejectForbiddenSerializedFields(input, 'Delivery store failure result');
  if (input.ok !== false) {
    throw new TypeError('Delivery store failure result must have ok=false.');
  }

  const deliveryRef = normalizeOperationRef(input.deliveryRef, 'Delivery store failure deliveryRef');
  const retryable =
    normalizeOptionalBoolean(input.retryable, 'Delivery store failure retryable') ??
    normalizeOptionalBoolean(input.error.retryable, 'Delivery store failure error retryable') ??
    false;
  const error = normalizeDeliveryError(input.error, retryable);
  const context = input.context === undefined ? undefined : normalizeOperationContext(input.context);
  const detailsRef = normalizeOptionalDetailsRef(
    input.detailsRef ?? error.detailsRef,
    'Delivery store failure detailsRef',
  );
  const correlationRef = normalizeOptionalCorrelationRef(
    input.correlationRef ?? error.correlationRef,
    'Delivery store failure correlationRef',
  );

  return Object.freeze({
    ok: false,
    deliveryRef,
    error,
    retryable,
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(context === undefined ? {} : { context }),
  });
}

function normalizeRequest(input: TelegramDeliveryRequest): TelegramDeliveryRequest {
  assertPlainObject(input, 'Delivery store request');
  rejectForbiddenSerializedFields(input, 'Delivery store request');

  const deliveryRef = normalizeOperationRef(input.deliveryRef, 'Delivery store request deliveryRef');
  const target = normalizeDeliveryTarget(input.target);
  const content = normalizeDeliveryContent(input.content);
  const context = input.context === undefined ? undefined : normalizeOperationContext(input.context);
  const correlationRef = normalizeOptionalCorrelationRef(input.correlationRef, 'Delivery store request correlationRef');

  return Object.freeze({
    deliveryRef,
    target,
    content,
    ...(context === undefined ? {} : { context }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function isPumpDeliveredDecision(input: unknown): input is TelegramDeliveryPumpDeliveredDecision {
  return typeof input === 'object' && input !== null && (input as { readonly kind?: unknown }).kind === 'delivered';
}

function isPumpFailedDecision(input: unknown): input is TelegramDeliveryPumpFailedDecision {
  return typeof input === 'object' && input !== null && (input as { readonly kind?: unknown }).kind === 'failed';
}

function deliveryResultFromSuccessInput(
  input: TelegramDeliverySuccess | TelegramDeliveryPumpDeliveredDecision,
): TelegramDeliverySuccess {
  return normalizeSuccessResult(isPumpDeliveredDecision(input) ? input.deliveryResult : input);
}

function deliveryResultFromFailureInput(
  input: TelegramDeliveryFailure | TelegramDeliveryPumpFailedDecision,
): TelegramDeliveryFailure {
  return normalizeFailureResult(isPumpFailedDecision(input) ? input.deliveryResult : input);
}

function sameTarget(actual: TelegramExternalMessageRef, expected: TelegramDeliveryTarget): boolean {
  return (
    actual.channelId === expected.channelId &&
    actual.chatId === expected.chatId &&
    actual.messageThreadId === expected.messageThreadId &&
    actual.workspaceRef === expected.workspaceRef &&
    actual.agentRef === expected.agentRef
  );
}

function normalizeAttemptRecord(input: unknown): DurableDeliveryAttemptRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery attempt record');
    rejectForbiddenSerializedFields(input, 'Delivery attempt record');
    if (input.schemaVersion !== DURABLE_DELIVERY_STORE_SCHEMA_VERSION || input.recordKind !== 'delivery-attempt') {
      return undefined;
    }
    const status = input.status;
    if (status !== 'created' && status !== 'delivered' && status !== 'failed') {
      return undefined;
    }
    const attemptNumber = normalizeAttemptNumber(input.attemptNumber);

    const record: DurableDeliveryAttemptRecord = {
      schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
      recordKind: 'delivery-attempt',
      deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery attempt record deliveryRef'),
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      status,
      target: normalizeDeliveryTarget(input.target as TelegramDeliveryTarget),
      content: normalizeDeliveryContent(input.content as TelegramDeliveryTextContent),
      ...(attemptNumber === undefined ? {} : { attemptNumber }),
      ...(input.context === undefined
        ? {}
        : { context: normalizeOperationContext(input.context as AdapterOperationContext) }),
      ...(input.correlationRef === undefined
        ? {}
        : {
            correlationRef: normalizeCorrelationRef(
              input.correlationRef,
              'Delivery attempt record correlationRef',
            ),
          }),
      createdAtIso: normalizeIsoTimestamp(input.createdAtIso, 'Delivery attempt record createdAtIso'),
      updatedAtIso: normalizeIsoTimestamp(input.updatedAtIso, 'Delivery attempt record updatedAtIso'),
    };

    return safeRecord(record, 'Delivery attempt record');
  } catch {
    return undefined;
  }
}

function normalizeIdempotencyIndexRecord(input: unknown): DurableDeliveryIdempotencyIndexRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery idempotency index record');
    rejectForbiddenSerializedFields(input, 'Delivery idempotency index record');
    if (
      input.schemaVersion !== DURABLE_DELIVERY_STORE_SCHEMA_VERSION ||
      input.recordKind !== 'delivery-idempotency-index'
    ) {
      return undefined;
    }

    const record: DurableDeliveryIdempotencyIndexRecord = {
      schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
      recordKind: 'delivery-idempotency-index',
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery idempotency index deliveryRef'),
      createdAtIso: normalizeIsoTimestamp(input.createdAtIso, 'Delivery idempotency index createdAtIso'),
    };

    return safeRecord(record, 'Delivery idempotency index record');
  } catch {
    return undefined;
  }
}

function normalizeResultRecord(input: unknown): DurableDeliveryResultRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery result record');
    rejectForbiddenSerializedFields(input, 'Delivery result record');
    if (input.schemaVersion !== DURABLE_DELIVERY_STORE_SCHEMA_VERSION) {
      return undefined;
    }

    if (input.recordKind === 'delivery-success-result') {
      const deliveryResult = normalizeSuccessResult(input.deliveryResult as TelegramDeliverySuccess);
      const externalMessageRef = normalizeExternalMessageRef(input.externalMessageRef as TelegramExternalMessageRef);
      const record: DurableDeliverySuccessResultRecord = {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'delivery-success-result',
        deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery success record deliveryRef'),
        idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
        deliveryResult,
        externalMessageRef,
        retryable: false,
        shouldMarkDelivered: true,
        shouldMarkFailed: false,
        shouldRetry: false,
        recordedAtIso: normalizeIsoTimestamp(input.recordedAtIso, 'Delivery success record recordedAtIso'),
      };
      return safeRecord(record, 'Delivery success result record');
    }

    if (input.recordKind === 'delivery-failure-result') {
      const deliveryResult = normalizeFailureResult(input.deliveryResult as TelegramDeliveryFailure);
      const storedRetryable = normalizeOptionalBoolean(input.retryable, 'Delivery failure record retryable');
      const retryable = storedRetryable ?? deliveryResult.retryable ?? deliveryResult.error.retryable ?? false;
      const record: DurableDeliveryFailureResultRecord = {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'delivery-failure-result',
        deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery failure record deliveryRef'),
        idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
        deliveryResult,
        error: deliveryResult.error,
        retryable,
        shouldMarkDelivered: false,
        shouldMarkFailed: true,
        shouldRetry: retryable,
        recordedAtIso: normalizeIsoTimestamp(input.recordedAtIso, 'Delivery failure record recordedAtIso'),
      };
      return safeRecord(record, 'Delivery failure result record');
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function normalizeExternalMessageRecord(input: unknown): DurableDeliveryExternalMessageRecord | undefined {
  try {
    assertPlainObject(input, 'Delivery external message record');
    rejectForbiddenSerializedFields(input, 'Delivery external message record');
    if (
      input.schemaVersion !== DURABLE_DELIVERY_STORE_SCHEMA_VERSION ||
      input.recordKind !== 'external-message-ref'
    ) {
      return undefined;
    }

    const record: DurableDeliveryExternalMessageRecord = {
      schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
      recordKind: 'external-message-ref',
      deliveryRef: normalizeOperationRef(input.deliveryRef, 'Delivery external record deliveryRef'),
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      externalMessageRef: normalizeExternalMessageRef(input.externalMessageRef as TelegramExternalMessageRef),
      recordedAtIso: normalizeIsoTimestamp(input.recordedAtIso, 'Delivery external record recordedAtIso'),
    };

    return safeRecord(record, 'Delivery external message record');
  } catch {
    return undefined;
  }
}

function assertStoreBoundary(boundary: DurableDeliveryRecordBoundary): void {
  if (
    typeof boundary !== 'object' ||
    boundary === null ||
    typeof boundary.read !== 'function' ||
    typeof boundary.write !== 'function'
  ) {
    throw new TypeError('Durable delivery store requires an injected durable record boundary.');
  }
}

export function createDurableDeliveryStore(input: {
  readonly boundary: DurableDeliveryRecordBoundary;
}): DurableDeliveryStore {
  const boundary = input.boundary;
  assertStoreBoundary(boundary);

  async function readAttemptByDeliveryRef(
    deliveryRef: AdapterOperationRef,
  ): Promise<DurableDeliveryAttemptRecord | undefined> {
    const key = attemptKey(normalizeOperationRef(deliveryRef, 'Delivery store deliveryRef'));
    return normalizeAttemptRecord(await boundary.read(key));
  }

  async function readIndex(
    idempotencyKey: AdapterIdempotencyKey,
  ): Promise<DurableDeliveryIdempotencyIndexRecord | undefined> {
    const key = idempotencyIndexKey(normalizeIdempotencyKey(idempotencyKey));
    return normalizeIdempotencyIndexRecord(await boundary.read(key));
  }

  async function readAttemptByIdempotencyKey(
    idempotencyKey: AdapterIdempotencyKey,
  ): Promise<DurableDeliveryAttemptRecord | undefined> {
    const index = await readIndex(idempotencyKey);
    return index === undefined ? undefined : readAttemptByDeliveryRef(index.deliveryRef);
  }

  async function writeAttempt(record: DurableDeliveryAttemptRecord): Promise<void> {
    await boundary.write(attemptKey(record.deliveryRef), record);
  }

  async function resolveIdempotencyKey(
    deliveryRef: AdapterOperationRef,
    providedKey?: AdapterIdempotencyKey,
  ): Promise<AdapterIdempotencyKey> {
    if (providedKey !== undefined) {
      return normalizeIdempotencyKey(providedKey);
    }

    const attempt = await readAttemptByDeliveryRef(deliveryRef);
    if (attempt === undefined) {
      throw new TypeError('Delivery store idempotencyKey is required when no attempt record exists.');
    }

    return attempt.idempotencyKey;
  }

  async function registerAttempt(
    inputRecord: RegisterDurableDeliveryAttemptInput,
  ): Promise<DurableDeliveryAttemptRegistration> {
    const request = normalizeRequest(inputRecord.request);
    const idempotencyKey = normalizeIdempotencyKey(inputRecord.idempotencyKey);
    const createdAtIso = normalizeIsoTimestamp(
      inputRecord.createdAtIso,
      'Delivery attempt registration createdAtIso',
    );
    const attemptNumber = normalizeAttemptNumber(inputRecord.attemptNumber);

    const existingAttempt = await readAttemptByDeliveryRef(request.deliveryRef);
    if (existingAttempt !== undefined) {
      if (existingAttempt.idempotencyKey !== idempotencyKey) {
        throw new TypeError('Delivery store duplicate deliveryRef has a different idempotencyKey.');
      }
      return Object.freeze({ status: 'duplicate', record: existingAttempt });
    }

    const existingIndex = await readIndex(idempotencyKey);
    if (existingIndex !== undefined) {
      if (existingIndex.deliveryRef !== request.deliveryRef) {
        throw new TypeError('Delivery store duplicate idempotencyKey points at a different deliveryRef.');
      }
      const indexedAttempt = await readAttemptByDeliveryRef(existingIndex.deliveryRef);
      if (indexedAttempt !== undefined) {
        return Object.freeze({ status: 'duplicate', record: indexedAttempt });
      }
    }

    const record: DurableDeliveryAttemptRecord = safeRecord(
      {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'delivery-attempt',
        deliveryRef: request.deliveryRef,
        idempotencyKey,
        status: 'created',
        target: request.target,
        content: request.content,
        ...(attemptNumber === undefined ? {} : { attemptNumber }),
        ...(request.context === undefined ? {} : { context: request.context }),
        ...(request.correlationRef === undefined ? {} : { correlationRef: request.correlationRef }),
        createdAtIso,
        updatedAtIso: createdAtIso,
      },
      'Delivery attempt record',
    );
    const indexRecord: DurableDeliveryIdempotencyIndexRecord = safeRecord(
      {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'delivery-idempotency-index',
        idempotencyKey,
        deliveryRef: request.deliveryRef,
        createdAtIso,
      },
      'Delivery idempotency index record',
    );

    await writeAttempt(record);
    await boundary.write(idempotencyIndexKey(idempotencyKey), indexRecord);

    return Object.freeze({ status: 'created', record });
  }

  async function markDelivered(
    inputRecord: MarkDurableDeliverySuccessInput,
  ): Promise<DurableDeliverySuccessResultRecord> {
    const deliveryResult = deliveryResultFromSuccessInput(inputRecord.result);
    const idempotencyKey = await resolveIdempotencyKey(deliveryResult.deliveryRef, inputRecord.idempotencyKey);
    const recordedAtIso = normalizeIsoTimestamp(
      inputRecord.recordedAtIso,
      'Delivery success record recordedAtIso',
    );
    const attempt = await readAttemptByDeliveryRef(deliveryResult.deliveryRef);
    if (attempt !== undefined && !sameTarget(deliveryResult.externalMessageRef, attempt.target)) {
      throw new TypeError('Delivery store success external message ref must match the registered attempt target.');
    }

    const record: DurableDeliverySuccessResultRecord = safeRecord(
      {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'delivery-success-result',
        deliveryRef: deliveryResult.deliveryRef,
        idempotencyKey,
        deliveryResult,
        externalMessageRef: deliveryResult.externalMessageRef,
        retryable: false,
        shouldMarkDelivered: true,
        shouldMarkFailed: false,
        shouldRetry: false,
        recordedAtIso,
      },
      'Delivery success result record',
    );
    const externalRecord: DurableDeliveryExternalMessageRecord = safeRecord(
      {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'external-message-ref',
        deliveryRef: deliveryResult.deliveryRef,
        idempotencyKey,
        externalMessageRef: deliveryResult.externalMessageRef,
        recordedAtIso,
      },
      'Delivery external message record',
    );

    await boundary.write(resultKey(record.deliveryRef), record);
    await boundary.write(externalMessageKey(record.deliveryRef), externalRecord);

    if (attempt !== undefined) {
      await writeAttempt(
        safeRecord(
          {
            ...attempt,
            status: 'delivered',
            updatedAtIso: recordedAtIso,
          },
          'Delivery delivered attempt record',
        ),
      );
    }

    return record;
  }

  async function markFailed(
    inputRecord: MarkDurableDeliveryFailureInput,
  ): Promise<DurableDeliveryFailureResultRecord> {
    const deliveryResult = deliveryResultFromFailureInput(inputRecord.result);
    const idempotencyKey = await resolveIdempotencyKey(deliveryResult.deliveryRef, inputRecord.idempotencyKey);
    const recordedAtIso = normalizeIsoTimestamp(
      inputRecord.recordedAtIso,
      'Delivery failure record recordedAtIso',
    );
    const retryable = deliveryResult.retryable ?? deliveryResult.error.retryable ?? false;

    const record: DurableDeliveryFailureResultRecord = safeRecord(
      {
        schemaVersion: DURABLE_DELIVERY_STORE_SCHEMA_VERSION,
        recordKind: 'delivery-failure-result',
        deliveryRef: deliveryResult.deliveryRef,
        idempotencyKey,
        deliveryResult,
        error: deliveryResult.error,
        retryable,
        shouldMarkDelivered: false,
        shouldMarkFailed: true,
        shouldRetry: retryable,
        recordedAtIso,
      },
      'Delivery failure result record',
    );

    await boundary.write(resultKey(record.deliveryRef), record);

    const attempt = await readAttemptByDeliveryRef(record.deliveryRef);
    if (attempt !== undefined) {
      await writeAttempt(
        safeRecord(
          {
            ...attempt,
            status: 'failed',
            updatedAtIso: recordedAtIso,
          },
          'Delivery failed attempt record',
        ),
      );
    }

    return record;
  }

  async function getResultByDeliveryRef(
    deliveryRef: AdapterOperationRef,
  ): Promise<DurableDeliveryResultRecord | undefined> {
    const key = resultKey(normalizeOperationRef(deliveryRef, 'Delivery store deliveryRef'));
    return normalizeResultRecord(await boundary.read(key));
  }

  async function getResultByIdempotencyKey(
    idempotencyKey: AdapterIdempotencyKey,
  ): Promise<DurableDeliveryResultRecord | undefined> {
    const attempt = await readAttemptByIdempotencyKey(idempotencyKey);
    return attempt === undefined ? undefined : getResultByDeliveryRef(attempt.deliveryRef);
  }

  async function getExternalMessageRefByDeliveryRef(
    deliveryRef: AdapterOperationRef,
  ): Promise<TelegramExternalMessageRef | undefined> {
    const key = externalMessageKey(normalizeOperationRef(deliveryRef, 'Delivery store deliveryRef'));
    const record = normalizeExternalMessageRecord(await boundary.read(key));
    return record?.externalMessageRef;
  }

  async function listRecords<T>(
    prefix: DurableDeliveryRecordPrefix,
    normalize: (input: unknown) => T | undefined,
  ): Promise<readonly T[]> {
    if (boundary.list === undefined) {
      return Object.freeze([]);
    }

    const records: T[] = [];
    for (const candidate of await boundary.list(prefix)) {
      const record = normalize(candidate);
      if (record !== undefined) {
        records.push(record);
      }
    }

    return Object.freeze(records);
  }

  return Object.freeze({
    registerAttempt,
    markDelivered,
    markFailed,
    async recordPumpDecision(
      inputRecord: RecordDurableDeliveryPumpDecisionInput,
    ): Promise<DurableDeliveryResultRecord> {
      if (inputRecord.decision.kind === 'delivered') {
        return markDelivered({
          result: inputRecord.decision,
          ...(inputRecord.idempotencyKey === undefined ? {} : { idempotencyKey: inputRecord.idempotencyKey }),
          ...(inputRecord.recordedAtIso === undefined ? {} : { recordedAtIso: inputRecord.recordedAtIso }),
        });
      }

      return markFailed({
        result: inputRecord.decision,
        ...(inputRecord.idempotencyKey === undefined ? {} : { idempotencyKey: inputRecord.idempotencyKey }),
        ...(inputRecord.recordedAtIso === undefined ? {} : { recordedAtIso: inputRecord.recordedAtIso }),
      });
    },
    getAttemptByDeliveryRef: readAttemptByDeliveryRef,
    getAttemptByIdempotencyKey: readAttemptByIdempotencyKey,
    getResultByDeliveryRef,
    getResultByIdempotencyKey,
    getExternalMessageRefByDeliveryRef,
    listAttempts(): Promise<readonly DurableDeliveryAttemptRecord[]> {
      return listRecords(
        `${TELEGRAM_DELIVERY_STORE_KEY_PREFIX}:attempt:` as DurableDeliveryRecordPrefix,
        normalizeAttemptRecord,
      );
    },
    listResults(): Promise<readonly DurableDeliveryResultRecord[]> {
      return listRecords(
        `${TELEGRAM_DELIVERY_STORE_KEY_PREFIX}:result:` as DurableDeliveryRecordPrefix,
        normalizeResultRecord,
      );
    },
  });
}
