import {
  createFakeInboundIdempotencyInput,
  createFakeInboundIdempotencyRecord,
  createFakeInboundIdempotencySafeError,
  rejectUnsafeFakeInboundIdempotencyFields,
  FAKE_INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS,
  type FakeInboundIdempotencyRecord,
  type FakeInboundIdempotencySafeError,
  type FakeInboundIdempotencySuppressedEffect,
} from '../../inbound-idempotency/index.js';

export interface FakeInboundIdempotencyReserveDecision {
  readonly kind: 'reserved' | 'duplicate';
  readonly duplicate: boolean;
  readonly shouldDispatchCommandIntent: boolean;
  readonly suppressedEffects: readonly FakeInboundIdempotencySuppressedEffect[];
  readonly record: FakeInboundIdempotencyRecord;
  readonly duplicateOfEventRef?: string | undefined;
}

export interface FakeInboundProcessingMarker {
  readonly kind: 'fake-inbound-processing-marker';
  readonly idempotencyRef: string;
  readonly effect: FakeInboundIdempotencySuppressedEffect;
  readonly markerRef: string;
  readonly recordedAtRef: string;
}

export interface FakeInboundProcessingMarkerDecision {
  readonly kind: 'recorded' | 'duplicate-marker';
  readonly duplicate: boolean;
  readonly shouldRunEffect: boolean;
  readonly marker: FakeInboundProcessingMarker;
}

export interface FakeInboundProcessingMarkerInput {
  readonly idempotencyRef: string;
  readonly effect: FakeInboundIdempotencySuppressedEffect;
  readonly markerRef?: string | undefined;
  readonly recordedAtRef?: string | undefined;
}

export interface FakeInboundIdempotencyCompletionInput {
  readonly idempotencyRef: string;
  readonly completedSeenRef?: string | undefined;
  readonly lastOutcomeRef?: string | undefined;
  readonly processedRef?: string | undefined;
}

export interface FakeInboundIdempotencyFailureInput {
  readonly idempotencyRef: string;
  readonly failedSeenRef?: string | undefined;
  readonly lastOutcomeRef?: string | undefined;
  readonly failureRef?: string | undefined;
  readonly error?: FakeInboundIdempotencySafeError | undefined;
}

export interface FakeInboundIdempotencyStore {
  readonly reserve: (input: Parameters<typeof createFakeInboundIdempotencyInput>[0]) => FakeInboundIdempotencyReserveDecision;
  readonly markCompleted: (input: FakeInboundIdempotencyCompletionInput) => FakeInboundIdempotencyRecord;
  readonly markFailed: (input: FakeInboundIdempotencyFailureInput) => FakeInboundIdempotencyRecord;
  readonly recordProcessingMarker: (
    input: FakeInboundProcessingMarkerInput,
  ) => FakeInboundProcessingMarkerDecision;
  readonly get: (idempotencyRef: string) => FakeInboundIdempotencyRecord | null;
  readonly getRecords: () => readonly FakeInboundIdempotencyRecord[];
  readonly getProcessingMarkers: () => readonly FakeInboundProcessingMarker[];
  readonly reset: () => void;
}

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:~-]+$/u;
const MAX_SAFE_REF_LENGTH = 256;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeRef(input: unknown, label: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.trim();
  if (normalized.length === 0 || normalized.length > MAX_SAFE_REF_LENGTH || !SAFE_REF_PATTERN.test(normalized)) {
    throw new TypeError(`${label} must be a safe ref.`);
  }

  return normalized;
}

function normalizeEffect(effect: FakeInboundIdempotencySuppressedEffect): FakeInboundIdempotencySuppressedEffect {
  if (!FAKE_INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS.includes(effect)) {
    throw new TypeError('Fake inbound processing marker effect is unsupported.');
  }

  return effect;
}

function freezeRecord(record: FakeInboundIdempotencyRecord): FakeInboundIdempotencyRecord {
  return Object.freeze(clone(record));
}

function freezeMarker(marker: FakeInboundProcessingMarker): FakeInboundProcessingMarker {
  return Object.freeze(clone(marker));
}

function completeRecord(
  existing: FakeInboundIdempotencyRecord,
  input: FakeInboundIdempotencyCompletionInput,
): FakeInboundIdempotencyRecord {
  return Object.freeze({
    ...existing,
    lastSeenRef: sanitizeRef(input.completedSeenRef ?? 'seen:completed', 'Fake inbound completion seen ref'),
    status: 'completed',
    lastOutcomeRef: sanitizeRef(input.lastOutcomeRef ?? 'outcome:completed', 'Fake inbound completion outcome ref'),
    processedRef: sanitizeRef(input.processedRef ?? 'processed:command-intent', 'Fake inbound processed ref'),
  });
}

function failRecord(
  existing: FakeInboundIdempotencyRecord,
  input: FakeInboundIdempotencyFailureInput,
): FakeInboundIdempotencyRecord {
  return Object.freeze({
    ...existing,
    lastSeenRef: sanitizeRef(input.failedSeenRef ?? 'seen:failed', 'Fake inbound failure seen ref'),
    status: 'failed',
    lastOutcomeRef: sanitizeRef(input.lastOutcomeRef ?? 'outcome:failed', 'Fake inbound failure outcome ref'),
    failureRef: sanitizeRef(input.failureRef ?? 'failure:inbound-idempotency', 'Fake inbound failure ref'),
    error: input.error ?? createFakeInboundIdempotencySafeError(),
  });
}

export function createFakeInboundIdempotencyStore(
  initialRecords: readonly FakeInboundIdempotencyRecord[] = [],
): FakeInboundIdempotencyStore {
  const records = new Map<string, FakeInboundIdempotencyRecord>();
  const markers = new Map<string, FakeInboundProcessingMarker>();

  for (const record of initialRecords) {
    rejectUnsafeFakeInboundIdempotencyFields(record, 'Initial fake inbound idempotency record');
    records.set(record.idempotencyRef, freezeRecord(record));
  }

  return Object.freeze({
    reserve(input) {
      rejectUnsafeFakeInboundIdempotencyFields(input, 'Fake inbound idempotency reserve input');
      const prepared = createFakeInboundIdempotencyInput(input);
      const existing = records.get(prepared.idempotencyRef);

      if (existing !== undefined) {
        const duplicateRecord = freezeRecord({
          ...existing,
          lastSeenRef: prepared.firstSeenRef,
        });
        records.set(existing.idempotencyRef, duplicateRecord);

        return Object.freeze({
          kind: 'duplicate',
          duplicate: true,
          shouldDispatchCommandIntent: false,
          suppressedEffects: FAKE_INBOUND_IDEMPOTENCY_SUPPRESSED_EFFECTS,
          record: duplicateRecord,
          duplicateOfEventRef: existing.eventRef,
        });
      }

      const record = freezeRecord(createFakeInboundIdempotencyRecord(prepared));
      records.set(record.idempotencyRef, record);

      return Object.freeze({
        kind: 'reserved',
        duplicate: false,
        shouldDispatchCommandIntent: true,
        suppressedEffects: Object.freeze([]),
        record,
      });
    },

    markCompleted(input) {
      rejectUnsafeFakeInboundIdempotencyFields(input, 'Fake inbound idempotency completion input');
      const idempotencyRef = sanitizeRef(input.idempotencyRef, 'Fake inbound completion idempotencyRef');
      const existing = records.get(idempotencyRef);
      if (existing === undefined) {
        throw new TypeError('Fake inbound idempotency record was not found.');
      }
      if (existing.status === 'completed') {
        return freezeRecord(existing);
      }
      if (existing.status === 'failed') {
        throw new TypeError('Failed fake inbound idempotency records cannot be completed.');
      }

      const completed = freezeRecord(completeRecord(existing, input));
      records.set(idempotencyRef, completed);
      return completed;
    },

    markFailed(input) {
      rejectUnsafeFakeInboundIdempotencyFields(input, 'Fake inbound idempotency failure input');
      const idempotencyRef = sanitizeRef(input.idempotencyRef, 'Fake inbound failure idempotencyRef');
      const existing = records.get(idempotencyRef);
      if (existing === undefined) {
        throw new TypeError('Fake inbound idempotency record was not found.');
      }
      if (existing.status === 'completed') {
        throw new TypeError('Completed fake inbound idempotency records cannot be failed.');
      }
      if (existing.status === 'failed') {
        return freezeRecord(existing);
      }

      const failed = freezeRecord(failRecord(existing, input));
      records.set(idempotencyRef, failed);
      return failed;
    },

    recordProcessingMarker(input) {
      rejectUnsafeFakeInboundIdempotencyFields(input, 'Fake inbound processing marker input');
      const idempotencyRef = sanitizeRef(input.idempotencyRef, 'Fake inbound marker idempotencyRef');
      const effect = normalizeEffect(input.effect);
      const markerKey = `${idempotencyRef}:${effect}`;
      const existing = markers.get(markerKey);
      if (existing !== undefined) {
        return Object.freeze({
          kind: 'duplicate-marker',
          duplicate: true,
          shouldRunEffect: false,
          marker: freezeMarker(existing),
        });
      }

      const marker = freezeMarker({
        kind: 'fake-inbound-processing-marker',
        idempotencyRef,
        effect,
        markerRef: sanitizeRef(input.markerRef ?? `marker:${effect}`, 'Fake inbound markerRef'),
        recordedAtRef: sanitizeRef(input.recordedAtRef ?? 'seen:marker-1', 'Fake inbound marker recordedAtRef'),
      });
      markers.set(markerKey, marker);

      return Object.freeze({
        kind: 'recorded',
        duplicate: false,
        shouldRunEffect: true,
        marker,
      });
    },

    get(idempotencyRef) {
      const record = records.get(sanitizeRef(idempotencyRef, 'Fake inbound get idempotencyRef'));
      return record === undefined ? null : freezeRecord(record);
    },

    getRecords() {
      return Object.freeze([...records.values()].map(freezeRecord));
    },

    getProcessingMarkers() {
      return Object.freeze([...markers.values()].map(freezeMarker));
    },

    reset() {
      records.clear();
      markers.clear();
    },
  });
}
