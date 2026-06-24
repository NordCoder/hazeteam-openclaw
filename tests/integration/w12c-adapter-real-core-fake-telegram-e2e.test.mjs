import assert from 'node:assert/strict';
import test from 'node:test';

import { ok } from 'hazeteam-core/foundation';
import {
  CORE_INTERACTION_CONTRACT_VERSION,
  assertInMemoryHostSessionBindingStore,
  createCoreInteractionHost,
} from 'hazeteam-core/host';
import {
  createInMemoryPresentationActionTokenStore,
  createInMemoryPresentationOutboxStore,
} from 'hazeteam-core/presentation';

import {
  createTelegramDeliveryPump,
  createTelegramRenderDeliveryRequest,
  createTopicBindingSnapshot,
  mapOpenClawTelegramInboundEvent,
  renderSafePresentationLike,
} from '../../packages/openclaw-adapter/dist/index.js';
import {
  createFakeTelegramDeliverySink,
  createTestTelegramMessageEvent,
} from '../../packages/openclaw-testkit/dist/index.js';

const FIXED_NOW = '2026-06-24T00:00:00.000Z';
const SAFE_INBOUND_EVENT_REF = 'external-event:w12c-inbound';

const FORBIDDEN_PUBLIC_LEAK_TERMS = Object.freeze([
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
  'filesystem',
  'storageRoot',
  'storagePath',
  'webhook',
  'polling',
  'network',
]);

const FAKE_TOPIC = Object.freeze({
  channelId: 'channel-w12c',
  chatId: 'chat-w12c',
  messageThreadId: 'thread-w12c',
  topicName: 'W12C Fake Topic',
});

function fixedNow() {
  return FIXED_NOW;
}

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertObjectLike(value, label) {
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(typeof value, 'object', `${label} must be object-like`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
}

function assertJsonSerializable(value, label) {
  const serialized = JSON.stringify(value);
  assert.notEqual(serialized, undefined, `${label} must be JSON-serializable`);
  JSON.parse(serialized);
  return serialized;
}

function assertNoForbiddenPublicLeakTerms(value, label) {
  const serialized = assertJsonSerializable(value, label);
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const forbiddenTerm of FORBIDDEN_PUBLIC_LEAK_TERMS) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(forbiddenTerm)),
      false,
      `${label} serialized output exposes forbidden term ${forbiddenTerm}`,
    );
  }

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      const normalizedKey = normalizeForLeakScan(key);
      for (const forbiddenTerm of FORBIDDEN_PUBLIC_LEAK_TERMS) {
        assert.notEqual(
          normalizedKey,
          normalizeForLeakScan(forbiddenTerm),
          `${label} exposes forbidden public field ${key}`,
        );
      }

      if (nestedValue !== null && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }
}

function assertNoForbiddenPublicLeakTermsForAll(samples) {
  for (const [label, value] of Object.entries(samples)) {
    assertNoForbiddenPublicLeakTerms(value, label);
  }
}

function createBindingSnapshot() {
  return createTopicBindingSnapshot({
    key: {
      workspaceId: 'w12c-workspace',
      channelId: FAKE_TOPIC.channelId,
      topicId: FAKE_TOPIC.messageThreadId,
    },
    status: 'active',
    agentId: 'w12c-agent',
    sessionId: 'w12c-session',
    createdAtIso: FIXED_NOW,
    updatedAtIso: FIXED_NOW,
    metadata: Object.freeze({ fixture: 'w12c' }),
  });
}

function createFakeTelegramOpenClawInboundMessage() {
  const event = createTestTelegramMessageEvent({
    operationRef: 'operation:w12c-inbound',
    correlationRef: 'correlation:w12c-inbound',
    channelRef: Object.freeze({ channelId: FAKE_TOPIC.channelId }),
    topicRef: FAKE_TOPIC,
    actor: Object.freeze({
      actorRef: 'actor:w12c-user',
      displayName: 'W12C User',
      username: 'w12c_user',
    }),
    occurredAt: FIXED_NOW,
    receivedAt: FIXED_NOW,
    externalMessageRef: Object.freeze({
      channelId: FAKE_TOPIC.channelId,
      chatId: FAKE_TOPIC.chatId,
      messageThreadId: FAKE_TOPIC.messageThreadId,
      messageId: 'message-w12c-inbound',
    }),
    text: '  prove fake Telegram edge through the real core host  ',
    detailsRef: 'details:w12c-inbound',
  });

  return Object.freeze({
    ...event,
    rawTelegramUpdate: Object.freeze({ botToken: 'must-not-cross-boundary' }),
  });
}

function mapFakeInboundEvent(event) {
  const mapped = mapOpenClawTelegramInboundEvent({
    event,
    binding: createBindingSnapshot(),
  });

  assert.equal(mapped.ok, true);
  assert.equal(mapped.value.source, 'openclaw-telegram');
  assert.equal(mapped.value.eventKind, 'message');
  assert.equal(mapped.value.routing.workspaceRef, 'workspace:w12c-workspace');
  assert.equal(mapped.value.routing.agentRef, 'agent:w12c-agent');
  assert.equal(mapped.value.routing.hostSessionRef, 'host-session:w12c-session');
  assert.equal(mapped.value.dispatch.target, 'host-inbound-action');
  assert.equal(mapped.value.dispatch.text, 'prove fake Telegram edge through the real core host');
  assert.equal(JSON.stringify(mapped.value).includes('must-not-cross-boundary'), false);

  return mapped.value;
}

function mapMappedInboundToHostAction(mappedInbound) {
  assert.equal(mappedInbound.dispatch.target, 'host-inbound-action');

  return Object.freeze({
    contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
    kind: 'agent_message',
    actor: Object.freeze({
      id: mappedInbound.actor?.actorRef ?? 'actor:w12c-unknown',
      kind: 'user',
    }),
    agentRef: Object.freeze({ id: mappedInbound.routing.agentRef }),
    workspaceRef: Object.freeze({ id: mappedInbound.routing.workspaceRef }),
    sessionRef: Object.freeze({ id: mappedInbound.routing.hostSessionRef }),
    correlationId: mappedInbound.correlationRef,
    text: mappedInbound.dispatch.text,
    payload: Object.freeze({
      externalEvent: Object.freeze({
        eventRef: SAFE_INBOUND_EVENT_REF,
        eventKind: mappedInbound.eventKind,
      }),
      operationRef: mappedInbound.operationRef,
      externalConversation: Object.freeze({
        channelRef: mappedInbound.routing.telegramTopic.channelId,
        chatRef: mappedInbound.routing.telegramTopic.chatId,
        threadRef: mappedInbound.routing.telegramTopic.messageThreadId,
      }),
      externalMessage: Object.freeze({
        messageRef: mappedInbound.dispatch.externalMessageRef.messageId,
      }),
    }),
  });
}

function createFakeAgentControlHost() {
  const dispatches = [];

  const host = Object.freeze({
    listAgentSurfaces() {
      return ok(Object.freeze([]));
    },
    getAgentSurface(agentRef) {
      return ok(Object.freeze({
        contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
        agentRef: Object.freeze({ id: agentRef.id }),
        workspaceRef: Object.freeze({ id: 'workspace:w12c-workspace' }),
        displayName: 'W12C Real Core Host',
        topicTitle: 'W12C Real Core Host',
        helpText: 'Deterministic W12C fake-edge host surface.',
        availability: 'active',
        commands: Object.freeze([]),
      }));
    },
    dispatch(action) {
      dispatches.push(action);

      return Promise.resolve(ok(Object.freeze({
        contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
        agentRef: action.agentRef,
        workspaceRef: action.workspaceRef ?? Object.freeze({ id: 'workspace:w12c-workspace' }),
        sessionRef: action.sessionRef,
        outboundItems: Object.freeze([
          Object.freeze({
            kind: 'message',
            text: `Accepted fake inbound message: ${action.text}`,
            facts: Object.freeze({
              agentRef: action.agentRef.id,
              workspaceRef: action.workspaceRef?.id ?? 'workspace:w12c-workspace',
              actionKind: action.kind,
              correlationId: action.correlationId,
              inboundEventRef: action.payload?.externalEvent?.eventRef ?? SAFE_INBOUND_EVENT_REF,
            }),
          }),
        ]),
        updatedAt: FIXED_NOW,
        executionContext: Object.freeze({
          contractVersion: CORE_INTERACTION_CONTRACT_VERSION,
          workspaceRef: action.workspaceRef ?? Object.freeze({ id: 'workspace:w12c-workspace' }),
          mode: 'workspace',
          actor: action.actor,
          agentRef: action.agentRef,
          correlationId: action.correlationId,
        }),
      })));
    },
    getDispatches() {
      return Object.freeze([...dispatches]);
    },
  });

  return host;
}

function createRealCoreHostWithFakePorts() {
  const agentControlHost = createFakeAgentControlHost();
  const coreHost = createCoreInteractionHost({
    agentControlHost,
    sessionBindingStore: assertInMemoryHostSessionBindingStore({ now: fixedNow }),
    presentationOutboxStore: createInMemoryPresentationOutboxStore({ now: fixedNow }),
    presentationActionTokenStore: createInMemoryPresentationActionTokenStore({
      now: fixedNow,
      createTokenId: () => 'presentation-action-token:w12c',
    }),
    now: fixedNow,
    correlationId: 'correlation:w12c-real-core-host',
  });

  return Object.freeze({ coreHost, agentControlHost });
}

function createSafePresentationFromCoreResponse(coreResponse) {
  const outboundMessage = coreResponse.value.outboundItems.find((item) => item.kind === 'message');
  assertObjectLike(outboundMessage, 'core outbound message');
  assert.equal(typeof outboundMessage.text, 'string');

  return Object.freeze({
    title: 'W12C fake core response',
    intent: 'success',
    body: Object.freeze([
      Object.freeze({ text: outboundMessage.text }),
      Object.freeze({ text: `Agent ${coreResponse.value.agentRef.id} returned a safe public envelope.`, tone: 'muted' }),
    ]),
  });
}

function createDeliveryTarget(mappedInbound) {
  return Object.freeze({
    channelId: `telegram-channel:${mappedInbound.routing.telegramTopic.channelId}`,
    chatId: `telegram-chat:${mappedInbound.routing.telegramTopic.chatId}`,
    messageThreadId: `telegram-thread:${mappedInbound.routing.telegramTopic.messageThreadId}`,
    workspaceRef: mappedInbound.routing.workspaceRef,
    agentRef: mappedInbound.routing.agentRef,
  });
}

test('W12C maps a fake Telegram edge through the real public core host facade and fake delivery', async () => {
  const event = createFakeTelegramOpenClawInboundMessage();
  const mappedInbound = mapFakeInboundEvent(event);
  const hostAction = mapMappedInboundToHostAction(mappedInbound);

  assertNoForbiddenPublicLeakTermsForAll({
    mappedInbound,
    hostAction,
  });

  const { coreHost, agentControlHost } = createRealCoreHostWithFakePorts();
  assertObjectLike(coreHost, 'core host facade');
  assert.equal(typeof coreHost.submitHostAction, 'function');

  const coreResponse = await coreHost.submitHostAction(hostAction);
  assertObjectLike(coreResponse, 'core response envelope');
  assert.equal(coreResponse.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(coreResponse.ok, true);
  assertObjectLike(coreResponse.value, 'core response value');
  assert.equal(coreResponse.value.contractVersion, CORE_INTERACTION_CONTRACT_VERSION);
  assert.equal(coreResponse.value.agentRef.id, 'agent:w12c-agent');
  assert.equal(coreResponse.value.workspaceRef.id, 'workspace:w12c-workspace');
  assert.equal(coreResponse.value.sessionRef.id, 'host-session:w12c-session');
  assert.equal(coreResponse.value.correlationId, 'correlation:w12c-inbound');
  assert.equal(coreResponse.value.outboundItems.length, 1);
  assert.equal(agentControlHost.getDispatches().length, 1);

  const safePresentation = createSafePresentationFromCoreResponse(coreResponse);
  const renderedFragment = renderSafePresentationLike(safePresentation);
  const deliveryRequest = createTelegramRenderDeliveryRequest({
    deliveryRef: 'operation:w12c-delivery',
    target: createDeliveryTarget(mappedInbound),
    source: safePresentation,
    context: Object.freeze({
      operationRef: 'operation:w12c-delivery',
      correlationRef: mappedInbound.correlationRef,
      workspaceRef: mappedInbound.routing.workspaceRef,
      agentRef: mappedInbound.routing.agentRef,
      actorRef: mappedInbound.actor.actorRef,
      detailsRef: 'details:w12c-delivery',
    }),
    correlationRef: mappedInbound.correlationRef,
  });

  const deliverySink = createFakeTelegramDeliverySink();
  const delivery = createTelegramDeliveryPump({ sink: deliverySink }).deliver(deliveryRequest);

  assert.equal(delivery.ok, true);
  assert.equal(delivery.value.kind, 'delivered');
  assert.equal(delivery.value.sinkCalled, true);
  assert.equal(delivery.value.shouldMarkDelivered, true);
  assert.equal(delivery.value.shouldMarkFailed, false);
  assert.equal(delivery.value.externalMessageRef.messageId, 'telegram-message:fake-1');
  assert.equal(deliverySink.getRequests().length, 1);
  assert.equal(deliverySink.getResults().length, 1);

  assertNoForbiddenPublicLeakTermsForAll({
    coreResponse,
    coreResponseValue: coreResponse.value,
    safePresentation,
    renderedFragment,
    deliveryRequest,
    deliveryDecision: delivery.value,
    fakeDeliveryRequests: deliverySink.getRequests(),
    fakeDeliveryResults: deliverySink.getResults(),
  });
});
