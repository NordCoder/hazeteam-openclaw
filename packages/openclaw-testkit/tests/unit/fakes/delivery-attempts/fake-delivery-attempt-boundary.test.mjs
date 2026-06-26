import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFakeDeliveryAttemptRecordBoundary,
  createReplaySafeFakeDeliveryExecutor,
} from '../../../../dist/fakes/delivery-attempts/index.js';
import { createTestDeliveryAttemptFixture } from '../../../../dist/delivery-attempts/index.js';

const UNSAFE_PUBLIC_STRING = ['bot', 'Token=abc'].join('');

test('fake delivery attempt boundary stores JSON-safe records in deterministic order', () => {
  const boundary = createFakeDeliveryAttemptRecordBoundary();

  boundary.write('delivery-attempt-store:attempt:b', {
    recordKind: 'delivery-attempt',
    attemptRef: 'delivery-attempt:b',
    businessResultStatus: 'not-evaluated',
  });
  boundary.write('delivery-attempt-store:attempt:a', {
    recordKind: 'delivery-attempt',
    attemptRef: 'delivery-attempt:a',
    businessResultStatus: 'not-evaluated',
  });

  assert.equal(boundary.size(), 2);
  assert.deepEqual(
    boundary.snapshot().map((entry) => entry.key),
    ['delivery-attempt-store:attempt:a', 'delivery-attempt-store:attempt:b'],
  );
  assert.deepEqual(
    boundary.list('delivery-attempt-store:attempt:').map((record) => record.attemptRef),
    ['delivery-attempt:a', 'delivery-attempt:b'],
  );
});

test('fake delivery attempt boundary rejects unsafe public records', () => {
  const boundary = createFakeDeliveryAttemptRecordBoundary();

  assert.throws(
    () => boundary.write('delivery-attempt-store:attempt:unsafe', { rawProviderPayload: { id: 1 } }),
    TypeError,
  );
  assert.throws(
    () => boundary.write('delivery-attempt-store:attempt:unsafe-string', { message: UNSAFE_PUBLIC_STRING }),
    TypeError,
  );
});

test('replay-safe fake delivery executor does not duplicate execution', async () => {
  const executor = createReplaySafeFakeDeliveryExecutor();
  let calls = 0;

  const first = await executor.submitOnce({
    idempotencyKey: 'delivery-attempt:outbox:test:claim:test:attempt:1',
    execute() {
      calls += 1;
      return { acceptedByProvider: true };
    },
  });
  const replay = await executor.submitOnce({
    idempotencyKey: 'delivery-attempt:outbox:test:claim:test:attempt:1',
    execute() {
      calls += 1;
      return { acceptedByProvider: true };
    },
  });

  assert.equal(calls, 1);
  assert.equal(first.executionStatus, 'executed');
  assert.equal(replay.executionStatus, 'duplicate');
  assert.deepEqual(executor.executedKeys(), ['delivery-attempt:outbox:test:claim:test:attempt:1']);
});

test('delivery attempt fixtures are deterministic fake data', () => {
  const first = createTestDeliveryAttemptFixture();
  const second = createTestDeliveryAttemptFixture();

  assert.deepEqual(first, second);
  assert.equal(first.request.deliveryRef, 'operation:test-delivery-attempt');
  assert.equal(first.idempotencyKey, 'delivery-attempt:outbox:test-outbox:claim:test-claim:attempt:1');
  assert.equal(first.successResult.ok, true);
  assert.equal(first.failureResult.ok, false);
});
