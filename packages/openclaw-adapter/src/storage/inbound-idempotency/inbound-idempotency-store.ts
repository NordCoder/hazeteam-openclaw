import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
  type AdapterOperationResult,
  type AdapterSafeError,
} from '../../contracts/result.js';
import type { AdapterIdempotencyKey } from '../../contracts/idempotency.js';
import {
  createInboundIdempotencyRecord,
  normalizeInboundIdempotencyRecord,
  rejectUnsafeInboundIdempotencyFields,
  INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS,
  type InboundIdempotencyEventRef,
  type InboundIdempotencyRecord,
  type InboundIdempotencyRecordInput,
  type InboundIdempotencySeenRef,
  type InboundIdempotencyOutcomeRef,
  type InboundIdempotencyProcessedRef,
  type InboundIdempotencyFailureRef,
  type InboundIdempotencySuppressedEffect,
} from '../../inbound-idempotency/index.js';

export type MaybePromise<T> = T | Promise<T>;

export interface InboundIdempotencyRecordBoundary {
  readonly get: (idempotencyRef: AdapterIdempotencyKey) => MaybePromise<InboundIdempotencyRecord | null | undefined>;
  readonly put: (record: InboundIdempotencyRecord) => MaybePromise<InboundIdempotencyRecord | void>;
  readonly list?: (() => MaybePromise<readonly InboundIdempotencyRecord[]>) | undefined;
}

export interface InboundIdempotencyReserveInput extends InboundIdempotencyRecordInput {}

export interface InboundIdempotencyCompleteInput {
  readonly idempotencyRef: AdapterIdempotencyKey;
  readonly completedSeenRef: InboundIdempotencySeenRef;
  readonly lastOutcomeRef: InboundIdempotencyOutcomeRef;
  readonly processedRef: InboundIdempotencyProcessedRef;
}

export interface InboundIdempotencyFailInput {
  readonly idempotencyRef: AdapterIdempotencyKey;
  readonly failedSeenRef: InboundIdempotencySeenRef;
  readonly lastOutcomeRef: InboundIdempotencyOutcomeRef;
  readonly failureRef: InboundIdempotencyFailureRef;
  readonly error: AdapterSafeError;
}

export interface InboundIdempotencyReservedDecision {
  readonly kind: 'reserved';
  readonly duplicate: false;
  readonly shouldDispatchCommandIntent: true;
  readonly suppressedEffects: readonly [];
  readonly record: InboundIdempotencyRecord;
}

export interface InboundIdempotencyDuplicateDecision {
  readonly kind: 'duplicate';
  readonly duplicate: true;
  readonly shouldDispatchCommandIntent: false;
  readonly suppressedEffects: readonly InboundIdempotencySuppressedEffect[];
  readonly record: InboundIdempotencyRecord;
  readonly duplicateOfEventRef: InboundIdempotencyEventRef;
}

export type InboundIdempotencyReserveDecision =
  | InboundIdempotencyReservedDecision
  | InboundIdempotencyDuplicateDecision;

export interface InboundIdempotencyStore {
  readonly reserve: (
    input: InboundIdempotencyReserveInput,
  ) => Promise<AdapterOperationResult<InboundIdempotencyReserveDecision>>;
  readonly markCompleted: (
    input: InboundIdempotencyCompleteInput,
  ) => Promise<AdapterOperationResult<InboundIdempotencyRecord>>;
  readonly markFailed: (
    input: InboundIdempotencyFailInput,
  ) => Promise<AdapterOperationResult<InboundIdempotencyRecord>>;
  readonly get: (
    idempotencyRef: AdapterIdempotencyKey,
  ) => Promise<AdapterOperationResult<InboundIdempotencyRecord | null>>;
  readonly list: () => Promise<AdapterOperationResult<readonly InboundIdempotencyRecord[]>>;
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function assertPlainRecord(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (!isPlainRecord(input)) {
    throw new TypeError(`${label} must be a plain record.`);
  }
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

function validateBoundary(boundary: InboundIdempotencyRecordBoundary): void {
  assertPlainRecord(boundary, 'Inbound idempotency boundary');
  if (typeof boundary.get !== 'function' || typeof boundary.put !== 'function') {
    throw new TypeError('Inbound idempotency boundary must provide get and put functions.');
  }
  if (boundary.list !== undefined && typeof boundary.list !== 'function') {
    throw new TypeError('Inbound idempotency boundary list must be a function when provided.');
  }
}

function normalizeReserveInput(input: InboundIdempotencyReserveInput): InboundIdempotencyRecord {
  rejectUnsafeInboundIdempotencyFields(input, 'Inbound idempotency reserve input');

  return createInboundIdempotencyRecord({
    ...input,
    status: 'reserved',
  });
}

function normalizeCompleteInput(input: InboundIdempotencyCompleteInput): InboundIdempotencyCompleteInput {
  assertPlainRecord(input, 'Inbound idempotency complete input');
  rejectUnsafeInboundIdempotencyFields(input, 'Inbound idempotency complete input');

  return input;
}

function normalizeFailInput(input: InboundIdempotencyFailInput): InboundIdempotencyFailInput {
  assertPlainRecord(input, 'Inbound idempotency fail input');
  rejectUnsafeInboundIdempotencyFields(input, 'Inbound idempotency fail input');

  return input;
}

function completeRecord(
  input: InboundIdempotencyCompleteInput,
  existing: InboundIdempotencyRecord,
): InboundIdempotencyRecord {
  return createInboundIdempotencyRecord({
    eventRef: existing.eventRef,
    idempotencyRef: existing.idempotencyRef,
    eventKind: existing.eventKind,
    channelRef: existing.channelRef,
    ...(existing.chatRef === undefined ? {} : { chatRef: existing.chatRef }),
    ...(existing.threadRef === undefined ? {} : { threadRef: existing.threadRef }),
    ...(existing.messageRef === undefined ? {} : { messageRef: existing.messageRef }),
    ...(existing.callbackRef === undefined ? {} : { callbackRef: existing.callbackRef }),
    firstSeenRef: existing.firstSeenRef,
    lastSeenRef: input.completedSeenRef,
    safeEventFingerprint: existing.safeEventFingerprint,
    status: 'completed',
    lastOutcomeRef: input.lastOutcomeRef,
    processedRef: input.processedRef,
    ...(existing.correlationRef === undefined ? {} : { correlationRef: existing.correlationRef }),
  });
}

function failRecord(
  input: InboundIdempotencyFailInput,
  existing: InboundIdempotencyRecord,
): InboundIdempotencyRecord {
  return createInboundIdempotencyRecord({
    eventRef: existing.eventRef,
    idempotencyRef: existing.idempotencyRef,
    eventKind: existing.eventKind,
    channelRef: existing.channelRef,
    ...(existing.chatRef === undefined ? {} : { chatRef: existing.chatRef }),
    ...(existing.threadRef === undefined ? {} : { threadRef: existing.threadRef }),
    ...(existing.messageRef === undefined ? {} : { messageRef: existing.messageRef }),
    ...(existing.callbackRef === undefined ? {} : { callbackRef: existing.callbackRef }),
    firstSeenRef: existing.firstSeenRef,
    lastSeenRef: input.failedSeenRef,
    safeEventFingerprint: existing.safeEventFingerprint,
    status: 'failed',
    lastOutcomeRef: input.lastOutcomeRef,
    failureRef: input.failureRef,
    ...(existing.correlationRef === undefined ? {} : { correlationRef: existing.correlationRef }),
    error: input.error,
  });
}

function markDuplicateSeen(
  duplicateSeenRef: InboundIdempotencySeenRef,
  existing: InboundIdempotencyRecord,
): InboundIdempotencyRecord {
  return normalizeInboundIdempotencyRecord(
    {
      ...existing,
      lastSeenRef: duplicateSeenRef,
    },
    'Inbound idempotency duplicate record',
  );
}

async function readRecord(
  boundary: InboundIdempotencyRecordBoundary,
  idempotencyRef: AdapterIdempotencyKey,
): Promise<InboundIdempotencyRecord | null> {
  const record = await boundary.get(idempotencyRef);
  if (record === null || record === undefined) {
    return null;
  }

  return normalizeInboundIdempotencyRecord(record, 'Inbound idempotency persisted record');
}

async function writeRecord(
  boundary: InboundIdempotencyRecordBoundary,
  record: InboundIdempotencyRecord,
): Promise<void> {
  const persisted = await boundary.put(record);
  if (persisted !== undefined) {
    normalizeInboundIdempotencyRecord(persisted, 'Inbound idempotency persisted write record');
  }
}

export function createInboundIdempotencyStore(
  boundary: InboundIdempotencyRecordBoundary,
): InboundIdempotencyStore {
  validateBoundary(boundary);

  return Object.freeze({
    async reserve(input: InboundIdempotencyReserveInput) {
      let pendingRecord: InboundIdempotencyRecord;
      try {
        pendingRecord = normalizeReserveInput(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Inbound idempotency reserve input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, pendingRecord.idempotencyRef);
        if (existingRecord !== null) {
          const duplicateRecord = markDuplicateSeen(pendingRecord.firstSeenRef, existingRecord);
          await writeRecord(boundary, duplicateRecord);

          return adapterOk(
            Object.freeze({
              kind: 'duplicate',
              duplicate: true,
              shouldDispatchCommandIntent: false,
              suppressedEffects: INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS,
              record: duplicateRecord,
              duplicateOfEventRef: existingRecord.eventRef,
            }),
          );
        }

        await writeRecord(boundary, pendingRecord);

        return adapterOk(
          Object.freeze({
            kind: 'reserved',
            duplicate: false,
            shouldDispatchCommandIntent: true,
            suppressedEffects: Object.freeze([]),
            record: pendingRecord,
          }),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Inbound idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async markCompleted(input: InboundIdempotencyCompleteInput) {
      let normalizedInput: InboundIdempotencyCompleteInput;
      try {
        normalizedInput = normalizeCompleteInput(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Inbound idempotency completion input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, normalizedInput.idempotencyRef);
        if (existingRecord === null) {
          return createStoreError({
            code: 'not-found',
            message: 'Inbound idempotency record was not found.',
            retryable: false,
          });
        }
        if (existingRecord.status === 'completed') {
          return adapterOk(existingRecord);
        }
        if (existingRecord.status === 'failed') {
          return createStoreError({
            code: 'conflict',
            message: 'Failed inbound idempotency records cannot be completed.',
            retryable: false,
          });
        }

        const completedRecord = completeRecord(normalizedInput, existingRecord);
        await writeRecord(boundary, completedRecord);

        return adapterOk(completedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Inbound idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async markFailed(input: InboundIdempotencyFailInput) {
      let normalizedInput: InboundIdempotencyFailInput;
      try {
        normalizedInput = normalizeFailInput(input);
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Inbound idempotency failure input is malformed.',
          retryable: false,
        });
      }

      try {
        const existingRecord = await readRecord(boundary, normalizedInput.idempotencyRef);
        if (existingRecord === null) {
          return createStoreError({
            code: 'not-found',
            message: 'Inbound idempotency record was not found.',
            retryable: false,
          });
        }
        if (existingRecord.status === 'completed') {
          return createStoreError({
            code: 'conflict',
            message: 'Completed inbound idempotency records cannot be failed.',
            retryable: false,
          });
        }
        if (existingRecord.status === 'failed') {
          return adapterOk(existingRecord);
        }

        const failedRecord = failRecord(normalizedInput, existingRecord);
        await writeRecord(boundary, failedRecord);

        return adapterOk(failedRecord);
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Inbound idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },

    async get(idempotencyRef: AdapterIdempotencyKey) {
      try {
        return adapterOk(await readRecord(boundary, idempotencyRef));
      } catch {
        return createStoreError({
          code: 'invalid-input',
          message: 'Inbound idempotency get input is malformed.',
          retryable: false,
        });
      }
    },

    async list() {
      if (boundary.list === undefined) {
        return createStoreError({
          code: 'dependency-missing',
          message: 'Inbound idempotency boundary list operation is missing.',
          retryable: false,
        });
      }

      try {
        const records = await boundary.list();
        return adapterOk(
          Object.freeze(
            records.map((record) =>
              normalizeInboundIdempotencyRecord(record, 'Inbound idempotency listed record'),
            ),
          ),
        );
      } catch {
        return createStoreError({
          code: 'dependency-failed',
          message: 'Inbound idempotency boundary failed safely.',
          retryable: true,
        });
      }
    },
  });
}
