import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSafeTelegramInboundTopicRouteJson,
  prepareTelegramInboundTopicRoute,
} from '../../dist/topic-routing/telegram-inbound-topic-route.js';

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
  'approve:secret-token',
];

function providerMessage(overrides = {}) {
  return {
    providerKind: 'telegram',
    eventKind: 'message',
    updateId: 'update-0001',
    channelId: 'main-channel',
    chatId: '-100123456',
    messageThreadId: 'agent-coder',
    messageId: 'message-0001',
    actorId: 'user-anna',
    text: '/status summary',
    topicTitle: 'Coder topic',
    receivedAt: '2026-06-25T10:00:00.000Z',
    ...overrides,
  };
}

function binding(overrides = {}) {
  return {
    descriptorKind: 'w17c-telegram-topic-binding',
    bindingRef: 'binding:coder',
    key: {
      channelRef: 'telegram-channel:main-channel',
      chatRef: 'telegram-chat:100123456',
      threadRef: 'telegram-thread:agent-coder',
    },
    target: {
      workspaceRef: 'workspace:test',
      agentRef: 'agent:coder',
      hostSessionRef: 'host-session:test-coder',
      uiDescriptorRef: 'ui:coder',
    },
    status: 'active',
    display: {
      displayTitle: 'Coder topic',
      routingAuthority: false,
    },
    ...overrides,
  };
}

function encoded(value) {
  return JSON.stringify(value);
}

function assertJsonSerializable(value) {
  assert.deepEqual(JSON.parse(encoded(value)), value);
}

function assertNoLeak(value) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');
  for (const term of PROTECTED_TERMS) {
    assert.equal(output.includes(term), false, `public output leaked ${term}`);
  }
}

test('provider-shaped message is quarantined into a safe event and routed by channel chat thread refs', () => {
  const result = prepareTelegramInboundTopicRoute({ providerUpdate: providerMessage(), topicBindings: [binding()] });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'routed');
  assert.equal(result.reasonCode, 'routed');
  assert.equal(result.decisionKind, 'prepare-command-intent');
  assert.equal(result.effects, 'none');
  assert.equal(result.willCallRemote, false);
  assert.equal(result.commandExecuted, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.readinessClaim, 'local-inbound-topic-route-evidence-only');

  assert.deepEqual(result.routingAuthority, {
    descriptorKind: 'w17c-telegram-routing-authority',
    channelRef: 'telegram-channel:main-channel',
    chatRef: 'telegram-chat:100123456',
    threadRef: 'telegram-thread:agent-coder',
    authority: 'channelRef+chatRef+threadRef',
  });
  assert.equal(result.channelEvent?.descriptorKind, 'w17c-safe-telegram-channel-event');
  assert.equal(result.channelEvent?.textIntent?.commandName, 'status');
  assert.equal(result.channelEvent?.textIntent?.argumentText, 'summary');
  assert.equal(result.channelEvent?.topicDisplay?.title, 'Coder topic');
  assert.equal(result.channelEvent?.topicDisplay?.titleRoutingAuthority, false);
  assert.equal(result.channelEvent?.topicDisplay?.routingKeyAuthority, 'channelRef+chatRef+threadRef');
  assert.equal(result.intent?.bindingRef, 'binding:coder');
  assert.equal(result.intent?.target.workspaceRef, 'workspace:test');
  assert.equal(result.intent?.effects, 'none');
  assert.equal(result.intent?.willCallRemote, false);
  assert.equal(result.intent?.commandExecuted, false);
  assert.equal(isSafeTelegramInboundTopicRouteJson(result), true);
  assertJsonSerializable(result);
  assertNoLeak(result);
});

test('topic title spoofing does not change routing authority', () => {
  const result = prepareTelegramInboundTopicRoute({
    providerUpdate: providerMessage({ messageThreadId: 'agent-reviewer', topicTitle: 'Coder topic' }),
    topicBindings: [binding()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'safe-help');
  assert.equal(result.reasonCode, 'unbound-topic');
  assert.equal(result.intent, undefined);
  assert.equal(result.routingAuthority?.threadRef, 'telegram-thread:agent-reviewer');
  assert.equal(result.channelEvent?.topicDisplay?.title, 'Coder topic');
  assert.equal(result.channelEvent?.topicDisplay?.titleRoutingAuthority, false);
  assertNoLeak(result);
});

test('callback events are forwarded to callback path without permission or token consumption', () => {
  const result = prepareTelegramInboundTopicRoute({
    providerUpdate: providerMessage({
      eventKind: 'callback_query',
      updateId: 'callback-update-0001',
      messageId: 'message-0002',
      text: undefined,
      callbackId: 'callback-0001',
      callbackData: 'approve:secret-token',
    }),
    topicBindings: [binding()],
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'callback-forwarded');
  assert.equal(result.reasonCode, 'callback-forwarded');
  assert.equal(result.decisionKind, 'forward-callback-path');
  assert.equal(result.intent, undefined);
  assert.equal(result.callbackPath?.callbackRef, 'telegram-callback:callback-0001');
  assert.match(result.callbackPath?.callbackTokenRef ?? '', /^callback-token:[a-f0-9]{8}$/u);
  assert.equal(result.callbackPath?.permissionChecked, false);
  assert.equal(result.callbackPath?.tokenConsumed, false);
  assert.equal(result.channelEvent?.callbackIntent?.permissionChecked, false);
  assert.equal(result.channelEvent?.callbackIntent?.tokenConsumed, false);
  assertNoLeak(result);
  assertJsonSerializable(result);
});

test('duplicate idempotency refs are not routed twice', () => {
  const first = prepareTelegramInboundTopicRoute({ providerUpdate: providerMessage(), topicBindings: [binding()] });
  assert.equal(first.ok, true);
  assert.ok(first.channelEvent);

  const duplicate = prepareTelegramInboundTopicRoute({
    providerUpdate: providerMessage(),
    topicBindings: [binding()],
    seenIdempotencyRefs: [first.channelEvent.idempotencyRef],
  });

  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.status, 'already-processed');
  assert.equal(duplicate.reasonCode, 'already-processed');
  assert.equal(duplicate.decisionKind, 'deduplicate-safely');
  assert.equal(duplicate.intent, undefined);
  assertNoLeak(duplicate);
});

test('unsafe provider-shaped input is rejected or redacted without echoing protected material', () => {
  const result = prepareTelegramInboundTopicRoute({
    providerUpdate: providerMessage({
      channelId: 'https://internal.service.local/channel',
      text: 'Bearer private-token',
      topicTitle: '/Users/anna/private/topic',
      rawProviderPayload: { token: '123456:ABC-private-token' },
      providerClientObject: true,
      endpoint: 'https://internal.service.local',
      authorizationHeader: 'Bearer private-token',
      localPath: '/Users/anna/private/project',
      stackTrace: 'Error: private stack',
    }),
    topicBindings: [binding()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'rejected');
  assert.equal(result.reasonCode, 'invalid-provider-input');
  assert.equal(result.channelEvent, undefined);
  assert.equal(result.intent, undefined);
  assert.ok(result.issues.some((issue) => issue.code === 'unsafe-field-redacted'));
  assert.equal(isSafeTelegramInboundTopicRouteJson(result), true);
  assertJsonSerializable(result);
  assertNoLeak(result);
});

test('unknown, unbound, disabled, and malformed commands stay safe and local', () => {
  const unknown = prepareTelegramInboundTopicRoute({
    providerUpdate: providerMessage({ text: '/unknown value' }),
    topicBindings: [binding()],
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.status, 'safe-help');
  assert.equal(unknown.reasonCode, 'unknown-command');
  assert.equal(unknown.intent, undefined);

  const unbound = prepareTelegramInboundTopicRoute({ providerUpdate: providerMessage(), topicBindings: [] });
  assert.equal(unbound.ok, false);
  assert.equal(unbound.status, 'safe-help');
  assert.equal(unbound.reasonCode, 'unbound-topic');
  assert.equal(unbound.intent, undefined);

  const disabled = prepareTelegramInboundTopicRoute({ providerUpdate: providerMessage(), topicBindings: [binding({ status: 'disabled' })] });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.status, 'ignored');
  assert.equal(disabled.reasonCode, 'disabled-binding');
  assert.equal(disabled.intent, undefined);

  const malformed = prepareTelegramInboundTopicRoute({ providerUpdate: providerMessage({ text: '/9bad' }), topicBindings: [binding()] });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 'rejected');
  assert.equal(malformed.reasonCode, 'malformed-command');
  assert.equal(malformed.intent, undefined);

  for (const result of [unknown, unbound, disabled, malformed]) {
    assert.equal(result.effects, 'none');
    assert.equal(result.willCallRemote, false);
    assert.equal(result.commandExecuted, false);
    assertNoLeak(result);
    assertJsonSerializable(result);
  }
});
