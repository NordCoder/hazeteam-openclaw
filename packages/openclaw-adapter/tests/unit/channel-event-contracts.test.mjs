import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationRef,
  createAdapterRawDebugRef,
  isOpenClawTelegramCallbackEvent,
  isOpenClawTelegramMessageEvent,
  isOpenClawTelegramSystemEvent,
} from '../../dist/contracts/index.js';

const channelId = 'oc-channel:prod-router';
const chatId = 'telegram-chat:-1001234567890';
const messageThreadId = 'telegram-topic:42';
const messageId = 'telegram-message:9001';

const topicRef = Object.freeze({
  channelId,
  chatId,
  messageThreadId,
  topicName: 'Coder topic',
});

const channelRef = Object.freeze({
  channelId,
});

const actor = Object.freeze({
  actorRef: createActorRef('telegram-user-42'),
  displayName: 'Ada',
  username: 'ada-dev',
});

const commonEventFields = Object.freeze({
  operationRef: createAdapterOperationRef('op-1'),
  correlationRef: createAdapterCorrelationRef('corr-1'),
  channelRef,
  topicRef,
  actor,
  occurredAt: '2026-06-22T18:00:00.000Z',
  receivedAt: '2026-06-22T18:00:01.000Z',
  detailsRef: createAdapterDetailsRef('details-1'),
  rawDebugRef: createAdapterRawDebugRef('debug-1'),
});

function assertNoUnsafePublicFields(event) {
  for (const forbiddenFieldName of [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawMessage',
    'rawCallback',
    'payloadBody',
    'botToken',
    'apiKey',
    'secret',
    'stack',
    'rawError',
  ]) {
    assert.equal(forbiddenFieldName in event, false, `${forbiddenFieldName} should not be public`);
  }
}

test('message event carries safe normalized message coordinates and attachments', () => {
  const event = Object.freeze({
    ...commonEventFields,
    eventKind: 'message',
    externalMessageRef: {
      channelId,
      chatId,
      messageThreadId,
      messageId,
    },
    text: '/help',
    attachments: [
      {
        kind: 'document',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: 128,
        detailsRef: createAdapterDetailsRef('attachment-1'),
      },
    ],
  });

  assert.equal(event.eventKind, 'message');
  assert.deepEqual(event.externalMessageRef, {
    channelId,
    chatId,
    messageThreadId,
    messageId,
  });
  assert.equal(event.attachments[0].kind, 'document');
  assert.equal(Buffer.isBuffer(event.attachments[0]), false);
  assertNoUnsafePublicFields(event);
});

test('callback event carries opaque callback payload without provider body', () => {
  const event = Object.freeze({
    ...commonEventFields,
    eventKind: 'callback',
    callbackId: 'telegram-callback:cb-1',
    externalMessageRef: {
      channelId,
      chatId,
      messageThreadId,
      messageId,
    },
    callbackPayload: 'hz:token-1',
  });

  assert.equal(event.eventKind, 'callback');
  assert.equal(event.callbackId, 'telegram-callback:cb-1');
  assert.equal(event.callbackPayload, 'hz:token-1');
  assertNoUnsafePublicFields(event);
});

test('system event carries safe topic lifecycle signal', () => {
  const event = Object.freeze({
    ...commonEventFields,
    eventKind: 'system',
    systemEventKind: 'topic-renamed',
  });

  assert.equal(event.eventKind, 'system');
  assert.equal(event.systemEventKind, 'topic-renamed');
  assertNoUnsafePublicFields(event);
});

test('type guard helpers distinguish message, callback, and system events', () => {
  const messageEvent = { ...commonEventFields, eventKind: 'message', externalMessageRef: { channelId, chatId, messageId } };
  const callbackEvent = { ...commonEventFields, eventKind: 'callback', callbackId: 'telegram-callback:cb-1', callbackPayload: 'hz:token-1' };
  const systemEvent = { ...commonEventFields, eventKind: 'system', systemEventKind: 'unknown' };

  assert.equal(isOpenClawTelegramMessageEvent(messageEvent), true);
  assert.equal(isOpenClawTelegramMessageEvent(callbackEvent), false);
  assert.equal(isOpenClawTelegramMessageEvent(null), false);

  assert.equal(isOpenClawTelegramCallbackEvent(callbackEvent), true);
  assert.equal(isOpenClawTelegramCallbackEvent(systemEvent), false);
  assert.equal(isOpenClawTelegramCallbackEvent({}), false);

  assert.equal(isOpenClawTelegramSystemEvent(systemEvent), true);
  assert.equal(isOpenClawTelegramSystemEvent(messageEvent), false);
  assert.equal(isOpenClawTelegramSystemEvent('system'), false);
});

test('topic ref identity is channelId plus chatId plus messageThreadId', () => {
  assert.equal(topicRef.channelId, channelId);
  assert.equal(topicRef.chatId, chatId);
  assert.equal(topicRef.messageThreadId, messageThreadId);
  assert.equal(topicRef.topicName, 'Coder topic');

  const renamedTopicRef = {
    ...topicRef,
    topicName: 'Coder topic renamed',
  };

  assert.deepEqual(
    [renamedTopicRef.channelId, renamedTopicRef.chatId, renamedTopicRef.messageThreadId],
    [topicRef.channelId, topicRef.chatId, topicRef.messageThreadId],
  );
  assert.notEqual(renamedTopicRef.topicName, topicRef.topicName);
});

test('rawDebugRef remains an opaque ref and rejects embedded provider data', () => {
  assert.equal(commonEventFields.rawDebugRef, 'raw-debug:debug-1');
  assert.throws(() => createAdapterRawDebugRef('{"update_id":1}'), /safe value/);
});
