import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDeterministicTopicBindingRef,
  createTopicBindingKeyId,
  createTopicBindingRecord,
} from '../../../dist/topic-bindings/topic-binding-records.js';
import { createTopicBindingRecordStore } from '../../../dist/storage/topic-bindings/topic-binding-record-store.js';

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function makeRecord(overrides = {}) {
  return createTopicBindingRecord({
    bindingKey: {
      channelRef: 'telegram-channel:support',
      chatRef: 'telegram-chat:main',
      threadRef: 'telegram-thread:agent-a',
      ...(overrides.bindingKey ?? {}),
    },
    target: {
      workspaceRef: 'workspace:acme',
      agentRef: 'agent:support',
      hostSessionRef: 'host-session:support-main',
      ...(overrides.target ?? {}),
    },
    status: overrides.status ?? 'active',
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? '2026-06-25T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-06-25T00:00:00.000Z',
    ...(overrides.bindingRef === undefined ? {} : { bindingRef: overrides.bindingRef }),
    ...(overrides.display === undefined ? {} : { display: overrides.display }),
    ...(overrides.correlationRef === undefined ? {} : { correlationRef: overrides.correlationRef }),
  });
}

function createFakePort() {
  const byRef = new Map();
  const refByKey = new Map();
  let putCount = 0;

  function putRecord(record) {
    const stored = cloneJson(record);
    byRef.set(stored.bindingRef, stored);
    refByKey.set(createTopicBindingKeyId(stored.bindingKey), stored.bindingRef);
    return cloneJson(stored);
  }

  return Object.freeze({
    port: Object.freeze({
      getByBindingRef(bindingRef) {
        return cloneJson(byRef.get(bindingRef)) ?? null;
      },

      getByBindingKey(bindingKeyId) {
        const bindingRef = refByKey.get(bindingKeyId);
        return bindingRef === undefined ? null : cloneJson(byRef.get(bindingRef));
      },

      put(record) {
        putCount += 1;
        return putRecord(record);
      },

      deleteByBindingRef(bindingRef) {
        const record = byRef.get(bindingRef);
        if (record === undefined) {
          return false;
        }
        byRef.delete(bindingRef);
        refByKey.delete(createTopicBindingKeyId(record.bindingKey));
        return true;
      },

      list() {
        return Array.from(byRef.values()).map((record) => cloneJson(record));
      },
    }),

    seed(record) {
      putRecord(record);
    },

    putCount() {
      return putCount;
    },
  });
}

test('creates deterministic topic binding records without using display title as authority', () => {
  const first = makeRecord({ display: { topicTitle: 'Support Alpha' } });
  const renamed = makeRecord({ display: { topicTitle: 'Renamed Support Topic' } });

  assert.equal(first.bindingRef, createDeterministicTopicBindingRef(first.bindingKey));
  assert.equal(renamed.bindingRef, first.bindingRef);
  assert.equal(createTopicBindingKeyId(renamed.bindingKey), createTopicBindingKeyId(first.bindingKey));
  assert.notEqual(renamed.display.topicTitle, first.display.topicTitle);
  assert.equal(renamed.bindingRef.includes('Renamed'), false);
});

test('upsert is replay-safe and does not duplicate record writes for identical replay', async () => {
  const fake = createFakePort();
  const store = createTopicBindingRecordStore({ records: fake.port });
  const first = makeRecord();
  const updated = makeRecord({ version: 2, updatedAt: '2026-06-25T00:01:00.000Z' });

  const created = await store.upsert(first);
  const replayed = await store.upsert(first);
  const updateDecision = await store.upsert(updated);

  assert.equal(created.status, 'created');
  assert.equal(replayed.status, 'replayed');
  assert.equal(replayed.replayed, true);
  assert.equal(updateDecision.status, 'updated');
  assert.equal(fake.putCount(), 2);
  assert.deepEqual(await store.getByBindingRef(first.bindingRef), updated);
  assert.deepEqual(await store.getByBindingKey(first.bindingKey), updated);
});

test('same binding key with a different bindingRef is a deterministic conflict', async () => {
  const fake = createFakePort();
  const store = createTopicBindingRecordStore({ records: fake.port });
  const first = makeRecord();
  const conflicting = makeRecord({
    bindingRef: 'topic-binding:manual-conflict',
    target: { agentRef: 'agent:other' },
    version: 2,
    updatedAt: '2026-06-25T00:02:00.000Z',
  });

  await store.upsert(first);
  const decision = await store.upsert(conflicting);

  assert.equal(decision.status, 'conflict');
  assert.equal(decision.reason, 'binding-key-conflict');
  assert.deepEqual(await store.getByBindingRef(first.bindingRef), first);
  assert.equal(fake.putCount(), 1);
});

test('stale versions are replay-safe conflicts and do not overwrite current binding', async () => {
  const fake = createFakePort();
  const store = createTopicBindingRecordStore({ records: fake.port });
  const first = makeRecord({ version: 2, updatedAt: '2026-06-25T00:02:00.000Z' });
  const stale = makeRecord({
    version: 1,
    status: 'disabled',
    updatedAt: '2026-06-25T00:03:00.000Z',
  });

  await store.upsert(first);
  const decision = await store.upsert(stale);

  assert.equal(decision.status, 'conflict');
  assert.equal(decision.reason, 'stale-version');
  assert.deepEqual(await store.getByBindingRef(first.bindingRef), first);
  assert.equal(fake.putCount(), 1);
});

test('record helpers reject unsafe raw or sensitive fields before persistence', async () => {
  const fake = createFakePort();
  const store = createTopicBindingRecordStore({ records: fake.port });
  const unsafeFieldName = ['raw', 'Update'].join('');
  const unsafeInput = {
    ...makeRecord(),
    [unsafeFieldName]: { provider: 'unsafe' },
  };

  assert.throws(
    () => createTopicBindingRecord(unsafeInput),
    /unsafe provider/u,
  );
  await assert.rejects(
    () => store.upsert(unsafeInput),
    /unsafe provider/u,
  );
  assert.equal(fake.putCount(), 0);
});

test('list and delete return cloned deterministic records sorted by binding key', async () => {
  const fake = createFakePort();
  const store = createTopicBindingRecordStore({ records: fake.port });
  const second = makeRecord({
    bindingKey: { channelRef: 'telegram-channel:z-channel' },
    target: { workspaceRef: 'workspace:z' },
  });
  const first = makeRecord({
    bindingKey: { channelRef: 'telegram-channel:a-channel' },
    target: { workspaceRef: 'workspace:a' },
  });

  await store.upsert(second);
  await store.upsert(first);

  const listed = await store.list();
  assert.deepEqual(listed.map((record) => record.bindingKey.channelRef), [
    'telegram-channel:a-channel',
    'telegram-channel:z-channel',
  ]);
  assert.equal(Object.isFrozen(listed), true);
  assert.notEqual(listed[0], first);
  assert.deepEqual(listed[0], first);

  assert.deepEqual(await store.deleteByBindingRef(first.bindingRef), {
    bindingRef: first.bindingRef,
    deleted: true,
  });
  assert.deepEqual(await store.deleteByBindingRef(first.bindingRef), {
    bindingRef: first.bindingRef,
    deleted: false,
  });
});
