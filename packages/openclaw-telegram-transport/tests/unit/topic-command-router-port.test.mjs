import assert from 'node:assert/strict';
import test from 'node:test';

import { isSafeTopicCommandRouterJson, routeTopicCommand } from '../../dist/topic-command-router-port.js';

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

function binding(overrides = {}) {
  return {
    descriptorKind: 'topic-command-topic-binding',
    bindingRef: 'binding:coder',
    key: {
      channelRef: 'telegram-channel:main-channel',
      chatRef: 'telegram-chat:workspace-chat',
      threadRef: 'telegram-thread:agent-coder',
    },
    target: {
      workspaceRef: 'workspace:test',
      agentRef: 'agent:coder',
      hostSessionRef: 'host-session:test-coder',
      uiDescriptorRef: 'ui:coder',
      domainPackageRef: 'domain:lifeos',
    },
    status: 'active',
    display: {
      displayTitle: 'Coder topic',
      agentDisplayName: 'Coder',
      workspaceDisplayName: 'Workspace',
      routingAuthority: false,
    },
    ...overrides,
  };
}

function event(overrides = {}) {
  return {
    descriptorKind: 'openclaw-telegram-channel-event',
    descriptorVersion: 'w14b',
    providerKind: 'telegram',
    eventKind: 'message',
    eventRef: 'telegram-event:event-0001',
    idempotencyKey: 'channel-event-idem:test-0001',
    channelRef: 'telegram-channel:main-channel',
    chatRef: 'telegram-chat:workspace-chat',
    threadRef: 'telegram-thread:agent-coder',
    messageRef: 'telegram-message:message-0001',
    authorRef: 'actor:user-anna',
    receivedAt: '2026-06-25T10:00:00.000Z',
    command: {
      descriptorKind: 'channel-event-command-projection',
      commandRef: 'telegram-command:status',
      commandName: 'status',
      source: 'explicit-field',
      routingAuthority: false,
      argumentText: 'summary',
    },
    topicDisplay: {
      descriptorKind: 'channel-event-topic-display',
      title: 'Coder topic',
      titleRoutingAuthority: false,
      routingKeyAuthority: 'channelRef+chatRef+threadRef',
    },
    unsupportedFieldCount: 0,
    redactedFieldCount: 0,
    effects: 'none',
    willCallRemote: false,
    jsonSerializable: true,
    ...overrides,
  };
}

function assertJsonSerializable(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
}

function assertNoLeak(value) {
  const output = JSON.stringify(value);
  assert.equal(typeof output, 'string');
  for (const term of PROTECTED_TERMS) {
    assert.equal(output.includes(term), false, `router output leaked ${term}`);
  }
}

test('matched command routes by channelRef plus chatRef plus threadRef', () => {
  const result = routeTopicCommand({ channelEvent: event(), topicBindings: [binding()] });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'routed');
  assert.equal(result.reasonCode, 'routed');
  assert.deepEqual(result.routingAuthority, {
    descriptorKind: 'topic-command-routing-authority',
    channelRef: 'telegram-channel:main-channel',
    chatRef: 'telegram-chat:workspace-chat',
    threadRef: 'telegram-thread:agent-coder',
    authority: 'channelRef+chatRef+threadRef',
  });
  assert.equal(result.intent?.bindingRef, 'binding:coder');
  assert.equal(result.intent?.target.workspaceRef, 'workspace:test');
  assert.equal(result.command?.argumentText, 'summary');
  assert.equal(result.intent?.effects, 'none');
  assert.equal(result.intent?.willCallRemote, false);
  assert.equal(result.intent?.commandExecuted, false);
  assertJsonSerializable(result);
});

test('same topic title but different threadRef does not route', () => {
  const result = routeTopicCommand({
    channelEvent: event({ threadRef: 'telegram-thread:agent-reviewer' }),
    topicBindings: [binding()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'safe-help');
  assert.equal(result.reasonCode, 'unbound-topic');
  assert.equal(result.intent, undefined);
  assert.equal(result.routingAuthority?.threadRef, 'telegram-thread:agent-reviewer');
  assert.equal(result.help?.reasonCode, 'safe-help');
});

test('title-only event does not route', () => {
  const result = routeTopicCommand({
    channelEvent: {
      descriptorKind: 'openclaw-telegram-channel-event',
      descriptorVersion: 'w14b',
      eventKind: 'message',
      command: {
        descriptorKind: 'channel-event-command-projection',
        commandRef: 'telegram-command:status',
        commandName: 'status',
        routingAuthority: false,
      },
      topicDisplay: {
        descriptorKind: 'channel-event-topic-display',
        title: 'Coder topic',
        titleRoutingAuthority: false,
        routingKeyAuthority: 'channelRef+chatRef+threadRef',
      },
    },
    topicBindings: [binding()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'ignored');
  assert.equal(result.reasonCode, 'invalid-safe-event');
  assert.equal(result.routingAuthority, undefined);
  assert.equal(result.intent, undefined);
  assertJsonSerializable(result);
});

test('unknown command returns safe help', () => {
  const result = routeTopicCommand({
    channelEvent: event({
      command: {
        descriptorKind: 'channel-event-command-projection',
        commandRef: 'telegram-command:not_known',
        commandName: 'not_known',
        routingAuthority: false,
      },
    }),
    topicBindings: [binding()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'safe-help');
  assert.equal(result.reasonCode, 'unknown-command');
  assert.equal(result.decisionKind, 'render-safe-help');
  assert.equal(result.intent, undefined);
  assert.equal(result.help?.reasonCode, 'safe-help');
  assert.equal(result.commandExecuted, false);
});

test('unbound topic returns safe help', () => {
  const result = routeTopicCommand({ channelEvent: event(), topicBindings: [] });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'safe-help');
  assert.equal(result.reasonCode, 'unbound-topic');
  assert.equal(result.intent, undefined);
  assert.equal(result.help?.helpKind, 'unbound-topic');
  assert.equal(result.help?.reasonCode, 'safe-help');
});

test('disabled binding does not route', () => {
  const result = routeTopicCommand({
    channelEvent: event(),
    topicBindings: [binding({ status: 'disabled' })],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'ignored');
  assert.equal(result.reasonCode, 'disabled-binding');
  assert.equal(result.intent, undefined);
  assert.equal(result.help?.reasonCode, 'safe-help');
});

test('unsupported event kind does not route', () => {
  const result = routeTopicCommand({
    channelEvent: event({ eventKind: 'callback' }),
    topicBindings: [binding()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'ignored');
  assert.equal(result.reasonCode, 'unsupported-event-kind');
  assert.equal(result.intent, undefined);
});

test('unsafe refs or unsafe command argument text are rejected safely', () => {
  const unsafeRefResult = routeTopicCommand({
    channelEvent: event({ channelRef: '/Users/anna/private/channel' }),
    topicBindings: [binding()],
  });
  assert.equal(unsafeRefResult.ok, false);
  assert.equal(unsafeRefResult.reasonCode, 'invalid-safe-event');
  assert.equal(unsafeRefResult.intent, undefined);
  assertNoLeak(unsafeRefResult);

  const unsafeArgumentResult = routeTopicCommand({
    channelEvent: event({
      command: {
        descriptorKind: 'channel-event-command-projection',
        commandRef: 'telegram-command:status',
        commandName: 'status',
        routingAuthority: false,
        argumentText: 'Bearer private-token',
      },
    }),
    topicBindings: [binding()],
  });
  assert.equal(unsafeArgumentResult.ok, false);
  assert.equal(unsafeArgumentResult.reasonCode, 'invalid-safe-event');
  assert.equal(unsafeArgumentResult.command, undefined);
  assert.equal(unsafeArgumentResult.intent, undefined);
  assertNoLeak(unsafeArgumentResult);
  assertJsonSerializable(unsafeArgumentResult);
});

test('JSON serialization and no-leak output cover router outputs', () => {
  const unsafeEnvelope = routeTopicCommand({
    channelEvent: event({
      command: undefined,
      text: '/actions list',
      rawProviderPayload: { token: '123456:ABC-private-token' },
      providerClientObject: true,
      endpoint: 'https://internal.service.local',
      authorizationHeader: 'Bearer private-token',
      localPath: '/Users/anna/private/project',
      stackTrace: 'Error: private stack',
    }),
    topicBindings: [binding()],
  });

  assert.equal(unsafeEnvelope.ok, false);
  assert.equal(unsafeEnvelope.reasonCode, 'invalid-safe-event');
  assert.equal(unsafeEnvelope.intent, undefined);
  assert.equal(unsafeEnvelope.command, undefined);
  assert.equal(isSafeTopicCommandRouterJson(unsafeEnvelope), true);
  assertJsonSerializable(unsafeEnvelope);
  assertNoLeak(unsafeEnvelope);

  const safeTextResult = routeTopicCommand({
    channelEvent: event({ command: undefined, text: '/actions list' }),
    topicBindings: [binding()],
  });

  assert.equal(safeTextResult.ok, true);
  assert.equal(safeTextResult.status, 'routed');
  assert.equal(safeTextResult.command?.commandName, 'actions');
  assert.equal(safeTextResult.command?.argumentText, 'list');
  assert.equal(isSafeTopicCommandRouterJson(safeTextResult), true);
  assertJsonSerializable(safeTextResult);
  assertNoLeak(safeTextResult);
});
