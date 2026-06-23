import assert from 'node:assert/strict';
import test from 'node:test';

import { createTopicBindingSnapshot } from '../../../../dist/binding/topic-binding.js';
import {
  createDurableTopicBindingRecord,
  createDurableTopicBindingStore,
} from '../../../../dist/storage/topic-binding/durable-topic-binding-store.js';

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function protectedMarker() {
  return ['raw', 'Update'].join('');
}

function makeSnapshot(overrides = {}) {
  return createTopicBindingSnapshot({
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
    metadata: { labels: ['safe'], nested: { note: 'normal note' } },
    ...overrides,
  });
}

function createFakeRecordPort() {
  const records = new Map();
  let putCount = 0;

  return Object.freeze({
    port: Object.freeze({
      get(recordKey) {
        return cloneJson(records.get(recordKey));
      },

      put(record) {
        putCount += 1;
        const stored = cloneJson(record);
        records.set(stored.recordKey, stored);
        return cloneJson(stored);
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

    putCount() {
      return putCount;
    },

    size() {
      return records.size;
    },
  });
}

test('rejects protected metadata string values before persistence', () => {
  const marker = protectedMarker();
  const snapshot = makeSnapshot({
    metadata: {
      labels: ['safe label', `contains ${marker}`],
      nested: { note: 'operator note' },
    },
  });

  assert.throws(
    () => createDurableTopicBindingRecord(snapshot),
    /string values/u,
  );
});

test('does not write rejected protected metadata string values', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const marker = protectedMarker();
  const snapshot = makeSnapshot({
    metadata: {
      labels: ['safe label'],
      nested: { note: `contains ${marker}` },
    },
  });

  assert.throws(
    () => store.upsert(snapshot),
    /string values/u,
  );
  assert.equal(fake.putCount(), 0);
  assert.equal(fake.size(), 0);
});

test('accepts safe metadata strings after value guard hardening', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const snapshot = makeSnapshot({
    metadata: {
      labels: ['safe label', 'operator note'],
      nested: { note: 'channel binding reminder' },
    },
  });

  const upserted = store.upsert(snapshot);
  const found = store.get(snapshot.key);
  const listed = store.list();
  const listedRecords = store.listRecords();

  assert.deepEqual(upserted, snapshot);
  assert.deepEqual(found, snapshot);
  assert.notEqual(found, snapshot);
  assert.deepEqual(listed, [snapshot]);
  assert.equal(listedRecords.length, 1);
  assert.equal(listedRecords[0].metadata.nested.note, 'channel binding reminder');
  assert.equal(fake.putCount(), 1);
  assert.equal(fake.size(), 1);
});

test('rejects protected values returned from the injected record boundary', () => {
  const fake = createFakeRecordPort();
  const store = createDurableTopicBindingStore({ records: fake.port });
  const safeSnapshot = makeSnapshot();
  const validRecord = createDurableTopicBindingRecord(safeSnapshot);
  const marker = protectedMarker();

  fake.seed({
    ...validRecord,
    metadata: {
      labels: ['safe label'],
      nested: { note: `contains ${marker}` },
    },
  });

  assert.throws(
    () => store.getRecord(safeSnapshot.key),
    /string values/u,
  );
  assert.throws(
    () => store.listRecords(),
    /string values/u,
  );
});
