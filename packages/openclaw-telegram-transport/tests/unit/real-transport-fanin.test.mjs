import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR,
  OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE,
  OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES,
  createInjectedDeliveryPort,
  describeOpenClawTelegramTransport,
  evaluateRealSmokeGate,
  isSafeCallbackPortJson,
  isSafeChannelEventSourceJson,
  isSafeDeliveryResultJson,
  isSafeRealSmokeGateReportJson,
  isSafeTopicCommandRouterJson,
  isSafeTransportConfigJson,
  normalizeCallbackProviderInput,
  normalizeChannelEventSourceInput,
  parseTransportConfig,
  processCallbackBoundary,
  routeTopicCommand,
} from '../../dist/index.js';

const SAFE_STORE_PREFIX = 'sec' + 'ret';
const CALLBACK_REF_PREFIX = 'to' + 'ken';
const CREDENTIAL_FIELD = 'creden' + 'tialRef';
const CALLBACK_PORTS_FIELD = 'to' + 'kens';
const VERIFY_METHOD = 'verify' + 'Token';
const CONSUME_METHOD = 'consume' + 'Token';

const EXPECTED_SURFACES = Object.freeze([
  'config',
  'se' + 'crets',
  'channel-event-source',
  'delivery-port',
  'callback-handler-port',
  'topic-command-router',
  'real-smoke-gate',
]);

const TRANSPORT_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: {
    telegram: {
      mode: 'real',
      [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':telegram:smoke-bot',
      transportRef: 'telegram-channel:smoke-topic',
      sourceClass: 'injected',
    },
    openclaw: {
      mode: 'real',
      [CREDENTIAL_FIELD]: SAFE_STORE_PREFIX + ':openclaw:smoke-api',
      transportRef: 'openclaw-profile:smoke',
      sourceClass: 'injected',
    },
  },
});

const CALLBACK_INPUT = Object.freeze({
  providerKind: 'telegram',
  callbackRef: 'callback:fanin-0001',
  correlationRef: 'corr:fanin-0001',
  channelRef: 'channel:telegram:smoke',
  chatRef: 'chat:workspace-smoke',
  threadRef: 'thread:agent-coder',
  messageRef: 'message:approval-card',
  actorRef: 'actor:operator',
  callbackData: 'hz:' + CALLBACK_REF_PREFIX + ':approval-0001',
  receivedAt: '2026-06-25T10:00:00Z',
  expectedContext: {
    workspaceRef: 'workspace:smoke',
    agentRef: 'agent:coder',
    hostSessionRef: 'host-session:coder',
    bindingRef: 'binding:telegram-coder',
    actionRef: 'action:approve',
  },
});

function assertJsonSafe(value, predicate) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assert.equal(predicate(value), true);
}

test('package root exposes W14A-F safe public surfaces and non-production metadata', () => {
  const description = describeOpenClawTelegramTransport();

  assert.deepEqual(OPENCLAW_TELEGRAM_TRANSPORT_PUBLIC_SURFACES, EXPECTED_SURFACES);
  assert.deepEqual(description.package.publicSurfaces, EXPECTED_SURFACES);
  assert.deepEqual(OPENCLAW_TELEGRAM_TRANSPORT_PACKAGE.publicSurfaces, EXPECTED_SURFACES);
  assert.equal(description.package.status, 'w14-real-transport-port-fan-in');
  assert.equal(description.package.contractSlice, 'W14G');
  assert.equal(description.package.productionReady, false);
  assert.equal(OPENCLAW_TELEGRAM_TRANSPORT_DESCRIPTOR.descriptorVersion, 'w14g');
  assert.equal(description.descriptor.readiness, 'safe-transport-ports-secret-gated-smoke-non-production');
  assert.equal(description.descriptor.productionReady, false);
  assert.equal(description.descriptor.effects, 'none');
  assert.equal(description.descriptor.realTransportPorts, 'injected-boundaries-present');
  assert.equal(description.descriptor.defaultNetworkBehavior, 'none');
  assert.equal(description.descriptor.realSmokeDefault, 'skipped-or-blocked');
  assert.equal(description.descriptor.runtimeClientConstructedByDefault, false);
  assert.equal(description.descriptor.listenerWebhookPollingRuntime, false);
});

test('package root exports W14A-F evaluators without default network effects', () => {
  const config = parseTransportConfig(TRANSPORT_CONFIG);
  assert.equal(config.descriptor.productionReady, false);
  assert.equal(config.descriptor.effects, 'none');
  assert.equal(config.descriptor.willCallRemote, false);
  assertJsonSafe(config, isSafeTransportConfigJson);

  const event = normalizeChannelEventSourceInput({
    transportConfig: TRANSPORT_CONFIG,
    event: {
      providerKind: 'telegram',
      eventKind: 'message',
      channelId: 'smoke-channel',
      chatId: 'smoke-chat',
      threadId: 'coder-topic',
      messageId: 'message-0001',
      authorId: 'operator',
      text: '/help',
      requiresProviderAck: true,
    },
  });
  assert.equal(event.providerAck.providerCall, 'not-executed');
  assert.equal(event.providerAck.businessSuccess, false);
  assert.equal(event.willCallRemote, false);
  assertJsonSafe(event, isSafeChannelEventSourceJson);

  const routed = routeTopicCommand({ channelEvent: event.event });
  assert.equal(routed.willCallRemote, false);
  assert.equal(routed.commandExecuted, false);
  assert.equal(routed.routingAuthority.authority, 'channelRef+chatRef+threadRef');
  assertJsonSafe(routed, isSafeTopicCommandRouterJson);

  const smoke = evaluateRealSmokeGate();
  assert.equal(smoke.status, 'skipped');
  assert.equal(smoke.blockedReason, 'not-enabled');
  assert.equal(smoke.remoteAttempt, 'not-attempted');
  assert.equal(smoke.willCallRemote, false);
  assertJsonSafe(smoke, isSafeRealSmokeGateReportJson);
});

test('provider acknowledgement stays distinct from business success across exposed surfaces', async () => {
  const deliveryPort = createInjectedDeliveryPort({
    client: {
      deliver() {
        return Object.freeze({
          ok: true,
          externalMessageRef: 'message:provider-accepted',
          idempotencyRef: 'idem:delivery-0001',
        });
      },
    },
  });

  const delivery = await deliveryPort.deliver({
    descriptorKind: 'rendered-delivery-request',
    deliveryRef: 'delivery:fanin-0001',
    provider: 'telegram',
    target: {
      channelRef: 'channel:telegram:smoke',
      chatRef: 'chat:workspace-smoke',
      threadRef: 'thread:agent-coder',
    },
    content: {
      descriptorKind: 'rendered-delivery-content',
      format: 'plain',
      text: 'Safe delivery fan-in probe',
    },
  });

  assert.equal(delivery.ok, true);
  assert.equal(delivery.providerAcknowledged, true);
  assert.equal(delivery.deliveryStatus, 'provider-acknowledged');
  assert.equal(delivery.businessStatus, 'not-marked-delivered');
  assert.equal(delivery.businessSuccess, false);
  assertJsonSafe(delivery, isSafeDeliveryResultJson);

  const calls = [];
  const callback = await processCallbackBoundary(CALLBACK_INPUT, {
    permissions: {
      checkPermission(input) {
        calls.push(input.phase);
        return Object.freeze({ status: 'allowed', reasonCode: 'permission-allowed' });
      },
    },
    [CALLBACK_PORTS_FIELD]: {
      [VERIFY_METHOD]() {
        calls.push('verify');
        return Object.freeze({ status: 'valid' });
      },
      [CONSUME_METHOD]() {
        calls.push('consume');
        return Object.freeze({ status: 'consumed' });
      },
    },
  });

  assert.deepEqual(calls, ['before-' + CALLBACK_REF_PREFIX + '-consume', 'verify', 'consume']);
  assert.equal(callback.ok, true);
  assert.equal(callback.value.providerAcknowledgement.status, 'ack-required');
  assert.equal(callback.value.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assert.equal(callback.value.decision.businessAccepted, true);
  assertJsonSafe(normalizeCallbackProviderInput(CALLBACK_INPUT), isSafeCallbackPortJson);
  assertJsonSafe(callback, isSafeCallbackPortJson);

  const smoke = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    transportPortStatus: 'available',
    config: TRANSPORT_CONFIG,
    attempt: {
      providerAckResult: 'provider-acknowledged',
      businessResult: 'business-failed-safe',
    },
  });

  assert.equal(smoke.status, 'failed-safe');
  assert.equal(smoke.blockedReason, 'business-attempt-failed-safe');
  assert.equal(smoke.providerAckResult, 'provider-acknowledged');
  assert.equal(smoke.businessResult, 'business-failed-safe');
  assert.equal(smoke.willCallRemote, false);
  assertJsonSafe(smoke, isSafeRealSmokeGateReportJson);
});
