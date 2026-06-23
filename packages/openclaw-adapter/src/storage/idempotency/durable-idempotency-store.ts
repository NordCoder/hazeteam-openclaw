import {
  isAdapterIdempotencyKey,
  type AdapterIdempotencyKey,
  type AdapterIdempotencyRecordStatus,
  type AdapterIdempotencyScope,
} from '../../contracts/idempotency.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type AdapterOperationResult,
  type AdapterSafeError,
} from '../../contracts/result.js';
import {
  parseOpenClawAdapterRef,
  type AdapterCorrelationRef,
  type AdapterDetailsRef,
  type AdapterOperationRef,
  type OpenClawAdapterRefKind,
} from '../../contracts/refs.js';

const DURABLE_IDEMPOTENCY_RECORD_KIND = 'openclaw-durable-idempotency-record' as const;
const MAX_STORE_REF_LENGTH = 256;
const MAX_STORE_TIMESTAMP_LENGTH = 128;
const SAFE_STORE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]+/gu;

const FORBIDDEN_STORAGE_FIELD_NAMES = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
] as const;
const FORBIDDEN_STORAGE_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['sec', 'ret'],
] as const;
const FORBIDDEN_STORAGE_FIELD_NAME_SET = new Set(
  FORBIDDEN_STORAGE_FIELD_NAMES.map((fieldName) => normalizeFieldName(fieldName)),
);

export type MaybePromise<T> = T | Promise<T>;

export type DurableIdempotencyRecordStatus = Exclude<AdapterIdempotencyRecordStatus, 'duplicate'>;

export interface DurableIdempotencyRecord {
  readonly kind: typeof DURABLE_IDEMPOTENCY_RECORD_KIND;
  readonly key: AdapterIdempotencyKey;
  readonly scope: AdapterIdempotencyScope;
  readonly status: DurableIdempotencyRecordStatus;
  readonly firstSeenAt: string;
  readonly lastSeenAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
  readonly operationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly resultRef?: string;
  readonly failureRef?: string;
  readonly error?: AdapterSafeError;
}

export interface DurableIdempotencyRecordBoundary {
  readonly get: (
    key: AdapterIdempotencyKey,
  ) => MaybePromise<DurableIdempotencyRecord | null | undefined>;
  readonly put: (record: DurableIdempotencyRecord) => MaybePromise<DurableIdempotencyRecord | void>;
  readonly delete: (key: AdapterIdempotencyKey) => MaybePromise<boolean | void>;
  readonly list?: (() => MaybePromise<readonly DurableIdempotencyRecord[]>) | undefined;
}

export interface DurableIdempotencyReserveInput {
  readonly key: AdapterIdempotencyKey;
  readonly firstSeenAt: string;
  readonly lastSeenAt?: string;
  readonly operationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
}

export interface DurableIdempotencyCompleteInput {
  readonly key: AdapterIdempotencyKey;
  readonly completedAt: string;
  readonly lastSeenAt?: string;
  readonly operationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly resultRef?: string;
}

export interface DurableIdempotencyFailInput {
  readonly key: AdapterIdempotencyKey;
  readonly failedAt: string;
  readonly lastSeenAt?: string;
  readonly operationRef?: AdapterOperationRef;
  readonly correlationRef?: AdapterCorrelationRef;
  readonly detailsRef?: AdapterDetailsRef;
  readonly failureRef?: string;
  readonly error: AdapterSafeError;
}

export interface DurableIdempotencyReservedDecision {
  readonly kind: 'reserved';
  readonly duplicate: false;
  readonly record: DurableIdempotencyRecord;
}

export interface DurableIdempotencyDuplicateDecision {
  readonly kind: 'duplicate';
  readonly duplicate: true;
  readonly record: DurableIdempotencyRecord;
}

export type DurableIdempotencyReserveDecision =
  | DurableIdempotencyReservedDecision
  | DurableIdempotencyDuplicateDecision;

export interface DurableIdempotencyDeleteDecision {
  readonly key: AdapterIdempotencyKey;
  readonly deleted: boolean;
}

export interface DurableIdempotencyStore {
  readonly reserve: (
    input: DurableIdempotencyReserveInput,
  ) => Promise<AdapterOperationResult<DurableIdempotencyReserveDecision>>;
  readonly markCompleted: (
    input: DurableIdempotencyCompleteInput,
  ) => Promise<AdapterOperationResult<DurableIdempotencyRecord>>;
  readonly markFailed: (
    input: DurableIdempotencyFailInput,
  ) => Promise<AdapterOperationResult<DurableIdempotencyRecord>>;
  readonly get: (
    key: AdapterIdempotencyKey,
  ) => Promise<AdapterOperationResult<DurableIdempotencyRecord | null>>;
  readonly delete: (
    key: AdapterIdempotencyKey,
  ) => Promise<AdapterOperationResult<DurableIdempotencyDeleteDecision>>;
  readonly list: () => Promise<AdapterOperationResult<readonly DurableIdempotencyRecord[]>>;
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isForbiddenStorageFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    FORBIDDEN_STORAGE_FIELD_NAME_SET.has(normalizedFieldName) ||
    FORBIDDEN_STORAGE_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function sanitizeStoreText(input: string): string {
  const withoutControlCharacters = input
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  return FORBIDDEN_STORAGE_FIELD_NAMES.reduce((currentText, forbiddenTerm) => {
    const assignmentPattern = new RegExp(`\\b${escapeRegExp(forbiddenTerm)}\\b\\s*[:=]\\s*\\S+`, 'giu');
    const termPattern = new RegExp(`\\b${escapeRegExp(forbiddenTerm)}\\b`, 'giu');

    return currentText.replace(assignmentPattern, '[redacted]').replace(termPattern, '[redacted]');
  }, withoutControlCharacters);
}

function containsForbiddenStorageTerm(input: string): boolean {
  const normalizedInput = normalizeFieldName(input);

  return (
    FORBIDDEN_STORAGE_FIELD_NAME_SET.has(normalizedInput) ||
    FORBIDDEN_STORAGE_FIELD_NAMES.some((term) => normalizedInput.includes(normalizeFieldName(term))) ||
    FORBIDDEN_STORAGE_FIELD_NAME_PARTS.some((parts) => normalizedInput.includes(parts.join('')))
  );
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function assertPlainRecord(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (!isPlainRecord(input)) {
    throw new TypeError(`${label} must be a plain record.`);
  }
}

function rejectUnsafeStorageFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeStorageFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isForbiddenStorageFieldName(fieldName)) {
      throw new TypeError(`${label} must not include raw provider, runtime, tool, error, or protected fields.`);
    }
    rejectUnsafeStorageFields(value, label, seen);
  }
}

function normalizeIdempotencyKey(input: unknown, label: string): AdapterIdempotencyKey {
  if (!isAdapterIdempotencyKey(input)) {
    throw new TypeError(`${label} must be a safe adapter idempotency key.`);
  }

  if (containsForbiddenStorageTerm(input)) {
    throw new TypeError(`${label} must not contain protected terms.`);
  }

  return input;
}

function getIdempotencyScope(key: AdapterIdempotencyKey): AdapterIdempotencyScope {
  const [scope] = key.split(':');
  if (scope !== 'inbound-message' && scope !== 'callback' && scope !== 'delivery-attempt') {
    throw new TypeError('Adapter idempotency key scope is unsupported.');
  }

  return scope;
}

function normalizeStatus(input: unknown, label: string): DurableIdempotencyRecordStatus {
  if (input !== 'pending' && input !== 'completed' && input !== 'failed') {
    throw new TypeError(`${label} status must be pending, completed, or failed.`);
  }

  return input;
}

function normalizeSafeStoreString(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = sanitizeStoreText(input);
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    !SAFE_STORE_REF_PATTERN.test(normalized) ||
    containsForbiddenStorageTerm(normalized)
  ) {
    throw new TypeError(`${label} must be a bounded safe storage string.`);
  }

  return normalized;
}

function normalizeTimestamp(input: unknown, label: string): string {
  return normalizeSafeStoreString(input, label, MAX_STORE_TIMESTAMP_LENGTH);
}

function normalizeSafeStoreRef(input: unknown, label: string): string {
  return normalizeSafeStoreString(input, label, MAX_STORE_REF_LENGTH);
}

function normalizeOptionalSafeStoreRef(input: unknown, label: string): string | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeSafeStoreRef(input, label);
}

function normalizeAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T {
  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== kind || containsForbiddenStorageTerm(parsed.ref)) {
    throw new TypeError(`${label} must be a safe adapter ref.`);
  }

  return parsed.ref as T;
}

function normalizeOptionalAdapterRef<T extends string>(
  input: unknown,
  kind: OpenClawAdapterRefKind,
  label: string,
): T | undefined {
  if (input === undefined) {
    return undefined;
  }

  return normalizeAdapterRef<T>(input, kind, label);
}

function normalizeSafeError(input: AdapterSafeError): AdapterSafeError {
  assertPlainRecord(input, 'Durable idempotency safe error');
  rejectUnsafeStorageFields(input, 'Durable idempotency safe error');

  if (typeof input.code !== 'string') {
    throw new TypeError('Durable idempotency safe error code must be a string.');
  }
  if (typeof input.message !== 'string') {
    throw new TypeError('Durable idempotency safe error message must be a string.');
  }
  if (input.retryable !== undefined && typeof input.retryable !== 'boolean') {
    throw new TypeError('Durable idempotency safe error retryable flag must be a boolean.');
  }

  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    'Durable idempotency safe error detailsRef',
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    'Durable idempotency safe error correlationRef',
  );

  return createAdapterSafeError({
    code: input.code as AdapterSafeError['code'],
    message: sanitizeStoreText(input.message),
    ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
  });
}

function normalizeDurableIdempotencyRecord(input: unknown, label: string): DurableIdempotencyRecord {
  assertPlainRecord(input, label);
  rejectUnsafeStorageFields(input, label);

  if (input.kind !== DURABLE_IDEMPOTENCY_RECORD_KIND) {
    throw new TypeError(`${label} kind is unsupported.`);
  }

  const key = normalizeIdempotencyKey(input.key, `${label} key`);
  const scope = getIdempotencyScope(key);
  if (input.scope !== scope) {
    throw new TypeError(`${label} scope must match idempotency key scope.`);
  }

  const status = normalizeStatus(input.status, label);
  const firstSeenAt = normalizeTimestamp(input.firstSeenAt, `${label} firstSeenAt`);
  const lastSeenAt =
    input.lastSeenAt === undefined
      ? undefined
      : normalizeTimestamp(input.lastSeenAt, `${label} lastSeenAt`);
  const completedAt =
    input.completedAt === undefined
      ? undefined
      : normalizeTimestamp(input.completedAt, `${label} completedAt`);
  const failedAt =
    input.failedAt === undefined ? undefined : normalizeTimestamp(input.failedAt, `${label} failedAt`);
  const operationRef = normalizeOptionalAdapterRef<AdapterOperationRef>(
    input.operationRef,
    'operation',
    `${label} operationRef`,
  );
  const correlationRef = normalizeOptionalAdapterRef<AdapterCorrelationRef>(
    input.correlationRef,
    'correlation',
    `${label} correlationRef`,
  );
  const detailsRef = normalizeOptionalAdapterRef<AdapterDetailsRef>(
    input.detailsRef,
    'details',
    `${label} detailsRef`,
  );
  const resultRef = normalizeOptionalSafeStoreRef(input.resultRef, `${label} resultRef`);
  const failureRef = normalizeOptionalSafeStoreRef(input.failureRef, `${label} failureRef`);
  const error = input.error === undefined ? undefined : normalizeSafeError(input.error as AdapterSafeError);

  if (status === 'pending' && (completedAt !== undefined || failedAt !== undefined || error !== undefined)) {
    throw new TypeError(`${label} pending record must not include terminal fields.`);
  }
  if (status === 'completed' && completedAt === undefined) {
    throw new TypeError(`${label} completed record requires completedAt.`);
  }
  if (status === 'failed' && (failedAt === undefined || error === undefined)) {
    throw new TypeError(`${label} failed record requires failedAt and safe error.`);
  }

  return Object.freeze({
    kind: DURABLE_IDEMPOTENCY_RECORD_KIND,
    key,
    scope,
    status,
    firstSeenAt,
    ...(lastSeenAt === undefined ? {} : { lastSeenAt }),
    ...(completedAt === undefined ? {} : { completedAt }),
    ...(failedAt === undefined ? {} : { failedAt }),
    ...(operationRef === undefined ? {} : { operationRef }),
    ...(correlationRef === undefined ? {} : { correlationRef }),
    ...(detailsRef === undefined ? {} : { detailsRef }),
    ...(resultRef === undefined ? {} : { resultRef }),
    ...(failureRef === undefined ? {} : { failureRef }),
    ...(error === undefined ? {} : { error }),
  });
}

function createStoreError(input: {
  readonly code: AdapterSafeError['code'];
  readonly message: string;
  readonly retryable?: boolean;
}): AdapterOperationResult<never> {
  return adapterErr(
    createAdapterSafeError({
      code: input.code,
      message: input.message,
      ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
    }),
  );
}

function validateBoundary(boundary: DurableIdempotencyRecordBoundary): void {
  assertPlainRecord(boundary, 'Durable idempotency boundary');
  if (typeof boundary.get !== 'function' || typeof boundary.put !== 'function' || typeof boundary.delete !== 'function') {
    throw new TypeError('Durable idempotency boundary must provide get, put, and delete functions.');
  }
  if (boundary.list !== undefined && typeof boundary.list !== 'function') {
    throw new TypeError('Durable idempotency boundary list must be a function when provided.');
  }
}

function validateOperationInput(input: unknown, label: string): void {
  assertPlainRecord(input, label);
  rejectUnsafeStorageFields(input, label);
}

function createPendingRecord(input: DurableIdempotencyReserveInput): DurableIdempotencyRecord {
  validateOperationInput(input, 'Durable idempotency reserve input');
  const key = normalizeIdempotencyKey(input.key, 'Durable idempotency reserve key');

  return normalizeDurableIdempotencyRecord(
    {
      kind: DURABLE_IDEMPOTENCY_RECORD_KIND,
      key,
      scope: getIdempotencyScope(key),
      status: 'pending',
      firstSeenAt: input.firstSeenAt,
      ...(input.lastSeenAt === undefined ? {} : { lastSeenAt: input.lastSeenAt }),
      ...(input.operationRef === undefined ? {} : { operationRef: input.operationRef }),
      ...(input.correlationRef === undefined ? {} : { correlationRef: input.correlationRef }),
      ...(input.detailsRef === undefined ? {} : { detailsRef: input.detailsRef }),
    },
    'Durable idempotency pending record',
  );
}

function createCompletedRecord(
  input: DurableIdempotencyCompleteInput,
  existing: DurableIdempotencyRecord,
): DurableIdempotencyRecord {
  validateOperationInput(input, 'Durable idempotency complete input');

  return normalizeDurableIdempotencyRecord(
    {
      kind: DURABLE_IDEMPOTENCY_RECORD_KIND,
      key: existing.key,
      scope: existing.scope,
      status: 'completed',
      firstSeenAt: existing.firstSeenAt,
      completedAt: input.completedAt,
      lastSeenAt: input.lastSeenAt ?? input.completedAt,
      operationRef: input.operationRef ?? existing.operationRef,
      correlationRef: input.correlationRef ?? existing.correlationRef,
      detailsRef: input.detailsRef ?? existing.detailsRef,
      ...(input.resultRef === undefined ? {} : { resultRef: input.resultRef }),
    },
    'Durable idempotency completed record',
  );
}

function createFailedRecord(
  input: DurableIdempotencyFailInput,
  existing: DurableIdempotencyRecord,
): DurableIdempotencyRecord {
  validateOperationInput(input, 'Durable idempotency fail input');

  return normalizeDurableIdempotencyRecord(
    {
      kind: DURABLE_IDEMPOTENCY_RECORD_KIND,
      key: existing.key,
      scope: existing.scope,
      status: 'failed',
      firstSeenAt: existing.firstSeenAt,
      failedAt: input.failedAt,
      lastSeenAt: input.lastSeenAt ?? input.failedAt,
      operationRef: input.operationRef ?? existing.operationRef,
      correlationRef: input.correlationRef ?? existing.correlationRef,
      detailsRef: input.detailsRef ?? existing.detailsRef,
      ...(input.failureRef === undefined ? {} : { failureRef: input.failureRef }),
      error: input.error,
    },
    'Durable idempotency failed record',
  );
}

async function readRecord(
  boundary: DurableIdempotencyRecordBoundary,
  key: AdapterIdempotencyKey,
): Promise<DurableIdempotencyRecord | null> {
  const record = await boundary.get(key);
  if (record === null || record === undefined) {
    return null;
  }

  return normalizeDurableIdempotencyRecord(record, 'Durable idempotency persisted record');
}

async function writeRecord(
  boundary: DurableIdempotencyRecordBoundary,
  record: DurableIdempotencyRecord,
): Promise<void> {
  const persisted = await boundary.put(record);
  if (persisted !== undefined) {
    normalizeDurableIdempotencyRecord(persisted, 'Durable idempotency persisted write record');
  }
}

export function createDurableIdempotencyStore(
  boundary: DurableIdempotencyRecordBoundary,
): DurableIdempotencyStore {
  validateBoundary(boundary);

  return Object.freeze({
    async reserve(input: DurableIdempotencyReserveInput) {
      let pendingRecord: DurableIdempotencyRecord;
      try {
        pendingRecord = createPendingRecord(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable idempotency reserve input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, pendingRecord.key);
        if (existingRecord !== null) {
          return adapterOk(
            Object.freeze({
              kind: 'duplicate',
              duplicate: true,
              record: existingRecord,
            }),
          );
        }

        await writeRecord(boundary, pendingRecord);

        return adapterOk(
          Object.freeze({
            kind: 'reserved',
            duplicate: false,
            record: pendingRecord,
          }),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async markCompleted(input: DurableIdempotencyCompleteInput) {
      let key: AdapterIdempotencyKey;
      try {
        validateOperationInput(input, 'Durable idempotency complete input');
        key = normalizeIdempotencyKey(input.key, 'Durable idempotency complete key');
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable idempotency complete input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, key);
        if (existingRecord === null) {
          return createStoreError({
            code: 'not-found',
            message: 'Durable idempotency record was not found.',
            retryable: false,
          });
        }
        if (existingRecord.status === 'completed') {
          return adapterOk(existingRecord);
        }
        if (existingRecord.status !== 'pending' && existingRecord.status !== 'failed') {
          return createStoreError({
            code: 'conflict',
            message: 'Durable idempotency record cannot be completed from its current status.',
            retryable: false,
          });
        }

        const completedRecord = createCompletedRecord(input, existingRecord);
        await writeRecord(boundary, completedRecord);

        return adapterOk(completedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async markFailed(input: DurableIdempotencyFailInput) {
      let key: AdapterIdempotencyKey;
      try {
        validateOperationInput(input, 'Durable idempotency fail input');
        key = normalizeIdempotencyKey(input.key, 'Durable idempotency fail key');
        normalizeSafeError(input.error);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable idempotency fail input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, key);
        if (existingRecord === null) {
          return createStoreError({
            code: 'not-found',
            message: 'Durable idempotency record was not found.',
            retryable: false,
          });
        }
        if (existingRecord.status === 'completed') {
          return createStoreError({
            code: 'conflict',
            message: 'Completed durable idempotency records cannot be failed.',
            retryable: false,
          });
        }

        const failedRecord = createFailedRecord(input, existingRecord);
        await writeRecord(boundary, failedRecord);

        return adapterOk(failedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async get(key: AdapterIdempotencyKey) {
      let normalizedKey: AdapterIdempotencyKey;
      try {
        normalizedKey = normalizeIdempotencyKey(key, 'Durable idempotency get key');
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable idempotency get key is malformed.',
          retryable: false,
        });
      }

      try {
        return adapterOk(await readRecord(boundary, normalizedKey));
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async delete(key: AdapterIdempotencyKey) {
      let normalizedKey: AdapterIdempotencyKey;
      try {
        normalizedKey = normalizeIdempotencyKey(key, 'Durable idempotency delete key');
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Durable idempotency delete key is malformed.',
          retryable: false,
        });
      }

      try {
        const deleted = await boundary.delete(normalizedKey);
        return adapterOk(
          Object.freeze({
            key: normalizedKey,
            deleted: deleted === undefined ? true : deleted,
          }),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async list() {
      if (boundary.list === undefined) {
        return createStoreError({
          code: 'dependency-missing',
          message: 'Durable idempotency boundary list operation is missing.',
          retryable: false,
        });
      }

      try {
        const records = await boundary.list();
        return adapterOk(
          Object.freeze(
            records.map((record) =>
              normalizeDurableIdempotencyRecord(record, 'Durable idempotency listed record'),
            ),
          ),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Durable idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },
  });
}
