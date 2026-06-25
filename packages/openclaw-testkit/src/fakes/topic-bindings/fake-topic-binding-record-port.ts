import {
  createFakeTopicBindingKeyId,
  type FakeTopicBindingKeyId,
  type FakeTopicBindingRecord,
  type FakeTopicBindingRef,
} from '../../topic-bindings/topic-binding-fixtures.js';

export interface FakeTopicBindingRecordPort {
  readonly getByBindingRef: (bindingRef: FakeTopicBindingRef) => FakeTopicBindingRecord | null;
  readonly getByBindingKey: (bindingKeyId: FakeTopicBindingKeyId) => FakeTopicBindingRecord | null;
  readonly put: (record: FakeTopicBindingRecord) => FakeTopicBindingRecord;
  readonly deleteByBindingRef: (bindingRef: FakeTopicBindingRef) => boolean;
  readonly list: () => readonly FakeTopicBindingRecord[];
}

export interface FakeTopicBindingRecordPortHandle {
  readonly port: FakeTopicBindingRecordPort;
  readonly seed: (records: readonly FakeTopicBindingRecord[]) => void;
  readonly clear: () => void;
  readonly getPutCount: () => number;
  readonly getDeleteCount: () => number;
  readonly getSnapshot: () => readonly FakeTopicBindingRecord[];
}

const UNSAFE_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['sec', 'ret'],
] as const;
const UNSAFE_FIELD_NAMES = new Set([
  ['callback', 'Payload'].join(''),
  ['provider', 'Payload'].join(''),
  ['raw', 'Callback'].join(''),
  ['raw', 'Error'].join(''),
  ['raw', 'ProviderPayload'].join(''),
  ['raw', 'TelegramUpdate'].join(''),
  ['raw', 'Update'].join(''),
  'stack',
  ['telegram', 'Update'].join(''),
  ['token', 'Value'].join(''),
].map((fieldName) => normalizeFieldName(fieldName)));

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function rejectUnsafeFields(input: unknown, seen = new Set<object>()): void {
  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeFields(value, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeFieldName(fieldName)) {
      throw new TypeError('Fake topic binding records must not include unsafe provider, callback, token, or diagnostic fields.');
    }

    rejectUnsafeFields(value, seen);
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneRecord(record: FakeTopicBindingRecord): FakeTopicBindingRecord {
  rejectUnsafeFields(record);
  return Object.freeze(cloneJson(record));
}

function sortRecords(records: Iterable<FakeTopicBindingRecord>): readonly FakeTopicBindingRecord[] {
  return Object.freeze(
    Array.from(records)
      .map((record) => cloneRecord(record))
      .sort((left, right) => createFakeTopicBindingKeyId(left.bindingKey).localeCompare(
        createFakeTopicBindingKeyId(right.bindingKey),
      )),
  );
}

export function createFakeTopicBindingRecordPort(
  seedRecords: readonly FakeTopicBindingRecord[] = [],
): FakeTopicBindingRecordPortHandle {
  const recordsByRef = new Map<FakeTopicBindingRef, FakeTopicBindingRecord>();
  const refsByKey = new Map<FakeTopicBindingKeyId, FakeTopicBindingRef>();
  let putCount = 0;
  let deleteCount = 0;

  function putRecord(record: FakeTopicBindingRecord): FakeTopicBindingRecord {
    const storedRecord = cloneRecord(record);
    const bindingKeyId = createFakeTopicBindingKeyId(storedRecord.bindingKey);
    const previousRef = refsByKey.get(bindingKeyId);

    if (previousRef !== undefined && previousRef !== storedRecord.bindingRef) {
      throw new TypeError('Fake topic binding record key is already bound to a different bindingRef.');
    }

    recordsByRef.set(storedRecord.bindingRef, storedRecord);
    refsByKey.set(bindingKeyId, storedRecord.bindingRef);

    return cloneRecord(storedRecord);
  }

  const handle: FakeTopicBindingRecordPortHandle = Object.freeze({
    port: Object.freeze({
      getByBindingRef(bindingRef: FakeTopicBindingRef): FakeTopicBindingRecord | null {
        const record = recordsByRef.get(bindingRef);
        return record === undefined ? null : cloneRecord(record);
      },

      getByBindingKey(bindingKeyId: FakeTopicBindingKeyId): FakeTopicBindingRecord | null {
        const bindingRef = refsByKey.get(bindingKeyId);
        if (bindingRef === undefined) {
          return null;
        }

        const record = recordsByRef.get(bindingRef);
        return record === undefined ? null : cloneRecord(record);
      },

      put(record: FakeTopicBindingRecord): FakeTopicBindingRecord {
        putCount += 1;
        return putRecord(record);
      },

      deleteByBindingRef(bindingRef: FakeTopicBindingRef): boolean {
        const record = recordsByRef.get(bindingRef);
        if (record === undefined) {
          return false;
        }

        deleteCount += 1;
        recordsByRef.delete(bindingRef);
        refsByKey.delete(createFakeTopicBindingKeyId(record.bindingKey));
        return true;
      },

      list(): readonly FakeTopicBindingRecord[] {
        return sortRecords(recordsByRef.values());
      },
    }),

    seed(records: readonly FakeTopicBindingRecord[]): void {
      for (const record of records) {
        putRecord(record);
      }
    },

    clear(): void {
      recordsByRef.clear();
      refsByKey.clear();
      putCount = 0;
      deleteCount = 0;
    },

    getPutCount(): number {
      return putCount;
    },

    getDeleteCount(): number {
      return deleteCount;
    },

    getSnapshot(): readonly FakeTopicBindingRecord[] {
      return sortRecords(recordsByRef.values());
    },
  });

  handle.seed(seedRecords);

  return handle;
}
