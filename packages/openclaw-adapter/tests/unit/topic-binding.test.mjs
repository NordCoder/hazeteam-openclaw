import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTelegramTopicBindingKey,
  createTelegramTopicBindingSnapshot,
  isTelegramTopicBindingDisabled,
  isTelegramTopicBindingEnabled,
  isTelegramTopicBindingKey,
  parseTelegramTopicBindingKey,
} from '../../dist/binding/topic-binding.js';
import { createInMemoryTelegramTopicBindingStore } from '../../dist/binding/in-memory-topic-binding-store.js';

const baseBindingInput = Object.freeze({
  channelId: 'channel-main',
  chatId: '-1001234567890',
  messageThreadId: '42',
  topicName: 'Initial display name',
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:support',
  hostSessionRef: 'host-session:session-1',
  detailsRef: 'details:binding-1',
  createdAt: '2026-06-23T00:00:00.000Z',
});

const forbiddenPublicFields = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawMessage',
  'rawCallback',
  'payloadBody',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'toolPayload',
  'approvalPayload',
];

function collectObjectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeys(item, keys);
    }

    return keys;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value)) {
      keys.add(key);
      collectObjectKeys(nestedValue, keys);
    }
  }

  return keys;
}

function assertNoForbiddenPublicFields(value) {
  const keys = collectObjectKeys(value);
  for (const field of forbiddenPublicFields) {
    assert.equal(keys.has(field), false, `unexpected public field ${field}`);
  }
}

test('binding key is deterministic and ignores topic display name', () => {
  const firstKey = createTelegramTopicBindingKey({
    ...baseBindingInput,
    topicName: 'Renamed topic A',
  });
  const secondKey = createTelegramTopicBindingKey({
    ...baseBindingInput,
    topicName: 'Renamed topic B',
  });

  assert.equal(firstKey, 'telegram-topic:channel-main:-1001234567890:42');
  assert.equal(firstKey, secondKey);
});

test('parse and is helpers accept canonical keys and reject invalid keys', () => {
  const key = createTelegramTopicBindingKey(baseBindingInput);
  const parsed = parseTelegramTopicBindingKey(key);

  assert.equal(isTelegramTopicBindingKey(key), true);
  assert.deepEqual(parsed, {
    key,
    channelId: 'channel-main',
    chatId: '-1001234567890',
    messageThreadId: '42',
  });

  for (const invalidKey of [
    null,
    '',
    'telegram-topic',
    'telegram-topic:channel-main:-1001234567890',
    'telegram-topic:channel-main:-1001234567890:42:extra',
    'telegram-topic:channel-main:-1001234567890:',
    'telegram-topic:channel-main:-1001234567890:thread 42',
    'telegram-topic:channel-main:-1001234567890:thread/42',
    'telegram-topic:channel-main:-1001234567890:thread\n42',
    ' telegram-topic:channel-main:-1001234567890:42',
    'openclaw-topic:channel-main:-1001234567890:42',
  ]) {
    assert.equal(isTelegramTopicBindingKey(invalidKey), false, `accepted invalid key ${invalidKey}`);
    assert.equal(parseTelegramTopicBindingKey(invalidKey), null, `parsed invalid key ${invalidKey}`);
  }
});

test('snapshot contains target refs and enabled status by default', () => {
  const snapshot = createTelegramTopicBindingSnapshot(baseBindingInput);

  assert.equal(snapshot.key, createTelegramTopicBindingKey(baseBindingInput));
  assert.equal(snapshot.workspaceRef, 'workspace:acme');
  assert.equal(snapshot.agentRef, 'agent:support');
  assert.equal(snapshot.hostSessionRef, 'host-session:session-1');
  assert.equal(snapshot.status, 'enabled');
  assert.equal(snapshot.topicName, 'Initial display name');
  assert.equal(isTelegramTopicBindingEnabled(snapshot), true);
  assert.equal(isTelegramTopicBindingDisabled(snapshot), false);
  assertNoForbiddenPublicFields(snapshot);
});

test('disabled binding helper recognizes disabled snapshots', () => {
  const snapshot = createTelegramTopicBindingSnapshot({
    ...baseBindingInput,
    status: 'disabled',
  });

  assert.equal(isTelegramTopicBindingEnabled(snapshot), false);
  assert.equal(isTelegramTopicBindingDisabled(snapshot), true);
});

test('in-memory store can upsert, get by key, get by coordinates, list, and disable bindings', () => {
  const store = createInMemoryTelegramTopicBindingStore();
  const upserted = store.upsert(baseBindingInput);

  assert.equal(upserted.ok, true);
  assert.equal(upserted.value.status, 'enabled');
  assert.equal(upserted.value.key, createTelegramTopicBindingKey(baseBindingInput));

  const byKey = store.getByKey(upserted.value.key);
  assert.equal(byKey.ok, true);
  assert.equal(byKey.value.key, upserted.value.key);

  const byCoordinates = store.getByTopic({
    channelId: baseBindingInput.channelId,
    chatId: baseBindingInput.chatId,
    messageThreadId: baseBindingInput.messageThreadId,
    topicName: 'A display rename cannot change identity',
  });
  assert.equal(byCoordinates.ok, true);
  assert.equal(byCoordinates.value.key, upserted.value.key);

  const listed = store.list();
  assert.equal(listed.ok, true);
  assert.equal(listed.value.length, 1);
  assert.equal(listed.value[0].key, upserted.value.key);

  const disabled = store.disable({
    key: upserted.value.key,
    updatedAt: '2026-06-23T01:00:00.000Z',
  });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.value.status, 'disabled');
  assert.equal(disabled.value.updatedAt, '2026-06-23T01:00:00.000Z');
  assert.equal(isTelegramTopicBindingDisabled(disabled.value), true);

  const afterDisable = store.getByKey(upserted.value.key);
  assert.equal(afterDisable.ok, true);
  assert.equal(afterDisable.value.status, 'disabled');
  assertNoForbiddenPublicFields([upserted.value, byKey.value, byCoordinates.value, listed.value, disabled.value]);
});

test('duplicate active binding conflict is safe and deterministic', () => {
  const store = createInMemoryTelegramTopicBindingStore();
  const first = store.upsert(baseBindingInput);
  const duplicate = store.upsert({
    ...baseBindingInput,
    workspaceRef: 'workspace:other',
    topicName: 'Different display name',
  });

  assert.equal(first.ok, true);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'conflict');
  assert.match(duplicate.error.message, /Active Telegram topic binding already exists/u);

  const listed = store.list();
  assert.equal(listed.ok, true);
  assert.equal(listed.value.length, 1);
  assert.equal(listed.value[0].workspaceRef, 'workspace:acme');
  assert.equal(listed.value[0].topicName, 'Initial display name');
  assertNoForbiddenPublicFields([duplicate.error, listed.value]);
});

test('idempotent upsert may update display metadata without changing identity', () => {
  const store = createInMemoryTelegramTopicBindingStore();
  const first = store.upsert(baseBindingInput);
  const renamed = store.upsert({
    ...baseBindingInput,
    topicName: 'Renamed display-only topic',
    updatedAt: '2026-06-23T02:00:00.000Z',
  });

  assert.equal(first.ok, true);
  assert.equal(renamed.ok, true);
  assert.equal(renamed.value.key, first.value.key);
  assert.equal(renamed.value.topicName, 'Renamed display-only topic');
  assert.equal(renamed.value.updatedAt, '2026-06-23T02:00:00.000Z');

  const byRenamedTopic = store.getByTopic({
    channelId: baseBindingInput.channelId,
    chatId: baseBindingInput.chatId,
    messageThreadId: baseBindingInput.messageThreadId,
    topicName: 'Any later display-only topic name',
  });
  assert.equal(byRenamedTopic.ok, true);
  assert.equal(byRenamedTopic.value.key, first.value.key);
  assert.equal(byRenamedTopic.value.topicName, 'Renamed display-only topic');
});
