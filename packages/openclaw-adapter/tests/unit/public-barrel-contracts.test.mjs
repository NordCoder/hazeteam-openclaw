import assert from 'node:assert/strict';
import test from 'node:test';

import * as approvals from '../../dist/approvals/index.js';
import * as binding from '../../dist/binding/index.js';
import * as callbacks from '../../dist/callbacks/index.js';
import * as commands from '../../dist/commands/index.js';
import * as contracts from '../../dist/contracts/index.js';
import * as delivery from '../../dist/delivery/index.js';
import * as host from '../../dist/host/index.js';
import * as mapping from '../../dist/mapping/index.js';
import * as openclaw from '../../dist/openclaw/index.js';
import * as openclawApproval from '../../dist/openclaw/approval/index.js';
import * as openclawChannel from '../../dist/openclaw/channel/index.js';
import * as openclawDelivery from '../../dist/openclaw/delivery/index.js';
import * as openclawRuntime from '../../dist/openclaw/runtime/index.js';
import * as permissions from '../../dist/permissions/index.js';
import * as rendering from '../../dist/rendering/index.js';
import * as root from '../../dist/index.js';
import * as runtime from '../../dist/runtime/index.js';
import * as storage from '../../dist/storage/index.js';
import * as storageCallbacks from '../../dist/storage/callbacks/index.js';
import * as storageCore from '../../dist/storage/core/index.js';
import * as storageDelivery from '../../dist/storage/delivery/index.js';
import * as storageIdempotency from '../../dist/storage/idempotency/index.js';
import * as storageTopicBinding from '../../dist/storage/topic-binding/index.js';

const expectedContractRuntimeExports = [
  'adapterErr',
  'adapterOk',
  'allowPermission',
  'createActorRef',
  'createAdapterCorrelationRef',
  'createAdapterDetailsRef',
  'createAdapterIdempotencyKey',
  'createAdapterOperationContext',
  'createAdapterOperationRef',
  'createAdapterRawDebugRef',
  'createAdapterReadinessCheck',
  'createAdapterSafeError',
  'createAgentRef',
  'createCallbackIdempotencyKey',
  'createDeliveryAttemptIdempotencyKey',
  'createInboundMessageIdempotencyKey',
  'createOpenClawAdapterRef',
  'createTelegramActionButton',
  'createTelegramActionButtonPayload',
  'createTelegramDeliverySafeError',
  'createTelegramExternalMessageRef',
  'createWorkspaceRef',
  'denyPermission',
  'isAdapterErr',
  'isAdapterIdempotencyKey',
  'isAdapterOk',
  'isOpenClawAdapterRef',
  'isOpenClawTelegramCallbackEvent',
  'isOpenClawTelegramMessageEvent',
  'isOpenClawTelegramSystemEvent',
  'isPermissionAllowed',
  'isPermissionDenied',
  'isTelegramActionButtonPayload',
  'parseOpenClawAdapterRef',
  'summarizeAdapterReadiness',
];

const expectedBindingRuntimeExports = [
  'cloneTopicBindingSnapshot',
  'createInMemoryTopicBindingStore',
  'createTopicBindingKey',
  'createTopicBindingSnapshot',
  'isTopicBindingStatus',
  'serializeTopicBindingKey',
];

const expectedCommandRuntimeExports = [
  'createCommandDescriptor',
  'createCommandDescriptorSet',
  'createTelegramActionButtonDescriptor',
  'createTelegramButtonGroupDescriptor',
  'createTelegramCardDescriptor',
  'createTelegramTextBlock',
  'findCommandDescriptor',
  'isCommandDescriptor',
  'isTelegramCardDescriptor',
];

const expectedMappingRuntimeExports = [
  'getInboundMappingRawDebugRef',
  'mapOpenClawTelegramInboundEvent',
];

const expectedRenderingRuntimeExports = [
  'createTelegramRenderDeliveryRequest',
  'createTelegramRenderFragment',
  'isTelegramRenderFragment',
  'renderSafePresentationLike',
  'renderTelegramCardDescriptor',
  'renderTelegramInput',
];

const expectedHostRuntimeExports = [
  'ADAPTER_CORE_FACADE_METHOD_NAMES',
  'REQUIRED_ADAPTER_CORE_FACADE_METHOD_NAMES',
  'REQUIRED_ADAPTER_CORE_HOST_PORT_NAMES',
  'OPTIONAL_ADAPTER_CORE_HOST_PORT_NAMES',
  'ADAPTER_CORE_HOST_PORT_NAMES',
  'createAdapterCoreHostFactory',
  'getAvailableAdapterCoreFacadeMethods',
  'getConfiguredAdapterCoreHostPorts',
  'getMissingRequiredAdapterCoreFacadeMethods',
  'getMissingRequiredAdapterCoreHostPorts',
  'summarizeAdapterCoreHostReadiness',
];

const expectedPermissionRuntimeExports = [
  'PERMISSION_BEFORE_TOKEN_CONSUME_RULE',
  'createStaticPermissionEvaluator',
  'evaluateOpenClawTelegramPermission',
  'evaluateOpenClawTelegramPermissions',
  'permissionGrantMatchesRequirement',
];

const expectedDeliveryRuntimeExports = [
  'createTelegramDeliveryPumpRequest',
  'pumpTelegramDeliveryRequest',
  'createTelegramDeliveryPump',
];

const expectedCallbackRuntimeExports = [
  'parseOpenClawTelegramCallbackPayload',
  'runOpenClawTelegramCallbackTokenFlow',
];

const expectedRuntimeBridgeRuntimeExports = [
  'dispatchOpenClawRuntime',
  'summarizeOpenClawRuntimeBridgeReadiness',
  'createOpenClawRuntimeBridge',
];

const expectedApprovalRuntimeExports = [
  'createApprovalBridgeRequest',
  'createApprovalBridgeDecision',
  'createApprovalBridgePermissionRequirement',
  'isApprovalBridgeRequest',
  'isApprovalBridgeDecision',
  'submitApprovalBridgeRequest',
  'resolveApprovalBridgeDecision',
];

const expectedStorageRuntimeExports = [
  'cloneDurableTopicBindingRecord',
  'createDurableCallbackTokenStore',
  'createDurableCorePresentationActionTokenStoreAdapter',
  'createDurableCorePresentationOutboxStoreAdapter',
  'createDurableCoreSessionBindingStoreAdapter',
  'createDurableCoreStoreAdapterBundle',
  'createDurableDeliveryStore',
  'createDurableIdempotencyStore',
  'createDurableTopicBindingRecord',
  'createDurableTopicBindingRecordKey',
  'createDurableTopicBindingStore',
  'DURABLE_CORE_STORE_ADAPTER_NAMES',
  'durableTopicBindingRecordToSnapshot',
  'normalizeDurableCoreActionTokenRecord',
  'normalizeDurableCorePresentationOutboxRecord',
  'normalizeDurableCoreSessionBindingRecord',
  'normalizeDurableTopicBindingRecord',
  'summarizeDurableCoreStoreReadiness',
];

const expectedOpenClawChannelRuntimeExports = [
  'adaptOpenClawChannelEventEnvelope',
];

const expectedOpenClawDeliveryRuntimeExports = [
  'createOpenClawDeliveryAdapter',
  'createOpenClawDeliveryPortRequest',
  'sendOpenClawDeliveryRequest',
];

const expectedOpenClawRuntimePortExports = [
  'createOpenClawRuntimePortBridge',
  'dispatchOpenClawRuntimePort',
  'summarizeOpenClawRuntimePortReadiness',
];

const expectedOpenClawApprovalRuntimeExports = [
  'createOpenClawApprovalBridge',
  'resolveOpenClawApprovalBridgeDecision',
  'submitOpenClawApprovalBridgeRequest',
  'summarizeOpenClawApprovalBridgeReadiness',
];

const expectedOpenClawRuntimeExports = [
  ...expectedOpenClawChannelRuntimeExports,
  ...expectedOpenClawDeliveryRuntimeExports,
  ...expectedOpenClawRuntimePortExports,
  ...expectedOpenClawApprovalRuntimeExports,
];

const expectedRootRuntimeExports = [
  'OPENCLAW_ADAPTER_PACKAGE',
  ...expectedContractRuntimeExports,
  ...expectedBindingRuntimeExports,
  ...expectedCommandRuntimeExports,
  ...expectedMappingRuntimeExports,
  ...expectedRenderingRuntimeExports,
  ...expectedHostRuntimeExports,
  ...expectedPermissionRuntimeExports,
  ...expectedDeliveryRuntimeExports,
  ...expectedCallbackRuntimeExports,
  ...expectedRuntimeBridgeRuntimeExports,
  ...expectedApprovalRuntimeExports,
  ...expectedStorageRuntimeExports,
  ...expectedOpenClawRuntimeExports,
];

const telegramDeliveryTarget = Object.freeze({
  channelId: 'telegram-channel:w8e-fanin',
  chatId: 'telegram-chat:w8e-fanin',
  messageThreadId: 'telegram-thread:general',
});

function marker(...codes) {
  return String.fromCharCode(...codes);
}

const blockedProducedOutputTerms = [
  marker(114, 97, 119, 85, 112, 100, 97, 116, 101),
  marker(116, 101, 108, 101, 103, 114, 97, 109, 85, 112, 100, 97, 116, 101),
  marker(114, 97, 119, 84, 101, 108, 101, 103, 114, 97, 109, 85, 112, 100, 97, 116, 101),
  marker(114, 97, 119, 79, 112, 101, 110, 67, 108, 97, 119, 69, 118, 101, 110, 116),
  marker(114, 97, 119, 80, 114, 111, 118, 105, 100, 101, 114, 82, 101, 115, 112, 111, 110, 115, 101),
  marker(114, 97, 119, 82, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 84, 111, 111, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(116, 111, 111, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(97, 112, 112, 114, 111, 118, 97, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 65, 112, 112, 114, 111, 118, 97, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 67, 111, 114, 101, 82, 101, 115, 117, 108, 116),
  marker(114, 97, 119, 69, 114, 114, 111, 114),
  marker(115, 116, 97, 99, 107),
  marker(98, 111, 116, 84, 111, 107, 101, 110),
  marker(97, 112, 105, 75, 101, 121),
  marker(115, 101, 99, 114, 101, 116),
  marker(112, 97, 115, 115, 119, 111, 114, 100),
  marker(99, 114, 101, 100, 101, 110, 116, 105, 97, 108),
  marker(102, 105, 108, 101, 115, 121, 115, 116, 101, 109, 80, 97, 116, 104),
  marker(115, 116, 111, 114, 97, 103, 101, 80, 97, 116, 104),
];

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertExports(moduleValue, expectedNames, label) {
  for (const exportName of expectedNames) {
    assert.equal(exportName in moduleValue, true, `missing ${label} export ${exportName}`);
  }
}

function assertSafeOutput(value) {
  const serialized = JSON.stringify(value);
  assert.equal(typeof serialized, 'string');
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const blocked of blockedProducedOutputTerms) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(blocked)),
      false,
      `output includes blocked marker ${blocked}`,
    );
  }

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      for (const blocked of blockedProducedOutputTerms) {
        assert.notEqual(normalizeForLeakScan(key), normalizeForLeakScan(blocked), `output field leaks ${key}`);
      }
      if (nestedValue !== null && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }
}

function createTopicPort() {
  const records = new Map();
  return Object.freeze({
    get: (key) => records.get(key),
    put(record) {
      records.set(record.recordKey, record);
      return record;
    },
    delete: (key) => records.delete(key),
    list: () => [...records.values()],
  });
}

function createCoreBoundary() {
  const records = new Map();
  return Object.freeze({
    get: (key) => records.get(key),
    put(record) {
      records.set(record.recordKey, record);
      return record;
    },
    delete: (key) => records.delete(key),
    list: () => [...records.values()],
  });
}

test('root dist index exports shared Wave 1-8 public runtime helpers', () => {
  assertExports(root, expectedRootRuntimeExports, 'root');

  assert.equal(root.OPENCLAW_ADAPTER_PACKAGE.status, 'skeleton');
  assert.equal(root.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(root.adapterOk('value').ok, true);
  assert.equal(root.isOpenClawTelegramMessageEvent({ eventKind: 'message' }), true);
  assert.equal(root.createTelegramActionButtonPayload('token:approve'), 'hz:token:approve');
  assert.equal(root.isTelegramActionButtonPayload('hz:token:approve'), true);
  assert.equal(root.summarizeAdapterReadiness({ checks: [] }).status, 'unknown');
  assert.equal(root.createAdapterIdempotencyKey('callback', ['safe']), 'callback:safe');
});

test('dist barrels keep Wave 1-5 adapter contract coverage intact', () => {
  assertExports(contracts, expectedContractRuntimeExports, 'contracts');
  assertExports(binding, expectedBindingRuntimeExports, 'binding');
  assertExports(commands, expectedCommandRuntimeExports, 'commands');
  assertExports(mapping, expectedMappingRuntimeExports, 'mapping');
  assertExports(rendering, expectedRenderingRuntimeExports, 'rendering');
  assertExports(host, expectedHostRuntimeExports, 'host');
  assertExports(permissions, expectedPermissionRuntimeExports, 'permissions');
  assertExports(delivery, expectedDeliveryRuntimeExports, 'delivery');
  assertExports(callbacks, expectedCallbackRuntimeExports, 'callbacks');
  assertExports(runtime, expectedRuntimeBridgeRuntimeExports, 'runtime');
  assertExports(approvals, expectedApprovalRuntimeExports, 'approvals');

  const command = commands.createCommandDescriptor({ name: '/Start', title: 'Start session', aliases: ['begin'] });
  const commandSet = root.createCommandDescriptorSet({ commands: [command], defaultCommandName: 'start' });
  const fragment = rendering.renderSafePresentationLike({ title: 'Wave 4 ready' });
  const deliveryRequest = root.createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:w5-delivery',
    target: telegramDeliveryTarget,
    content: { format: 'plain', text: 'Wave 5 delivery ready' },
    correlationRef: 'correlation:w5-delivery',
  });
  const callback = root.parseOpenClawTelegramCallbackPayload('hz:token:approve-1');
  const missingRuntimeReadiness = runtime.summarizeOpenClawRuntimeBridgeReadiness();
  const approvalRequest = approvals.createApprovalBridgeRequest({
    approvalRef: 'approval:w5-fanin',
    title: 'Approve Wave 5 fan-in',
    message: 'Safe approval bridge request.',
    approveTokenRef: 'token:approve-w5',
    rejectTokenRef: 'token:reject-w5',
  });

  assert.equal(root.findCommandDescriptor(commandSet, '/begin')?.name, 'start');
  assert.equal(root.isCommandDescriptor(command), true);
  assert.equal(fragment.kind, 'telegram-render-fragment');
  assert.equal(root.isTelegramRenderFragment(fragment), true);
  assert.equal(deliveryRequest.deliveryRef, 'operation:w5-delivery');
  assert.equal(callback.ok, true);
  assert.equal(missingRuntimeReadiness.status, 'not-ready');
  assert.equal(root.isApprovalBridgeRequest(approvalRequest), true);
});

test('dist storage barrels keep Wave 7 durable storage public coverage intact', async () => {
  assertExports(storage, expectedStorageRuntimeExports, 'storage');
  assertExports(storageTopicBinding, [
    'cloneDurableTopicBindingRecord',
    'createDurableTopicBindingRecord',
    'createDurableTopicBindingRecordKey',
    'createDurableTopicBindingStore',
    'durableTopicBindingRecordToSnapshot',
    'normalizeDurableTopicBindingRecord',
  ], 'storage/topic-binding');
  assertExports(storageIdempotency, ['createDurableIdempotencyStore'], 'storage/idempotency');
  assertExports(storageCallbacks, ['createDurableCallbackTokenStore'], 'storage/callbacks');
  assertExports(storageDelivery, ['createDurableDeliveryStore'], 'storage/delivery');
  assertExports(storageCore, [
    'DURABLE_CORE_STORE_ADAPTER_NAMES',
    'createDurableCoreStoreAdapterBundle',
    'summarizeDurableCoreStoreReadiness',
  ], 'storage/core');

  const snapshot = root.createTopicBindingSnapshot({
    key: { workspaceId: 'workspace-storage', channelId: 'channel-storage', topicId: 'topic-storage' },
    status: 'active',
    agentId: 'agent-storage',
    sessionId: 'session-storage',
    createdAtIso: '2026-06-24T00:00:00.000Z',
    updatedAtIso: '2026-06-24T00:01:00.000Z',
  });
  const topicStore = storage.createDurableTopicBindingStore({ records: createTopicPort() });
  topicStore.upsert(snapshot);
  assert.deepEqual(topicStore.get(snapshot.key), snapshot);

  const idempotencyRecords = new Map();
  const idempotencyStore = root.createDurableIdempotencyStore(Object.freeze({
    get: (key) => idempotencyRecords.get(key) ?? null,
    put(record) {
      idempotencyRecords.set(record.key, record);
      return record;
    },
    delete: (key) => idempotencyRecords.delete(key),
    list: () => [...idempotencyRecords.values()],
  }));
  const reserved = await idempotencyStore.reserve({
    key: root.createCallbackIdempotencyKey({ channelId: 'channel-storage', chatId: 'chat-storage', callbackId: 'callback-storage' }),
    firstSeenAt: '2026-06-24T00:02:00.000Z',
  });
  const bundle = root.createDurableCoreStoreAdapterBundle({
    boundaries: {
      sessionBindingStore: createCoreBoundary(),
      presentationOutboxStore: createCoreBoundary(),
      presentationActionTokenStore: createCoreBoundary(),
    },
  });

  assert.equal(reserved.ok, true);
  assert.equal(reserved.value.kind, 'reserved');
  assert.equal(bundle.ok, true);
  assert.equal(bundle.value.readiness.status, 'ready');
});

test('dist OpenClaw barrels expose Wave 8 integration shells through subpath, aggregate, and root exports', () => {
  assertExports(openclawChannel, expectedOpenClawChannelRuntimeExports, 'openclaw/channel');
  assertExports(openclawDelivery, expectedOpenClawDeliveryRuntimeExports, 'openclaw/delivery');
  assertExports(openclawRuntime, expectedOpenClawRuntimePortExports, 'openclaw/runtime');
  assertExports(openclawApproval, expectedOpenClawApprovalRuntimeExports, 'openclaw/approval');
  assertExports(openclaw, expectedOpenClawRuntimeExports, 'openclaw');
  assertExports(root, expectedOpenClawRuntimeExports, 'root openclaw');
});

test('dist OpenClaw barrel Wave 8 shells compose with fake injected ports only', async () => {
  const channelResult = openclaw.adaptOpenClawChannelEventEnvelope(Object.freeze({
    kind: 'message',
    operationId: 'w8e-channel',
    correlationId: 'w8e-channel',
    channelId: 'channel-w8e',
    chatId: 'chat-w8e',
    threadId: 'thread-w8e',
    messageId: 'message-w8e',
    text: 'Wave 8 channel event ready.',
  }));

  const deliveryRequest = root.createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:w8e-delivery',
    target: telegramDeliveryTarget,
    content: { format: 'plain', text: 'Wave 8 delivery ready.' },
    correlationRef: 'correlation:w8e-delivery',
  });
  const deliveryAdapter = openclaw.createOpenClawDeliveryAdapter({
    port: Object.freeze({
      sendMessage(portRequest) {
        assert.equal(portRequest.text, 'Wave 8 delivery ready.');
        return Object.freeze({
          ok: true,
          messageId: 'telegram-message:w8e-delivery',
          correlationRef: portRequest.correlationRef,
        });
      },
    }),
  });
  const deliveryResult = await deliveryAdapter.send(deliveryRequest);

  const runtimeRequest = Object.freeze({
    dispatchRef: 'operation:w8e-runtime',
    intent: Object.freeze({ kind: 'adapter-smoke', text: 'Offline runtime dispatch.' }),
    correlationRef: 'correlation:w8e-runtime',
  });
  const runtimeBridge = openclaw.createOpenClawRuntimePortBridge({
    runtimePort: Object.freeze({
      dispatch(request) {
        return Object.freeze({
          ok: true,
          dispatchRef: request.dispatchRef,
          output: Object.freeze({
            outputRef: 'runtime-output:w8e-runtime',
            message: 'Offline runtime output.',
          }),
          correlationRef: request.correlationRef,
        });
      },
      getReadiness() {
        return Object.freeze({ status: 'ready', message: 'Offline runtime port ready.' });
      },
    }),
  });
  const runtimeResult = runtimeBridge.dispatch(runtimeRequest);

  const approvalPort = Object.freeze({
    submitApproval(request) {
      return Object.freeze({ ok: true, approvalRef: request.approvalRef, status: 'submitted' });
    },
    resolveApproval(decision) {
      return Object.freeze({ ok: true, approvalRef: decision.approvalRef, status: decision.status });
    },
    getReadiness() {
      return Object.freeze({ status: 'ready', message: 'Offline approval port ready.' });
    },
  });
  const approvalBridge = openclaw.createOpenClawApprovalBridge({ approvalPort });
  const approvalSubmit = approvalBridge.submit({
    approvalRef: 'approval:w8e-fanin',
    title: 'Approve Wave 8 fan-in',
    message: 'Safe offline approval request.',
    approveTokenRef: 'token:w8e-approve',
    rejectTokenRef: 'token:w8e-reject',
  });
  const approvalResolve = approvalBridge.resolve(
    { approvalRef: 'approval:w8e-fanin', status: 'approved', reason: 'Approved by fake port.' },
    root.allowPermission({ action: 'resolve-approval', resourceKind: 'approval' }),
  );

  assert.equal(channelResult.ok, true);
  assert.equal(channelResult.value.event.eventKind, 'message');
  assert.equal(channelResult.value.mappingInput.event.operationRef, 'operation:w8e-channel');
  assert.equal(deliveryResult.ok, true);
  assert.equal(deliveryResult.value.ok, true);
  assert.equal(deliveryResult.value.externalMessageRef.messageId, 'telegram-message:w8e-delivery');
  assert.equal(runtimeBridge.getReadiness().status, 'ready');
  assert.equal(runtimeResult.ok, true);
  assert.equal(runtimeResult.value.output.outputRef, 'runtime-output:w8e-runtime');
  assert.equal(approvalBridge.getReadiness().status, 'ready');
  assert.equal(approvalSubmit.ok, true);
  assert.equal(approvalSubmit.value.state.status, 'submitted');
  assert.equal(approvalResolve.ok, true);
  assert.equal(approvalResolve.value.state.status, 'approved');

  for (const sample of [channelResult, deliveryResult, runtimeResult, approvalSubmit, approvalResolve]) {
    assertSafeOutput(sample);
  }
});
