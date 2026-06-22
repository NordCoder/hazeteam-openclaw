import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdapterIdempotencyKey,
  createCallbackIdempotencyKey,
  createDeliveryAttemptIdempotencyKey,
  createInboundMessageIdempotencyKey,
  isAdapterIdempotencyKey,
} from '../../dist/contracts/index.js';

test('createAdapterIdempotencyKey is deterministic for safe parts', () => {
  const first = createAdapterIdempotencyKey('callback', ['channel-a', 'chat-1', 'callback-9']);
  const second = createAdapterIdempotencyKey('callback', ['channel-a', 'chat-1', 'callback-9']);

  assert.equal(first, second);
  assert.equal(first, 'callback:channel-a:chat-1:callback-9');
  assert.equal(isAdapterIdempotencyKey(first), true);
});

test('specialized idempotency helpers derive safe keys', () => {
  assert.equal(
    createInboundMessageIdempotencyKey({
      channelId: 'openclaw-prod',
      chatId: '-100123456',
      messageThreadId: '42',
      messageId: '777',
    }),
    'inbound-message:openclaw-prod:-100123456:thread:42:777',
  );

  assert.equal(
    createInboundMessageIdempotencyKey({
      channelId: 'openclaw-prod',
      chatId: '-100123456',
      messageId: '778',
    }),
    'inbound-message:openclaw-prod:-100123456:thread-none:778',
  );

  assert.equal(
    createCallbackIdempotencyKey({
      channelId: 'openclaw-prod',
      chatId: '-100123456',
      messageThreadId: '42',
      callbackId: 'cb-1',
    }),
    'callback:openclaw-prod:-100123456:thread:42:cb-1',
  );

  assert.equal(
    createDeliveryAttemptIdempotencyKey({
      outboxRef: 'outbox-1',
      claimRef: 'claim-1',
      attemptNumber: 2,
    }),
    'delivery-attempt:outbox:outbox-1:claim:claim-1:attempt:2',
  );
});

test('idempotency key helpers reject unsafe parts and attempts', () => {
  for (const unsafePart of ['', ' ', ' chat', 'chat id', 'chat\nid', 'chat:id', 'chat/id']) {
    assert.throws(
      () => createAdapterIdempotencyKey('callback', ['safe', unsafePart]),
      TypeError,
    );
  }

  assert.throws(() => createAdapterIdempotencyKey('delivery-attempt', []), TypeError);
  assert.throws(
    () => createDeliveryAttemptIdempotencyKey({ outboxRef: 'outbox-1', claimRef: 'claim-1', attemptNumber: 0 }),
    TypeError,
  );
  assert.equal(isAdapterIdempotencyKey('callback:safe:bad part'), false);
});

test('idempotency record shape remains a safe DTO', () => {
  const key = createCallbackIdempotencyKey({
    channelId: 'openclaw-prod',
    chatId: '-100123456',
    callbackId: 'cb-1',
  });
  const record = Object.freeze({
    key,
    scope: 'callback',
    status: 'completed',
    operationRef: 'operation:callback-1',
    correlationRef: 'correlation:flow-1',
    firstSeenAt: '2026-06-22T00:00:00.000Z',
    lastSeenAt: '2026-06-22T00:00:01.000Z',
    detailsRef: 'details:idempotency-1',
  });

  assert.deepEqual(
    Object.keys(record).sort(),
    [
      'correlationRef',
      'detailsRef',
      'firstSeenAt',
      'key',
      'lastSeenAt',
      'operationRef',
      'scope',
      'status',
    ],
  );
  assert.equal(record.key, key);
});
