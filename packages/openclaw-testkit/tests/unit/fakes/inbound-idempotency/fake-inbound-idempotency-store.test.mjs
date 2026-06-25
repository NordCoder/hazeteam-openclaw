import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFakeInboundIdempotencyInput,
  createFakeInboundIdempotencySafeError,
} from '../../../../dist/inbound-idempotency/inbound-idempotency-fixtures.js';
import { createFakeInboundIdempotencyStore } from '../../../../dist/fakes/inbound-idempotency/fake-inbound-idempotency-store.js';

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

test('fake inbound idempotency store deterministically suppresses duplicate events', () => {
  const store = createFakeInboundIdempotencyStore();
  const input = createFakeInboundIdempotencyInput({
    eventRef: 'inbound-event:message-1',
    idempotencyRef: 'inbound-message:telegram-channel-demo:telegram-chat-demo:thread-none:message-1',
    firstSeenRef: 'seen:message-1-first',
  });
  const duplicateInput = createFakeInboundIdempotencyInput({
    ...input,
    firstSeenRef: 'seen:message-1-duplicate',
  });

  const first = store.reserve(input);
  const duplicate = store.reserve(duplicateInput);

  assert.equal(first.kind, 'reserved');
  assert.equal(first.duplicate, false);
  assert.equal(first.shouldDispatchCommandIntent, true);
  assert.deepEqual(first.suppressedEffects, []);

  assert.equal(duplicate.kind, 'duplicate');
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.shouldDispatchCommandIntent, false);
  assert.deepEqual(duplicate.suppressedEffects, [
    'command-intent-dispatch',
    'runtime-dispatch',
    'delivery',
    'callback-consume',
    'approval-state',
  ]);
  assert.equal(duplicate.duplicateOfEventRef, 'inbound-event:message-1');
  assert.equal(duplicate.record.lastSeenRef, 'seen:message-1-duplicate');
  assert.deepEqual(
    store.getRecords().map((record) => record.idempotencyRef),
    ['inbound-message:telegram-channel-demo:telegram-chat-demo:thread-none:message-1'],
  );
  assertSafeSerialized([first, duplicate, store.getRecords()]);
});

test('fake inbound idempotency store records processing markers once per replay effect', () => {
  const store = createFakeInboundIdempotencyStore();
  const input = createFakeInboundIdempotencyInput({
    eventRef: 'inbound-event:message-2',
    idempotencyRef: 'inbound-message:telegram-channel-demo:telegram-chat-demo:thread-none:message-2',
    firstSeenRef: 'seen:message-2-first',
  });
  store.reserve(input);

  const firstMarker = store.recordProcessingMarker({
    idempotencyRef: input.idempotencyRef,
    effect: 'command-intent-dispatch',
    markerRef: 'marker:command-intent-message-2',
    recordedAtRef: 'seen:marker-first',
  });
  const replayMarker = store.recordProcessingMarker({
    idempotencyRef: input.idempotencyRef,
    effect: 'command-intent-dispatch',
    markerRef: 'marker:command-intent-message-2-replay',
    recordedAtRef: 'seen:marker-replay',
  });
  const deliveryMarker = store.recordProcessingMarker({
    idempotencyRef: input.idempotencyRef,
    effect: 'delivery',
    markerRef: 'marker:delivery-message-2',
    recordedAtRef: 'seen:delivery-marker',
  });

  assert.equal(firstMarker.kind, 'recorded');
  assert.equal(firstMarker.shouldRunEffect, true);
  assert.equal(replayMarker.kind, 'duplicate-marker');
  assert.equal(replayMarker.shouldRunEffect, false);
  assert.equal(replayMarker.marker.markerRef, 'marker:command-intent-message-2');
  assert.equal(deliveryMarker.kind, 'recorded');
  assert.deepEqual(
    store.getProcessingMarkers().map((marker) => marker.effect),
    ['command-intent-dispatch', 'delivery'],
  );
  assertSafeSerialized([firstMarker, replayMarker, deliveryMarker, store.getProcessingMarkers()]);
});

test('fake inbound idempotency store completes and fails records deterministically', () => {
  const completedStore = createFakeInboundIdempotencyStore();
  const failedStore = createFakeInboundIdempotencyStore();
  const completedInput = createFakeInboundIdempotencyInput({
    eventRef: 'inbound-event:message-3',
    idempotencyRef: 'inbound-message:telegram-channel-demo:telegram-chat-demo:thread-none:message-3',
  });
  const failedInput = createFakeInboundIdempotencyInput({
    eventRef: 'inbound-event:callback-3',
    idempotencyRef: 'callback:telegram-channel-demo:telegram-chat-demo:thread-none:callback-3',
    eventKind: 'callback',
    callbackRef: 'callback:3',
  });

  completedStore.reserve(completedInput);
  failedStore.reserve(failedInput);

  const completed = completedStore.markCompleted({
    idempotencyRef: completedInput.idempotencyRef,
    completedSeenRef: 'seen:message-3-completed',
    lastOutcomeRef: 'outcome:command-intent-created',
    processedRef: 'processed:command-intent-dispatch',
  });
  const completedReplay = completedStore.markCompleted({
    idempotencyRef: completedInput.idempotencyRef,
    completedSeenRef: 'seen:message-3-replay',
    lastOutcomeRef: 'outcome:ignored-replay',
    processedRef: 'processed:ignored-replay',
  });
  const failed = failedStore.markFailed({
    idempotencyRef: failedInput.idempotencyRef,
    failedSeenRef: 'seen:callback-3-failed',
    lastOutcomeRef: 'outcome:failed-safe',
    failureRef: 'failure:callback-normalization',
    error: createFakeInboundIdempotencySafeError({
      code: 'failed-safe',
      message: 'fake-inbound-normalization-failed',
      retryable: false,
    }),
  });
  const failedReplay = failedStore.markFailed({
    idempotencyRef: failedInput.idempotencyRef,
    failedSeenRef: 'seen:callback-3-replay',
    lastOutcomeRef: 'outcome:ignored-replay',
    failureRef: 'failure:ignored-replay',
  });

  assert.equal(completed.status, 'completed');
  assert.equal(completed.lastOutcomeRef, 'outcome:command-intent-created');
  assert.deepEqual(completedReplay, completed);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error.code, 'failed-safe');
  assert.deepEqual(failedReplay, failed);
  assertSafeSerialized([completed, completedReplay, failed, failedReplay]);
});

test('fake inbound idempotency fixtures reject unsafe inputs before recording', () => {
  const store = createFakeInboundIdempotencyStore();

  assert.throws(
    () =>
      store.reserve({
        eventRef: 'inbound-event:unsafe',
        rawProviderResponse: Object.freeze({ botToken: 'must-not-leak' }),
      }),
    /unsafe field names/u,
  );
  assert.throws(
    () =>
      store.recordProcessingMarker({
        idempotencyRef: 'inbound-message:telegram-channel-demo:telegram-chat-demo:thread-none:message-unsafe',
        effect: 'runtime-dispatch',
        credentialHandle: 'credential:must-not-leak',
      }),
    /unsafe field names/u,
  );

  assert.deepEqual(store.getRecords(), []);
  assert.deepEqual(store.getProcessingMarkers(), []);
});
