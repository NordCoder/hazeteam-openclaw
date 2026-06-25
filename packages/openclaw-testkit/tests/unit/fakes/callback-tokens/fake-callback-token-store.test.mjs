import assert from 'node:assert/strict';
import test from 'node:test';

import { createFakeCallbackTokenStore } from '../../../../dist/fakes/callback-tokens/index.js';

const tokenHandle = 'opaque-callback-handle:testkit-1';
const issuedAt = '2026-06-26T01:00:00.000Z';
const verifiedAt = '2026-06-26T01:01:00.000Z';
const consumedAt = '2026-06-26T01:02:00.000Z';
const deniedAt = '2026-06-26T01:03:00.000Z';

const allowedPermission = Object.freeze({
  status: 'allowed',
  decisionRef: 'permission:testkit-allow',
});
const deniedPermission = Object.freeze({
  status: 'denied',
  decisionRef: 'permission:testkit-deny',
  reasonRef: 'reason:testkit-deny',
});

function assertNoHandleLeak(value, handle) {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes(handle), false, 'fake public output must not include opaque handle value');
  for (const forbiddenTerm of ['rawProviderResponse', 'rawCallback', 'botToken', 'apiKey', 'secret', 'credential', 'stack']) {
    assert.equal(serialized.includes(forbiddenTerm), false, `fake public output must not include ${forbiddenTerm}`);
  }
}

test('testkit fake callback token store supports deterministic verify and consume replay', () => {
  const store = createFakeCallbackTokenStore();

  const issued = store.issue({ tokenHandle, recordRef: 'callback-token-record:testkit-1', issuedAt });
  const verified = store.verify({ tokenHandle, verifiedAt });
  const consumed = store.consume({ tokenHandle, consumedAt, permission: allowedPermission });
  const duplicateConsume = store.consume({ tokenHandle, consumedAt, permission: allowedPermission });

  assert.equal(issued.ok, true);
  assert.equal(issued.value.replayStatus, 'fresh');
  assert.equal(verified.ok, true);
  assert.equal(verified.value.record.status, 'verified');
  assert.equal(consumed.ok, true);
  assert.equal(consumed.value.consumedThisAttempt, true);
  assert.equal(consumed.value.record.tokenConsumed, true);
  assert.equal(duplicateConsume.ok, true);
  assert.equal(duplicateConsume.value.status, 'already-consumed');
  assert.equal(duplicateConsume.value.consumedThisAttempt, false);
  assert.equal(duplicateConsume.value.record.duplicateConsumes, 1);
  assertNoHandleLeak(duplicateConsume, tokenHandle);
});

test('testkit fake callback token store keeps denied permission paths unconsumed', () => {
  const store = createFakeCallbackTokenStore();

  store.issue({ tokenHandle, recordRef: 'callback-token-record:testkit-1', issuedAt });
  const denied = store.deny({ tokenHandle, deniedAt, permission: deniedPermission });
  const consumeAfterDenied = store.consume({ tokenHandle, consumedAt, permission: allowedPermission });
  const snapshot = store.snapshot();

  assert.equal(denied.ok, true);
  assert.equal(denied.value.record.status, 'permission-denied');
  assert.equal(denied.value.record.tokenConsumed, false);
  assert.equal(consumeAfterDenied.ok, false);
  assert.equal(consumeAfterDenied.error.code, 'permission-denied');
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.deniedCount, 1);
  assert.equal(snapshot.value.consumedCount, 0);
  assertNoHandleLeak(snapshot, tokenHandle);
});
