import assert from 'node:assert/strict';
import test from 'node:test';

import {
  composeAdapterCommandIntent,
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterOperationRef,
  createCommandDescriptorSet,
  createTopicBindingSnapshot,
  mapOpenClawTelegramInboundEvent,
} from '../../dist/index.js';

const FIXED_TIME = '2026-06-26T00:00:00.000Z';

function createBinding() {
  return createTopicBindingSnapshot({
    key: {
      workspaceId: 'w17b1-workspace',
      channelId: 'w17b1-channel',
      topicId: 'w17b1-thread',
    },
    status: 'active',
    agentId: 'w17b1-agent',
    sessionId: 'w17b1-session',
    createdAtIso: FIXED_TIME,
    updatedAtIso: FIXED_TIME,
  });
}

function createMessageEvent(text) {
  return {
    eventKind: 'message',
    operationRef: createAdapterOperationRef('w17b1-message'),
    correlationRef: createAdapterCorrelationRef('w17b1-message'),
    channelRef: {
      channelId: 'w17b1-channel',
    },
    topicRef: {
      channelId: 'w17b1-channel',
      chatId: 'w17b1-chat',
      messageThreadId: 'w17b1-thread',
      topicName: 'Display topic name is not routing authority',
    },
    actor: {
      actorRef: createActorRef('w17b1-actor'),
      displayName: 'W17B1 Operator',
    },
    externalMessageRef: {
      channelId: 'w17b1-channel',
      chatId: 'w17b1-chat',
      messageId: 'w17b1-message-id',
      messageThreadId: 'w17b1-thread',
    },
    text,
    occurredAt: FIXED_TIME,
    receivedAt: FIXED_TIME,
  };
}

function createCallbackEvent() {
  return {
    eventKind: 'callback',
    operationRef: createAdapterOperationRef('w17b1-callback'),
    correlationRef: createAdapterCorrelationRef('w17b1-callback'),
    channelRef: {
      channelId: 'w17b1-channel',
    },
    topicRef: {
      channelId: 'w17b1-channel',
      chatId: 'w17b1-chat',
      messageThreadId: 'w17b1-thread',
    },
    actor: {
      actorRef: createActorRef('w17b1-actor'),
    },
    callbackId: 'w17b1-callback-id',
    callbackPayload: 'hz:w17b1-private-callback-reference',
    occurredAt: FIXED_TIME,
    receivedAt: FIXED_TIME,
  };
}

function mapEvent(event) {
  const mapped = mapOpenClawTelegramInboundEvent({
    event,
    binding: createBinding(),
  });

  assert.equal(mapped.ok, true, mapped.ok ? undefined : mapped.error.message);
  return mapped.value;
}

function assertJsonSerializable(value, label) {
  const serialized = JSON.stringify(value);
  assert.notEqual(serialized, undefined, `${label} must be JSON serializable`);
  JSON.parse(serialized);
  return serialized;
}

test('composes a mapped slash command into a canonical safe host-action command intent', () => {
  const mappedEvent = mapEvent(createMessageEvent('/status now'));
  const commandSet = createCommandDescriptorSet({
    commands: [
      {
        name: 'status',
        title: 'Status',
        aliases: ['state'],
        scope: 'topic',
        visibility: 'restricted',
      },
    ],
    defaultCommandName: 'status',
  });

  const intent = composeAdapterCommandIntent({ mappedEvent, commandSet });

  assert.equal(intent.ok, true, intent.ok ? undefined : intent.error.message);
  assert.equal(intent.value.kind, 'adapter-command-intent');
  assert.equal(intent.value.source, 'openclaw-adapter-inbound');
  assert.equal(intent.value.sourceEventKind, 'message');
  assert.equal(intent.value.intentRef, 'operation:w17b1-message');
  assert.equal(intent.value.operationRef, 'operation:w17b1-message');
  assert.equal(intent.value.target, 'host-action');
  assert.equal(intent.value.facadeMethod, 'submitHostAction');
  assert.equal(intent.value.actionKind, 'command');
  assert.equal(intent.value.commandName, 'status');
  assert.equal(intent.value.commandKind, 'adapter.command');
  assert.equal(intent.value.text, 'now');
  assert.equal(intent.value.command.commandName, 'status');
  assert.equal(intent.value.command.argumentsText, 'now');
  assert.equal(intent.value.command.descriptor.name, 'status');
  assert.equal(intent.value.workspaceRef, 'workspace:w17b1-workspace');
  assert.equal(intent.value.agentRef, 'agent:w17b1-agent');
  assert.equal(intent.value.hostSessionRef, 'host-session:w17b1-session');
  assert.equal(intent.value.permissionRequirement.action, 'send-message');
  assert.equal(intent.value.message.sourceMessageRef, 'w17b1-message-id');

  const serialized = assertJsonSerializable(intent, 'command intent result');
  assert.equal(serialized.includes('rawTelegramUpdate'), false);
  assert.equal(serialized.includes('rawProviderPayload'), false);
  assert.equal(serialized.includes('callbackPayload'), false);
  assert.equal(serialized.includes('opaqueCallbackPayload'), false);
});

test('composes a mapped plain inbound message without requiring command descriptors', () => {
  const mappedEvent = mapEvent(createMessageEvent('plain bounded message'));
  const intent = composeAdapterCommandIntent({ mappedEvent });

  assert.equal(intent.ok, true, intent.ok ? undefined : intent.error.message);
  assert.equal(intent.value.sourceEventKind, 'message');
  assert.equal(intent.value.target, 'host-action');
  assert.equal(intent.value.facadeMethod, 'submitHostAction');
  assert.equal(intent.value.actionKind, 'message');
  assert.equal(intent.value.commandName, 'message');
  assert.equal(intent.value.commandKind, 'adapter.message');
  assert.equal(intent.value.text, 'plain bounded message');
  assert.equal(intent.value.message.text, 'plain bounded message');
  assert.equal(Object.hasOwn(intent.value, 'command'), false);
});

test('returns a safe failure for an unknown mapped slash command when descriptors are supplied', () => {
  const mappedEvent = mapEvent(createMessageEvent('/unknown now'));
  const commandSet = createCommandDescriptorSet({
    commands: [
      {
        name: 'status',
        title: 'Status',
      },
    ],
  });

  const intent = composeAdapterCommandIntent({ mappedEvent, commandSet });

  assert.equal(intent.ok, false);
  assert.equal(intent.error.code, 'not-found');
  assert.equal(intent.error.message, 'Command descriptor was not found for inbound command.');
  assert.equal(intent.context.correlationRef, 'correlation:w17b1-message');
  assert.equal(JSON.stringify(intent).includes('/unknown'), false);
});

test('composes callback action intent without exposing callback payload or token reference', () => {
  const mappedEvent = mapEvent(createCallbackEvent());
  const intent = composeAdapterCommandIntent({ mappedEvent });

  assert.equal(intent.ok, true, intent.ok ? undefined : intent.error.message);
  assert.equal(intent.value.sourceEventKind, 'callback');
  assert.equal(intent.value.intentRef, 'operation:w17b1-callback');
  assert.equal(intent.value.target, 'user-intent');
  assert.equal(intent.value.facadeMethod, 'submitUserIntent');
  assert.equal(intent.value.actionKind, 'callback-action');
  assert.equal(intent.value.commandName, 'callback-action');
  assert.equal(intent.value.commandKind, 'adapter.callback-action');
  assert.equal(intent.value.resourceRef, 'w17b1-callback-id');
  assert.equal(intent.value.callback.callbackRef, 'w17b1-callback-id');
  assert.equal(intent.value.callback.permissionRequired, true);
  assert.equal(intent.value.permissionRequirement.action, 'consume-callback');

  const serialized = assertJsonSerializable(intent, 'callback intent result');
  assert.equal(serialized.includes('hz:w17b1-private-callback-reference'), false);
  assert.equal(serialized.includes('tokenRef'), false);
  assert.equal(serialized.includes('callbackPayload'), false);
  assert.equal(serialized.includes('opaqueCallbackPayload'), false);
});
