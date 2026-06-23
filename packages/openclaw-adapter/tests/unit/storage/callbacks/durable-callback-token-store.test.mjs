import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowPermission,
  createAdapterSafeError,
  createCallbackIdempotencyKey,
  denyPermission,
} from '../../../../dist/contracts/index.js';
import { createDurableCallbackTokenStore } from '../../../../dist/storage/callbacks/durable-callback-token-store.js';

const tokenRef = 'token:approve-1';
const idempotencyKey = createCallbackIdempotencyKey({
  channelId: 'channel-main',
  chatId: 'chat-1',
  callbackId: 'callback-1',
});
const verifiedAt = '2026-06-24T00:00:00.000Z';
const deniedAt = '2026-06-24T00:01:00.000Z';
const consumedAt = '2026-06-24T00:02:00.000Z';
const failedAt = '2026-06-24T00:03:00.000Z';

const permissionRequirement = Object.freeze({
  action: 'consume-callback',
  resourceKind: 'callback',
  actorRef: 'actor:user-1',
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:coder',
  resourceRef: 'callback:approve-1',
});

const verification = Object.freeze({
  status: 'verified',
  tokenRef,
  verificationRef: 'verification:approve-1',
  actionRef: 'callback-action:approve-1',
});

const consumption = Object.freeze({
  status: 'consumed',
  tokenRef,
  consumptionRef: 'consumption:approve-1',
});

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
      get(recordTokenRef) {
        const record = records.get(recordTokenRef);
        return record === undefined ? null : clone(record);
      },
      put(record) {
        const cloned = clone(record);
        records.set(cloned.tokenRef, cloned);
        return clone(cloned);
      },
      delete(recordTokenRef) {
        return records.delete(recordTokenRef);
      },
      list() {
        return [...records.values()].map(clone);
      },
    }),
  };
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

test('records verified callback token lifecycle records', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);

  const recorded = await store.recordVerified({
    tokenRef,
    verifiedAt,
    verification,
    idempotencyKey,
    detailsRef: 'details:callback-store',
    correlationRef: 'correlation:callback-store',
  });
  const replay = await store.getByToken(tokenRef);

  assert.equal(recorded.ok, true);
  assert.equal(recorded.value.kind, 'recorded');
  assert.equal(recorded.value.duplicate, false);
  assert.equal(recorded.value.record.status, 'verified');
  assert.equal(recorded.value.record.tokenConsumed, false);
  assert.equal(recorded.value.record.verification.verificationRef, 'verification:approve-1');
  assert.equal(Object.isFrozen(recorded.value.record), true);

  assert.equal(replay.ok, true);
  assert.deepEqual(replay.value, recorded.value.record);
  assertSafeSerialized(recorded.value.record);
});

test('records denied callback decisions without consuming tokens', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);
  const permission = denyPermission({
    requirement: permissionRequirement,
    reason: 'Actor context is not trusted.',
  });

  const denied = await store.recordDenied({
    tokenRef,
    deniedAt,
    permission,
    idempotencyKey,
  });

  assert.equal(denied.ok, true);
  assert.equal(denied.value.status, 'denied');
  assert.equal(denied.value.tokenConsumed, false);
  assert.equal(denied.value.deniedAt, deniedAt);
  assert.equal(denied.value.permission.status, 'denied');
  assert.equal('consumption' in denied.value, false);
  assertSafeSerialized(denied.value);
});

test('records consumed callback tokens only after stored verification and allowed permission input', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);
  const permission = allowPermission(permissionRequirement);

  const beforeVerification = await store.recordConsumed({
    tokenRef,
    consumedAt,
    verification,
    consumption,
    permission,
    idempotencyKey,
  });
  await store.recordVerified({ tokenRef, verifiedAt, verification, idempotencyKey });
  const consumed = await store.recordConsumed({
    tokenRef,
    consumedAt,
    verification,
    consumption,
    permission,
    idempotencyKey,
  });
  const duplicateConsumed = await store.recordConsumed({
    tokenRef,
    consumedAt,
    verification,
    consumption,
    permission,
    idempotencyKey,
  });

  assert.equal(beforeVerification.ok, false);
  assert.equal(beforeVerification.error.code, 'not-found');

  assert.equal(consumed.ok, true);
  assert.equal(consumed.value.status, 'consumed');
  assert.equal(consumed.value.tokenConsumed, true);
  assert.equal(consumed.value.permission.status, 'allowed');
  assert.equal(consumed.value.verification.status, 'verified');
  assert.equal(consumed.value.consumption.status, 'consumed');
  assert.equal(consumed.value.consumedAt, consumedAt);
  assertSafeSerialized(consumed.value);

  assert.equal(duplicateConsumed.ok, true);
  assert.equal(duplicateConsumed.value.status, 'consumed');
  assert.equal(duplicateConsumed.value.tokenConsumed, true);
});

test('rejects malformed token refs without touching durable boundary state', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);

  const malformed = await store.recordVerified({
    tokenRef: 'token:approve 1',
    verifiedAt,
    verification: Object.freeze({
      ...verification,
      tokenRef: 'token:approve 1',
    }),
  });

  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, 'invalid-input');
  assert.equal(records.size, 0);
  assertSafeSerialized(malformed);
});

test('replays callback records by token and idempotency key', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);

  await store.recordVerified({ tokenRef, verifiedAt, verification, idempotencyKey });

  const byToken = await store.getByToken(tokenRef);
  const byIdempotencyKey = await store.getByIdempotencyKey(idempotencyKey);
  const missingByIdempotencyKey = await store.getByIdempotencyKey(
    createCallbackIdempotencyKey({
      channelId: 'channel-main',
      chatId: 'chat-1',
      callbackId: 'callback-missing',
    }),
  );

  assert.equal(byToken.ok, true);
  assert.equal(byToken.value.status, 'verified');
  assert.equal(byIdempotencyKey.ok, true);
  assert.equal(byIdempotencyKey.value.tokenRef, tokenRef);
  assert.equal(missingByIdempotencyKey.ok, true);
  assert.equal(missingByIdempotencyKey.value, null);
});

test('records failed callback lifecycle records with sanitized safe errors', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);

  const failed = await store.recordFailed({
    tokenRef,
    failedAt,
    idempotencyKey,
    failureRef: 'failure:callback-1',
    error: createAdapterSafeError({
      code: 'dependency-failed',
      message: 'Callback failed rawError stack botToken=abc apiKey=def secret password credential',
      retryable: true,
    }),
  });

  assert.equal(failed.ok, true);
  assert.equal(failed.value.status, 'failed');
  assert.equal(failed.value.tokenConsumed, false);
  assert.equal(failed.value.failedAt, failedAt);
  assert.equal(failed.value.error.code, 'dependency-failed');
  assert.equal(failed.value.error.retryable, true);
  assertSafeSerialized(failed.value);
});

test('deletes callback records and lists safe lifecycle snapshots', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableCallbackTokenStore(boundary);
  const secondTokenRef = 'token:approve-2';

  await store.recordVerified({ tokenRef, verifiedAt, verification, idempotencyKey });
  await store.recordVerified({
    tokenRef: secondTokenRef,
    verifiedAt,
    verification: Object.freeze({ ...verification, tokenRef: secondTokenRef }),
  });

  const listedBeforeDelete = await store.list();
  const deleted = await store.delete(tokenRef);
  const listedAfterDelete = await store.list();

  assert.equal(listedBeforeDelete.ok, true);
  assert.equal(listedBeforeDelete.value.length, 2);
  assert.equal(deleted.ok, true);
  assert.deepEqual(deleted.value, { tokenRef, deleted: true });
  assert.equal(listedAfterDelete.ok, true);
  assert.deepEqual(
    listedAfterDelete.value.map((record) => record.tokenRef),
    [secondTokenRef],
  );
});
