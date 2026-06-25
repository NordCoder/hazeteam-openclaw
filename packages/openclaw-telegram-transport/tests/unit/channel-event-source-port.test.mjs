import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSafeChannelEventSourceJson,
  normalizeChannelEventSourceInput,
} from '../../dist/channel-event-source.js';

function dryRunConfig() {
  return {
    profile: 'dry-run',
    providers: {
      telegram: {
        mode: 'dry-run',
        transportRef: 'transport:telegram:unit-test',
      },
      openclaw: {
        enabled: false,
      },
    },
  };
}

function encoded(value) {
  return JSON.stringify(value);
}

function assertJsonSerializable(value) {
  assert.deepEqual(JSON.parse(encoded(value)), value);
}

function assertNoLeak(value, protectedTerms) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');

  for (const term of protectedTerms) {
    assert.equal(output.includes(term), false, `public output leaked ${term}`);
  }
}

const PROTECTED_TERMS = [
  '123456:ABC-private-token',
  'Bearer private-token',
  'https://internal.service.local',
  '/Users/anna/private',
  'rawProviderPayload',
  'providerClientObject',
  'endpoint',
  'authorizationHeader',
  'stackTrace',
];

test('valid fake provider event normalizes into a safe channel event DTO', () => {
  const result = normalizeChannelEventSourceInput({
    transportConfig: dryRunConfig(),
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      eventId: 'event-0001',
      channelId: 'main-channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-0001',
      authorId: 'user-anna',
      text: '/help status',
      topicTitle: 'Coder topic',
      occurredAt: '2026-06-25T09:59:00.000Z',
      receivedAt: '2026-06-25T10:00:00.000Z',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'normalized');
  assert.equal(result.reasonCode, 'normalized-event');
  assert.equal(result.effects, 'none');
  assert.equal(result.willCallRemote, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.transport.mode, 'dry-run');
  assert.ok(result.event);
  assert.equal(result.event.eventKind, 'message');
  assert.equal(result.event.channelRef, 'telegram-channel:main-channel');
  assert.equal(result.event.chatRef, 'telegram-chat:workspace-chat');
  assert.equal(result.event.threadRef, 'telegram-thread:agent-coder');
  assert.equal(result.event.messageRef, 'telegram-message:message-0001');
  assert.equal(result.event.authorRef, 'actor:user-anna');
  assert.equal(result.event.receivedAt, '2026-06-25T10:00:00.000Z');
  assert.equal(result.event.text, '/help status');
  assert.equal(result.event.command?.commandRef, 'telegram-command:help');
  assert.equal(result.event.command?.routingAuthority, false);
  assert.equal(result.event.command?.argumentText, 'status');
  assert.equal(result.event.topicDisplay?.title, 'Coder topic');
  assert.equal(result.event.topicDisplay?.titleRoutingAuthority, false);
  assert.equal(result.event.topicDisplay?.routingKeyAuthority, 'channelRef+chatRef+threadRef');
  assert.equal(result.providerAck.decision, 'acknowledge');
  assert.equal(result.providerAck.reasonCode, 'acknowledged-provider-event');
  assert.equal(result.providerAck.providerCall, 'not-executed');
  assert.equal(result.providerAck.businessProcessingStatus, 'not-started');
  assert.equal(result.providerAck.businessSuccess, false);
  assert.equal(isSafeChannelEventSourceJson(result), true);
  assertJsonSerializable(result);
});

test('unsafe provider-shaped input is redacted and never returned', () => {
  const result = normalizeChannelEventSourceInput({
    transportConfig: dryRunConfig(),
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      eventId: 'event-0002',
      channelId: 'main-channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-0002',
      authorId: 'user-anna',
      text: 'Bearer private-token',
      topicTitle: 'https://internal.service.local/private-topic',
      receivedAt: '2026-06-25T10:00:00.000Z',
      rawProviderPayload: {
        token: '123456:ABC-private-token',
      },
      providerClientObject: true,
      endpoint: 'https://internal.service.local',
      authorizationHeader: 'Bearer private-token',
      localPath: '/Users/anna/private/project',
      stackTrace: 'Error: private stack',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'normalized');
  assert.ok(result.event);
  assert.equal(result.event.text, undefined);
  assert.equal(result.event.topicDisplay, undefined);
  assert.equal(result.event.unsupportedFieldCount, 6);
  assert.equal(result.event.redactedFieldCount, 6);
  assert.ok(result.issues.some((issue) => issue.code === 'unsafe-input-redacted'));
  assert.ok(result.issues.some((issue) => issue.code === 'unsafe-text-redacted'));
  assert.ok(result.issues.some((issue) => issue.code === 'unsafe-topic-title-redacted'));
  assert.equal(isSafeChannelEventSourceJson(result), true);
  assertJsonSerializable(result);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('provider acknowledgement decision is separate from business processing success', () => {
  const result = normalizeChannelEventSourceInput({
    transportConfig: dryRunConfig(),
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      channelId: 'main-channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-ignored',
      ignored: true,
      requiresProviderAck: true,
      receivedAt: '2026-06-25T10:00:00.000Z',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'ignored');
  assert.equal(result.reasonCode, 'ignored-event');
  assert.equal(result.event, undefined);
  assert.equal(result.providerAck.required, true);
  assert.equal(result.providerAck.decision, 'acknowledge');
  assert.equal(result.providerAck.reasonCode, 'acknowledged-provider-event');
  assert.equal(result.providerAck.providerCall, 'not-executed');
  assert.equal(result.providerAck.businessSuccess, false);
  assert.equal(result.providerAck.businessProcessingStatus, 'not-started');
  assertJsonSerializable(result);
});

test('unsupported and malformed events return safe reason codes without unsafe details', () => {
  const unsupported = normalizeChannelEventSourceInput({
    transportConfig: dryRunConfig(),
    event: {
      providerKind: 'telegram',
      eventKind: 'provider-specific-topic-update',
      channelId: 'main-channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-unsupported',
      receivedAt: '2026-06-25T10:00:00.000Z',
    },
  });

  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.status, 'unsupported');
  assert.equal(unsupported.reasonCode, 'unsupported-event-kind');
  assert.equal(unsupported.providerAck.decision, 'acknowledge');
  assertNoLeak(unsupported, PROTECTED_TERMS);

  const malformed = normalizeChannelEventSourceInput({
    transportConfig: dryRunConfig(),
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      channelId: '/Users/anna/private/channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-invalid',
      receivedAt: '2026-06-25T10:00:00.000Z',
    },
  });

  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 'invalid');
  assert.equal(malformed.reasonCode, 'invalid-provider-input');
  assert.equal(malformed.event, undefined);
  assert.equal(malformed.providerAck.decision, 'do-not-acknowledge');
  assertNoLeak(malformed, PROTECTED_TERMS);
});

test('missing config and disabled config block event normalization safely', () => {
  const missing = normalizeChannelEventSourceInput({
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      channelId: 'main-channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-missing-config',
      receivedAt: '2026-06-25T10:00:00.000Z',
    },
  });

  assert.equal(missing.ok, false);
  assert.equal(missing.status, 'ignored');
  assert.equal(missing.reasonCode, 'missing-transport-config');
  assert.equal(missing.transport.mode, 'missing');
  assert.equal(missing.event, undefined);
  assert.equal(missing.providerAck.decision, 'do-not-acknowledge');
  assertJsonSerializable(missing);

  const disabled = normalizeChannelEventSourceInput({
    transportConfig: {
      profile: 'test',
      providers: {
        telegram: {
          enabled: false,
        },
        openclaw: {
          enabled: false,
        },
      },
    },
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      channelId: 'main-channel',
      chatId: 'workspace-chat',
      threadId: 'agent-coder',
      messageId: 'message-disabled',
      receivedAt: '2026-06-25T10:00:00.000Z',
    },
  });

  assert.equal(disabled.ok, false);
  assert.equal(disabled.status, 'ignored');
  assert.equal(disabled.reasonCode, 'ignored-provider-disabled');
  assert.equal(disabled.transport.mode, 'disabled');
  assert.equal(disabled.transport.readiness, 'disabled');
  assert.equal(disabled.event, undefined);
  assert.equal(disabled.providerAck.decision, 'do-not-acknowledge');
  assertJsonSerializable(disabled);
  assertNoLeak(disabled, PROTECTED_TERMS);
});
