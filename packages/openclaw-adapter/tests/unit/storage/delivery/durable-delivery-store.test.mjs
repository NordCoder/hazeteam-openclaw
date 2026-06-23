import assert from 'node:assert/strict';
import test from 'node:test';

import { createDurableDeliveryStore } from '../../../../dist/storage/delivery/durable-delivery-store.js';

const createdAtIso = '2026-01-01T00:00:00.000Z';
const deliveredAtIso = '2026-01-01T00:01:00.000Z';
const failedAtIso = '2026-01-01T00:02:00.000Z';

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:workspace-alpha',
  chatId: 'telegram-chat:chat-alpha',
  messageThreadId: 'telegram-thread:topic-alpha',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
});

const forbiddenSerializedTerms = [
  'rawUpdate',
  'telegramUpdate',
  'rawTelegramUpdate',
  'rawOpenClawEvent',
  'rawProviderResponse',
  'rawDeliveryResponse',
  'rawRuntimePayload',
  'rawToolPayload',
  'toolPayload',
  'approvalPayload',
  'rawError',
  'stack',
  ['bot', 'Token'].join(''),
  ['api', 'Key'].join(''),
  ['sec', 'ret'].join(''),
  ['pass', 'word'].join(''),
  ['cred', 'ential'].join(''),
];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFakeBoundary() {
  const records = new Map();

  return {
    records,
    boundary: Object.freeze({
      read(key) {
        return records.has(key) ? cloneJson(records.get(key)) : undefined;
      },
      write(key, record) {
        records.set(key, cloneJson(record));
      },
      list(prefix) {
        const values = [];
        for (const [key, value] of records.entries()) {
          if (key.startsWith(prefix)) {
            values.push(cloneJson(value));
          }
        }
        return values;
      },
    }),
  };
}

function makeRequest(deliveryRef = 'operation:delivery-store-1') {
  return Object.freeze({
    deliveryRef,
    target: deliveryTarget,
    content: Object.freeze({
      format: 'plain',
      text: 'Ready for durable delivery persistence.',
      buttonGroups: [
        {
          buttons: [
            {
              label: 'Continue',
              payload: 'hz:token:delivery-store-1',
              style: 'primary',
            },
          ],
        },
      ],
    }),
    context: Object.freeze({
      operationRef: deliveryRef,
      correlationRef: 'correlation:delivery-store-1',
      workspaceRef: 'workspace:workspace-alpha',
      agentRef: 'agent:coder',
    }),
    correlationRef: 'correlation:delivery-store-1',
  });
}

function makeIdempotencyKey(suffix = '1') {
  return `delivery-attempt:outbox:outbox-${suffix}:claim:claim-${suffix}:attempt:1`;
}

function successFor(request, messageId = 'telegram-message:delivered-1') {
  return Object.freeze({
    ok: true,
    deliveryRef: request.deliveryRef,
    externalMessageRef: Object.freeze({
      ...request.target,
      messageId,
      correlationRef: request.correlationRef,
    }),
    context: request.context,
    correlationRef: request.correlationRef,
  });
}

function failureFor(request, retryable, message = 'rate limited before retry') {
  return Object.freeze({
    ok: false,
    deliveryRef: request.deliveryRef,
    error: Object.freeze({
      code: retryable ? 'rate-limited' : 'provider-rejected',
      message,
      retryable,
      detailsRef: retryable ? 'details:rate-limited-1' : 'details:provider-rejected-1',
      correlationRef: request.correlationRef,
    }),
    retryable,
    detailsRef: retryable ? 'details:rate-limited-1' : 'details:provider-rejected-1',
    context: request.context,
    correlationRef: request.correlationRef,
  });
}

function assertNoForbiddenSerializedTerms(sample) {
  const lowerJson = JSON.stringify(sample).toLowerCase();
  for (const term of forbiddenSerializedTerms) {
    assert.equal(
      lowerJson.includes(term.toLowerCase()),
      false,
      `serialized sample leaks forbidden term ${term}`,
    );
  }
}

test('durable delivery store registers and retrieves a safe delivery attempt', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const request = makeRequest();
  const idempotencyKey = makeIdempotencyKey();

  const registration = await store.registerAttempt({
    request,
    idempotencyKey,
    attemptNumber: 1,
    createdAtIso,
  });

  assert.equal(registration.status, 'created');
  assert.equal(registration.record.recordKind, 'delivery-attempt');
  assert.equal(registration.record.deliveryRef, 'operation:delivery-store-1');
  assert.equal(registration.record.idempotencyKey, idempotencyKey);
  assert.equal(registration.record.status, 'created');
  assert.equal(registration.record.attemptNumber, 1);
  assert.deepEqual(registration.record.target, deliveryTarget);
  assert.deepEqual(registration.record.content, request.content);
  assert.deepEqual(await store.getAttemptByDeliveryRef(request.deliveryRef), registration.record);
  assert.deepEqual(await store.getAttemptByIdempotencyKey(idempotencyKey), registration.record);
  assert.equal(await store.getAttemptByDeliveryRef('operation:missing-delivery'), undefined);
  assert.deepEqual(await store.listAttempts(), [registration.record]);
  assertNoForbiddenSerializedTerms(registration.record);
});

test('durable delivery store returns duplicates without overwriting deliveryRef or idempotency records', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const request = makeRequest('operation:delivery-store-duplicate');
  const idempotencyKey = makeIdempotencyKey('duplicate');

  const first = await store.registerAttempt({ request, idempotencyKey, createdAtIso });
  const duplicate = await store.registerAttempt({
    request: { ...request, content: { format: 'plain', text: 'new content must not overwrite' } },
    idempotencyKey,
    createdAtIso: '2026-01-01T00:05:00.000Z',
  });

  assert.equal(first.status, 'created');
  assert.equal(duplicate.status, 'duplicate');
  assert.deepEqual(duplicate.record, first.record);
  assert.equal(duplicate.record.content.text, 'Ready for durable delivery persistence.');

  await assert.rejects(
    () =>
      store.registerAttempt({
        request: makeRequest('operation:delivery-store-duplicate-other'),
        idempotencyKey,
        createdAtIso,
      }),
    /duplicate idempotencyKey/u,
  );
});

test('durable delivery store marks a delivery as delivered and stores the external message ref', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const request = makeRequest('operation:delivery-store-success');
  const idempotencyKey = makeIdempotencyKey('success');
  await store.registerAttempt({ request, idempotencyKey, createdAtIso });

  const result = await store.markDelivered({
    result: successFor(request),
    recordedAtIso: deliveredAtIso,
  });

  assert.equal(result.recordKind, 'delivery-success-result');
  assert.equal(result.deliveryRef, request.deliveryRef);
  assert.equal(result.idempotencyKey, idempotencyKey);
  assert.equal(result.retryable, false);
  assert.equal(result.shouldMarkDelivered, true);
  assert.equal(result.shouldMarkFailed, false);
  assert.equal(result.shouldRetry, false);
  assert.deepEqual(result.externalMessageRef, successFor(request).externalMessageRef);
  assert.deepEqual(await store.getResultByDeliveryRef(request.deliveryRef), result);
  assert.deepEqual(await store.getResultByIdempotencyKey(idempotencyKey), result);
  assert.deepEqual(
    await store.getExternalMessageRefByDeliveryRef(request.deliveryRef),
    successFor(request).externalMessageRef,
  );
  assert.equal((await store.getAttemptByDeliveryRef(request.deliveryRef)).status, 'delivered');
  assert.deepEqual(await store.listResults(), [result]);
  assertNoForbiddenSerializedTerms(result);
});

test('durable delivery store marks retryable and non-retryable delivery failures deterministically', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const retryRequest = makeRequest('operation:delivery-store-retry-failure');
  const finalRequest = makeRequest('operation:delivery-store-final-failure');
  await store.registerAttempt({
    request: retryRequest,
    idempotencyKey: makeIdempotencyKey('retry-failure'),
    createdAtIso,
  });
  await store.registerAttempt({
    request: finalRequest,
    idempotencyKey: makeIdempotencyKey('final-failure'),
    createdAtIso,
  });

  const retryFailure = failureFor(retryRequest, true);
  const retryRecord = await store.recordPumpDecision({
    decision: Object.freeze({
      kind: 'failed',
      deliveryRef: retryRequest.deliveryRef,
      deliveryResult: retryFailure,
      error: retryFailure.error,
      sinkCalled: true,
      retryable: true,
      shouldMarkDelivered: false,
      shouldMarkFailed: true,
      shouldRetry: true,
    }),
    recordedAtIso: failedAtIso,
  });
  const finalRecord = await store.markFailed({
    result: failureFor(finalRequest, false),
    recordedAtIso: '2026-01-01T00:03:00.000Z',
  });

  assert.equal(retryRecord.recordKind, 'delivery-failure-result');
  assert.equal(retryRecord.retryable, true);
  assert.equal(retryRecord.shouldRetry, true);
  assert.equal(retryRecord.error.code, 'rate-limited');
  assert.equal(finalRecord.retryable, false);
  assert.equal(finalRecord.shouldRetry, false);
  assert.equal(finalRecord.error.code, 'provider-rejected');
  assert.equal((await store.getAttemptByDeliveryRef(retryRequest.deliveryRef)).status, 'failed');
  assert.equal((await store.getAttemptByDeliveryRef(finalRequest.deliveryRef)).status, 'failed');
  assertNoForbiddenSerializedTerms(retryRecord);
  assertNoForbiddenSerializedTerms(finalRecord);
});

test('durable delivery store rejects malformed external message refs before persistence', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const request = makeRequest('operation:delivery-store-bad-external');
  await store.registerAttempt({
    request,
    idempotencyKey: makeIdempotencyKey('bad-external'),
    createdAtIso,
  });

  await assert.rejects(
    () =>
      store.markDelivered({
        result: {
          ...successFor(request),
          externalMessageRef: {
            ...successFor(request).externalMessageRef,
            messageId: 'telegram-message:bad space',
          },
        },
        recordedAtIso: deliveredAtIso,
      }),
    /safe Telegram delivery ref/u,
  );

  assert.equal(await store.getResultByDeliveryRef(request.deliveryRef), undefined);
  assert.equal(await store.getExternalMessageRefByDeliveryRef(request.deliveryRef), undefined);
  assert.equal([...records.keys()].some((key) => key.includes(':external-message:')), false);
});

test('durable delivery store ignores malformed stored result records on read', async () => {
  const { boundary, records } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const request = makeRequest('operation:delivery-store-malformed-read');
  await store.registerAttempt({
    request,
    idempotencyKey: makeIdempotencyKey('malformed-read'),
    createdAtIso,
  });
  records.set(
    `telegram-delivery-store:result:${request.deliveryRef}`,
    cloneJson({
      schemaVersion: 1,
      recordKind: 'delivery-failure-result',
      deliveryRef: request.deliveryRef,
      idempotencyKey: makeIdempotencyKey('malformed-read'),
      deliveryResult: {
        ok: false,
        deliveryRef: request.deliveryRef,
        error: {
          code: 'provider-unavailable',
          message: 'bad retry flag',
          retryable: 'yes',
        },
        retryable: 'yes',
      },
      error: {
        code: 'provider-unavailable',
        message: 'bad retry flag',
        retryable: 'yes',
      },
      retryable: 'yes',
      recordedAtIso: failedAtIso,
    }),
  );

  assert.equal(await store.getResultByDeliveryRef(request.deliveryRef), undefined);
});

test('durable delivery store rejects raw/sensitive fields and redacts sensitive error messages', async () => {
  const { boundary } = createFakeBoundary();
  const store = createDurableDeliveryStore({ boundary });
  const request = makeRequest('operation:delivery-store-no-leak');
  await store.registerAttempt({
    request,
    idempotencyKey: makeIdempotencyKey('no-leak'),
    createdAtIso,
  });

  await assert.rejects(
    () =>
      store.markDelivered({
        result: {
          ...successFor(request),
          rawProviderResponse: { message_id: 1 },
        },
        recordedAtIso: deliveredAtIso,
      }),
    /must not include raw provider/u,
  );

  const failure = await store.markFailed({
    result: failureFor(
      request,
      true,
      `${['sec', 'ret'].join('')}=abc ${['api', 'Key'].join('')}=def stack rawProviderResponse`,
    ),
    recordedAtIso: failedAtIso,
  });

  assert.equal(failure.error.message, '[redacted] [redacted] [redacted] [redacted]');
  assertNoForbiddenSerializedTerms(failure);
});
