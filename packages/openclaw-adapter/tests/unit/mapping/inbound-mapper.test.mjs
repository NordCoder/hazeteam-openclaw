import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationRef,
  createAdapterRawDebugRef,
} from '../../../dist/contracts/index.js';
import { createTopicBindingSnapshot } from '../../../dist/binding/index.js';
import { mapOpenClawTelegramInboundEvent } from '../../../dist/mapping/inbound-mapper.js';

const topicRef = Object.freeze({
  channelId: 'channel-main',
  chatId: 'chat-100',
  messageThreadId: 'thread-1',
  topicName: 'Display Only',
});

const externalMessageRef = Object.freeze({
  channelId: 'channel-main',
  chatId: 'chat-100',
  messageThreadId: 'thread-1',
  messageId: 'msg-1',
});

function makeBinding(overrides = {}) {
  return createTopicBindingSnapshot({
    key: {
      workspaceId: 'workspace-a',
      channelId: 'channel-main',
      topicId: 'thread-1',
    },
    status: 'active',
    agentId: 'agent-support',
    sessionId: 'session-1',
    createdAtIso: '2026-06-23T00:00:00.000Z',
    updatedAtIso: '2026-06-23T01:00:00.000Z',
    ...overrides,
  });
}

function makeBaseEvent(overrides = {}) {
  return Object.freeze({
    operationRef: createAdapterOperationRef('op-1'),
    correlationRef: createAdapterCorrelationRef('corr-1'),
    channelRef: { channelId: 'channel-main' },
    topicRef,
    actor: {
      actorRef: createActorRef('telegram-user-42'),
      displayName: ' Ada  Lovelace ',
      username: ' ada_l ',
    },
    occurredAt: '2026-06-23T02:00:00.000Z',
    receivedAt: '2026-06-23T02:00:01.000Z',
    detailsRef: createAdapterDetailsRef('details-1'),
    rawDebugRef: createAdapterRawDebugRef('raw-1'),
    ...overrides,
  });
}

function makeMessageEvent(overrides = {}) {
  return Object.freeze({
    ...makeBaseEvent(),
    eventKind: 'message',
    externalMessageRef,
    text: '  hello\nworld  ',
    attachments: [
      { kind: 'document', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 123 },
    ],
    ...overrides,
  });
}

test('maps a normalized Telegram message through trusted binding into safe host dispatch candidate', () => {
  const result = mapOpenClawTelegramInboundEvent({ event: makeMessageEvent(), binding: makeBinding() });

  assert.equal(result.ok, true);
  assert.equal(result.value.eventKind, 'message');
  assert.equal(result.value.source, 'openclaw-telegram');
  assert.equal(result.value.operationRef, 'operation:op-1');
  assert.equal(result.value.correlationRef, 'correlation:corr-1');
  assert.equal(result.value.routing.workspaceRef, 'workspace:workspace-a');
  assert.equal(result.value.routing.agentRef, 'agent:agent-support');
  assert.equal(result.value.routing.hostSessionRef, 'host-session:session-1');
  assert.deepEqual(result.value.routing.telegramTopic, {
    channelId: 'channel-main',
    chatId: 'chat-100',
    messageThreadId: 'thread-1',
  });
  assert.equal(
    result.value.idempotencyKey,
    'inbound-message:channel-main:chat-100:thread:thread-1:msg-1',
  );
  assert.deepEqual(result.value.dispatch, {
    target: 'host-inbound-action',
    actionKind: 'telegram-message',
    text: 'hello world',
    attachments: [
      { kind: 'document', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 123 },
    ],
    externalMessageRef,
  });
  assert.equal(result.value.permissionRequirement.action, 'send-message');
  assert.equal(result.value.permissionRequirement.resourceKind, 'topic');
  assert.equal(result.context.rawDebugRef, 'raw-debug:raw-1');
  assert.equal(JSON.stringify(result.value).includes('raw-debug:raw-1'), false);
});

test('fails safely when no trusted topic binding is provided', () => {
  const result = mapOpenClawTelegramInboundEvent({ event: makeMessageEvent() });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-missing');
  assert.equal(result.error.retryable, true);
  assert.equal(result.error.correlationRef, 'correlation:corr-1');
});

test('fails safely for inactive or mismatched trusted bindings', () => {
  const inactive = mapOpenClawTelegramInboundEvent({
    event: makeMessageEvent(),
    binding: makeBinding({ status: 'disabled' }),
  });
  assert.equal(inactive.ok, false);
  assert.equal(inactive.error.code, 'conflict');
  assert.equal(inactive.error.message, 'Topic binding is disabled.');

  const mismatched = mapOpenClawTelegramInboundEvent({
    event: makeMessageEvent(),
    binding: makeBinding({ key: { workspaceId: 'workspace-a', channelId: 'channel-main', topicId: 'other-thread' } }),
  });
  assert.equal(mismatched.ok, false);
  assert.equal(mismatched.error.code, 'conflict');
  assert.match(mismatched.error.message, /thread/u);
});

test('maps an opaque Telegram callback without verifying or consuming the token', () => {
  const result = mapOpenClawTelegramInboundEvent({
    binding: makeBinding(),
    event: makeBaseEvent({
      eventKind: 'callback',
      callbackId: 'callback-1',
      callbackPayload: 'hz:token-123',
      externalMessageRef,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.eventKind, 'callback');
  assert.equal(result.value.dispatch.target, 'callback-token');
  assert.equal(result.value.dispatch.opaqueCallbackPayload, 'hz:token-123');
  assert.equal(result.value.dispatch.tokenRef, 'token-123');
  assert.equal(
    result.value.idempotencyKey,
    'callback:channel-main:chat-100:thread:thread-1:callback-1',
  );
  assert.equal(result.value.permissionRequirement.action, 'consume-callback');
});

test('rejects malformed callback payloads as safe mapper errors', () => {
  const result = mapOpenClawTelegramInboundEvent({
    binding: makeBinding(),
    event: makeBaseEvent({
      eventKind: 'callback',
      callbackId: 'callback-1',
      callbackPayload: '{"action":"approve","bot_token":"unsafe"}',
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(JSON.stringify(result).includes('bot_token'), false);
});

test('maps normalized system events into adapter-owned system dispatch DTOs', () => {
  const result = mapOpenClawTelegramInboundEvent({
    binding: makeBinding(),
    event: makeBaseEvent({
      eventKind: 'system',
      systemEventKind: 'topic-renamed',
      externalMessageRef,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.eventKind, 'system');
  assert.deepEqual(result.value.dispatch, {
    target: 'system-event',
    actionKind: 'telegram-system-event',
    systemEventKind: 'topic-renamed',
    externalMessageRef,
  });
});
