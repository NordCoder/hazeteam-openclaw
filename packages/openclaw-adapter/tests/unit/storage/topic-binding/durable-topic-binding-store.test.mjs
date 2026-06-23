import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTopicBindingKey,
  createTopicBindingSnapshot,
} from '../../../../dist/binding/topic-binding.js';
import {
  cloneDurableTopicBindingRecord,
  createDurableTopicBindingRecord,
  createDurableTopicBindingRecordKey,
  createDurableTopicBindingStore,
  durableTopicBindingRecordToSnapshot,
  normalizeDurableTopicBindingRecord,
} from '../../../../dist/storage/topic-binding/durable-topic-binding-store.js';

const forbiddenSerializedTerms = Object.freeze([
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
]);

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function makeSnapshotInput(overrides = {}) {
  return {
    key: {
      workspaceId: 'workspace-a',
      channelId: 'channel-main',
      topicId: 'topic-1',
    },
    status: 'active',
    agentId: 'agent-support',
    sessionId: 'session-1',
    createdAtIso: '2026-06-24T00:00:00.000Z',
    updatedAtIso: '2026-06-24T01:00:00.000Z',
    metadata: { labels: ['initial'], nested: { count: 1 } },
    ...overrides,
  };
}

function makeSnapshot(overrides = {}) {
  return createTopicBindingSnapshot(makeSnapshotInput(overrides));
}

function createFakeRecordPort() {
  const records = new Map();

  return {
    port: Object.freeze({
      get(recordKey) {
        return cloneJson(records.get(recordKey));
      },

      put(record) {
        const clonedRecord = cloneJson(record);
        records.set(clonedRecord.recordKey, clonedRecord);
        return cloneJson(clonedRecord);
      },

      delete(recordKey) {
        return records.delete(recordKey);
      },

      list() {
        return Array.from(records.values()).map((record) => cloneJson(record));
      },
    }),

    seed(record) {
      records.set(record.recordKey, cloneJson(record));
    },
  };
}

test('creates normalized durable topic binding records from safe snapshots', () => {
  const snapshot = makeSnapshot({
    key: {
      workspaceId: ' workspace-a ',
      channelId: ' channel-main ',
      topicId: ' topic-1 ',
    },
    agentId: ' agent-support ',
    sessionId: ' session-1 ',
  });

  const record = createDurableTopicBindingRecord(snapshot);

  assert.deepEqual(record, {
    kind: 'topic-binding',
    recordKey: 'topic-binding:workspace=workspace-a:channel=channel-main:topic=topic-1',
    workspaceId: 'workspace-a',
    channelId: 'channel-main',
    topicId: 'topic-1',
    status: 'active',
    agentId: 'agent-support',
    sessionId: 'session-1',
    createdAtIso: '2026-06-24T00:00:00.000Z',
    updatedAtIso: '2026-06-24T01:00:00.000Z',
    metadata: { labels: ['initial'], nested: { count: 1 } },
  });
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.metadata), true);
  assert.equal(Object.isFrozen(record.metadata.labels), true);
  assert.deepEqual(durableTopicBindingRecordToSnapshot(record), snapshot);
});

test('normalizes serialized durable records and rejects mismatched record keys', () => {
  const record = createDurableTopicBindingRecord(makeSnapshot());
  const fromSerialized = cloneJson(record);

  assert.deepEqual(normalizeDurableTopicBindingRecord(fromSerialized), record);
  assert.deepEqual(cloneDurableTopicBindingRecord(fromSerialized), record);
  assert.equal(
    createDurableTopicBindingRecordKey(createTopicBindingKey({
      workspaceId: 'workspace-a',
      channelId: 'channel-main',
      topicId: 'topic-1',
    })),
    record.recordKey,
  );

  assert.throws(
    () => normalizeDurableTopicBindingRecord({ ...fromSerialized, recordKey: `${record.recordKey}:mismatch` }),
    /recordKey/u,
  );
});

test('upsert stores and get retrieves cloned safe snapshots and records', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const snapshot = makeSnapshot();

  const upserted = store.upsert(snapshot);
  const found = store.get(snapshot.key);
  const foundRecord = store.getRecord(snapshot.key);

  assert.deepEqual(upserted, snapshot);
  assert.deepEqual(found, snapshot);
  assert.notEqual(found, snapshot);
  assert.equal(Object.isFrozen(found), true);
  assert.equal(Object.isFrozen(found.key), true);
  assert.equal(Object.isFrozen(found.metadata), true);
  assert.deepEqual(foundRecord, createDurableTopicBindingRecord(snapshot));
  assert.equal(Object.isFrozen(foundRecord), true);
});

test('upsert overwrites an existing durable topic binding record', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const first = makeSnapshot({ status: 'active', agentId: 'agent-a', sessionId: 'session-a' });
  const second = makeSnapshot({ status: 'paused', agentId: 'agent-b', sessionId: 'session-b' });

  store.upsert(first);
  store.upsert(second);

  const listed = store.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'paused');
  assert.equal(listed[0].agentId, 'agent-b');
  assert.equal(listed[0].sessionId, 'session-b');
  assert.deepEqual(store.get(first.key), second);
});

test('delete returns false for missing records and true for existing records', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const snapshot = makeSnapshot();

  assert.equal(store.delete(snapshot.key), false);
  store.upsert(snapshot);
  assert.equal(store.delete(snapshot.key), true);
  assert.equal(store.get(snapshot.key), undefined);
  assert.equal(store.getRecord(snapshot.key), undefined);
  assert.equal(store.delete(snapshot.key), false);
});

test('list and listRecords return cloned values sorted by durable record key', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const second = makeSnapshot({
    key: { workspaceId: 'workspace-b', channelId: 'channel-main', topicId: 'topic-2' },
    agentId: 'agent-b',
  });
  const first = makeSnapshot({
    key: { workspaceId: 'workspace-a', channelId: 'channel-main', topicId: 'topic-1' },
    agentId: 'agent-a',
  });

  store.upsert(second);
  store.upsert(first);

  const listed = store.list();
  const listedRecords = store.listRecords();

  assert.deepEqual(listed.map((snapshot) => snapshot.key.workspaceId), ['workspace-a', 'workspace-b']);
  assert.deepEqual(listedRecords.map((record) => record.workspaceId), ['workspace-a', 'workspace-b']);
  assert.deepEqual(listedRecords.map((record) => record.recordKey), [
    'topic-binding:workspace=workspace-a:channel=channel-main:topic=topic-1',
    'topic-binding:workspace=workspace-b:channel=channel-main:topic=topic-2',
  ]);
  assert.notEqual(listed[0], first);
  assert.deepEqual(listed[0], first);
  assert.equal(Object.isFrozen(listed), true);
  assert.equal(Object.isFrozen(listedRecords), true);
});

test('malformed durable records are rejected when read from the injected boundary', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const record = createDurableTopicBindingRecord(makeSnapshot());

  fake.seed({ ...record, status: 'archived' });
  assert.throws(() => store.get(makeSnapshot().key), /status/u);

  const unsafeFake = createFakeRecordPort();
  const unsafeStore = createDurableTopicBindingStore({ records: unsafeFake.port });
  unsafeFake.seed({ ...record, rawUpdate: { provider: 'unsafe' } });
  assert.throws(() => unsafeStore.listRecords(), /raw provider/u);
});

test('rejects unsafe durable metadata field names before persistence', () => {
  for (const forbiddenTerm of forbiddenSerializedTerms) {
    assert.throws(
      () => createDurableTopicBindingRecord(makeSnapshotInput({ metadata: { [forbiddenTerm]: 'unsafe' } })),
      /must not include/u,
      forbiddenTerm,
    );
  }
});

test('durable records and store results do not serialize raw or sensitive field names', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const snapshot = makeSnapshot({ metadata: { labels: ['safe'], nested: { count: 1 } } });
  const record = createDurableTopicBindingRecord(snapshot);

  const outputs = [
    record,
    store.upsert(snapshot),
    store.get(snapshot.key),
    store.getRecord(snapshot.key),
    store.list(),
    store.listRecords(),
  ];

  for (const output of outputs) {
    const serialized = JSON.stringify(output);
    for (const forbiddenTerm of forbiddenSerializedTerms) {
      assert.equal(
        serialized.includes(forbiddenTerm),
        false,
        `serialized output leaked forbidden term ${forbiddenTerm}`,
      );
    }
  }
});
