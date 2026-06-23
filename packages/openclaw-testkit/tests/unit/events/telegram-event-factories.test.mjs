import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTestTelegramActorRef,
  createTestTelegramCallbackEvent,
  createTestTelegramCallbackId,
  createTestTelegramChannelId,
  createTestTelegramChannelRef,
  createTestTelegramChatId,
  createTestTelegramExternalMessageRef,
  createTestTelegramForumTopicRef,
  createTestTelegramMessageEvent,
  createTestTelegramMessageId,
  createTestTelegramMessageThreadId,
  createTestTelegramSystemEvent,
} from '../../../dist/events/telegram-event-factories.js';

const forbiddenGeneratedFieldNames = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderPayload',
  'rawProviderResponse',
  'rawMessage',
  'rawCallback',
  'payloadBody',
  'provider',
  'botToken',
  'apiKey',
  'secret',
  'stack',
  'rawError',
];

function collectObjectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeys(item, keys);
    }
    return keys;
  }

  if (typeof value !== 'object' || value === null) {
    return keys;
  }

  for (const key of Object.keys(value)) {
    keys.add(key);
    collectObjectKeys(value[key], keys);
  }

  return keys;
}

function assertNoUnsafeGeneratedFields(value) {
  const keys = collectObjectKeys(value);

  for (const forbiddenFieldName of forbiddenGeneratedFieldNames) {
    assert.equal(keys.has(forbiddenFieldName), false, `${forbiddenFieldName} should not be generated`);
  }
}

test('message factory returns a deterministic safe message event', () => {
  const event = createTestTelegramMessageEvent();

  assert.equal(event.eventKind, 'message');
  assert.equal(event.text, 'test message');
  assert.deepEqual(event.externalMessageRef, {
    channelId: createTestTelegramChannelId(),
    chatId: createTestTelegramChatId(),
    messageId: createTestTelegramMessageId(),
    messageThreadId: createTestTelegramMessageThreadId(),
  });
  assertNoUnsafeGeneratedFields(event);
});

test('callback factory returns callback event with opaque callback payload', () => {
  const event = createTestTelegramCallbackEvent();

  assert.equal(event.eventKind, 'callback');
  assert.equal(event.callbackId, createTestTelegramCallbackId());
  assert.equal(event.callbackPayload, 'opaque-test-callback-payload');
  assert.equal(event.callbackPayload.includes('{'), false);
  assert.equal(event.callbackPayload.includes('telegram'), false);
  assertNoUnsafeGeneratedFields(event);
});

test('system factory returns a safe system event', () => {
  const event = createTestTelegramSystemEvent();

  assert.equal(event.eventKind, 'system');
  assert.equal(event.systemEventKind, 'topic-created');
  assertNoUnsafeGeneratedFields(event);
});

test('topic ref canonical identity is channel id plus chat id plus message thread id', () => {
  const topicRef = createTestTelegramForumTopicRef({
    channelId: createTestTelegramChannelId('channel-alpha'),
    chatId: createTestTelegramChatId('chat-alpha'),
    messageThreadId: createTestTelegramMessageThreadId('thread-alpha'),
    topicName: 'Before rename',
  });
  const renamedTopicRef = createTestTelegramForumTopicRef({
    ...topicRef,
    topicName: 'After rename',
  });

  assert.deepEqual(
    [renamedTopicRef.channelId, renamedTopicRef.chatId, renamedTopicRef.messageThreadId],
    [topicRef.channelId, topicRef.chatId, topicRef.messageThreadId],
  );
  assert.notEqual(renamedTopicRef.topicName, topicRef.topicName);
});

test('overrides preserve supplied safe refs, ids, and text', () => {
  const channelId = createTestTelegramChannelId('channel-overridden');
  const chatId = createTestTelegramChatId('chat-overridden');
  const messageThreadId = createTestTelegramMessageThreadId('thread-overridden');
  const messageId = createTestTelegramMessageId('message-overridden');
  const channelRef = createTestTelegramChannelRef({ channelId });
  const topicRef = createTestTelegramForumTopicRef({
    channelId,
    chatId,
    messageThreadId,
    topicName: 'Override topic',
  });
  const externalMessageRef = createTestTelegramExternalMessageRef({
    channelId,
    chatId,
    messageId,
    messageThreadId,
  });
  const actor = createTestTelegramActorRef({
    actorRef: 'actor:override-user',
    displayName: 'Override User',
    username: 'override_user',
  });

  const event = createTestTelegramMessageEvent({
    operationRef: 'operation:override-operation',
    correlationRef: 'correlation:override-correlation',
    channelRef,
    topicRef,
    externalMessageRef,
    actor,
    text: 'safe override text',
    occurredAt: '2026-02-03T04:05:06.000Z',
    receivedAt: '2026-02-03T04:05:07.000Z',
  });

  assert.equal(event.operationRef, 'operation:override-operation');
  assert.equal(event.correlationRef, 'correlation:override-correlation');
  assert.deepEqual(event.channelRef, channelRef);
  assert.deepEqual(event.topicRef, topicRef);
  assert.deepEqual(event.externalMessageRef, externalMessageRef);
  assert.deepEqual(event.actor, actor);
  assert.equal(event.text, 'safe override text');
  assert.equal(event.occurredAt, '2026-02-03T04:05:06.000Z');
  assert.equal(event.receivedAt, '2026-02-03T04:05:07.000Z');
});

test('factories are deterministic across repeated calls', () => {
  assert.deepEqual(createTestTelegramChannelRef(), createTestTelegramChannelRef());
  assert.deepEqual(createTestTelegramForumTopicRef(), createTestTelegramForumTopicRef());
  assert.deepEqual(createTestTelegramExternalMessageRef(), createTestTelegramExternalMessageRef());
  assert.deepEqual(createTestTelegramActorRef(), createTestTelegramActorRef());
  assert.deepEqual(createTestTelegramMessageEvent(), createTestTelegramMessageEvent());
  assert.deepEqual(createTestTelegramCallbackEvent(), createTestTelegramCallbackEvent());
  assert.deepEqual(createTestTelegramSystemEvent(), createTestTelegramSystemEvent());
});

test('unknown raw provider fields supplied by JavaScript callers are not copied into generated events', () => {
  const unsafeOverrides = {
    rawUpdate: { update_id: 1 },
    telegramUpdate: { update_id: 1 },
    rawMessage: { text: '/start' },
    rawCallback: { data: 'unsafe' },
    provider: { name: 'telegram' },
  };

  const messageEvent = createTestTelegramMessageEvent({
    ...unsafeOverrides,
    text: 'safe text survives',
  });
  const callbackEvent = createTestTelegramCallbackEvent({
    ...unsafeOverrides,
    callbackPayload: 'safe-opaque-payload',
  });
  const systemEvent = createTestTelegramSystemEvent(unsafeOverrides);

  assert.equal(messageEvent.text, 'safe text survives');
  assert.equal(callbackEvent.callbackPayload, 'safe-opaque-payload');
  assertNoUnsafeGeneratedFields(messageEvent);
  assertNoUnsafeGeneratedFields(callbackEvent);
  assertNoUnsafeGeneratedFields(systemEvent);
});
