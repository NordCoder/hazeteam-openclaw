import {
  createTopicBindingKey,
  createTopicBindingKeyId,
  createTopicBindingRecord,
  normalizeTopicBindingRecord,
  type TopicBindingKey,
  type TopicBindingKeyId,
  type TopicBindingRecord,
  type TopicBindingRecordInput,
  type TopicBindingRef,
} from '../../topic-bindings/topic-binding-records.js';

export type MaybePromise<T> = T | Promise<T>;

export interface TopicBindingRecordPort {
  readonly getByBindingRef: (bindingRef: TopicBindingRef) => MaybePromise<TopicBindingRecord | null | undefined>;
  readonly getByBindingKey: (bindingKeyId: TopicBindingKeyId) => MaybePromise<TopicBindingRecord | null | undefined>;
  readonly put: (record: TopicBindingRecord) => MaybePromise<TopicBindingRecord | void>;
  readonly deleteByBindingRef: (bindingRef: TopicBindingRef) => MaybePromise<boolean | void>;
  readonly list: () => MaybePromise<readonly TopicBindingRecord[]>;
}

export interface TopicBindingRecordCreatedDecision {
  readonly status: 'created';
  readonly replayed: false;
  readonly record: TopicBindingRecord;
}

export interface TopicBindingRecordUpdatedDecision {
  readonly status: 'updated';
  readonly replayed: false;
  readonly record: TopicBindingRecord;
  readonly previousRecord: TopicBindingRecord;
}

export interface TopicBindingRecordReplayedDecision {
  readonly status: 'replayed';
  readonly replayed: true;
  readonly record: TopicBindingRecord;
}

export interface TopicBindingRecordConflictDecision {
  readonly status: 'conflict';
  readonly replayed: false;
  readonly reason: 'binding-key-conflict' | 'stale-version';
  readonly record: TopicBindingRecord;
  readonly existingRecord: TopicBindingRecord;
}

export type TopicBindingRecordUpsertDecision =
  | TopicBindingRecordCreatedDecision
  | TopicBindingRecordUpdatedDecision
  | TopicBindingRecordReplayedDecision
  | TopicBindingRecordConflictDecision;

export interface TopicBindingRecordDeleteDecision {
  readonly bindingRef: TopicBindingRef;
  readonly deleted: boolean;
}

export interface TopicBindingRecordStore {
  readonly upsert: (record: TopicBindingRecordInput | TopicBindingRecord) => Promise<TopicBindingRecordUpsertDecision>;
  readonly getByBindingRef: (bindingRef: TopicBindingRef) => Promise<TopicBindingRecord | null>;
  readonly getByBindingKey: (bindingKey: TopicBindingKey) => Promise<TopicBindingRecord | null>;
  readonly deleteByBindingRef: (bindingRef: TopicBindingRef) => Promise<TopicBindingRecordDeleteDecision>;
  readonly list: () => Promise<readonly TopicBindingRecord[]>;
}

function assertRecordPort(input: unknown): asserts input is TopicBindingRecordPort {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('Topic binding record store requires an injected record port.');
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.getByBindingRef !== 'function' ||
    typeof candidate.getByBindingKey !== 'function' ||
    typeof candidate.put !== 'function' ||
    typeof candidate.deleteByBindingRef !== 'function' ||
    typeof candidate.list !== 'function'
  ) {
    throw new TypeError('Topic binding record store port must implement get, put, delete, and list methods.');
  }
}

function normalizeMaybeRecord(input: TopicBindingRecord | null | undefined): TopicBindingRecord | null {
  return input === null || input === undefined ? null : normalizeTopicBindingRecord(input);
}

function normalizeRecordList(input: readonly TopicBindingRecord[]): readonly TopicBindingRecord[] {
  if (!Array.isArray(input)) {
    throw new TypeError('Topic binding record list must be an array.');
  }

  return Object.freeze(
    input
      .map((record) => normalizeTopicBindingRecord(record))
      .sort((left, right) => createTopicBindingKeyId(left.bindingKey).localeCompare(createTopicBindingKeyId(right.bindingKey))),
  );
}

function recordsAreEqual(left: TopicBindingRecord, right: TopicBindingRecord): boolean {
  return JSON.stringify(normalizeTopicBindingRecord(left)) === JSON.stringify(normalizeTopicBindingRecord(right));
}

function normalizeCandidate(input: TopicBindingRecordInput | TopicBindingRecord): TopicBindingRecord {
  if ('kind' in input) {
    return normalizeTopicBindingRecord(input);
  }

  return createTopicBindingRecord(input);
}

function created(record: TopicBindingRecord): TopicBindingRecordCreatedDecision {
  return Object.freeze({
    status: 'created',
    replayed: false,
    record: normalizeTopicBindingRecord(record),
  });
}

function updated(record: TopicBindingRecord, previousRecord: TopicBindingRecord): TopicBindingRecordUpdatedDecision {
  return Object.freeze({
    status: 'updated',
    replayed: false,
    record: normalizeTopicBindingRecord(record),
    previousRecord: normalizeTopicBindingRecord(previousRecord),
  });
}

function replayed(record: TopicBindingRecord): TopicBindingRecordReplayedDecision {
  return Object.freeze({
    status: 'replayed',
    replayed: true,
    record: normalizeTopicBindingRecord(record),
  });
}

function conflict(
  reason: TopicBindingRecordConflictDecision['reason'],
  record: TopicBindingRecord,
  existingRecord: TopicBindingRecord,
): TopicBindingRecordConflictDecision {
  return Object.freeze({
    status: 'conflict',
    replayed: false,
    reason,
    record: normalizeTopicBindingRecord(record),
    existingRecord: normalizeTopicBindingRecord(existingRecord),
  });
}

export function createTopicBindingRecordStore(input: {
  readonly records: TopicBindingRecordPort;
}): TopicBindingRecordStore {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('Topic binding record store input must be an object.');
  }

  const records = input.records;
  assertRecordPort(records);

  return Object.freeze({
    async upsert(recordInput: TopicBindingRecordInput | TopicBindingRecord): Promise<TopicBindingRecordUpsertDecision> {
      const candidate = normalizeCandidate(recordInput);
      const bindingKeyId = createTopicBindingKeyId(candidate.bindingKey);
      const existingByRef = normalizeMaybeRecord(await records.getByBindingRef(candidate.bindingRef));
      const existingByKey = normalizeMaybeRecord(await records.getByBindingKey(bindingKeyId));

      if (existingByKey !== null && existingByKey.bindingRef !== candidate.bindingRef) {
        return conflict('binding-key-conflict', candidate, existingByKey);
      }

      if (existingByRef !== null) {
        if (createTopicBindingKeyId(existingByRef.bindingKey) !== bindingKeyId) {
          return conflict('binding-key-conflict', candidate, existingByRef);
        }

        if (recordsAreEqual(existingByRef, candidate)) {
          return replayed(existingByRef);
        }

        if (candidate.version <= existingByRef.version) {
          return conflict('stale-version', candidate, existingByRef);
        }

        const persistedRecord = await records.put(candidate);
        const normalizedPersistedRecord = normalizeMaybeRecord(persistedRecord) ?? candidate;

        return updated(normalizedPersistedRecord, existingByRef);
      }

      const persistedRecord = await records.put(candidate);
      const normalizedPersistedRecord = normalizeMaybeRecord(persistedRecord) ?? candidate;

      return created(normalizedPersistedRecord);
    },

    async getByBindingRef(bindingRef: TopicBindingRef): Promise<TopicBindingRecord | null> {
      return normalizeMaybeRecord(await records.getByBindingRef(bindingRef));
    },

    async getByBindingKey(bindingKey: TopicBindingKey): Promise<TopicBindingRecord | null> {
      return normalizeMaybeRecord(await records.getByBindingKey(createTopicBindingKeyId(createTopicBindingKey(bindingKey))));
    },

    async deleteByBindingRef(bindingRef: TopicBindingRef): Promise<TopicBindingRecordDeleteDecision> {
      const deleted = (await records.deleteByBindingRef(bindingRef)) === true;

      return Object.freeze({ bindingRef, deleted });
    },

    async list(): Promise<readonly TopicBindingRecord[]> {
      return normalizeRecordList(await records.list());
    },
  });
}
