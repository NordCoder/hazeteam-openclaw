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

const expectedMappingRuntimeExports = ['getInboundMappingRawDebugRef', 'mapOpenClawTelegramInboundEvent'];
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
  'createDurableTopicBindingRecord',
  'createDurableTopicBindingRecordKey',
  'createDurableTopicBindingStore',
  'durableTopicBindingRecordToSnapshot',
  'normalizeDurableTopicBindingRecord',
  'cloneDurableTopicBindingRecord',
  'createDurableIdempotencyStore',
  'createDurableCallbackTokenStore',
  'createDurableDeliveryStore',
  'DURABLE_CORE_STORE_ADAPTER_NAMES',
  'createDurableCorePresentationActionTokenStoreAdapter',
  'createDurableCorePresentationOutboxStoreAdapter',
  'createDurableCoreSessionBindingStoreAdapter',
  'createDurableCoreStoreAdapterBundle',
  'normalizeDurableCoreActionTokenRecord',
  'normalizeDurableCorePresentationOutboxRecord',
  'normalizeDurableCoreSessionBindingRecord',
  'summarizeDurableCoreStoreReadiness',
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

test('root dist index exports existing public API plus Wave 7 durable storage API', () => {
  assertExports(root, expectedRootRuntimeExports, 'root');
  assert.equal(root.OPENCLAW_ADAPTER_PACKAGE.status, 'skeleton');
  assert.equal(root.createWorkspaceRef('acme'), 'workspace:acme');
  assert.equal(root.adapterOk('value').ok, true);
  assert.equal(root.createAdapterIdempotencyKey('callback', ['safe']), 'callback:safe');
});

test('existing dist barrels keep their public runtime exports', () => {
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
});

test('storage dist barrel and subpath barrels expose W7 durable store factories', () => {
  assertExports(storage, expectedStorageRuntimeExports, 'storage');
  assertExports(storageTopicBinding, [
    'createDurableTopicBindingRecord',
    'createDurableTopicBindingRecordKey',
    'createDurableTopicBindingStore',
    'durableTopicBindingRecordToSnapshot',
    'normalizeDurableTopicBindingRecord',
    'cloneDurableTopicBindingRecord',
  ], 'storage/topic-binding');
  assertExports(storageIdempotency, ['createDurableIdempotencyStore'], 'storage/idempotency');
  assertExports(storageCallbacks, ['createDurableCallbackTokenStore'], 'storage/callbacks');
  assertExports(storageDelivery, ['createDurableDeliveryStore'], 'storage/delivery');
  assertExports(storageCore, [
    'DURABLE_CORE_STORE_ADAPTER_NAMES',
    'createDurableCoreStoreAdapterBundle',
    'summarizeDurableCoreStoreReadiness',
  ], 'storage/core');
});

test('representative storage smoke calls work through root and storage barrels', async () => {
  const snapshot = root.createTopicBindingSnapshot({
    key: { workspaceId: 'workspace-alpha', channelId: 'channel-alpha', topicId: 'topic-alpha' },
    status: 'active',
    agentId: 'agent-alpha',
    sessionId: 'session-alpha',
    createdAtIso: '2026-01-01T00:00:00.000Z',
    updatedAtIso: '2026-01-01T00:00:00.000Z',
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
    key: root.createCallbackIdempotencyKey({ channelId: 'ch', chatId: '1', callbackId: 'cb' }),
    firstSeenAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(reserved.ok, true);
  assert.equal(reserved.value.kind, 'reserved');

  assert.equal(typeof storageCallbacks.createDurableCallbackTokenStore, 'function');
  assert.equal(typeof storageDelivery.createDurableDeliveryStore, 'function');

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
