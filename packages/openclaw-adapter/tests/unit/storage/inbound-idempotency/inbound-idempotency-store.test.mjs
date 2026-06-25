import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdapterSafeError,
  createCallbackIdempotencyKey,
  createInboundMessageIdempotencyKey,
} from '../../../../dist/contracts/index.js';
import {
  createInboundIdempotencyFingerprint,
  createInboundIdempotencyRecord,
} from '../../../../dist/inbound-idempotency/inbound-idempotency-records.js';
import { createInboundIdempotencyStore } from '../../../../dist/storage/inbound-idempotency/inbound-idempotency-store.js';

const forbiddenSerializedTerms = [
  'rawUpdate',
  'telegramUpdate',
  'rawProviderResponse',
  'rawRuntimePayload',
  'toolPayload',
  'approvalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
  'endpoint',
  'sdk',
  'client',
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFakeBoundary() {
  const records = new Map();

  return {
    records,
    boundary: Object.freeze({
      get(idempotencyRef) {
        const record = records.get(idempotencyRef);
        return record === undefined ? null : clone(record);
      },
      put(record) {
        const cloned = clone(record);
        records.set(cloned.idempotencyRef, cloned);
        return clone(cloned);
      },
      list() {
        return [...records.values()].map(clone);
      },
    }),
  };
}

function messageKey(messageId = 'message-1') {
  return createInboundMessageIdempotencyKey({
    channelId: 'telegram-channel-demo',
    chatId: 'telegram-chat-demo',
    messageId,
  });
}

function callbackKey(callbackId = 'callback-1') {
  return createCallbackIdempotencyKey({
    channelId: 'telegram-channel-demo',
    chatId: 'telegram-chat-demo',
    callbackId,
  });
}

function messageReserveInput(messageId = 'message-1') {
  return Object.freeze({
    eventRef: `inbound-event:${messageId}`,
    idempotencyRef: messageKey(messageId),
    eventKind: 'message',
    channelRef: 'telegram-channel:demo',
    chatRef: 'telegram-chat:demo',
    messageRef: `telegram-message:${messageId}`,
    firstSeenRef: `seen:${messageId}-first`,
    correlationRef: `correlation:${messageId}`,
  });
}

function assertSafeSerialized(value) {
  const serialized = JSON.stringify(value);

  for (const forbiddenTerm of forbiddenSerializedTerms) {
    assert.equal(
      serialized.includes(forbiddenTerm),
      false,
      `serialized value must not include ${forbiddenTerm}`,
    );
  }
}

test('inbound idempotency store reserves once and suppresses duplicate replay effects', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createInboundIdempotencyStore(boundary);
  const firstInput = messageReserveInput();
  const secondInput = Object.freeze({
    ...firstInput,
    firstSeenRef: 'seen:message-1-duplicate',
  });

  const firstReserve = await store.reserve(firstInput);
  const secondReserve = await store.reserve(secondInput);

  assert.equal(firstReserve.ok, true);
  assert.equal(firstReserve.value.kind, 'reserved');
  assert.equal(firstReserve.value.duplicate, false);
  assert.equal(firstReserve.value.shouldDispatchCommandIntent, true);
  assert.deepEqual(firstReserve.value.suppressedEffects, []);
  assert.equal(firstReserve.value.record.status, 'reserved');
  assert.equal(Object.isFrozen(firstReserve.value.record), true);

  assert.equal(secondReserve.ok, true);
  assert.equal(secondReserve.value.kind, 'duplicate');
  assert.equal(secondReserve.value.duplicate, true);
  assert.equal(secondReserve.value.shouldDispatchCommandIntent, false);
  assert.deepEqual(secondReserve.value.suppressedEffects, [
    'command-intent-dispatch',
    'runtime-dispatch',
    'delivery',
    'callback-consume',
    'approval-state',
  ]);
  assert.equal(secondReserve.value.duplicateOfEventRef, 'inbound-event:message-1');
  assert.equal(secondReserve.value.record.lastSeenRef, 'seen:message-1-duplicate');
  assert.equal(records.size, 1);
  assertSafeSerialized(secondReserve.value);
});

test('inbound idempotency store completes records idempotently without duplicate dispatch', async () => {
  const { boundary } = createFakeBoundary();
  const store = createInboundIdempotencyStore(boundary);
  const input = messageReserveInput('message-2');

  const reserved = await store.reserve(input);
  const completed = await store.markCompleted({
    idempotencyRef: input.idempotencyRef,
    completedSeenRef: 'seen:message-2-completed',
    lastOutcomeRef: 'outcome:command-intent-created',
    processedRef: 'processed:command-intent-dispatch',
  });
  const completedReplay = await store.markCompleted({
    idempotencyRef: input.idempotencyRef,
    completedSeenRef: 'seen:message-2-replayed',
    lastOutcomeRef: 'outcome:ignored-replay',
    processedRef: 'processed:ignored-replay',
  });
  const duplicateAfterCompletion = await store.reserve({
    ...input,
    firstSeenRef: 'seen:message-2-duplicate',
  });

  assert.equal(reserved.ok, true);
  assert.equal(completed.ok, true);
  assert.equal(completed.value.status, 'completed');
  assert.equal(completed.value.lastOutcomeRef, 'outcome:command-intent-created');
  assert.equal(completed.value.processedRef, 'processed:command-intent-dispatch');
  assert.deepEqual(completedReplay, completed);
  assert.equal(duplicateAfterCompletion.ok, true);
  assert.equal(duplicateAfterCompletion.value.shouldDispatchCommandIntent, false);
  assert.equal(duplicateAfterCompletion.value.record.status, 'completed');
  assertSafeSerialized(completed.value);
});

test('inbound idempotency records support callback event duplicates without raw callback material', async () => {
  const { boundary } = createFakeBoundary();
  const store = createInboundIdempotencyStore(boundary);
  const idempotencyRef = callbackKey();
  const first = await store.reserve({
    eventRef: 'inbound-event:callback-1',
    idempotencyRef,
    eventKind: 'callback',
    channelRef: 'telegram-channel:demo',
    chatRef: 'telegram-chat:demo',
    callbackRef: 'callback:opaque-1',
    firstSeenRef: 'seen:callback-1-first',
  });
  const duplicate = await store.reserve({
    eventRef: 'inbound-event:callback-1-replay',
    idempotencyRef,
    eventKind: 'callback',
    channelRef: 'telegram-channel:demo',
    chatRef: 'telegram-chat:demo',
    callbackRef: 'callback:opaque-1',
    firstSeenRef: 'seen:callback-1-duplicate',
  });

  assert.equal(first.ok, true);
  assert.equal(first.value.record.messageRef, undefined);
  assert.equal(first.value.record.callbackRef, 'callback:opaque-1');
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.value.shouldDispatchCommandIntent, false);
  assert.equal(duplicate.value.duplicateOfEventRef, 'inbound-event:callback-1');
  assertSafeSerialized([first.value, duplicate.value]);
});

test('inbound idempotency record normalization rejects unsafe fields and scopes', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createInboundIdempotencyStore(boundary);
  const unsafe = await store.reserve({
    ...messageReserveInput('message-3'),
    rawProviderResponse: Object.freeze({ botToken: 'must-not-leak' }),
  });
  const wrongScope = await store.reserve({
    ...messageReserveInput('message-4'),
    idempotencyRef: callbackKey('callback-wrong-scope'),
  });

  assert.equal(unsafe.ok, false);
  assert.equal(unsafe.error.code, 'invalid-input');
  assert.equal(wrongScope.ok, false);
  assert.equal(wrongScope.error.code, 'invalid-input');
  assert.equal(records.size, 0);
  assertSafeSerialized([unsafe, wrongScope]);
});

test('inbound idempotency helpers derive stable fingerprints and safe failed records', () => {
  const base = messageReserveInput('message-5');
  const fingerprint = createInboundIdempotencyFingerprint(base);
  const failed = createInboundIdempotencyRecord({
    ...base,
    safeEventFingerprint: fingerprint,
    status: 'failed',
    lastOutcomeRef: 'outcome:failed-safe',
    failureRef: 'failure:normalization',
    error: createAdapterSafeError({
      code: 'invalid-input',
      message: 'inbound-idempotency-failed',
      retryable: false,
    }),
  });

  assert.equal(fingerprint, createInboundIdempotencyFingerprint(base));
  assert.equal(failed.status, 'failed');
  assert.equal(failed.safeEventFingerprint, fingerprint);
  assert.equal(failed.error?.code, 'invalid-input');
  assertSafeSerialized(failed);
});
