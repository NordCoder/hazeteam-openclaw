import {
  cloneTopicBindingSnapshot,
  createTopicBindingKey,
  createTopicBindingSnapshot,
  serializeTopicBindingKey,
} from '../../binding/topic-binding.js';
import type {
  OpenClawAgentId,
  OpenClawChannelId,
  OpenClawSessionId,
  OpenClawTopicId,
  OpenClawWorkspaceId,
  SafeTopicBindingMetadata,
  TopicBindingKey,
  TopicBindingSnapshot,
  TopicBindingSnapshotInput,
  TopicBindingStatus,
} from '../../binding/topic-binding.js';

export type DurableTopicBindingRecordKind = 'topic-binding';
export type DurableTopicBindingRecordKey = string;

export interface DurableTopicBindingRecord {
  readonly kind: DurableTopicBindingRecordKind;
  readonly recordKey: DurableTopicBindingRecordKey;
  readonly workspaceId: OpenClawWorkspaceId;
  readonly channelId: OpenClawChannelId;
  readonly topicId: OpenClawTopicId;
  readonly status: TopicBindingStatus;
  readonly agentId: OpenClawAgentId;
  readonly sessionId: OpenClawSessionId;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
  readonly metadata?: SafeTopicBindingMetadata;
}

export interface DurableTopicBindingRecordPort {
  readonly get: (recordKey: DurableTopicBindingRecordKey) => DurableTopicBindingRecord | undefined;
  readonly put: (record: DurableTopicBindingRecord) => DurableTopicBindingRecord | void;
  readonly delete: (recordKey: DurableTopicBindingRecordKey) => boolean;
  readonly list: () => readonly DurableTopicBindingRecord[];
}

export interface DurableTopicBindingStore {
  readonly upsert: (snapshot: TopicBindingSnapshot) => TopicBindingSnapshot;
  readonly get: (key: TopicBindingKey) => TopicBindingSnapshot | undefined;
  readonly getRecord: (key: TopicBindingKey) => DurableTopicBindingRecord | undefined;
  readonly delete: (key: TopicBindingKey) => boolean;
  readonly list: () => readonly TopicBindingSnapshot[];
  readonly listRecords: () => readonly DurableTopicBindingRecord[];
}

const DURABLE_TOPIC_BINDING_RECORD_KIND = 'topic-binding' satisfies DurableTopicBindingRecordKind;
const UNSAFE_DURABLE_TOPIC_BINDING_FIELD_NAMES = new Set([
  'apikey',
  'approvalpayload',
  'authorization',
  'bottoken',
  'credential',
  'credentials',
  'password',
  'passwd',
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
const UNSAFE_DURABLE_TOPIC_BINDING_FIELD_NAME_PARTS = [
  ['api', 'key'],
  ['bot', 'token'],
  ['cred', 'ential'],
  ['pass', 'word'],
  ['pass', 'wd'],
  ['sec', 'ret'],
] as const;

function assertPlainObject(input: unknown, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function normalizeRequiredString(label: string, input: unknown): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${label} must be a string.`);
  }

  const normalized = input.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${label} must be non-empty.`);
  }

  return normalized;
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isUnsafeDurableTopicBindingFieldName(fieldName: string): boolean {
  const normalizedFieldName = normalizeFieldName(fieldName);

  return (
    UNSAFE_DURABLE_TOPIC_BINDING_FIELD_NAMES.has(normalizedFieldName) ||
    UNSAFE_DURABLE_TOPIC_BINDING_FIELD_NAME_PARTS.some((parts) => normalizedFieldName.includes(parts.join('')))
  );
}

function isUnsafeDurableTopicBindingStringValue(value: string): boolean {
  const normalizedValue = normalizeFieldName(value);

  return (
    Array.from(UNSAFE_DURABLE_TOPIC_BINDING_FIELD_NAMES).some((unsafeFieldName) =>
      normalizedValue.includes(unsafeFieldName),
    ) ||
    UNSAFE_DURABLE_TOPIC_BINDING_FIELD_NAME_PARTS.some((parts) => normalizedValue.includes(parts.join('')))
  );
}

function rejectUnsafeDurableTopicBindingFields(input: unknown, label: string, seen = new Set<object>()): void {
  if (typeof input === 'string') {
    if (isUnsafeDurableTopicBindingStringValue(input)) {
      throw new TypeError(`${label} must not include protected raw or sensitive string values.`);
    }

    return;
  }

  if (typeof input !== 'object' || input === null) {
    return;
  }

  if (seen.has(input)) {
    return;
  }
  seen.add(input);

  if (Array.isArray(input)) {
    for (const value of input) {
      rejectUnsafeDurableTopicBindingFields(value, label, seen);
    }
    return;
  }

  for (const [fieldName, value] of Object.entries(input)) {
    if (isUnsafeDurableTopicBindingFieldName(fieldName)) {
      throw new TypeError(`${label} must not include raw provider, runtime, tool, approval, error, or sensitive fields.`);
    }

    rejectUnsafeDurableTopicBindingFields(value, label, seen);
  }
}

function assertDurableTopicBindingRecordPort(input: unknown): asserts input is DurableTopicBindingRecordPort {
  assertPlainObject(input, 'Durable topic binding record port');

  if (
    typeof input.get !== 'function' ||
    typeof input.put !== 'function' ||
    typeof input.delete !== 'function' ||
    typeof input.list !== 'function'
  ) {
    throw new TypeError('Durable topic binding store requires an injected durable record port.');
  }
}

function createDurableTopicBindingRecordFromSnapshot(snapshot: TopicBindingSnapshot): DurableTopicBindingRecord {
  const normalizedSnapshot = createTopicBindingSnapshot(snapshot);
  const record = {
    kind: DURABLE_TOPIC_BINDING_RECORD_KIND,
    recordKey: serializeTopicBindingKey(normalizedSnapshot.key),
    workspaceId: normalizedSnapshot.key.workspaceId,
    channelId: normalizedSnapshot.key.channelId,
    topicId: normalizedSnapshot.key.topicId,
    status: normalizedSnapshot.status,
    agentId: normalizedSnapshot.agentId,
    sessionId: normalizedSnapshot.sessionId,
    createdAtIso: normalizedSnapshot.createdAtIso,
    updatedAtIso: normalizedSnapshot.updatedAtIso,
    ...(normalizedSnapshot.metadata === undefined ? {} : { metadata: normalizedSnapshot.metadata }),
  } satisfies DurableTopicBindingRecord;

  rejectUnsafeDurableTopicBindingFields(record, 'Durable topic binding record');

  return Object.freeze(record);
}

function normalizeRecordList(records: readonly DurableTopicBindingRecord[]): readonly DurableTopicBindingRecord[] {
  if (!Array.isArray(records)) {
    throw new TypeError('Durable topic binding record list must be an array.');
  }

  return Object.freeze(
    records
      .map((record) => normalizeDurableTopicBindingRecord(record))
      .sort((left, right) => left.recordKey.localeCompare(right.recordKey)),
  );
}

export function createDurableTopicBindingRecord(input: TopicBindingSnapshotInput): DurableTopicBindingRecord {
  assertPlainObject(input, 'Durable topic binding snapshot input');
  rejectUnsafeDurableTopicBindingFields(input, 'Durable topic binding snapshot input');

  return createDurableTopicBindingRecordFromSnapshot(createTopicBindingSnapshot(input));
}

export function normalizeDurableTopicBindingRecord(input: unknown): DurableTopicBindingRecord {
  assertPlainObject(input, 'Durable topic binding record');
  rejectUnsafeDurableTopicBindingFields(input, 'Durable topic binding record');

  if (input.kind !== DURABLE_TOPIC_BINDING_RECORD_KIND) {
    throw new TypeError('Durable topic binding record kind must be topic-binding.');
  }

  const recordKey = normalizeRequiredString('Durable topic binding recordKey', input.recordKey);
  const snapshot = createTopicBindingSnapshot({
    key: {
      workspaceId: input.workspaceId as OpenClawWorkspaceId,
      channelId: input.channelId as OpenClawChannelId,
      topicId: input.topicId as OpenClawTopicId,
    },
    status: input.status as TopicBindingStatus,
    agentId: input.agentId as OpenClawAgentId,
    sessionId: input.sessionId as OpenClawSessionId,
    createdAtIso: input.createdAtIso as string,
    updatedAtIso: input.updatedAtIso as string,
    ...(input.metadata === undefined ? {} : { metadata: input.metadata as SafeTopicBindingMetadata }),
  });
  const expectedRecordKey = serializeTopicBindingKey(snapshot.key);

  if (recordKey !== expectedRecordKey) {
    throw new TypeError('Durable topic binding recordKey must match the topic binding key.');
  }

  return createDurableTopicBindingRecordFromSnapshot(snapshot);
}

export function cloneDurableTopicBindingRecord(record: DurableTopicBindingRecord): DurableTopicBindingRecord {
  return normalizeDurableTopicBindingRecord(record);
}

export function createDurableTopicBindingRecordKey(key: TopicBindingKey): DurableTopicBindingRecordKey {
  return serializeTopicBindingKey(createTopicBindingKey(key));
}

export function durableTopicBindingRecordToSnapshot(record: DurableTopicBindingRecord): TopicBindingSnapshot {
  const normalizedRecord = normalizeDurableTopicBindingRecord(record);

  return cloneTopicBindingSnapshot({
    key: {
      workspaceId: normalizedRecord.workspaceId,
      channelId: normalizedRecord.channelId,
      topicId: normalizedRecord.topicId,
    },
    status: normalizedRecord.status,
    agentId: normalizedRecord.agentId,
    sessionId: normalizedRecord.sessionId,
    createdAtIso: normalizedRecord.createdAtIso,
    updatedAtIso: normalizedRecord.updatedAtIso,
    ...(normalizedRecord.metadata === undefined ? {} : { metadata: normalizedRecord.metadata }),
  });
}

export function createDurableTopicBindingStore(input: {
  readonly records: DurableTopicBindingRecordPort;
}): DurableTopicBindingStore {
  assertPlainObject(input, 'Durable topic binding store input');
  const records = input.records;
  assertDurableTopicBindingRecordPort(records);

  return Object.freeze({
    upsert(snapshot: TopicBindingSnapshot): TopicBindingSnapshot {
      const record = createDurableTopicBindingRecord(snapshot);
      const persistedRecord = records.put(record);
      const normalizedRecord = persistedRecord === undefined ? record : normalizeDurableTopicBindingRecord(persistedRecord);

      return durableTopicBindingRecordToSnapshot(normalizedRecord);
    },

    get(key: TopicBindingKey): TopicBindingSnapshot | undefined {
      const record = records.get(createDurableTopicBindingRecordKey(key));

      return record === undefined ? undefined : durableTopicBindingRecordToSnapshot(record);
    },

    getRecord(key: TopicBindingKey): DurableTopicBindingRecord | undefined {
      const record = records.get(createDurableTopicBindingRecordKey(key));

      return record === undefined ? undefined : normalizeDurableTopicBindingRecord(record);
    },

    delete(key: TopicBindingKey): boolean {
      return records.delete(createDurableTopicBindingRecordKey(key));
    },

    list(): readonly TopicBindingSnapshot[] {
      return Object.freeze(normalizeRecordList(records.list()).map((record) => durableTopicBindingRecordToSnapshot(record)));
    },

    listRecords(): readonly DurableTopicBindingRecord[] {
      return normalizeRecordList(records.list());
    },
  });
}
