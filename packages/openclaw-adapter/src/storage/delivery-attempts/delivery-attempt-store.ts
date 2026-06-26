import {
  DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
  createDeliveryAttemptRecord,
  createDeliveryAttemptRefFromIdempotencyKey,
  createDeliveryBusinessResultRecord,
  createDeliveryProviderAcknowledgementRecord,
  normalizeDeliveryAttemptRecord,
  normalizeDeliveryAttemptRef,
  normalizeDeliveryBusinessResultRecord,
  normalizeDeliveryProviderAcknowledgementRecord,
  updateDeliveryAttemptWithBusinessResult,
  updateDeliveryAttemptWithProviderAcknowledgement,
  type CreateDeliveryAttemptRecordInput,
  type CreateDeliveryBusinessResultRecordInput,
  type CreateDeliveryProviderAcknowledgementRecordInput,
  type DeliveryAttemptRecord,
  type DeliveryAttemptRef,
  type DeliveryBusinessResultRecord,
  type DeliveryProviderAcknowledgementRecord,
} from '../../delivery-attempts/index.js';
import {
  isAdapterIdempotencyKey,
  type AdapterIdempotencyKey,
} from '../../contracts/idempotency.js';
import {
  parseOpenClawAdapterRef,
  type AdapterOperationRef,
} from '../../contracts/refs.js';

const DELIVERY_ATTEMPT_STORE_KEY_PREFIX = 'delivery-attempt-store';

export type DeliveryAttemptRecordKey = `${typeof DELIVERY_ATTEMPT_STORE_KEY_PREFIX}:${string}`;
export type DeliveryAttemptRecordPrefix = DeliveryAttemptRecordKey;

export interface DeliveryAttemptRecordBoundary {
  readonly read: (key: DeliveryAttemptRecordKey) => Promise<unknown | null | undefined> | unknown | null | undefined;
  readonly write: (key: DeliveryAttemptRecordKey, record: DeliveryAttemptStoreRecord) => Promise<void> | void;
  readonly list?: (prefix: DeliveryAttemptRecordPrefix) => Promise<readonly unknown[]> | readonly unknown[];
}

export interface DeliveryAttemptIdempotencyIndexRecord {
  readonly schemaVersion: typeof DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION;
  readonly recordKind: 'delivery-attempt-idempotency-index';
  readonly idempotencyKey: AdapterIdempotencyKey;
  readonly attemptRef: DeliveryAttemptRef;
  readonly deliveryRef: AdapterOperationRef;
  readonly createdAtIso: string;
}

export type DeliveryAttemptStoreRecord =
  | DeliveryAttemptRecord
  | DeliveryProviderAcknowledgementRecord
  | DeliveryBusinessResultRecord
  | DeliveryAttemptIdempotencyIndexRecord;

export interface DeliveryAttemptRegistration {
  readonly registrationStatus: 'registered' | 'duplicate';
  readonly record: DeliveryAttemptRecord;
  readonly shouldExecuteDelivery: boolean;
}

export interface DeliveryProviderAcknowledgementRecording {
  readonly recordingStatus: 'recorded' | 'duplicate';
  readonly record: DeliveryProviderAcknowledgementRecord;
}

export interface DeliveryBusinessResultRecording {
  readonly recordingStatus: 'recorded' | 'duplicate';
  readonly record: DeliveryBusinessResultRecord;
}

export interface DeliveryAttemptStore {
  readonly registerAttempt: (input: CreateDeliveryAttemptRecordInput) => Promise<DeliveryAttemptRegistration>;
  readonly recordProviderAcknowledgement: (
    input: CreateDeliveryProviderAcknowledgementRecordInput,
  ) => Promise<DeliveryProviderAcknowledgementRecording>;
  readonly recordBusinessResult: (
    input: CreateDeliveryBusinessResultRecordInput,
  ) => Promise<DeliveryBusinessResultRecording>;
  readonly getAttemptByAttemptRef: (attemptRef: DeliveryAttemptRef) => Promise<DeliveryAttemptRecord | undefined>;
  readonly getAttemptByIdempotencyKey: (
    idempotencyKey: AdapterIdempotencyKey,
  ) => Promise<DeliveryAttemptRecord | undefined>;
  readonly getProviderAcknowledgementByAttemptRef: (
    attemptRef: DeliveryAttemptRef,
  ) => Promise<DeliveryProviderAcknowledgementRecord | undefined>;
  readonly getBusinessResultByAttemptRef: (
    attemptRef: DeliveryAttemptRef,
  ) => Promise<DeliveryBusinessResultRecord | undefined>;
  readonly listAttempts: () => Promise<readonly DeliveryAttemptRecord[]>;
  readonly listProviderAcknowledgements: () => Promise<readonly DeliveryProviderAcknowledgementRecord[]>;
  readonly listBusinessResults: () => Promise<readonly DeliveryBusinessResultRecord[]>;
}

function recordKey(segment: string, value: string): DeliveryAttemptRecordKey {
  return `${DELIVERY_ATTEMPT_STORE_KEY_PREFIX}:${segment}:${value}` as DeliveryAttemptRecordKey;
}

function attemptKey(attemptRef: DeliveryAttemptRef): DeliveryAttemptRecordKey {
  return recordKey('attempt', attemptRef);
}

function providerAcknowledgementKey(attemptRef: DeliveryAttemptRef): DeliveryAttemptRecordKey {
  return recordKey('provider-acknowledgement', attemptRef);
}

function businessResultKey(attemptRef: DeliveryAttemptRef): DeliveryAttemptRecordKey {
  return recordKey('business-result', attemptRef);
}

function idempotencyIndexKey(idempotencyKey: AdapterIdempotencyKey): DeliveryAttemptRecordKey {
  return recordKey('idempotency', idempotencyKey);
}

function normalizeOperationRef(input: unknown, label: string): AdapterOperationRef {
  const parsed = parseOpenClawAdapterRef(input);
  if (parsed?.kind !== 'operation') {
    throw new TypeError(`${label} must be a safe operation ref.`);
  }

  return parsed.ref as AdapterOperationRef;
}

function normalizeIdempotencyKey(input: unknown): AdapterIdempotencyKey {
  if (!isAdapterIdempotencyKey(input)) {
    throw new TypeError('Delivery attempt store idempotencyKey must be safe.');
  }

  return input;
}

function normalizeIsoTimestamp(input: unknown, label: string): string {
  if (typeof input !== 'string' || input.trim() !== input || Number.isNaN(Date.parse(input))) {
    throw new TypeError(`${label} must be an ISO timestamp string.`);
  }

  return input;
}

function normalizeIndexRecord(input: unknown): DeliveryAttemptIdempotencyIndexRecord | undefined {
  try {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return undefined;
    }

    const record = input as Record<string, unknown>;
    if (
      record.schemaVersion !== DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION ||
      record.recordKind !== 'delivery-attempt-idempotency-index'
    ) {
      return undefined;
    }

    return Object.freeze({
      schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
      recordKind: 'delivery-attempt-idempotency-index' as const,
      idempotencyKey: normalizeIdempotencyKey(record.idempotencyKey),
      attemptRef: normalizeDeliveryAttemptRef(record.attemptRef, 'Delivery attempt index attemptRef'),
      deliveryRef: normalizeOperationRef(record.deliveryRef, 'Delivery attempt index deliveryRef'),
      createdAtIso: normalizeIsoTimestamp(record.createdAtIso, 'Delivery attempt index createdAtIso'),
    });
  } catch {
    return undefined;
  }
}

function createIndexRecord(input: DeliveryAttemptRecord): DeliveryAttemptIdempotencyIndexRecord {
  return Object.freeze({
    schemaVersion: DELIVERY_ATTEMPT_RECORD_SCHEMA_VERSION,
    recordKind: 'delivery-attempt-idempotency-index' as const,
    idempotencyKey: input.idempotencyKey,
    attemptRef: input.attemptRef,
    deliveryRef: input.deliveryRef,
    createdAtIso: input.createdAtIso,
  });
}

function assertBoundary(boundary: DeliveryAttemptRecordBoundary): void {
  if (
    typeof boundary !== 'object' ||
    boundary === null ||
    typeof boundary.read !== 'function' ||
    typeof boundary.write !== 'function'
  ) {
    throw new TypeError('Delivery attempt store requires an injected record boundary.');
  }
}

function assertDeliveryRefMatchesAttempt(
  attempt: DeliveryAttemptRecord | undefined,
  deliveryRef: AdapterOperationRef,
): void {
  if (attempt !== undefined && attempt.deliveryRef !== deliveryRef) {
    throw new TypeError('Delivery attempt store record must match the registered deliveryRef.');
  }
}

function assertIdempotencyKeyMatchesAttempt(
  attempt: DeliveryAttemptRecord | undefined,
  idempotencyKey: AdapterIdempotencyKey,
): void {
  if (attempt !== undefined && attempt.idempotencyKey !== idempotencyKey) {
    throw new TypeError('Delivery attempt store record must match the registered idempotencyKey.');
  }
}

async function listRecords<T>(
  boundary: DeliveryAttemptRecordBoundary,
  prefix: DeliveryAttemptRecordPrefix,
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

export function createDeliveryAttemptStore(input: {
  readonly boundary: DeliveryAttemptRecordBoundary;
}): DeliveryAttemptStore {
  const boundary = input.boundary;
  assertBoundary(boundary);

  async function readAttemptByAttemptRef(attemptRef: DeliveryAttemptRef): Promise<DeliveryAttemptRecord | undefined> {
    const normalizedAttemptRef = normalizeDeliveryAttemptRef(attemptRef, 'Delivery attempt store attemptRef');
    return normalizeDeliveryAttemptRecord(await boundary.read(attemptKey(normalizedAttemptRef)));
  }

  async function readIndex(
    idempotencyKey: AdapterIdempotencyKey,
  ): Promise<DeliveryAttemptIdempotencyIndexRecord | undefined> {
    const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
    return normalizeIndexRecord(await boundary.read(idempotencyIndexKey(normalizedIdempotencyKey)));
  }

  async function readAttemptByIdempotencyKey(
    idempotencyKey: AdapterIdempotencyKey,
  ): Promise<DeliveryAttemptRecord | undefined> {
    const index = await readIndex(idempotencyKey);
    return index === undefined ? undefined : readAttemptByAttemptRef(index.attemptRef);
  }

  async function writeAttempt(record: DeliveryAttemptRecord): Promise<void> {
    await boundary.write(attemptKey(record.attemptRef), record);
  }

  return Object.freeze({
    async registerAttempt(inputRecord: CreateDeliveryAttemptRecordInput): Promise<DeliveryAttemptRegistration> {
      const idempotencyKey = normalizeIdempotencyKey(inputRecord.idempotencyKey);
      const requestedAttemptRef = inputRecord.attemptRef ?? createDeliveryAttemptRefFromIdempotencyKey(idempotencyKey);
      const normalizedAttemptRef = normalizeDeliveryAttemptRef(requestedAttemptRef, 'Delivery attempt registration attemptRef');

      const existingAttempt = await readAttemptByAttemptRef(normalizedAttemptRef);
      if (existingAttempt !== undefined) {
        if (existingAttempt.idempotencyKey !== idempotencyKey) {
          throw new TypeError('Delivery attempt duplicate attemptRef has a different idempotencyKey.');
        }
        return Object.freeze({
          registrationStatus: 'duplicate' as const,
          record: existingAttempt,
          shouldExecuteDelivery: false,
        });
      }

      const existingIndex = await readIndex(idempotencyKey);
      if (existingIndex !== undefined) {
        const indexedAttempt = await readAttemptByAttemptRef(existingIndex.attemptRef);
        if (indexedAttempt === undefined) {
          throw new TypeError('Delivery attempt idempotency index points at a missing attempt record.');
        }
        return Object.freeze({
          registrationStatus: 'duplicate' as const,
          record: indexedAttempt,
          shouldExecuteDelivery: false,
        });
      }

      const record = createDeliveryAttemptRecord({
        ...inputRecord,
        attemptRef: normalizedAttemptRef,
        idempotencyKey,
      });
      await writeAttempt(record);
      await boundary.write(idempotencyIndexKey(idempotencyKey), createIndexRecord(record));

      return Object.freeze({
        registrationStatus: 'registered' as const,
        record,
        shouldExecuteDelivery: true,
      });
    },

    async recordProviderAcknowledgement(
      inputRecord: CreateDeliveryProviderAcknowledgementRecordInput,
    ): Promise<DeliveryProviderAcknowledgementRecording> {
      const attemptRef = normalizeDeliveryAttemptRef(
        inputRecord.attemptRef,
        'Delivery provider acknowledgement attemptRef',
      );
      const idempotencyKey = normalizeIdempotencyKey(inputRecord.idempotencyKey);
      const attempt = await readAttemptByAttemptRef(attemptRef);
      assertIdempotencyKeyMatchesAttempt(attempt, idempotencyKey);

      const existing = normalizeDeliveryProviderAcknowledgementRecord(
        await boundary.read(providerAcknowledgementKey(attemptRef)),
      );
      if (existing !== undefined) {
        return Object.freeze({ recordingStatus: 'duplicate' as const, record: existing });
      }

      const record = createDeliveryProviderAcknowledgementRecord({
        ...inputRecord,
        attemptRef,
        idempotencyKey,
      });
      assertDeliveryRefMatchesAttempt(attempt, record.deliveryRef);

      await boundary.write(providerAcknowledgementKey(attemptRef), record);
      if (attempt !== undefined) {
        await writeAttempt(updateDeliveryAttemptWithProviderAcknowledgement(attempt, record));
      }

      return Object.freeze({ recordingStatus: 'recorded' as const, record });
    },

    async recordBusinessResult(
      inputRecord: CreateDeliveryBusinessResultRecordInput,
    ): Promise<DeliveryBusinessResultRecording> {
      const attemptRef = normalizeDeliveryAttemptRef(inputRecord.attemptRef, 'Delivery business result attemptRef');
      const idempotencyKey = normalizeIdempotencyKey(inputRecord.idempotencyKey);
      const deliveryRef = normalizeOperationRef(inputRecord.deliveryRef, 'Delivery business result deliveryRef');
      const attempt = await readAttemptByAttemptRef(attemptRef);
      assertIdempotencyKeyMatchesAttempt(attempt, idempotencyKey);
      assertDeliveryRefMatchesAttempt(attempt, deliveryRef);

      const existing = normalizeDeliveryBusinessResultRecord(await boundary.read(businessResultKey(attemptRef)));
      if (existing !== undefined) {
        return Object.freeze({ recordingStatus: 'duplicate' as const, record: existing });
      }

      const record = createDeliveryBusinessResultRecord({
        ...inputRecord,
        attemptRef,
        deliveryRef,
        idempotencyKey,
      });

      await boundary.write(businessResultKey(attemptRef), record);
      if (attempt !== undefined) {
        await writeAttempt(updateDeliveryAttemptWithBusinessResult(attempt, record));
      }

      return Object.freeze({ recordingStatus: 'recorded' as const, record });
    },

    getAttemptByAttemptRef: readAttemptByAttemptRef,
    getAttemptByIdempotencyKey: readAttemptByIdempotencyKey,

    async getProviderAcknowledgementByAttemptRef(
      attemptRef: DeliveryAttemptRef,
    ): Promise<DeliveryProviderAcknowledgementRecord | undefined> {
      const normalizedAttemptRef = normalizeDeliveryAttemptRef(attemptRef, 'Delivery provider acknowledgement attemptRef');
      return normalizeDeliveryProviderAcknowledgementRecord(
        await boundary.read(providerAcknowledgementKey(normalizedAttemptRef)),
      );
    },

    async getBusinessResultByAttemptRef(
      attemptRef: DeliveryAttemptRef,
    ): Promise<DeliveryBusinessResultRecord | undefined> {
      const normalizedAttemptRef = normalizeDeliveryAttemptRef(attemptRef, 'Delivery business result attemptRef');
      return normalizeDeliveryBusinessResultRecord(await boundary.read(businessResultKey(normalizedAttemptRef)));
    },

    listAttempts(): Promise<readonly DeliveryAttemptRecord[]> {
      return listRecords(
        boundary,
        `${DELIVERY_ATTEMPT_STORE_KEY_PREFIX}:attempt:` as DeliveryAttemptRecordPrefix,
        normalizeDeliveryAttemptRecord,
      );
    },

    listProviderAcknowledgements(): Promise<readonly DeliveryProviderAcknowledgementRecord[]> {
      return listRecords(
        boundary,
        `${DELIVERY_ATTEMPT_STORE_KEY_PREFIX}:provider-acknowledgement:` as DeliveryAttemptRecordPrefix,
        normalizeDeliveryProviderAcknowledgementRecord,
      );
    },

    listBusinessResults(): Promise<readonly DeliveryBusinessResultRecord[]> {
      return listRecords(
        boundary,
        `${DELIVERY_ATTEMPT_STORE_KEY_PREFIX}:business-result:` as DeliveryAttemptRecordPrefix,
        normalizeDeliveryBusinessResultRecord,
      );
    },
  });
}
