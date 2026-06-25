import assert from 'node:assert/strict';
import test from 'node:test';

import { createDeliveryAttemptStore } from '../../../dist/storage/delivery-attempts/index.js';

const CREATED_AT = '2026-06-25T00:00:00.000Z';
const ACK_AT = '2026-06-25T00:00:01.000Z';
const BUSINESS_AT = '2026-06-25T00:00:02.000Z';
const UNSAFE_FAILURE_TEXT = [
  ['bot', 'Token=abc'].join(''),
  ['raw', 'Provider', 'Payload'].join(''),
  ['st', 'ack'].join(''),
  ['sec', 'ret'].join(''),
].join(' ');

function createMemoryBoundary() {
  const records = new Map();
  return {
    read(key) {
      return records.get(key);
    },
    write(key, record) {
      records.set(key, JSON.parse(JSON.stringify(record)));
    },
    list(prefix) {
      return [...records.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, record]) => record);
    },
    size() {
      return records.size;
    },
  };
}

function createRequest(deliveryRef = 'operation:delivery-1') {
  return {
    deliveryRef,
    target: {
      channelId: 'telegram-channel:test-channel',
      chatId: 'telegram-chat:test-chat',
      messageThreadId: 'telegram-thread:test-thread',
    },
    content: {
      format: 'plain',
      text: 'visible message text must not be stored in public attempt records',
    },
    correlationRef: 'correlation:delivery-1',
  };
}

function createSuccess(deliveryRef = 'operation:delivery-1') {
  return {
    ok: true,
    deliveryRef,
    externalMessageRef: {
      channelId: 'telegram-channel:test-channel',
      chatId: 'telegram-chat:test-chat',
      messageThreadId: 'telegram-thread:test-thread',
      messageId: 'telegram-message:test-message',
      correlationRef: 'correlation:delivery-1',
    },
    correlationRef: 'correlation:delivery-1',
  };
}

function createFailure(deliveryRef = 'operation:delivery-1') {
  return {
    ok: false,
    deliveryRef,
    error: {
      code: 'provider-unavailable',
      message: UNSAFE_FAILURE_TEXT,
      retryable: true,
      correlationRef: 'correlation:delivery-1',
    },
    retryable: true,
    correlationRef: 'correlation:delivery-1',
  };
}

function assertNoForbiddenPublicMaterial(record) {
  const serialized = JSON.stringify(record);
  for (const forbidden of [
    'botToken',
    'rawProviderPayload',
    'stack',
    'secret',
    'telegram-chat:test-chat',
    'telegram-message:test-message',
    'visible message text',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into public record`);
  }
}

test('delivery attempt store registers attempts once per replay key', async () => {
  const boundary = createMemoryBoundary();
  const store = createDeliveryAttemptStore({ boundary });
  const input = {
    request: createRequest(),
    idempotencyKey: 'delivery-attempt:outbox:outbox-1:claim:claim-1:attempt:1',
    attemptNumber: 1,
    createdAtIso: CREATED_AT,
  };

  const first = await store.registerAttempt(input);
  const replay = await store.registerAttempt(input);

  assert.equal(first.registrationStatus, 'registered');
  assert.equal(first.shouldExecuteDelivery, true);
  assert.equal(replay.registrationStatus, 'duplicate');
  assert.equal(replay.shouldExecuteDelivery, false);
  assert.equal(replay.record.attemptRef, first.record.attemptRef);
  assert.equal((await store.listAttempts()).length, 1);
  assertNoForbiddenPublicMaterial(first.record);
});

test('provider acknowledgement is recorded separately from business success', async () => {
  const store = createDeliveryAttemptStore({ boundary: createMemoryBoundary() });
  const registered = await store.registerAttempt({
    request: createRequest(),
    idempotencyKey: 'delivery-attempt:outbox:outbox-2:claim:claim-2:attempt:1',
    createdAtIso: CREATED_AT,
  });

  const acknowledgement = await store.recordProviderAcknowledgement({
    attemptRef: registered.record.attemptRef,
    idempotencyKey: registered.record.idempotencyKey,
    result: createSuccess(),
    recordedAtIso: ACK_AT,
  });
  const afterAcknowledgement = await store.getAttemptByAttemptRef(registered.record.attemptRef);

  assert.equal(acknowledgement.record.acceptedByProvider, true);
  assert.equal(acknowledgement.record.businessResultStatus, 'not-evaluated');
  assert.equal(acknowledgement.record.shouldMarkDelivered, false);
  assert.equal(afterAcknowledgement.businessResultStatus, 'not-evaluated');
  assert.equal(afterAcknowledgement.executionStatus, 'provider-acknowledged');

  const business = await store.recordBusinessResult({
    attemptRef: registered.record.attemptRef,
    deliveryRef: registered.record.deliveryRef,
    idempotencyKey: registered.record.idempotencyKey,
    providerAcknowledgementRef: acknowledgement.record.providerAcknowledgementRef,
    businessResultStatus: 'marked-delivered',
    retryEligibility: 'not-eligible',
    recordedAtIso: BUSINESS_AT,
  });
  const afterBusiness = await store.getAttemptByAttemptRef(registered.record.attemptRef);

  assert.equal(business.record.shouldMarkDelivered, true);
  assert.equal(business.record.shouldRetry, false);
  assert.equal(afterBusiness.businessResultStatus, 'marked-delivered');
  assert.equal(afterBusiness.executionStatus, 'business-succeeded');
  assertNoForbiddenPublicMaterial(acknowledgement.record);
  assertNoForbiddenPublicMaterial(business.record);
});

test('provider failures are redacted and replay-safe', async () => {
  const store = createDeliveryAttemptStore({ boundary: createMemoryBoundary() });
  const registered = await store.registerAttempt({
    request: createRequest(),
    idempotencyKey: 'delivery-attempt:outbox:outbox-3:claim:claim-3:attempt:1',
    createdAtIso: CREATED_AT,
  });

  const failure = await store.recordProviderAcknowledgement({
    attemptRef: registered.record.attemptRef,
    idempotencyKey: registered.record.idempotencyKey,
    result: createFailure(),
    recordedAtIso: ACK_AT,
  });
  const replay = await store.recordProviderAcknowledgement({
    attemptRef: registered.record.attemptRef,
    idempotencyKey: registered.record.idempotencyKey,
    result: createFailure(),
    recordedAtIso: ACK_AT,
  });

  assert.equal(failure.record.providerAcknowledgementStatus, 'failed');
  assert.equal(failure.record.retryEligibility, 'eligible');
  assert.equal(failure.record.businessResultStatus, 'not-evaluated');
  assert.equal(replay.recordingStatus, 'duplicate');
  assertNoForbiddenPublicMaterial(failure.record);
});
