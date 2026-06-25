import assert from 'node:assert/strict';
import test from 'node:test';

import { createFakeCallbackTokenRecordStore } from '../../../../dist/storage/callback-tokens/index.js';

const tokenHandle = 'opaque-callback-handle:alpha-1';
const secondTokenHandle = 'opaque-callback-handle:beta-1';
const issuedAt = '2026-06-26T00:00:00.000Z';
const verifiedAt = '2026-06-26T00:01:00.000Z';
const consumedAt = '2026-06-26T00:02:00.000Z';
const deniedAt = '2026-06-26T00:03:00.000Z';
const failedAt = '2026-06-26T00:04:00.000Z';

const allowedPermission = Object.freeze({
  status: 'allowed',
  decisionRef: 'permission:allow-alpha',
  correlationRef: 'correlation:callback-alpha',
});
const deniedPermission = Object.freeze({
  status: 'denied',
  decisionRef: 'permission:deny-beta',
  reasonRef: 'reason:not-authorized',
});

function assertNoUnsafePublicSurface(value, hiddenValues = []) {
  const serialized = JSON.stringify(value);
  for (const hiddenValue of hiddenValues) {
    assert.equal(serialized.includes(hiddenValue), false, `public output leaked ${hiddenValue}`);
  }

  for (const forbiddenTerm of [
    'rawUpdate',
    'telegramUpdate',
    'rawProviderResponse',
    'rawCallback',
    'payloadBody',
    'botToken',
    'apiKey',
    'secret',
    'password',
    'credential',
    'stack',
    '/tmp/',
    'https://',
  ]) {
    assert.equal(serialized.includes(forbiddenTerm), false, `public output leaked ${forbiddenTerm}`);
  }
}

test('fake callback token record store issues and verifies public records without exposing token handles', () => {
  const store = createFakeCallbackTokenRecordStore();

  const issued = store.issue({
    tokenHandle,
    recordRef: 'callback-token-record:alpha',
    issuedAt,
    actionRef: 'callback-action:alpha',
  });
  const verified = store.verify({ tokenHandle, verifiedAt });
  const replayVerify = store.verify({ tokenHandle, verifiedAt });

  assert.equal(issued.ok, true);
  assert.equal(issued.value.status, 'issued');
  assert.equal(issued.value.record.status, 'issued');
  assert.equal(issued.value.record.tokenConsumed, false);
  assert.equal('tokenHandle' in issued.value.record, false);

  assert.equal(verified.ok, true);
  assert.equal(verified.value.status, 'verified');
  assert.equal(verified.value.replayStatus, 'fresh');
  assert.equal(verified.value.record.verifiedAt, verifiedAt);
  assert.equal(verified.value.record.tokenConsumed, false);

  assert.equal(replayVerify.ok, true);
  assert.equal(replayVerify.value.status, 'already-verified');
  assert.equal(replayVerify.value.replayStatus, 'duplicate');
  assertNoUnsafePublicSurface(replayVerify, [tokenHandle]);
});

test('fake callback token record store consumes once and makes duplicate consume deterministic', () => {
  const store = createFakeCallbackTokenRecordStore();

  store.issue({ tokenHandle, recordRef: 'callback-token-record:alpha', issuedAt });
  store.verify({ tokenHandle, verifiedAt });

  const consumed = store.consume({ tokenHandle, consumedAt, permission: allowedPermission });
  const duplicate = store.consume({ tokenHandle, consumedAt, permission: allowedPermission });
  const snapshot = store.snapshot();

  assert.equal(consumed.ok, true);
  assert.equal(consumed.value.status, 'consumed');
  assert.equal(consumed.value.consumedThisAttempt, true);
  assert.equal(consumed.value.record.tokenConsumed, true);
  assert.equal(consumed.value.record.consumeAttempts, 1);

  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.value.status, 'already-consumed');
  assert.equal(duplicate.value.replayStatus, 'duplicate');
  assert.equal(duplicate.value.consumedThisAttempt, false);
  assert.equal(duplicate.value.record.consumeAttempts, 2);
  assert.equal(duplicate.value.record.duplicateConsumes, 1);

  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.consumedCount, 1);
  assertNoUnsafePublicSurface(snapshot, [tokenHandle]);
});

test('fake callback token record store preserves denied permission as not consumed', () => {
  const store = createFakeCallbackTokenRecordStore();

  store.issue({ tokenHandle: secondTokenHandle, recordRef: 'callback-token-record:beta', issuedAt });
  const denied = store.deny({ tokenHandle: secondTokenHandle, deniedAt, permission: deniedPermission });
  const consumeAfterDenied = store.consume({
    tokenHandle: secondTokenHandle,
    consumedAt,
    permission: allowedPermission,
  });
  const record = store.getPublicRecord('callback-token-record:beta');

  assert.equal(denied.ok, true);
  assert.equal(denied.value.status, 'permission-denied');
  assert.equal(denied.value.consumedThisAttempt, false);
  assert.equal(denied.value.record.tokenConsumed, false);
  assert.equal('consumedAt' in denied.value.record, false);

  assert.equal(consumeAfterDenied.ok, false);
  assert.equal(consumeAfterDenied.error.code, 'permission-denied');

  assert.equal(record.ok, true);
  assert.equal(record.value.status, 'permission-denied');
  assert.equal(record.value.tokenConsumed, false);
  assertNoUnsafePublicSurface(record, [secondTokenHandle]);
});

test('fake callback token record store rejects malformed handles without state changes', () => {
  const store = createFakeCallbackTokenRecordStore();

  const issued = store.issue({
    tokenHandle: 'opaque callback handle',
    recordRef: 'callback-token-record:bad',
    issuedAt,
  });
  const snapshot = store.snapshot();

  assert.equal(issued.ok, false);
  assert.equal(issued.error.code, 'invalid-input');
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.records.length, 0);
  assertNoUnsafePublicSurface(issued, ['opaque callback handle']);
});

test('fake callback token record store records safe failed lifecycle snapshots', () => {
  const store = createFakeCallbackTokenRecordStore();

  store.issue({ tokenHandle, recordRef: 'callback-token-record:alpha', issuedAt });
  const failed = store.fail({
    tokenHandle,
    failedAt,
    failureRef: 'failure:callback-alpha',
    detailsRef: 'details:callback-alpha',
  });
  const listed = store.listPublicRecords();

  assert.equal(failed.ok, true);
  assert.equal(failed.value.status, 'failed');
  assert.equal(failed.value.consumedThisAttempt, false);
  assert.equal(failed.value.record.tokenConsumed, false);
  assert.equal(failed.value.record.failedAt, failedAt);
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.value.map((record) => record.recordRef), ['callback-token-record:alpha']);
  assertNoUnsafePublicSurface(listed, [tokenHandle]);
});
