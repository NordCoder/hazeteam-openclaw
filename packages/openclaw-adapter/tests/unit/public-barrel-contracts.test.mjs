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

const expectedOpenClawRuntimeExports = [
  'adaptOpenClawChannelEventEnvelope',
  'createOpenClawDeliveryAdapter',
  'createOpenClawDeliveryPortRequest',
  'sendOpenClawDeliveryRequest',
  'createOpenClawRuntimePortBridge',
  'dispatchOpenClawRuntimePort',
  'summarizeOpenClawRuntimePortReadiness',
  'createOpenClawApprovalBridge',
  'submitOpenClawApprovalBridgeRequest',
  'resolveOpenClawApprovalBridgeDecision',
  'summarizeOpenClawApprovalBridgeReadiness',
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
];

const telegramDeliveryTarget = Object.freeze({
  channelId: 'telegram-channel:w5-fanin',
  chatId: 'telegram-chat:w5-fanin',
  messageThreadId: 'telegram-thread:general',
});

function assertExports(moduleValue, expectedNames, label) {
  for (const exportName of expectedNames) {
    assert.equal(exportName in moduleValue, true, `missing ${label} export ${exportName}`);
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

test('root dist index exports shared, event, delivery, support, binding, descriptor, and Wave 7 helpers', () => {
  for (const exportName of expectedRootRuntimeExports) {
    assert.equal(exportName in root, true, `missing root export ${exportName}`);
  }

  assert.equal(root.OPENCLAW_ADAPTER_PACKAGE.status, 'skeleton');
  assert.equal(root.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(root.adapterOk('value').ok, true);
  assert.equal(root.isOpenClawTelegramMessageEvent({ eventKind: 'message' }), true);
  assert.equal(root.createTelegramActionButtonPayload('token:approve'), 'hz:token:approve');
  assert.equal(root.isTelegramActionButtonPayload('hz:token:approve'), true);
  assert.equal(root.summarizeAdapterReadiness({ checks: [] }).status, 'unknown');
  assert.equal(root.createAdapterIdempotencyKey('callback', ['safe']), 'callback:safe');
  assert.equal(
    root.isPermissionAllowed(root.allowPermission({ action: 'send-message', resourceKind: 'topic' })),
    true,
  );
});

test('dist contracts barrel exports shared, event, delivery, and support contract helpers', () => {
  for (const exportName of expectedContractRuntimeExports) {
    assert.equal(exportName in contracts, true, `missing contracts export ${exportName}`);
  }

  assert.equal(contracts.createAdapterOperationRef('op-1'), 'operation:op-1');
  assert.equal(contracts.createAdapterSafeError({ code: 'not-found', message: 'missing' }).code, 'not-found');
  assert.equal(contracts.isOpenClawTelegramCallbackEvent({ eventKind: 'callback' }), true);
  assert.equal(
    contracts.createTelegramDeliverySafeError({ code: 'timeout', message: 'timed out' }).code,
    'timeout',
  );
  assert.equal(
    contracts.createInboundMessageIdempotencyKey({ channelId: 'ch', chatId: '1', messageId: '2' }),
    'inbound-message:ch:1:thread-none:2',
  );
  assert.equal(
    contracts.isPermissionDenied(
      contracts.denyPermission({
        requirement: { action: 'consume-callback', resourceKind: 'callback' },
        reason: 'no',
      }),
    ),
    true,
  );
});

test('dist binding barrel and root export topic binding helpers', () => {
  for (const exportName of expectedBindingRuntimeExports) {
    assert.equal(exportName in binding, true, `missing binding export ${exportName}`);
    assert.equal(exportName in root, true, `missing root binding export ${exportName}`);
  }

  const snapshot = root.createTopicBindingSnapshot({
    key: {
      workspaceId: 'workspace-alpha',
      channelId: 'channel-alpha',
      topicId: 'topic-alpha',
    },
    status: 'active',
    agentId: 'agent-alpha',
    sessionId: 'session-alpha',
    createdAtIso: '2026-01-01T00:00:00.000Z',
    updatedAtIso: '2026-01-01T00:00:00.000Z',
  });

  const store = binding.createInMemoryTopicBindingStore();
  store.upsert(snapshot);

  assert.equal(root.isTopicBindingStatus(snapshot.status), true);
  assert.equal(
    root.serializeTopicBindingKey(snapshot.key),
    'topic-binding:workspace=workspace-alpha:channel=channel-alpha:topic=topic-alpha',
  );
  assert.deepEqual(store.get(root.createTopicBindingKey(snapshot.key)), snapshot);
});

test('dist commands barrel and root export command and Telegram UI descriptor helpers', () => {
  for (const exportName of expectedCommandRuntimeExports) {
    assert.equal(exportName in commands, true, `missing commands export ${exportName}`);
    assert.equal(exportName in root, true, `missing root command export ${exportName}`);
  }

  const command = root.createCommandDescriptor({
    name: '/Start',
    title: 'Start session',
    aliases: ['begin'],
  });
  const commandSet = commands.createCommandDescriptorSet({
    commands: [command],
    defaultCommandName: 'start',
  });
  const textBlock = root.createTelegramTextBlock({ text: 'Ready', tone: 'strong' });
  const button = commands.createTelegramActionButtonDescriptor({
    label: 'Approve',
    payload: 'token:approve',
    style: 'primary',
  });
  const card = root.createTelegramCardDescriptor({
    title: 'Action required',
    intent: 'action-request',
    body: [textBlock],
    buttonGroups: [commands.createTelegramButtonGroupDescriptor({ buttons: [button] })],
  });
  const foundCommand = root.findCommandDescriptor(commandSet, '/begin');

  assert.equal(command.name, 'start');
  assert.equal(root.isCommandDescriptor(command), true);
  assert.equal(foundCommand?.name, command.name);
  assert.equal(button.payload, 'hz:token:approve');
  assert.equal(root.isTelegramCardDescriptor(card), true);
});

test('dist mapping barrel and root export Wave 4 inbound mapper shell helpers', () => {
  for (const exportName of expectedMappingRuntimeExports) {
    assert.equal(exportName in mapping, true, `missing mapping export ${exportName}`);
    assert.equal(exportName in root, true, `missing root mapping export ${exportName}`);
  }

  assert.equal(
    root.getInboundMappingRawDebugRef({ rawDebugRef: 'raw-debug:w4-fanin' }),
    'raw-debug:w4-fanin',
  );
});

test('dist rendering barrel and root export Wave 4 Telegram renderer shell helpers', () => {
  for (const exportName of expectedRenderingRuntimeExports) {
    assert.equal(exportName in rendering, true, `missing rendering export ${exportName}`);
    assert.equal(exportName in root, true, `missing root rendering export ${exportName}`);
  }

  const fragment = root.renderSafePresentationLike({ title: 'Wave 4 ready' });

  assert.equal(fragment.kind, 'telegram-render-fragment');
  assert.equal(fragment.content.text, 'Wave 4 ready');
  assert.equal(root.isTelegramRenderFragment(fragment), true);
});

test('dist host barrel and root export Wave 4 core host factory shell helpers', () => {
  for (const exportName of expectedHostRuntimeExports) {
    assert.equal(exportName in host, true, `missing host export ${exportName}`);
    assert.equal(exportName in root, true, `missing root host export ${exportName}`);
  }

  const result = root.createAdapterCoreHostFactory();

  assert.equal(result.ok, true);
  assert.equal(result.value.metadata.corePackageName, 'hazeteam-core');
  assert.deepEqual(
    host.getMissingRequiredAdapterCoreHostPorts({ agentControlHost: Object.freeze({}) }),
    ['sessionBindingStore', 'presentationOutboxStore', 'presentationActionTokenStore'],
  );
});

test('dist permissions barrel and root export Wave 4 permission evaluator shell helpers', () => {
  for (const exportName of expectedPermissionRuntimeExports) {
    assert.equal(exportName in permissions, true, `missing permissions export ${exportName}`);
    assert.equal(exportName in root, true, `missing root permissions export ${exportName}`);
  }

  const requirement = Object.freeze({
    action: 'admin-topic-binding',
    resourceKind: 'workspace',
  });
  const grant = Object.freeze({
    requirement: Object.freeze({
      action: 'admin-topic-binding',
      resourceKind: 'workspace',
      actorRef: 'actor:admin',
      workspaceRef: 'workspace:acme',
    }),
  });
  const decision = root.evaluateOpenClawTelegramPermission({
    requirement,
    actor: Object.freeze({ actorRef: 'actor:admin', trust: 'trusted' }),
    context: Object.freeze({ workspaceRef: 'workspace:acme' }),
    grants: [grant],
  });

  assert.equal(decision.status, 'allowed');
  assert.equal(root.permissionGrantMatchesRequirement(grant, decision.requirement), true);
  assert.equal(root.PERMISSION_BEFORE_TOKEN_CONSUME_RULE.action, 'consume-callback');
});

test('dist delivery barrel and root export Wave 5 delivery pump helpers', () => {
  for (const exportName of expectedDeliveryRuntimeExports) {
    assert.equal(exportName in delivery, true, `missing delivery export ${exportName}`);
    assert.equal(exportName in root, true, `missing root delivery export ${exportName}`);
  }

  const request = root.createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:w5-delivery',
    target: telegramDeliveryTarget,
    content: { format: 'plain', text: 'Wave 5 delivery ready' },
    correlationRef: 'correlation:w5-delivery',
  });
  const pump = delivery.createTelegramDeliveryPump({
    sink: Object.freeze({
      submit(deliveryRequest) {
        return Object.freeze({
          ok: true,
          deliveryRef: deliveryRequest.deliveryRef,
          externalMessageRef: Object.freeze({
            channelId: deliveryRequest.target.channelId,
            chatId: deliveryRequest.target.chatId,
            messageThreadId: deliveryRequest.target.messageThreadId,
            messageId: 'telegram-message:w5-fanin',
            ...(deliveryRequest.correlationRef === undefined
              ? {}
              : { correlationRef: deliveryRequest.correlationRef }),
          }),
          ...(deliveryRequest.correlationRef === undefined
            ? {}
            : { correlationRef: deliveryRequest.correlationRef }),
        });
      },
    }),
  });
  const result = pump.deliver(request);

  assert.equal(request.deliveryRef, 'operation:w5-delivery');
  assert.equal(request.content.text, 'Wave 5 delivery ready');
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, 'delivered');
  assert.equal(result.value.externalMessageRef.messageId, 'telegram-message:w5-fanin');
});

test('dist callbacks barrel and root export Wave 5 callback token flow helpers', () => {
  for (const exportName of expectedCallbackRuntimeExports) {
    assert.equal(exportName in callbacks, true, `missing callbacks export ${exportName}`);
    assert.equal(exportName in root, true, `missing root callbacks export ${exportName}`);
  }

  const parsed = root.parseOpenClawTelegramCallbackPayload('hz:token:approve-1');

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.kind, 'openclaw-telegram-callback-payload');
  assert.equal(parsed.value.tokenRef, 'token:approve-1');
});

test('dist runtime barrel and root export Wave 5 runtime bridge helpers', () => {
  for (const exportName of expectedRuntimeBridgeRuntimeExports) {
    assert.equal(exportName in runtime, true, `missing runtime export ${exportName}`);
    assert.equal(exportName in root, true, `missing root runtime export ${exportName}`);
  }

  const missingRuntimeReadiness = runtime.summarizeOpenClawRuntimeBridgeReadiness();
  const bridge = root.createOpenClawRuntimeBridge();

  assert.equal(missingRuntimeReadiness.status, 'not-ready');
  assert.equal(missingRuntimeReadiness.checks[0].component, 'runtime');
  assert.equal(bridge.getReadiness().status, 'not-ready');
});

test('dist approvals barrel and root export Wave 5 approval bridge helpers', () => {
  for (const exportName of expectedApprovalRuntimeExports) {
    assert.equal(exportName in approvals, true, `missing approvals export ${exportName}`);
    assert.equal(exportName in root, true, `missing root approvals export ${exportName}`);
  }

  const request = approvals.createApprovalBridgeRequest({
    approvalRef: 'approval:w5-fanin',
    title: 'Approve Wave 5 fan-in',
    message: 'Safe approval bridge request.',
    approveTokenRef: 'token:approve-w5',
    rejectTokenRef: 'token:reject-w5',
  });
  const decision = root.createApprovalBridgeDecision({
    approvalRef: 'approval:w5-fanin',
    status: 'approved',
    reason: 'Approved in static-free smoke.',
  });
  const requirement = approvals.createApprovalBridgePermissionRequirement({
    approvalRef: 'approval:w5-fanin',
  });

  assert.equal(request.kind, 'openclaw-approval-request');
  assert.equal(request.approvePayload, 'hz:token:approve-w5');
  assert.equal(root.isApprovalBridgeRequest(request), true);
  assert.equal(decision.kind, 'openclaw-approval-decision');
  assert.equal(decision.status, 'approved');
  assert.equal(root.isApprovalBridgeDecision(decision), true);
  assert.equal(requirement.action, 'resolve-approval');
  assert.equal(requirement.resourceKind, 'approval');
});

test('dist storage barrels and root export Wave 7 durable storage helpers', async () => {
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
  assert.equal(reserved.ok, true);
  assert.equal(reserved.value.kind, 'reserved');

  const bundle = root.createDurableCoreStoreAdapterBundle({
    boundaries: {
      sessionBindingStore: createCoreBoundary(),
      presentationOutboxStore: createCoreBoundary(),
      presentationActionTokenStore: createCoreBoundary(),
    },
  });
  assert.equal(bundle.ok, true);
  assert.equal(bundle.value.readiness.status, 'ready');
});

test('Wave 8 OpenClaw barrels stay additive and expose safe root smoke helpers', async () => {
  assertExports(openclaw, expectedOpenClawRuntimeExports, 'openclaw');
  assertExports(openclawChannel, ['adaptOpenClawChannelEventEnvelope'], 'openclaw/channel');
  assertExports(
    openclawDelivery,
    ['createOpenClawDeliveryAdapter', 'createOpenClawDeliveryPortRequest', 'sendOpenClawDeliveryRequest'],
    'openclaw/delivery',
  );
  assertExports(
    openclawRuntime,
    ['createOpenClawRuntimePortBridge', 'dispatchOpenClawRuntimePort', 'summarizeOpenClawRuntimePortReadiness'],
    'openclaw/runtime',
  );
  assertExports(
    openclawApproval,
    [
      'createOpenClawApprovalBridge',
      'submitOpenClawApprovalBridgeRequest',
      'resolveOpenClawApprovalBridgeDecision',
      'summarizeOpenClawApprovalBridgeReadiness',
    ],
    'openclaw/approval',
  );
  assertExports(root, expectedOpenClawRuntimeExports, 'root Wave 8');

  const adaptedEvent = openclaw.adaptOpenClawChannelEventEnvelope({
    kind: 'message',
    operationId: 'w8e-op-1',
    correlationId: 'w8e-corr-1',
    channel: { id: 'channel-openclaw' },
    chat: { id: 'chat-openclaw' },
    thread: { id: 'thread-openclaw', title: '  Wave 8   Topic ' },
    actor: { id: 'actor-openclaw', displayName: '  Open Claw ' },
    occurredAt: '2026-06-24T08:00:00.000Z',
    message: { id: 'message-openclaw', text: '  hello OpenClaw  ' },
  });
  assert.equal(adaptedEvent.ok, true);
  assert.equal(adaptedEvent.value.event.eventKind, 'message');
  assert.equal(adaptedEvent.value.event.text, 'hello OpenClaw');
  assert.equal(adaptedEvent.value.mappingInput.event, adaptedEvent.value.event);

  const deliveryPort = Object.freeze({
    sendMessage(request) {
      return Object.freeze({ ok: true, messageId: `telegram-message:${request.deliveryRef}` });
    },
  });
  const deliveryRequest = root.createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:w8e-delivery-1',
    target: telegramDeliveryTarget,
    content: { format: 'plain', text: 'Wave 8 delivery smoke' },
    correlationRef: 'correlation:w8e-delivery-1',
  });
  const deliveryAdapter = openclaw.createOpenClawDeliveryAdapter({ port: deliveryPort });
  const deliveryResult = await deliveryAdapter.send(deliveryRequest);
  assert.equal(openclaw.createOpenClawDeliveryPortRequest(deliveryRequest).text, 'Wave 8 delivery smoke');
  assert.equal(deliveryResult.ok, true);
  assert.equal(deliveryResult.value.ok, true);
  assert.equal(deliveryResult.value.externalMessageRef.messageId, 'telegram-message:operation:w8e-delivery-1');

  const runtimeMissing = openclaw.summarizeOpenClawRuntimePortReadiness();
  const runtimePort = Object.freeze({
    dispatch(request) {
      return Object.freeze({
        ok: true,
        dispatchRef: request.dispatchRef,
        output: Object.freeze({
          outputRef: 'runtime-output:w8e-smoke',
          message: 'Wave 8 runtime smoke',
        }),
      });
    },
    getReadiness() {
      return Object.freeze({ status: 'ready', message: 'Wave 8 runtime port ready' });
    },
  });
  const runtimeBridge = openclaw.createOpenClawRuntimePortBridge({ runtimePort });
  const runtimeDispatch = runtimeBridge.dispatch(
    Object.freeze({
      dispatchRef: 'operation:w8e-runtime-1',
      intent: Object.freeze({
        kind: 'run-command',
        text: 'Wave 8 runtime smoke',
        resourceRef: 'runtime-resource:w8e-smoke',
      }),
      workspaceRef: 'workspace:w8e',
      agentRef: 'agent:w8e',
      actorRef: 'actor:w8e',
      correlationRef: 'correlation:w8e-runtime-1',
      detailsRef: 'details:w8e-runtime-1',
    }),
  );
  assert.equal(runtimeMissing.status, 'not-ready');
  assert.equal(runtimeBridge.getReadiness().status, 'ready');
  assert.equal(runtimeDispatch.ok, true);
  assert.equal(runtimeDispatch.value.output.outputRef, 'runtime-output:w8e-smoke');

  const approvalMissing = openclaw.summarizeOpenClawApprovalBridgeReadiness();
  const approvalPort = Object.freeze({
    submitApproval(request) {
      return Object.freeze({
        ok: true,
        state: Object.freeze({
          approvalRef: request.approvalRef,
          status: 'submitted',
          detailsRef: request.detailsRef,
          correlationRef: request.correlationRef,
        }),
      });
    },
    resolveApproval(decision) {
      return Object.freeze({
        ok: true,
        state: Object.freeze({
          approvalRef: decision.approvalRef,
          status: decision.status,
          detailsRef: decision.detailsRef,
          correlationRef: decision.correlationRef,
        }),
      });
    },
  });
  const approvalBridge = openclaw.createOpenClawApprovalBridge({ approvalPort });
  const approvalRequest = Object.freeze({
    approvalRef: 'approval:w8e-1',
    title: 'Approve Wave 8 smoke',
    message: 'safe approval smoke',
    approveTokenRef: 'token:w8e-approve',
    rejectTokenRef: 'token:w8e-reject',
    workspaceRef: 'workspace:w8e',
    agentRef: 'agent:w8e',
    actorRef: 'actor:w8e',
    detailsRef: 'details:w8e-approval-1',
    correlationRef: 'correlation:w8e-approval-1',
  });
  const approvalDecision = Object.freeze({
    approvalRef: 'approval:w8e-1',
    status: 'approved',
    actorRef: 'actor:w8e',
    reason: 'approved safely',
    detailsRef: 'details:w8e-approval-1',
    correlationRef: 'correlation:w8e-approval-1',
  });
  const permissionDecision = root.allowPermission(
    root.createApprovalBridgePermissionRequirement({
      approvalRef: 'approval:w8e-1',
      actorRef: 'actor:w8e',
      workspaceRef: 'workspace:w8e',
      agentRef: 'agent:w8e',
      detailsRef: 'details:w8e-approval-1',
      correlationRef: 'correlation:w8e-approval-1',
    }),
  );
  const submitted = approvalBridge.submit(approvalRequest);
  const resolved = approvalBridge.resolve(approvalDecision, permissionDecision);
  assert.equal(approvalMissing.status, 'not-ready');
  assert.equal(approvalBridge.getReadiness().status, 'ready');
  assert.equal(submitted.ok, true);
  assert.equal(submitted.value.state.status, 'submitted');
  assert.equal(resolved.ok, true);
  assert.equal(resolved.value.state.status, 'approved');
});
