import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTopicBindingKey,
  createTopicBindingSnapshot,
} from '../../../dist/binding/topic-binding.js';
import { createInMemoryTopicBindingStore } from '../../../dist/binding/in-memory-topic-binding-store.js';

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
    createdAtIso: '2026-06-23T00:00:00.000Z',
    updatedAtIso: '2026-06-23T01:00:00.000Z',
    metadata: { labels: ['initial'] },
    ...overrides,
  });
}

test('empty store list is empty', () => {
  const store = createInMemoryTopicBindingStore();

  assert.deepEqual(store.list(), []);
});

test('upsert stores and get retrieves a cloned snapshot', () => {
  const store = createInMemoryTopicBindingStore();
  const snapshot = makeSnapshot();

  const upserted = store.upsert(snapshot);
  const found = store.get(snapshot.key);

  assert.deepEqual(upserted, snapshot);
  assert.deepEqual(found, snapshot);
  assert.notEqual(found, snapshot);
});

test('upsert overwrites the same key deterministically', () => {
  const store = createInMemoryTopicBindingStore();
  const first = makeSnapshot({ status: 'active', agentId: 'agent-a' });
  const second = makeSnapshot({ status: 'paused', agentId: 'agent-b' });

  store.upsert(first);
  store.upsert(second);

  const listed = store.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'paused');
  assert.equal(listed[0].agentId, 'agent-b');
});

test('delete returns true for existing key and false for missing key', () => {
  const store = createInMemoryTopicBindingStore();
  const snapshot = makeSnapshot();

  store.upsert(snapshot);
  assert.equal(store.delete(snapshot.key), true);
  assert.equal(store.get(snapshot.key), undefined);
  assert.equal(store.delete(snapshot.key), false);
});

test('list returns cloned snapshots sorted by serialized key', () => {
  const store = createInMemoryTopicBindingStore();
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
  assert.deepEqual(listed.map((snapshot) => snapshot.key.workspaceId), ['workspace-a', 'workspace-b']);
  assert.notEqual(listed[0], first);
  assert.deepEqual(listed[0], first);
});

test('listByWorkspace filters by workspace id', () => {
  const store = createInMemoryTopicBindingStore();
  store.upsert(makeSnapshot({
    key: { workspaceId: 'workspace-a', channelId: 'channel-main', topicId: 'topic-1' },
    agentId: 'agent-a',
  }));
  store.upsert(makeSnapshot({
    key: { workspaceId: 'workspace-b', channelId: 'channel-main', topicId: 'topic-2' },
    agentId: 'agent-b',
  }));

  const filtered = store.listByWorkspace('workspace-a');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].agentId, 'agent-a');
});

test('clear removes all snapshots', () => {
  const store = createInMemoryTopicBindingStore();
  const key = createTopicBindingKey({
    workspaceId: 'workspace-a',
    channelId: 'channel-main',
    topicId: 'topic-1',
  });

  store.upsert(makeSnapshot({ key }));
  store.clear();

  assert.deepEqual(store.list(), []);
  assert.equal(store.get(key), undefined);
});
