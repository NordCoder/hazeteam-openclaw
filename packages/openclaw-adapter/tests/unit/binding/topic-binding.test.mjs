import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cloneTopicBindingSnapshot,
  createTopicBindingKey,
  createTopicBindingSnapshot,
  isTopicBindingStatus,
  serializeTopicBindingKey,
} from '../../../dist/binding/topic-binding.js';

const baseKeyInput = Object.freeze({
  workspaceId: 'workspace-a',
  channelId: 'channel-main',
  topicId: 'topic-42',
});

const baseSnapshotInput = Object.freeze({
  key: baseKeyInput,
  status: 'active',
  agentId: 'agent-support',
  sessionId: 'session-1',
  createdAtIso: '2026-06-23T00:00:00.000Z',
  updatedAtIso: '2026-06-23T01:00:00.000Z',
});

test('creates deterministic topic binding keys', () => {
  assert.deepEqual(createTopicBindingKey(baseKeyInput), {
    workspaceId: 'workspace-a',
    channelId: 'channel-main',
    topicId: 'topic-42',
  });

  assert.deepEqual(createTopicBindingKey(baseKeyInput), createTopicBindingKey({ ...baseKeyInput }));
});

test('serializes topic binding keys deterministically', () => {
  assert.equal(
    serializeTopicBindingKey(baseKeyInput),
    'topic-binding:workspace=workspace-a:channel=channel-main:topic=topic-42',
  );

  assert.equal(
    serializeTopicBindingKey({ workspaceId: 'workspace/a', channelId: 'channel:a', topicId: 'topic 42' }),
    'topic-binding:workspace=workspace%2Fa:channel=channel%3Aa:topic=topic%2042',
  );
});

test('validates topic binding statuses', () => {
  assert.equal(isTopicBindingStatus('active'), true);
  assert.equal(isTopicBindingStatus('paused'), true);
  assert.equal(isTopicBindingStatus('disabled'), true);
  assert.equal(isTopicBindingStatus('archived'), false);
  assert.equal(isTopicBindingStatus(undefined), false);
});

test('creates snapshots with explicit timestamps', () => {
  const snapshot = createTopicBindingSnapshot(baseSnapshotInput);

  assert.equal(snapshot.status, 'active');
  assert.equal(snapshot.agentId, 'agent-support');
  assert.equal(snapshot.sessionId, 'session-1');
  assert.equal(snapshot.createdAtIso, '2026-06-23T00:00:00.000Z');
  assert.equal(snapshot.updatedAtIso, '2026-06-23T01:00:00.000Z');
  assert.deepEqual(snapshot.key, baseKeyInput);
});

test('rejects invalid status and empty identifiers', () => {
  assert.throws(
    () => createTopicBindingSnapshot({ ...baseSnapshotInput, status: 'archived' }),
    /status/u,
  );
  assert.throws(
    () => createTopicBindingKey({ ...baseKeyInput, topicId: '   ' }),
    /topicId/u,
  );
  assert.throws(
    () => createTopicBindingSnapshot({ ...baseSnapshotInput, agentId: '' }),
    /agentId/u,
  );
});

test('cloned snapshots do not share mutable metadata references', () => {
  const metadata = {
    labels: ['safe'],
    nested: { count: 1 },
  };
  const snapshot = createTopicBindingSnapshot({
    ...baseSnapshotInput,
    metadata,
  });
  const cloned = cloneTopicBindingSnapshot(snapshot);

  metadata.labels.push('mutated');
  metadata.nested.count = 2;

  assert.notEqual(snapshot.metadata, metadata);
  assert.notEqual(cloned.metadata, snapshot.metadata);
  assert.deepEqual(snapshot.metadata, {
    labels: ['safe'],
    nested: { count: 1 },
  });
  assert.deepEqual(cloned.metadata, snapshot.metadata);
});

test('rejects unsafe metadata keys recursively', () => {
  const unsafeKey = ['sec', 'ret'].join('');
  assert.throws(
    () => createTopicBindingSnapshot({
      ...baseSnapshotInput,
      metadata: { nested: { [unsafeKey]: 'value' } },
    }),
    /unsafe field/u,
  );
});

test('rejects non JSON-like metadata values', () => {
  assert.throws(
    () => createTopicBindingSnapshot({
      ...baseSnapshotInput,
      metadata: { callback: () => undefined },
    }),
    /JSON-like/u,
  );

  assert.throws(
    () => createTopicBindingSnapshot({
      ...baseSnapshotInput,
      metadata: { value: undefined },
    }),
    /JSON-like/u,
  );
});
