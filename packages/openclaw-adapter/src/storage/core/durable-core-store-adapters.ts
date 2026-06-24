import type { AdapterOperationContext } from '../../contracts/context.js';
import type {
  AdapterCorrelationRef,
  AdapterDetailsRef,
  AdapterOperationRef,
  AgentRef,
  ActorRef,
  OpenClawAdapterRef,
  OpenClawAdapterRefKind,
  WorkspaceRef,
} from '../../contracts/refs.js';
import { parseOpenClawAdapterRef } from '../../contracts/refs.js';
import type { AdapterOperationResult } from '../../contracts/result.js';
import { adapterErr, adapterOk, createAdapterSafeError } from '../../contracts/result.js';
import type { OpenClawTelegramAdapterReadiness } from '../../contracts/readiness.js';
import { createAdapterReadinessCheck, summarizeAdapterReadiness } from '../../contracts/readiness.js';
import type { AdapterCoreHostPorts } from '../../host/core-host-factory.js';

export const DURABLE_CORE_STORE_ADAPTER_NAMES = [
  'sessionBindingStore',
  'presentationOutboxStore',
  'presentationActionTokenStore',
] as const;

export type DurableCoreStoreAdapterName = (typeof DURABLE_CORE_STORE_ADAPTER_NAMES)[number];

export type DurableCoreRecordKind =
  | 'core.session-binding'
  | 'core.presentation-outbox'
  | 'core.action-token';

export type DurableCoreSessionBindingStatus = 'active' | 'superseded' | 'expired' | 'revoked';

export type DurableCorePresentationOutboxStatus =
  | 'pending'
  | 'claimed'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DurableCoreActionTokenStatus = 'issued' | 'verified' | 'consumed' | 'expired' | 'revoked';

export interface DurableCoreSerializedRecordDescriptor {
  readonly format: string;
  readonly contentRef?: OpenClawAdapterRef;
  readonly summary?: string;
}

export interface DurableCoreSafeRecordBase {
  readonly recordKind: DurableCoreRecordKind;
  readonly recordKey: string;
  readonly updatedByOperationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly safeMessage?: string;
  readonly serializedPayloadDescriptor?: DurableCoreSerializedRecordDescriptor;
}

export interface DurableCoreSessionBindingRecord extends DurableCoreSafeRecordBase {
  readonly recordKind: 'core.session-binding';
  readonly externalSessionRef: OpenClawAdapterRef;
  readonly hostSessionRef: OpenClawAdapterRef;
  readonly workspaceRef?: WorkspaceRef;
  readonly agentRef?: AgentRef;
  readonly actorRef?: ActorRef;
  readonly status: DurableCoreSessionBindingStatus;
}

export interface DurableCorePresentationOutboxRecord extends DurableCoreSafeRecordBase {
  readonly recordKind: 'core.presentation-outbox';
  readonly presentationRef: OpenClawAdapterRef;
  readonly status: DurableCorePresentationOutboxStatus;
  readonly claimRef?: OpenClawAdapterRef;
  readonly deliveryRequestRef?: OpenClawAdapterRef;
  readonly externalMessageRef?: OpenClawAdapterRef;
  readonly attemptRef?: OpenClawAdapterRef;
}

export interface DurableCoreActionTokenRecord extends DurableCoreSafeRecordBase {
  readonly recordKind: 'core.action-token';
  readonly actionTokenRef: OpenClawAdapterRef;
  readonly presentationRef?: OpenClawAdapterRef;
  readonly actorRef?: ActorRef;
  readonly status: DurableCoreActionTokenStatus;
  readonly issuedByOperationRef?: AdapterOperationRef;
  readonly consumedByOperationRef?: AdapterOperationRef;
}

export interface DurableCoreRecordListInput {
  readonly status?: string;
  readonly limit?: number;
}

export type MaybePromise<T> = T | Promise<T>;

export interface DurableCoreRecordStore<TRecord extends DurableCoreSafeRecordBase> {
  readonly get: (recordKey: string) => MaybePromise<unknown | null | undefined>;
  readonly put: (record: TRecord) => MaybePromise<unknown>;
  readonly delete?: (recordKey: string) => MaybePromise<unknown>;
  readonly list?: (input?: DurableCoreRecordListInput) => MaybePromise<readonly unknown[]>;
}

export interface DurableCoreStoreAdapterBoundaries {
  readonly sessionBindingStore?: DurableCoreRecordStore<DurableCoreSessionBindingRecord>;
  readonly presentationOutboxStore?: DurableCoreRecordStore<DurableCorePresentationOutboxRecord>;
  readonly presentationActionTokenStore?: DurableCoreRecordStore<DurableCoreActionTokenRecord>;
}

export interface DurableCoreStoreAdapterBundleInput {
  readonly boundaries?: DurableCoreStoreAdapterBoundaries;
  readonly context?: AdapterOperationContext;
}

export interface DurableCoreStoreAdapters {
  readonly sessionBindingStore?: DurableCoreSessionBindingStoreAdapter;
  readonly presentationOutboxStore?: DurableCorePresentationOutboxStoreAdapter;
  readonly presentationActionTokenStore?: DurableCorePresentationActionTokenStoreAdapter;
}

export type DurableCoreHostStorePorts = Pick<AdapterCoreHostPorts, DurableCoreStoreAdapterName>;

export interface DurableCoreStoreAdapterBundle {
  readonly adapters: DurableCoreStoreAdapters;
  readonly ports: DurableCoreHostStorePorts;
  readonly configuredStores: readonly DurableCoreStoreAdapterName[];
  readonly missingStores: readonly DurableCoreStoreAdapterName[];
  readonly readiness: OpenClawTelegramAdapterReadiness;
}

export interface DurableCoreSessionBindingStoreAdapter {
  readonly get: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreSessionBindingRecord | undefined>>;
  readonly put: (
    record: unknown,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreSessionBindingRecord>>;
  readonly delete: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<{ readonly deleted: true }>>;
  readonly list: (
    input?: DurableCoreRecordListInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCoreSessionBindingRecord[]>>;
  readonly getSessionBinding: DurableCoreSessionBindingStoreAdapter['get'];
  readonly putSessionBinding: DurableCoreSessionBindingStoreAdapter['put'];
}

export interface DurableCorePresentationOutboxStoreAdapter {
  readonly get: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCorePresentationOutboxRecord | undefined>>;
  readonly put: (
    record: unknown,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCorePresentationOutboxRecord>>;
  readonly delete: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<{ readonly deleted: true }>>;
  readonly list: (
    input?: DurableCoreRecordListInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCorePresentationOutboxRecord[]>>;
  readonly getPresentationOutboxRecord: DurableCorePresentationOutboxStoreAdapter['get'];
  readonly putPresentationOutboxRecord: DurableCorePresentationOutboxStoreAdapter['put'];
  readonly listPendingPresentationOutboxRecords: (
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCorePresentationOutboxRecord[]>>;
}

export interface DurableCorePresentationActionTokenStoreAdapter {
  readonly get: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreActionTokenRecord | undefined>>;
  readonly put: (
    record: unknown,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreActionTokenRecord>>;
  readonly delete: (
    recordKey: string,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<{ readonly deleted: true }>>;
  readonly list: (
    input?: DurableCoreRecordListInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<readonly DurableCoreActionTokenRecord[]>>;
  readonly consumeActionTokenRecord: (
    recordKey: string,
    input?: DurableCoreActionTokenConsumeInput,
    context?: AdapterOperationContext,
  ) => Promise<AdapterOperationResult<DurableCoreActionTokenRecord>>;
  readonly getActionTokenRecord: DurableCorePresentationActionTokenStoreAdapter['get'];
  readonly putActionTokenRecord: DurableCorePresentationActionTokenStoreAdapter['put'];
}

export interface DurableCoreActionTokenConsumeInput {
  readonly consumedByOperationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly safeMessage?: string;
}

interface DurableCoreBaseRecordFields {
  readonly updatedByOperationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly safeMessage?: string;
  readonly serializedPayloadDescriptor?: DurableCoreSerializedRecordDescriptor;
}

const RECORD_KEY_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const MAX_RECORD_KEY_LENGTH = 256;
const MAX_SAFE_MESSAGE_LENGTH = 240;
const MAX_DESCRIPTOR_FORMAT_LENGTH = 80;
const SESSION_BINDING_STATUSES = ['active', 'superseded', 'expired', 'revoked'] as const;
const PRESENTATION_OUTBOX_STATUSES = ['pending', 'claimed', 'delivered', 'failed', 'cancelled'] as const;
const ACTION_TOKEN_STATUSES = ['issued', 'verified', 'consumed', 'expired', 'revoked'] as const;
const SAFE_DESCRIPTOR_FORMAT_PATTERN = /^[A-Za-z0-9._~-]+$/u;
const SENSITIVE_ASSIGNMENT_TERMS = [
  ['bot', 'token'].join('[_-]?'),
  ['api', 'key'].join('[_-]?'),
  'authorization',
  'password',
  'passwd',
  ['sec', 'ret'].join(''),
  'credential',
];
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(?:${SENSITIVE_ASSIGNMENT_TERMS.join('|')})\\b\\s*[:=]\\s*\\S+`,
  'giu',
);
const PROTECTED_VALUE_TERM_PARTS = [
  ['raw', 'update'],
  ['telegram', 'update'],
  ['raw', 'telegram', 'update'],
  ['raw', 'open', 'claw', 'event'],
  ['raw', 'provider', 'response'],
  ['raw', 'runtime', 'payload'],
  ['raw', 'tool', 'payload'],
  ['tool', 'payload'],
  ['approval', 'payload'],
  ['raw', 'approval', 'payload'],
  ['raw', 'core', 'result'],
  ['raw', 'error'],
  ['stack'],
  ['bot', 'token'],
  ['api', 'key'],
  ['secret'],
  ['password'],
  ['credential'],
  ['filesystem', 'path'],
  ['storage', 'path'],
] as const;
const NORMALIZED_PROTECTED_VALUE_TERMS = PROTECTED_VALUE_TERM_PARTS.map((parts) => parts.join(''));
const PROTECTED_VALUE_MESSAGE_PATTERNS = PROTECTED_VALUE_TERM_PARTS.map(
  (parts) => new RegExp(`(?<![A-Za-z0-9])${parts.join('(?:[\\s_-]*)')}(?![A-Za-z0-9])`, 'giu'),
);
const BASE_RECORD_ALLOWED_KEYS = [
  'recordKind',
  'recordKey',
  'updatedByOperationRef',
  'correlationRef',
  'detailsRef',
  'safeMessage',
  'serializedPayloadDescriptor',
] as const;
const SESSION_BINDING_ALLOWED_KEYS = new Set([
  ...BASE_RECORD_ALLOWED_KEYS,
  'externalSessionRef',
  'hostSessionRef',
  'workspaceRef',
  'agentRef',
  'actorRef',
  'status',
]);
const PRESENTATION_OUTBOX_ALLOWED_KEYS = new Set([
  ...BASE_RECORD_ALLOWED_KEYS,
  'presentationRef',
  'status',
  'claimRef',
  'deliveryRequestRef',
  'externalMessageRef',
  'attemptRef',
]);
const ACTION_TOKEN_ALLOWED_KEYS = new Set([
  ...BASE_RECORD_ALLOWED_KEYS,
  'actionTokenRef',
  'presentationRef',
  'actorRef',
  'status',
  'issuedByOperationRef',
  'consumedByOperationRef',
]);
const SERIALIZED_DESCRIPTOR_ALLOWED_KEYS = new Set(['format', 'contentRef', 'summary']);
const LIST_INPUT_ALLOWED_KEYS = new Set(['status', 'limit']);
const ACTION_TOKEN_CONSUME_ALLOWED_KEYS = new Set([
  'consumedByOperationRef',
  'correlationRef',
  'detailsRef',
  'safeMessage',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new TypeError(`${label} contains unsupported fields.`);
    }
  }
}

function invalidInputResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(createAdapterSafeError({ code: 'invalid-input', message }), context);
}

function dependencyMissingResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(createAdapterSafeError({ code: 'dependency-missing', message }), context);
}

function dependencyFailedResult<T>(
  storeName: DurableCoreStoreAdapterName,
  operation: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(
    createAdapterSafeError({
      code: 'dependency-failed',
      message: `Durable core ${storeName} boundary failed during ${operation}.`,
      retryable: true,
    }),
    context,
  );
}

function notFoundResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(createAdapterSafeError({ code: 'not-found', message }), context);
}

function conflictResult<T>(
  message: string,
  context: AdapterOperationContext | undefined,
): AdapterOperationResult<T> {
  return adapterErr(createAdapterSafeError({ code: 'conflict', message }), context);
}

function normalizeProtectedTermCandidate(value: string): string {
  return value.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function containsProtectedValueTerm(value: string): boolean {
  const normalized = normalizeProtectedTermCandidate(value);
  return NORMALIZED_PROTECTED_VALUE_TERMS.some((term) => normalized.includes(term));
}

function redactProtectedValueTerms(value: string): string {
  return PROTECTED_VALUE_MESSAGE_PATTERNS.reduce(
    (currentValue, pattern) => currentValue.replace(pattern, '[redacted]'),
    value,
  );
}

function normalizeRecordKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('recordKey must be a string.');
  }

  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_RECORD_KEY_LENGTH ||
    !RECORD_KEY_PATTERN.test(normalized)
  ) {
    throw new TypeError('recordKey must be a non-empty safe identifier.');
  }

  if (containsProtectedValueTerm(normalized)) {
    throw new TypeError('recordKey must not contain protected terms.');
  }

  return normalized;
}

function normalizeOptionalSafeMessage(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new TypeError('safeMessage must be a string when provided.');
  }

  const normalized = value
    .replace(/[\u0000-\u001F\u007F]+/gu, ' ')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '[redacted]')
    .replace(/\[redacted\]\s*[:=]\s*\S+/giu, '[redacted]')
    .trim();
  const redacted = redactProtectedValueTerms(normalized)
    .replace(/\s+/gu, ' ')
    .trim();

  if (redacted.length === 0) {
    return undefined;
  }

  if (redacted.length <= MAX_SAFE_MESSAGE_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_SAFE_MESSAGE_LENGTH - 3)}...`;
}

function normalizeAdapterRef<TRef extends OpenClawAdapterRef>(
  fieldName: string,
  value: unknown,
  expectedKind?: OpenClawAdapterRefKind,
): TRef {
  const parsed = parseOpenClawAdapterRef(value);
  if (parsed === null || (expectedKind !== undefined && parsed.kind !== expectedKind)) {
    throw new TypeError(`${fieldName} must be a safe adapter ref.`);
  }

  if (containsProtectedValueTerm(parsed.ref) || containsProtectedValueTerm(parsed.value)) {
    throw new TypeError(`${fieldName} must not contain protected terms.`);
  }

  return parsed.ref as TRef;
}

function normalizeOptionalAdapterRef<TRef extends OpenClawAdapterRef>(
  fieldName: string,
  value: unknown,
  expectedKind?: OpenClawAdapterRefKind,
): TRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeAdapterRef<TRef>(fieldName, value, expectedKind);
}

function normalizeRecordKind(
  value: unknown,
  expectedKind: DurableCoreRecordKind,
  label: string,
): DurableCoreRecordKind {
  if (value === undefined) {
    return expectedKind;
  }

  if (value !== expectedKind) {
    throw new TypeError(`${label} has an unsupported record kind.`);
  }

  return expectedKind;
}

function normalizeStatus<TStatus extends string>(
  fieldName: string,
  value: unknown,
  allowedStatuses: readonly TStatus[],
): TStatus {
  if (typeof value !== 'string' || !allowedStatuses.includes(value as TStatus)) {
    throw new TypeError(`${fieldName} has an unsupported status.`);
  }

  return value as TStatus;
}

function normalizeOptionalLimit(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > 1_000) {
    throw new TypeError('limit must be a positive integer no greater than 1000 when provided.');
  }

  return value;
}

function normalizeSerializedPayloadDescriptor(
  value: unknown,
): DurableCoreSerializedRecordDescriptor | undefined {
  if (value === undefined) {
    return undefined;
  }

  assertRecord(value, 'serializedPayloadDescriptor');
  assertAllowedKeys(value, SERIALIZED_DESCRIPTOR_ALLOWED_KEYS, 'serializedPayloadDescriptor');

  if (typeof value.format !== 'string') {
    throw new TypeError('serializedPayloadDescriptor.format must be a string.');
  }

  const format = value.format.trim();
  if (
    format.length === 0 ||
    format.length > MAX_DESCRIPTOR_FORMAT_LENGTH ||
    !SAFE_DESCRIPTOR_FORMAT_PATTERN.test(format) ||
    containsProtectedValueTerm(format)
  ) {
    throw new TypeError('serializedPayloadDescriptor.format must be a safe identifier.');
  }

  const contentRef = normalizeOptionalAdapterRef('serializedPayloadDescriptor.contentRef', value.contentRef);
  const summary = normalizeOptionalSafeMessage(value.summary);

  return Object.freeze({
    format,
    ...(contentRef === undefined ? {} : { contentRef }),
    ...(summary === undefined ? {} : { summary }),
  });
}

function normalizeBaseRecordFields(input: {
  readonly record: Record<string, unknown>;
  readonly expectedKind: DurableCoreRecordKind;
  readonly label: string;
}): DurableCoreBaseRecordFields {
  normalizeRecordKind(input.record.recordKind, input.expectedKind, input.label);
  const updatedByOperationRef = normalizeOptionalAdapterRef<AdapterOperationRef>(
    'updatedByOperationRef',
    input.record.updatedByOperationRef,
    'operation',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    'correlationRef',
    input.record.correlationRef,
    'correlation',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    'detailsRef',
    input.record.detailsRef,
    'details',
  );
  const safeMessage = normalizeOptionalSafeMessage(input.record.safeMessage);
  const serializedPayloadDescriptor = normalizeSerializedPayloadDescriptor(
    input.record.serializedPayloadDescriptor,
  );

  return Object.freeze({
    ...(updatedByOperationRef === undefined ? {} : { updatedByOperationRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(safeMessage === undefined ? {} : { safeMessage }),
    ...(serializedPayloadDescriptor === undefined ? {} : { serializedPayloadDescriptor }),
  });
}

function normalizeListInput(input: unknown): DurableCoreRecordListInput {
  if (input === undefined) {
    return Object.freeze({});
  }

  assertRecord(input, 'list input');
  assertAllowedKeys(input, LIST_INPUT_ALLOWED_KEYS, 'list input');

  const limit = normalizeOptionalLimit(input.limit);
  return Object.freeze({
    ...(input.status === undefined ? {} : { status: normalizeRecordKey(input.status) }),
    ...(limit === undefined ? {} : { limit }),
  });
}

function normalizeActionTokenConsumeInput(input: unknown): DurableCoreActionTokenConsumeInput {
  if (input === undefined) {
    return Object.freeze({});
  }

  assertRecord(input, 'action token consume input');
  assertAllowedKeys(input, ACTION_TOKEN_CONSUME_ALLOWED_KEYS, 'action token consume input');

  const consumedByOperationRef = normalizeOptionalAdapterRef<AdapterOperationRef>(
    'consumedByOperationRef',
    input.consumedByOperationRef,
    'operation',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    'correlationRef',
    input.correlationRef,
    'correlation',
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    'detailsRef',
    input.detailsRef,
    'details',
  );
  const safeMessage = normalizeOptionalSafeMessage(input.safeMessage);

  return Object.freeze({
    ...(consumedByOperationRef === undefined ? {} : { consumedByOperationRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(safeMessage === undefined ? {} : { safeMessage }),
  });
}

function isDurableCoreRecordStore(value: unknown): value is DurableCoreRecordStore<DurableCoreSafeRecordBase> {
  return (
    isRecord(value) &&
    typeof value.get === 'function' &&
    typeof value.put === 'function' &&
    (value.delete === undefined || typeof value.delete === 'function') &&
    (value.list === undefined || typeof value.list === 'function')
  );
}

function assertDurableCoreRecordStore(
  value: unknown,
  storeName: DurableCoreStoreAdapterName,
): void {
  if (!isDurableCoreRecordStore(value)) {
    throw new TypeError(`Durable core ${storeName} boundary must expose get and put functions.`);
  }
}

function createSafeGetOperation<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
  readonly normalize: (record: unknown) => TRecord;
}): (
  recordKey: string,
  context?: AdapterOperationContext,
) => Promise<AdapterOperationResult<TRecord | undefined>> {
  return async (recordKey, context) => {
    let safeRecordKey: string;
    try {
      safeRecordKey = normalizeRecordKey(recordKey);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core record key is malformed.',
        context,
      );
    }

    let rawRecord: unknown | null | undefined;
    try {
      rawRecord = await input.boundary.get(safeRecordKey);
    } catch {
      return dependencyFailedResult(input.storeName, 'read', context);
    }

    if (rawRecord === undefined || rawRecord === null) {
      return adapterOk(undefined, context);
    }

    try {
      return adapterOk(input.normalize(rawRecord), context);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core record is malformed.',
        context,
      );
    }
  };
}

function createSafePutOperation<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
  readonly normalize: (record: unknown) => TRecord;
}): (record: unknown, context?: AdapterOperationContext) => Promise<AdapterOperationResult<TRecord>> {
  return async (record, context) => {
    let normalizedRecord: TRecord;
    try {
      normalizedRecord = input.normalize(record);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core record is malformed.',
        context,
      );
    }

    try {
      await input.boundary.put(normalizedRecord);
    } catch {
      return dependencyFailedResult(input.storeName, 'write', context);
    }

    return adapterOk(normalizedRecord, context);
  };
}

function createSafeDeleteOperation<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
}): (
  recordKey: string,
  context?: AdapterOperationContext,
) => Promise<AdapterOperationResult<{ readonly deleted: true }>> {
  return async (recordKey, context) => {
    if (input.boundary.delete === undefined) {
      return dependencyMissingResult(
        `Durable core ${input.storeName} boundary does not expose delete.`,
        context,
      );
    }

    let safeRecordKey: string;
    try {
      safeRecordKey = normalizeRecordKey(recordKey);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core record key is malformed.',
        context,
      );
    }

    try {
      await input.boundary.delete(safeRecordKey);
    } catch {
      return dependencyFailedResult(input.storeName, 'delete', context);
    }

    return adapterOk(Object.freeze({ deleted: true as const }), context);
  };
}

function createSafeListOperation<TRecord extends DurableCoreSafeRecordBase>(input: {
  readonly storeName: DurableCoreStoreAdapterName;
  readonly boundary: DurableCoreRecordStore<TRecord>;
  readonly normalize: (record: unknown) => TRecord;
}): (
  listInput?: DurableCoreRecordListInput,
  context?: AdapterOperationContext,
) => Promise<AdapterOperationResult<readonly TRecord[]>> {
  return async (listInput, context) => {
    if (input.boundary.list === undefined) {
      return dependencyMissingResult(
        `Durable core ${input.storeName} boundary does not expose list.`,
        context,
      );
    }

    let filter: DurableCoreRecordListInput;
    try {
      filter = normalizeListInput(listInput);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core record list input is malformed.',
        context,
      );
    }

    let rawRecords: readonly unknown[];
    try {
      rawRecords = await input.boundary.list(filter);
    } catch {
      return dependencyFailedResult(input.storeName, 'list', context);
    }

    try {
      const normalized = rawRecords.map((record) => input.normalize(record));
      const filtered =
        filter.status === undefined
          ? normalized
          : normalized.filter((record) => 'status' in record && record.status === filter.status);
      const limited = filter.limit === undefined ? filtered : filtered.slice(0, filter.limit);
      return adapterOk(Object.freeze(limited), context);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core records are malformed.',
        context,
      );
    }
  };
}

export function normalizeDurableCoreSessionBindingRecord(
  input: unknown,
): DurableCoreSessionBindingRecord {
  assertRecord(input, 'session binding record');
  assertAllowedKeys(input, SESSION_BINDING_ALLOWED_KEYS, 'session binding record');
  const baseRecord = normalizeBaseRecordFields({
    record: input,
    expectedKind: 'core.session-binding',
    label: 'session binding record',
  });
  const workspaceRef = normalizeOptionalAdapterRef<WorkspaceRef>('workspaceRef', input.workspaceRef, 'workspace');
  const agentRef = normalizeOptionalAdapterRef<AgentRef>('agentRef', input.agentRef, 'agent');
  const actorRef = normalizeOptionalAdapterRef<ActorRef>('actorRef', input.actorRef, 'actor');

  return Object.freeze({
    recordKind: 'core.session-binding' as const,
    recordKey: normalizeRecordKey(input.recordKey),
    ...baseRecord,
    externalSessionRef: normalizeAdapterRef('externalSessionRef', input.externalSessionRef),
    hostSessionRef: normalizeAdapterRef('hostSessionRef', input.hostSessionRef),
    ...(workspaceRef === undefined ? {} : { workspaceRef }),
    ...(agentRef === undefined ? {} : { agentRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    status: normalizeStatus('status', input.status, SESSION_BINDING_STATUSES),
  });
}

export function normalizeDurableCorePresentationOutboxRecord(
  input: unknown,
): DurableCorePresentationOutboxRecord {
  assertRecord(input, 'presentation outbox record');
  assertAllowedKeys(input, PRESENTATION_OUTBOX_ALLOWED_KEYS, 'presentation outbox record');
  const baseRecord = normalizeBaseRecordFields({
    record: input,
    expectedKind: 'core.presentation-outbox',
    label: 'presentation outbox record',
  });
  const claimRef = normalizeOptionalAdapterRef('claimRef', input.claimRef);
  const deliveryRequestRef = normalizeOptionalAdapterRef('deliveryRequestRef', input.deliveryRequestRef);
  const externalMessageRef = normalizeOptionalAdapterRef('externalMessageRef', input.externalMessageRef);
  const attemptRef = normalizeOptionalAdapterRef('attemptRef', input.attemptRef);

  return Object.freeze({
    recordKind: 'core.presentation-outbox' as const,
    recordKey: normalizeRecordKey(input.recordKey),
    ...baseRecord,
    presentationRef: normalizeAdapterRef('presentationRef', input.presentationRef),
    status: normalizeStatus('status', input.status, PRESENTATION_OUTBOX_STATUSES),
    ...(claimRef === undefined ? {} : { claimRef }),
    ...(deliveryRequestRef === undefined ? {} : { deliveryRequestRef }),
    ...(externalMessageRef === undefined ? {} : { externalMessageRef }),
    ...(attemptRef === undefined ? {} : { attemptRef }),
  });
}

export function normalizeDurableCoreActionTokenRecord(input: unknown): DurableCoreActionTokenRecord {
  assertRecord(input, 'action token record');
  assertAllowedKeys(input, ACTION_TOKEN_ALLOWED_KEYS, 'action token record');
  const baseRecord = normalizeBaseRecordFields({
    record: input,
    expectedKind: 'core.action-token',
    label: 'action token record',
  });
  const presentationRef = normalizeOptionalAdapterRef('presentationRef', input.presentationRef);
  const actorRef = normalizeOptionalAdapterRef<ActorRef>('actorRef', input.actorRef, 'actor');
  const issuedByOperationRef = normalizeOptionalAdapterRef<AdapterOperationRef>(
    'issuedByOperationRef',
    input.issuedByOperationRef,
    'operation',
  );
  const consumedByOperationRef = normalizeOptionalAdapterRef<AdapterOperationRef>(
    'consumedByOperationRef',
    input.consumedByOperationRef,
    'operation',
  );

  return Object.freeze({
    recordKind: 'core.action-token' as const,
    recordKey: normalizeRecordKey(input.recordKey),
    ...baseRecord,
    actionTokenRef: normalizeAdapterRef('actionTokenRef', input.actionTokenRef),
    ...(presentationRef === undefined ? {} : { presentationRef }),
    ...(actorRef === undefined ? {} : { actorRef }),
    status: normalizeStatus('status', input.status, ACTION_TOKEN_STATUSES),
    ...(issuedByOperationRef === undefined ? {} : { issuedByOperationRef }),
    ...(consumedByOperationRef === undefined ? {} : { consumedByOperationRef }),
  });
}

export function summarizeDurableCoreStoreReadiness(
  boundaries: DurableCoreStoreAdapterBoundaries = {},
): OpenClawTelegramAdapterReadiness {
  const checks = DURABLE_CORE_STORE_ADAPTER_NAMES.map((storeName) => {
    const boundary = boundaries[storeName];
    return createAdapterReadinessCheck({
      component: `storage.core.${storeName}`,
      status: isDurableCoreRecordStore(boundary) ? 'pass' : 'fail',
      message: isDurableCoreRecordStore(boundary)
        ? `Durable core ${storeName} boundary is configured.`
        : `Durable core ${storeName} boundary is missing or malformed.`,
    });
  });

  return summarizeAdapterReadiness({ checks });
}

export function createDurableCoreSessionBindingStoreAdapter(
  boundary: DurableCoreRecordStore<DurableCoreSessionBindingRecord>,
): DurableCoreSessionBindingStoreAdapter {
  assertDurableCoreRecordStore(boundary, 'sessionBindingStore');

  const get = createSafeGetOperation({
    storeName: 'sessionBindingStore',
    boundary,
    normalize: normalizeDurableCoreSessionBindingRecord,
  });
  const put = createSafePutOperation({
    storeName: 'sessionBindingStore',
    boundary,
    normalize: normalizeDurableCoreSessionBindingRecord,
  });
  const remove = createSafeDeleteOperation({ storeName: 'sessionBindingStore', boundary });
  const list = createSafeListOperation({
    storeName: 'sessionBindingStore',
    boundary,
    normalize: normalizeDurableCoreSessionBindingRecord,
  });

  return Object.freeze({
    get,
    put,
    delete: remove,
    list,
    getSessionBinding: get,
    putSessionBinding: put,
  });
}

export function createDurableCorePresentationOutboxStoreAdapter(
  boundary: DurableCoreRecordStore<DurableCorePresentationOutboxRecord>,
): DurableCorePresentationOutboxStoreAdapter {
  assertDurableCoreRecordStore(boundary, 'presentationOutboxStore');

  const get = createSafeGetOperation({
    storeName: 'presentationOutboxStore',
    boundary,
    normalize: normalizeDurableCorePresentationOutboxRecord,
  });
  const put = createSafePutOperation({
    storeName: 'presentationOutboxStore',
    boundary,
    normalize: normalizeDurableCorePresentationOutboxRecord,
  });
  const remove = createSafeDeleteOperation({ storeName: 'presentationOutboxStore', boundary });
  const list = createSafeListOperation({
    storeName: 'presentationOutboxStore',
    boundary,
    normalize: normalizeDurableCorePresentationOutboxRecord,
  });
  const listPendingPresentationOutboxRecords = (context?: AdapterOperationContext) =>
    list(Object.freeze({ status: 'pending' }), context);

  return Object.freeze({
    get,
    put,
    delete: remove,
    list,
    getPresentationOutboxRecord: get,
    putPresentationOutboxRecord: put,
    listPendingPresentationOutboxRecords,
  });
}

export function createDurableCorePresentationActionTokenStoreAdapter(
  boundary: DurableCoreRecordStore<DurableCoreActionTokenRecord>,
): DurableCorePresentationActionTokenStoreAdapter {
  assertDurableCoreRecordStore(boundary, 'presentationActionTokenStore');

  const get = createSafeGetOperation({
    storeName: 'presentationActionTokenStore',
    boundary,
    normalize: normalizeDurableCoreActionTokenRecord,
  });
  const put = createSafePutOperation({
    storeName: 'presentationActionTokenStore',
    boundary,
    normalize: normalizeDurableCoreActionTokenRecord,
  });
  const remove = createSafeDeleteOperation({ storeName: 'presentationActionTokenStore', boundary });
  const list = createSafeListOperation({
    storeName: 'presentationActionTokenStore',
    boundary,
    normalize: normalizeDurableCoreActionTokenRecord,
  });
  const consumeActionTokenRecord = async (
    recordKey: string,
    input?: DurableCoreActionTokenConsumeInput,
    context?: AdapterOperationContext,
  ): Promise<AdapterOperationResult<DurableCoreActionTokenRecord>> => {
    const lookup = await get(recordKey, context);
    if (!lookup.ok) {
      return lookup;
    }

    if (lookup.value === undefined) {
      return notFoundResult('Durable core action token record was not found.', context);
    }

    if (lookup.value.status === 'consumed') {
      return conflictResult('Durable core action token record is already consumed.', context);
    }

    if (lookup.value.status === 'expired' || lookup.value.status === 'revoked') {
      return conflictResult('Durable core action token record is not consumable.', context);
    }

    let consumeInput: DurableCoreActionTokenConsumeInput;
    try {
      consumeInput = normalizeActionTokenConsumeInput(input);
    } catch (error) {
      return invalidInputResult(
        error instanceof Error ? error.message : 'Durable core action token consume input is malformed.',
        context,
      );
    }

    const consumed = normalizeDurableCoreActionTokenRecord({
      ...lookup.value,
      status: 'consumed',
      ...(consumeInput.consumedByOperationRef === undefined
        ? {}
        : { consumedByOperationRef: consumeInput.consumedByOperationRef }),
      ...(consumeInput.correlationRef === undefined ? {} : { correlationRef: consumeInput.correlationRef }),
      ...(consumeInput.detailsRef === undefined ? {} : { detailsRef: consumeInput.detailsRef }),
      ...(consumeInput.safeMessage === undefined ? {} : { safeMessage: consumeInput.safeMessage }),
    });

    return put(consumed, context);
  };

  return Object.freeze({
    get,
    put,
    delete: remove,
    list,
    consumeActionTokenRecord,
    getActionTokenRecord: get,
    putActionTokenRecord: put,
  });
}

function assertBoundaryObject(input: DurableCoreStoreAdapterBoundaries): void {
  for (const storeName of DURABLE_CORE_STORE_ADAPTER_NAMES) {
    const boundary = input[storeName];
    if (boundary !== undefined && !isDurableCoreRecordStore(boundary)) {
      throw new TypeError(`Durable core ${storeName} boundary must expose get and put functions.`);
    }
  }
}

function createAdapters(boundaries: DurableCoreStoreAdapterBoundaries): DurableCoreStoreAdapters {
  return Object.freeze({
    ...(boundaries.sessionBindingStore === undefined
      ? {}
      : { sessionBindingStore: createDurableCoreSessionBindingStoreAdapter(boundaries.sessionBindingStore) }),
    ...(boundaries.presentationOutboxStore === undefined
      ? {}
      : {
          presentationOutboxStore: createDurableCorePresentationOutboxStoreAdapter(
            boundaries.presentationOutboxStore,
          ),
        }),
    ...(boundaries.presentationActionTokenStore === undefined
      ? {}
      : {
          presentationActionTokenStore: createDurableCorePresentationActionTokenStoreAdapter(
            boundaries.presentationActionTokenStore,
          ),
        }),
  });
}

function createPorts(adapters: DurableCoreStoreAdapters): DurableCoreHostStorePorts {
  return Object.freeze({
    ...(adapters.sessionBindingStore === undefined
      ? {}
      : { sessionBindingStore: adapters.sessionBindingStore }),
    ...(adapters.presentationOutboxStore === undefined
      ? {}
      : { presentationOutboxStore: adapters.presentationOutboxStore }),
    ...(adapters.presentationActionTokenStore === undefined
      ? {}
      : { presentationActionTokenStore: adapters.presentationActionTokenStore }),
  });
}

function listConfiguredStores(boundaries: DurableCoreStoreAdapterBoundaries): readonly DurableCoreStoreAdapterName[] {
  return Object.freeze(
    DURABLE_CORE_STORE_ADAPTER_NAMES.filter((storeName) => isDurableCoreRecordStore(boundaries[storeName])),
  );
}

function listMissingStores(boundaries: DurableCoreStoreAdapterBoundaries): readonly DurableCoreStoreAdapterName[] {
  return Object.freeze(
    DURABLE_CORE_STORE_ADAPTER_NAMES.filter((storeName) => !isDurableCoreRecordStore(boundaries[storeName])),
  );
}

export function createDurableCoreStoreAdapterBundle(
  input: DurableCoreStoreAdapterBundleInput = {},
): AdapterOperationResult<DurableCoreStoreAdapterBundle> {
  const boundaries = input.boundaries ?? {};
  if (!isRecord(boundaries)) {
    return invalidInputResult('Durable core store boundaries must be an object.', input.context);
  }

  try {
    assertBoundaryObject(boundaries);
    const adapters = createAdapters(boundaries);
    const ports = createPorts(adapters);

    return adapterOk(
      Object.freeze({
        adapters,
        ports,
        configuredStores: listConfiguredStores(boundaries),
        missingStores: listMissingStores(boundaries),
        readiness: summarizeDurableCoreStoreReadiness(boundaries),
      }),
      input.context,
    );
  } catch (error) {
    return invalidInputResult(
      error instanceof Error ? error.message : 'Durable core store adapter bundle input is invalid.',
      input.context,
    );
  }
}
