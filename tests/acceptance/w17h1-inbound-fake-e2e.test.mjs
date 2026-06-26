import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSafeTelegramInboundTopicRouteJson,
  prepareTelegramInboundTopicRoute,
} from '../../packages/openclaw-telegram-transport/dist/topic-routing/telegram-inbound-topic-route.js';
import {
  composeAdapterCommandIntent,
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterOperationRef,
  createCommandDescriptorSet,
  createTopicBindingSnapshot,
  mapOpenClawTelegramInboundEvent,
} from '../../packages/openclaw-adapter/dist/index.js';
import { createAdapterCommandFacade } from '../../packages/openclaw-adapter/dist/commands/command-facade.js';

const FIXED_TIME = '2026-06-26T00:00:00.000Z';
const WORKSPACE_ID = 'w17h1-workspace';
const AGENT_ID = 'w17h1-agent';
const SESSION_ID = 'w17h1-session';
const CHANNEL_ID = 'acceptance-channel';
const CHAT_ID = 'acceptance-chat';
const THREAD_ID = 'agent-coder';
const MESSAGE_ID = 'acceptance-message';

const PROTECTED_TERMS = Object.freeze([
  'rawProviderPayload',
  'rawCallbackPayload',
  'providerClientObject',
  'sdkClient',
  'clientHandle',
  'runtimeHandle',
  'endpoint',
  'filesystemPath',
  'stackTrace',
  'authorizationHeader',
  'callbackData',
  '123456:ABC-private-token',
  'Bearer private-token',
  'hz:raw-callback-token',
  'https://internal.service.local',
  '/Users/anna/private/project',
  '[object Runtime]',
  '[object Client]',
  'Error: private stack frame',
]);

function providerMessage() {
  return Object.freeze({
    providerKind: 'telegram',
    eventKind: 'message',
    updateId: 'update-w17h1',
    channelId: CHANNEL_ID,
    chatId: CHAT_ID,
    messageThreadId: THREAD_ID,
    messageId: MESSAGE_ID,
    actorId: 'acceptance-actor',
    text: '/status safe-summary',
    topicTitle: 'Coder topic display only',
    receivedAt: FIXED_TIME,
    occurredAt: FIXED_TIME,
    rawProviderPayload: Object.freeze({ value: '123456:ABC-private-token' }),
    rawCallbackPayload: 'hz:raw-callback-token',
    providerClientObject: 'provider object',
    sdkClient: '[object Client]',
    clientHandle: '[object Client]',
    runtimeHandle: '[object Runtime]',
    endpoint: 'https://internal.service.local',
    filesystemPath: '/Users/anna/private/project',
    stackTrace: 'Error: private stack frame',
    authorizationHeader: 'Bearer private-token',
    callbackData: 'hz:raw-callback-token',
  });
}

function telegramTopicBinding() {
  return Object.freeze({
    descriptorKind: 'w17c-telegram-topic-binding',
    bindingRef: 'binding:w17h1-coder',
    key: Object.freeze({
      channelRef: 'telegram-channel:' + CHANNEL_ID,
      chatRef: 'telegram-chat:' + CHAT_ID,
      threadRef: 'telegram-thread:' + THREAD_ID,
    }),
    target: Object.freeze({
      workspaceRef: 'workspace:' + WORKSPACE_ID,
      agentRef: 'agent:' + AGENT_ID,
      hostSessionRef: 'host-session:' + SESSION_ID,
      uiDescriptorRef: 'ui:w17h1-coder',
    }),
    status: 'active',
    display: Object.freeze({
      displayTitle: 'Coder topic display only',
      routingAuthority: false,
    }),
  });
}

function commandDescriptors() {
  return Object.freeze([
    Object.freeze({
      descriptorKind: 'w17c-telegram-command-descriptor',
      commandRef: 'telegram-command:status',
      commandName: 'status',
      namespace: 'workspace',
      intentKind: 'workspace.status',
      requiresBinding: true,
      enabled: true,
    }),
  ]);
}

function adapterBinding() {
  return createTopicBindingSnapshot({
    key: {
      workspaceId: WORKSPACE_ID,
      channelId: 'telegram-channel:' + CHANNEL_ID,
      topicId: 'telegram-thread:' + THREAD_ID,
    },
    status: 'active',
    agentId: AGENT_ID,
    sessionId: SESSION_ID,
    createdAtIso: FIXED_TIME,
    updatedAtIso: FIXED_TIME,
  });
}

function adapterMessageEventFromRoute(routeResult) {
  const safeEvent = routeResult.channelEvent;
  assert.ok(safeEvent, 'safe channel event must be available after routing');
  assert.equal(safeEvent.eventKind, 'message');

  return Object.freeze({
    eventKind: 'message',
    operationRef: createAdapterOperationRef('w17h1-inbound-message'),
    correlationRef: createAdapterCorrelationRef('w17h1-inbound-message'),
    channelRef: Object.freeze({
      channelId: safeEvent.channelRef,
    }),
    topicRef: Object.freeze({
      channelId: safeEvent.channelRef,
      chatId: safeEvent.chatRef,
      messageThreadId: safeEvent.threadRef,
      topicName: safeEvent.topicDisplay?.title,
    }),
    actor: Object.freeze({
      actorRef: createActorRef('w17h1-actor'),
      displayName: 'W17H1 Operator',
    }),
    externalMessageRef: Object.freeze({
      channelId: safeEvent.channelRef,
      chatId: safeEvent.chatRef,
      messageThreadId: safeEvent.threadRef,
      messageId: safeEvent.messageRef,
    }),
    text: safeEvent.textIntent?.text,
    occurredAt: FIXED_TIME,
    receivedAt: FIXED_TIME,
  });
}

function adapterCommandSet() {
  return createCommandDescriptorSet({
    commands: [
      {
        name: 'status',
        title: 'Status',
        scope: 'topic',
        visibility: 'restricted',
      },
    ],
    defaultCommandName: 'status',
  });
}

function assertJsonSerializable(value, label) {
  const serialized = JSON.stringify(value);
  assert.equal(typeof serialized, 'string', label + ' must stringify to JSON');
  assert.doesNotThrow(() => JSON.parse(serialized), label + ' must parse from JSON');
  return serialized;
}

function assertNoLeak(value, label) {
  const serialized = assertJsonSerializable(value, label);
  for (const term of PROTECTED_TERMS) {
    assert.equal(serialized.includes(term), false, label + ' leaked ' + term);
  }
}

test('W17H1 inbound fake E2E routes a quarantined provider update into a safe adapter command intent', async () => {
  const route = prepareTelegramInboundTopicRoute({
    providerUpdate: providerMessage(),
    topicBindings: [telegramTopicBinding()],
    commandDescriptors: commandDescriptors(),
  });

  assert.equal(route.ok, true);
  assert.equal(route.status, 'routed');
  assert.equal(route.reasonCode, 'routed');
  assert.equal(route.decisionKind, 'prepare-command-intent');
  assert.equal(route.effects, 'none');
  assert.equal(route.willCallRemote, false);
  assert.equal(route.commandExecuted, false);
  assert.equal(route.productionReady, false);
  assert.equal(route.readinessClaim, 'local-inbound-topic-route-evidence-only');
  assert.equal(route.routingAuthority?.authority, 'channelRef+chatRef+threadRef');
  assert.equal(route.channelEvent?.descriptorKind, 'w17c-safe-telegram-channel-event');
  assert.equal(route.channelEvent?.topicDisplay?.titleRoutingAuthority, false);
  assert.equal(route.channelEvent?.textIntent?.commandName, 'status');
  assert.equal(route.channelEvent?.textIntent?.argumentText, 'safe-summary');
  assert.equal(route.intent?.descriptorKind, 'w17c-telegram-command-intent');
  assert.equal(route.intent?.commandName, 'status');
  assert.equal(route.intent?.argumentText, 'safe-summary');
  assert.equal(route.intent?.target.workspaceRef, 'workspace:' + WORKSPACE_ID);
  assert.ok((route.channelEvent?.unsupportedFieldCount ?? 0) >= 8);
  assert.ok((route.channelEvent?.redactedFieldCount ?? 0) >= 7);
  assert.ok(route.issues.some((issue) => issue.code === 'unsafe-field-redacted'));
  assert.equal(isSafeTelegramInboundTopicRouteJson(route), true);
  assertNoLeak(route, 'telegram inbound route result');

  const mapped = mapOpenClawTelegramInboundEvent({
    event: adapterMessageEventFromRoute(route),
    binding: adapterBinding(),
  });

  assert.equal(mapped.ok, true, mapped.ok ? undefined : mapped.error.message);
  assert.equal(mapped.value.source, 'openclaw-telegram');
  assert.equal(mapped.value.eventKind, 'message');
  assert.equal(mapped.value.dispatch.target, 'host-inbound-action');
  assert.equal(mapped.value.dispatch.actionKind, 'telegram-message');
  assert.equal(mapped.value.dispatch.text, '/status safe-summary');
  assert.equal(mapped.value.routing.workspaceRef, 'workspace:' + WORKSPACE_ID);
  assert.equal(mapped.value.routing.agentRef, 'agent:' + AGENT_ID);
  assert.equal(mapped.value.routing.hostSessionRef, 'host-session:' + SESSION_ID);
  assertNoLeak(mapped, 'adapter mapped inbound event');

  const intent = composeAdapterCommandIntent({
    mappedEvent: mapped.value,
    commandSet: adapterCommandSet(),
  });

  assert.equal(intent.ok, true, intent.ok ? undefined : intent.error.message);
  assert.equal(intent.value.kind, 'adapter-command-intent');
  assert.equal(intent.value.source, 'openclaw-adapter-inbound');
  assert.equal(intent.value.sourceEventKind, 'message');
  assert.equal(intent.value.target, 'host-action');
  assert.equal(intent.value.facadeMethod, 'submitHostAction');
  assert.equal(intent.value.actionKind, 'command');
  assert.equal(intent.value.commandName, 'status');
  assert.equal(intent.value.commandKind, 'adapter.command');
  assert.equal(intent.value.text, 'safe-summary');
  assert.equal(intent.value.command.commandName, 'status');
  assert.equal(intent.value.command.argumentsText, 'safe-summary');
  assert.equal(intent.value.command.descriptor.name, 'status');
  assert.equal(intent.value.permissionRequirement.action, 'send-message');
  assertNoLeak(intent, 'adapter command intent result');

  const hostFacadeCalls = [];
  const hostFacade = Object.freeze({
    submitHostAction(input) {
      hostFacadeCalls.push(input);
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          status: 'accepted',
          resultRef: 'core-result:w17h1-inbound',
          correlationRef: input.correlationRef,
        }),
      });
    },
    submitUserIntent() {
      throw new Error('wrong facade method');
    },
  });
  const commandFacade = createAdapterCommandFacade({ facade: hostFacade });

  assert.equal(commandFacade.getReadiness().status, 'ready');
  const dispatched = await commandFacade.submit(intent.value);

  assert.equal(dispatched.ok, true, dispatched.ok ? undefined : dispatched.error.message);
  assert.equal(dispatched.value.kind, 'adapter-command-result');
  assert.equal(dispatched.value.status, 'accepted');
  assert.equal(dispatched.value.intentRef, 'operation:w17h1-inbound-message');
  assert.equal(dispatched.value.target, 'host-action');
  assert.equal(dispatched.value.commandName, 'status');
  assert.equal(dispatched.value.correlationRef, 'correlation:w17h1-inbound-message');
  assert.equal(hostFacadeCalls.length, 1);
  assert.equal(hostFacadeCalls[0].kind, 'adapter-command-intent');
  assert.equal(hostFacadeCalls[0].target, 'host-action');
  assert.equal(hostFacadeCalls[0].commandName, 'status');
  assert.equal(hostFacadeCalls[0].text, 'safe-summary');
  assert.equal(hostFacadeCalls[0].workspaceRef, 'workspace:' + WORKSPACE_ID);
  assertNoLeak(hostFacadeCalls[0], 'adapter command facade input');
  assertNoLeak(dispatched, 'adapter command facade result');

  assertNoLeak(
    {
      route,
      mapped,
      intent,
      dispatched,
      hostFacadeInput: hostFacadeCalls[0],
    },
    'combined inbound fake E2E public output',
  );
});
