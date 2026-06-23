import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdapterSafeError,
  createCallbackIdempotencyKey,
} from '../../../../dist/contracts/index.js';
import { createDurableIdempotencyStore } from '../../../../dist/storage/idempotency/durable-idempotency-store.js';

const firstSeenAt = '2026-06-24T00:00:00.000Z';
const completedAt = '2026-06-24T00:01:00.000Z';
const failedAt = '2026-06-24T00:02:00.000Z';

const forbiddenSerializedTerms = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawApprovalPayload',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credential',
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFakeBoundary() {
  const records = new Map();

  return {
    records,
    boundary: Object.freeze({
      get(key) {
        const record = records.get(key);
        return record === undefined ? null : clone(record);
      },
      put(record) {
        const cloned = clone(record);
        records.set(cloned.key, cloned);
        return clone(cloned);
      },
      delete(key) {
        return records.delete(key);
      },
      list() {
        return [...records.values()].map(clone);
      },
    }),
  };
}

function callbackKey(callbackId = 'callback-1') {
  return createCallbackIdempotencyKey({
    channelId: 'channel-main',
    chatId: 'chat-1',
    callbackId,
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

test('reserves pending idempotency records and returns duplicate decisions without overwriting', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createDurableIdempotencyStore(boundary);
  const key = callbackKey();

  const firstReserve = await store.reserve({
    key,
    firstSeenAt,
    operationRef: 'operation:idempotency-reserve',
    correlationRef: 'correlation:idempotency-reserve',
    detailsRef: 'details:idempotency-reserve',
  });
  const secondReserve = await store.reserve({ key, firstSeenAt: '2026-06-24T00:00:30.000Z' });

  assert.equal(firstReserve.ok, true);
  assert.equal(firstReserve.value.kind, 'reserved');
  assert.equal(firstReserve.value.duplicate, false);
  assert.equal(firstReserve.value.record.status, 'pending');
  assert.equal(firstReserve.value.record.scope, 'callback');
  assert.equal(Object.isFrozen(firstReserve.value.record), true);

  assert.equal(secondReserve.ok, true);
  assert.equal(secondReserve.value.kind, 'duplicate');
  assert.equal(secondReserve.value.duplicate, true);
  assert.equal(secondReserve.value.record.firstSeenAt, firstSeenAt);
  assert.equal(records.size, 1);
});

test('gets existing and missing idempotency records through normalized safe DTOs', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableIdempotencyStore(boundary);
  const key = callbackKey();
  const missingKey = callbackKey('missing-callback');

  await store.reserve({ key, firstSeenAt });

  const existing = await store.get(key);
  const missing = await store.get(missingKey);

  assert.equal(existing.ok, true);
  assert.equal(existing.value?.key, key);
  assert.equal(existing.value?.status, 'pending');
  assert.equal(Object.isFrozen(existing.value), true);

  assert.equal(missing.ok, true);
  assert.equal(missing.value, null);
});

test('marks reserved idempotency records completed with safe result metadata', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableIdempotencyStore(boundary);
  const key = callbackKey();

  await store.reserve({ key, firstSeenAt });
  const completed = await store.markCompleted({
    key,
    completedAt,
    resultRef: 'result:callback-1',
    operationRef: 'operation:idempotency-complete',
    correlationRef: 'correlation:idempotency-complete',
  });
  const replay = await store.get(key);

  assert.equal(completed.ok, true);
  assert.equal(completed.value.status, 'completed');
  assert.equal(completed.value.completedAt, completedAt);
  assert.equal(completed.value.resultRef, 'result:callback-1');
  assert.equal(completed.value.error, undefined);
  assert.deepEqual(replay, { ok: true, value: completed.value });
  assertSafeSerialized(completed.value);
});

test('marks reserved idempotency records failed with sanitized safe errors', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableIdempotencyStore(boundary);
  const key = callbackKey();

  await store.reserve({ key, firstSeenAt });
  const failed = await store.markFailed({
    key,
    failedAt,
    failureRef: 'failure:callback-1',
    error: createAdapterSafeError({
      code: 'dependency-failed',
      message: 'Boundary failed rawError stack botToken=abc apiKey=def secret password credential',
      retryable: true,
    }),
  });

  assert.equal(failed.ok, true);
  assert.equal(failed.value.status, 'failed');
  assert.equal(failed.value.failedAt, failedAt);
  assert.equal(failed.value.failureRef, 'failure:callback-1');
  assert.equal(failed.value.error.code, 'dependency-failed');
  assert.equal(failed.value.error.retryable, true);
  assertSafeSerialized(failed.value);
});

test('deletes records by idempotency key and lists deterministic safe records', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableIdempotencyStore(boundary);
  const firstKey = callbackKey('callback-1');
  const secondKey = callbackKey('callback-2');

  await store.reserve({ key: firstKey, firstSeenAt });
  await store.reserve({ key: secondKey, firstSeenAt });

  const listedBeforeDelete = await store.list();
  const deleted = await store.delete(firstKey);
  const listedAfterDelete = await store.list();

  assert.equal(listedBeforeDelete.ok, true);
  assert.equal(listedBeforeDelete.value.length, 2);
  assert.equal(deleted.ok, true);
  assert.deepEqual(deleted.value, { key: firstKey, deleted: true });
  assert.equal(listedAfterDelete.ok, true);
  assert.deepEqual(
    listedAfterDelete.value.map((record) => record.key),
    [secondKey],
  );
});

test('rejects malformed idempotency inputs without writing unsafe records', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createDurableIdempotencyStore(boundary);

  const malformedReserve = await store.reserve({
    key: 'callback:channel-main:chat 1:thread-none:callback-1',
    firstSeenAt,
  });
  const unsafeReserve = await store.reserve({
    key: callbackKey(),
    firstSeenAt,
    rawProviderResponse: { ok: true },
  });

  assert.equal(malformedReserve.ok, false);
  assert.equal(malformedReserve.error.code, 'invalid-input');
  assert.equal(unsafeReserve.ok, false);
  assert.equal(unsafeReserve.error.code, 'invalid-input');
  assert.equal(records.size, 0);
  assertSafeSerialized(malformedReserve);
  assertSafeSerialized(unsafeReserve);
});
