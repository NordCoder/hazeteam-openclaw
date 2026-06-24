import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowPermission,
  createCallbackIdempotencyKey,
  createDeliveryAttemptIdempotencyKey,
  createTopicBindingSnapshot,
  denyPermission,
} from '../../packages/openclaw-adapter/dist/index.js';
import {
  createDurableCallbackTokenStore,
  createDurableCoreStoreAdapterBundle,
  createDurableDeliveryStore,
  createDurableIdempotencyStore,
  createDurableTopicBindingRecord,
  createDurableTopicBindingStore,
} from '../../packages/openclaw-adapter/dist/storage/index.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createTopicPort() {
  const records = new Map();
  return Object.freeze({
    get: (key) => clone(records.get(key)),
    put(record) {
      const copy = clone(record);
      records.set(copy.recordKey, copy);
      return clone(copy);
    },
    delete: (key) => records.delete(key),
    list: () => [...records.values()].map(clone),
  });
}

function createKeyBoundary(fieldName) {
  const records = new Map();
  return Object.freeze({
    get(key) {
      const record = records.get(key);
      return record === undefined ? null : clone(record);
    },
    put(record) {
      const copy = clone(record);
      records.set(copy[fieldName], copy);
      return clone(copy);
    },
    delete: (key) => records.delete(key),
    list: () => [...records.values()].map(clone),
  });
}

function createDeliveryBoundary() {
  const records = new Map();
  return Object.freeze({
    read: (key) => (records.has(key) ? clone(records.get(key)) : undefined),
    write(key, record) {
      records.set(key, clone(record));
    },
    list(prefix) {
      return [...records.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => clone(value));
    },
  });
}

function createCoreBoundary() {
  const records = new Map();
  return Object.freeze({
    get: (key) => clone(records.get(key)),
    put(record) {
      const copy = clone(record);
      records.set(copy.recordKey, copy);
      return clone(copy);
    },
    delete(key) {
      records.delete(key);
      return true;
    },
    list: () => [...records.values()].map(clone),
  });
}

function assertSafeOutput(value) {
  const serialized = JSON.stringify(value);
  assert.equal(typeof serialized, 'string');
  for (const blocked of ['raw', 'stack']) {
    assert.equal(serialized.toLowerCase().includes(blocked), false, `output includes blocked marker ${blocked}`);
  }
}

test('W7 durable stores replay safe deterministic state after restart-like re-instantiation', async () => {
  const topicPort = createTopicPort();
  const topicSnapshot = createTopicBindingSnapshot({
    key: { workspaceId: 'workspace-w7e', channelId: 'channel-w7e', topicId: 'topic-w7e' },
    status: 'active',
    agentId: 'coder',
    sessionId: 'session-w7e',
    createdAtIso: '2026-06-24T00:00:00.000Z',
    updatedAtIso: '2026-06-24T00:01:00.000Z',
  });
  createDurableTopicBindingStore({ records: topicPort }).upsert(topicSnapshot);
  const restartedTopic = createDurableTopicBindingStore({ records: topicPort });
  assert.deepEqual(restartedTopic.get(topicSnapshot.key), topicSnapshot);
  assert.deepEqual(restartedTopic.listRecords(), [createDurableTopicBindingRecord(topicSnapshot)]);

  const idempotencyBoundary = createKeyBoundary('key');
  const idempotencyKey = createCallbackIdempotencyKey({
    channelId: 'channel-w7e',
    chatId: 'chat-w7e',
    callbackId: 'callback-w7e',
  });
  const idempotency = createDurableIdempotencyStore(idempotencyBoundary);
  const reserved = await idempotency.reserve({
    key: idempotencyKey,
    firstSeenAt: '2026-06-24T00:02:00.000Z',
    operationRef: 'operation:w7e-reserve',
  });
  const completed = await idempotency.markCompleted({
    key: idempotencyKey,
    completedAt: '2026-06-24T00:03:00.000Z',
    resultRef: 'result:w7e',
  });
  const duplicate = await createDurableIdempotencyStore(idempotencyBoundary).reserve({
    key: idempotencyKey,
    firstSeenAt: '2026-06-24T00:04:00.000Z',
  });
  assert.equal(reserved.ok, true);
  assert.equal(completed.ok, true);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.value.kind, 'duplicate');
  assert.equal(duplicate.value.record.status, 'completed');

  const callbackBoundary = createKeyBoundary('tokenRef');
  const callback = createDurableCallbackTokenStore(callbackBoundary);
  const requirement = Object.freeze({
    action: 'consume-callback',
    resourceKind: 'callback',
    actorRef: 'actor:w7e',
    workspaceRef: 'workspace:w7e',
    agentRef: 'agent:coder',
  });
  const verification = Object.freeze({
    status: 'verified',
    tokenRef: 'token:w7e-approve',
    verificationRef: 'verification:w7e-approve',
    actionRef: 'callback-action:w7e-approve',
  });
  const consumption = Object.freeze({
    status: 'consumed',
    tokenRef: 'token:w7e-approve',
    consumptionRef: 'consumption:w7e-approve',
  });
  const denied = await callback.recordDenied({
    tokenRef: 'token:w7e-denied',
    deniedAt: '2026-06-24T00:05:00.000Z',
    permission: denyPermission({ requirement, reason: 'not allowed' }),
  });
  const beforeVerified = await callback.recordConsumed({
    tokenRef: 'token:w7e-approve',
    consumedAt: '2026-06-24T00:05:30.000Z',
    verification,
    consumption,
    permission: allowPermission(requirement),
    idempotencyKey,
  });
  await callback.recordVerified({
    tokenRef: 'token:w7e-approve',
    verifiedAt: '2026-06-24T00:06:00.000Z',
    verification,
    idempotencyKey,
  });
  const restartedCallback = createDurableCallbackTokenStore(callbackBoundary);
  const consumed = await restartedCallback.recordConsumed({
    tokenRef: 'token:w7e-approve',
    consumedAt: '2026-06-24T00:07:00.000Z',
    verification,
    consumption,
    permission: allowPermission(requirement),
    idempotencyKey,
  });
  const callbackByKey = await restartedCallback.getByIdempotencyKey(idempotencyKey);
  assert.equal(denied.ok, true);
  assert.equal(denied.value.tokenConsumed, false);
  assert.equal(beforeVerified.ok, false);
  assert.equal(beforeVerified.error.code, 'not-found');
  assert.equal(consumed.ok, true);
  assert.equal(consumed.value.tokenConsumed, true);
  assert.equal(callbackByKey.ok, true);
  assert.equal(callbackByKey.value.status, 'consumed');

  const deliveryBoundary = createDeliveryBoundary();
  const delivery = createDurableDeliveryStore({ boundary: deliveryBoundary });
  const request = Object.freeze({
    deliveryRef: 'operation:w7e-delivery',
    target: Object.freeze({
      channelId: 'telegram-channel:w7e',
      chatId: 'telegram-chat:w7e',
      messageThreadId: 'telegram-thread:w7e',
      workspaceRef: 'workspace:w7e',
      agentRef: 'agent:coder',
    }),
    content: Object.freeze({ format: 'plain', text: 'Durable delivery restart replay.' }),
    correlationRef: 'correlation:w7e-delivery',
  });
  const deliveryKey = createDeliveryAttemptIdempotencyKey({
    outboxRef: 'outbox-w7e',
    claimRef: 'claim-w7e',
    attemptNumber: 1,
  });
  const registered = await delivery.registerAttempt({
    request,
    idempotencyKey: deliveryKey,
    attemptNumber: 1,
    createdAtIso: '2026-06-24T00:08:00.000Z',
  });
  const restartedDelivery = createDurableDeliveryStore({ boundary: deliveryBoundary });
  assert.deepEqual(await restartedDelivery.getAttemptByDeliveryRef(request.deliveryRef), registered.record);
  assert.deepEqual(await restartedDelivery.getAttemptByIdempotencyKey(deliveryKey), registered.record);
  const delivered = await restartedDelivery.markDelivered({
    result: Object.freeze({
      ok: true,
      deliveryRef: request.deliveryRef,
      externalMessageRef: Object.freeze({
        ...request.target,
        messageId: 'telegram-message:w7e-delivered',
        correlationRef: request.correlationRef,
      }),
      correlationRef: request.correlationRef,
    }),
    recordedAtIso: '2026-06-24T00:09:00.000Z',
  });
  assert.equal(delivered.recordKind, 'delivery-success-result');
  assert.deepEqual(await restartedDelivery.getExternalMessageRefByDeliveryRef(request.deliveryRef), delivered.externalMessageRef);

  const coreBoundaries = Object.freeze({
    sessionBindingStore: createCoreBoundary(),
    presentationOutboxStore: createCoreBoundary(),
    presentationActionTokenStore: createCoreBoundary(),
  });
  const core = createDurableCoreStoreAdapterBundle({ boundaries: coreBoundaries });
  assert.equal(core.ok, true);
  await core.value.adapters.sessionBindingStore.putSessionBinding({
    recordKind: 'core.session-binding',
    recordKey: 'session:w7e',
    externalSessionRef: 'correlation:w7e-external',
    hostSessionRef: 'correlation:w7e-host',
    workspaceRef: 'workspace:w7e',
    agentRef: 'agent:coder',
    status: 'active',
    safeMessage: 'safe session binding persisted',
  });
  await core.value.adapters.presentationOutboxStore.putPresentationOutboxRecord({
    recordKind: 'core.presentation-outbox',
    recordKey: 'presentation:w7e',
    presentationRef: 'details:w7e-presentation',
    status: 'pending',
    serializedPayloadDescriptor: Object.freeze({
      format: 'json-safe-ref',
      contentRef: 'details:w7e-rendered',
      summary: 'safe presentation summary',
    }),
  });
  await core.value.adapters.presentationActionTokenStore.putActionTokenRecord({
    recordKind: 'core.action-token',
    recordKey: 'action-token:w7e',
    actionTokenRef: 'details:w7e-action-token',
    presentationRef: 'details:w7e-presentation',
    actorRef: 'actor:w7e',
    status: 'issued',
    issuedByOperationRef: 'operation:w7e-token-issued',
  });
  const restartedCore = createDurableCoreStoreAdapterBundle({ boundaries: coreBoundaries });
  const replayedSession = await restartedCore.value.adapters.sessionBindingStore.getSessionBinding('session:w7e');
  const pendingOutbox = await restartedCore.value.adapters.presentationOutboxStore.listPendingPresentationOutboxRecords();
  const consumedToken = await restartedCore.value.adapters.presentationActionTokenStore.consumeActionTokenRecord('action-token:w7e', {
    consumedByOperationRef: 'operation:w7e-token-consumed',
    safeMessage: 'safe callback consumed after permission',
  });
  assert.equal(restartedCore.ok, true);
  assert.equal(restartedCore.value.readiness.status, 'ready');
  assert.equal(replayedSession.ok, true);
  assert.equal(replayedSession.value.hostSessionRef, 'correlation:w7e-host');
  assert.equal(pendingOutbox.ok, true);
  assert.deepEqual(pendingOutbox.value.map((record) => record.recordKey), ['presentation:w7e']);
  assert.equal(consumedToken.ok, true);
  assert.equal(consumedToken.value.status, 'consumed');

  for (const sample of [
    restartedTopic.listRecords(),
    completed,
    duplicate,
    denied,
    consumed,
    callbackByKey,
    registered,
    delivered,
    replayedSession,
    pendingOutbox,
    consumedToken,
  ]) {
    assertSafeOutput(sample);
  }
});
