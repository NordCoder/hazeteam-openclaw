import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestDeliveryAttemptFixture } from '../../packages/openclaw-testkit/dist/delivery-attempts/index.js';
import { createFakeCallbackTokenStore } from '../../packages/openclaw-testkit/dist/fakes/callback-tokens/index.js';
import {
  createFakeDeliveryAttemptRecordBoundary,
  createReplaySafeFakeDeliveryExecutor,
} from '../../packages/openclaw-testkit/dist/fakes/delivery-attempts/index.js';
import { createFakeInboundIdempotencyStore } from '../../packages/openclaw-testkit/dist/fakes/inbound-idempotency/index.js';
import { createFakeInboundIdempotencyInput } from '../../packages/openclaw-testkit/dist/inbound-idempotency/index.js';

const RAW_PROVIDER_PAYLOAD_CANARY = 'raw-provider-canary:w17h4';
const RAW_CALLBACK_PAYLOAD_CANARY = 'raw-callback-canary:w17h4';
const OPAQUE_CALLBACK_HANDLE_CANARY = 'opaque-callback-handle:w17h4';
const SECRET_VALUE_CANARIES = Object.freeze([
  'bot-token-value:w17h4',
  'credential-value:w17h4',
  'secret-value:w17h4',
  'https://provider.example.invalid/w17h4',
  '/tmp/hazeteam-openclaw/w17h4',
  'sdk-client-handle:w17h4',
  'provider-handle:w17h4',
  'runtime-only-value:w17h4',
]);

const FORBIDDEN_PUBLIC_TERMS = Object.freeze([
  'rawProviderPayload',
  'rawProviderResponse',
  'rawCallbackPayload',
  'rawCallbackData',
  'rawRuntimePayload',
  'rawRuntimeValue',
  'rawError',
  'stack',
  'botToken',
  'apiKey',
  'secret',
  'password',
  'credentialValue',
  'credentialSecret',
  'endpoint',
  'sdkHandle',
  'clientHandle',
  'providerHandle',
  'filesystemPath',
  'filePath',
  'repoPath',
  'workspacePath',
  'runtimeValue',
  'process.env',
]);

function assertJsonSerializable(value) {
  const serialized = JSON.stringify(value);
  assert.notEqual(serialized, undefined, 'public output must be JSON serializable');
  assert.deepEqual(JSON.parse(serialized), JSON.parse(serialized), 'public output must round-trip as JSON');
  return serialized;
}

function assertNoUnsafePublicOutput(value) {
  const serialized = assertJsonSerializable(value);
  const forbiddenValues = [
    RAW_PROVIDER_PAYLOAD_CANARY,
    RAW_CALLBACK_PAYLOAD_CANARY,
    OPAQUE_CALLBACK_HANDLE_CANARY,
    ...SECRET_VALUE_CANARIES,
  ];

  for (const forbiddenTerm of FORBIDDEN_PUBLIC_TERMS) {
    assert.equal(serialized.includes(forbiddenTerm), false, `public output must not include ${forbiddenTerm}`);
  }
  for (const forbiddenValue of forbiddenValues) {
    assert.equal(serialized.includes(forbiddenValue), false, `public output must not include ${forbiddenValue}`);
  }
}

function expectOk(result) {
  assert.equal(result.ok, true);
  return result.value;
}

test('W17H4 durable replay fake E2E suppresses duplicate inbound, delivery, and callback effects', async () => {
  const inboundStore = createFakeInboundIdempotencyStore();
  const deliveryBoundary = createFakeDeliveryAttemptRecordBoundary();
  const deliveryExecutor = createReplaySafeFakeDeliveryExecutor();
  const callbackStore = createFakeCallbackTokenStore();

  const commandDispatches = [];
  const fakeProviderDeliveries = [];

  assert.throws(
    () =>
      inboundStore.reserve({
        eventRef: 'inbound-event:w17h4-unsafe',
        rawProviderPayload: Object.freeze({ canary: RAW_PROVIDER_PAYLOAD_CANARY }),
      }),
    /unsafe field names/u,
  );

  const inboundInput = createFakeInboundIdempotencyInput({
    eventRef: 'inbound-event:w17h4-message-1',
    idempotencyRef: 'inbound-message:telegram-channel-w17h4:telegram-chat-w17h4:thread-w17h4:message-1',
    channelRef: 'telegram-channel:w17h4',
    chatRef: 'telegram-chat:w17h4',
    threadRef: 'telegram-thread:w17h4',
    messageRef: 'telegram-message:w17h4-1',
    firstSeenRef: 'seen:w17h4-message-first',
    correlationRef: 'correlation:w17h4-durable-replay',
  });
  const inboundReplayInput = createFakeInboundIdempotencyInput({
    ...inboundInput,
    firstSeenRef: 'seen:w17h4-message-replay',
  });

  const firstReserve = inboundStore.reserve(inboundInput);
  const firstCommandMarker = inboundStore.recordProcessingMarker({
    idempotencyRef: inboundInput.idempotencyRef,
    effect: 'command-intent-dispatch',
    markerRef: 'marker:w17h4-command-dispatch',
    recordedAtRef: 'seen:w17h4-command-marker',
  });

  if (firstReserve.shouldDispatchCommandIntent && firstCommandMarker.shouldRunEffect) {
    commandDispatches.push(
      Object.freeze({
        kind: 'safe-command-intent-dispatch',
        commandRef: 'command:w17h4-durable-replay',
        idempotencyRef: inboundInput.idempotencyRef,
        correlationRef: 'correlation:w17h4-durable-replay',
      }),
    );
  }

  const completedInbound = inboundStore.markCompleted({
    idempotencyRef: inboundInput.idempotencyRef,
    completedSeenRef: 'seen:w17h4-message-completed',
    lastOutcomeRef: 'outcome:w17h4-command-dispatched',
    processedRef: 'processed:w17h4-command-dispatch',
  });

  const replayReserve = inboundStore.reserve(inboundReplayInput);
  const replayCommandMarker = inboundStore.recordProcessingMarker({
    idempotencyRef: inboundReplayInput.idempotencyRef,
    effect: 'command-intent-dispatch',
    markerRef: 'marker:w17h4-command-dispatch-replay',
    recordedAtRef: 'seen:w17h4-command-marker-replay',
  });
  const replayCompletedInbound = inboundStore.markCompleted({
    idempotencyRef: inboundReplayInput.idempotencyRef,
    completedSeenRef: 'seen:w17h4-message-replay-completed',
    lastOutcomeRef: 'outcome:w17h4-replay-suppressed',
    processedRef: 'processed:w17h4-replay-suppressed',
  });

  assert.equal(firstReserve.kind, 'reserved');
  assert.equal(firstReserve.shouldDispatchCommandIntent, true);
  assert.equal(firstCommandMarker.shouldRunEffect, true);
  assert.equal(completedInbound.status, 'completed');
  assert.equal(replayReserve.kind, 'duplicate');
  assert.equal(replayReserve.shouldDispatchCommandIntent, false);
  assert.deepEqual(replayReserve.suppressedEffects, [
    'command-intent-dispatch',
    'runtime-dispatch',
    'delivery',
    'callback-consume',
    'approval-state',
  ]);
  assert.equal(replayCommandMarker.kind, 'duplicate-marker');
  assert.equal(replayCommandMarker.shouldRunEffect, false);
  assert.equal(replayCompletedInbound.status, 'completed');
  assert.equal(commandDispatches.length, 1, 'duplicate inbound replay must not dispatch a duplicate command/effect');
  assert.equal(inboundStore.getRecords().length, 1);
  assert.deepEqual(
    inboundStore.getProcessingMarkers().map((marker) => marker.effect),
    ['command-intent-dispatch'],
  );

  const deliveryFixture = createTestDeliveryAttemptFixture({
    deliveryRef: 'operation:w17h4-delivery-1',
    correlationRef: 'correlation:w17h4-durable-replay',
    idempotencyKey: 'delivery-attempt:outbox:w17h4:claim:w17h4:attempt:1',
    text: 'w17h4 durable replay delivery',
  });
  const deliveryRecordKey = 'delivery-attempt-store:attempt:w17h4-delivery-1';

  const firstDelivery = await deliveryExecutor.submitOnce({
    idempotencyKey: deliveryFixture.idempotencyKey,
    execute() {
      fakeProviderDeliveries.push(
        Object.freeze({
          kind: 'fake-provider-delivery-call',
          deliveryRef: deliveryFixture.deliveryRef,
          correlationRef: deliveryFixture.correlationRef,
        }),
      );
      deliveryBoundary.write(deliveryRecordKey, {
        recordKind: 'delivery-attempt-record',
        deliveryRef: deliveryFixture.deliveryRef,
        idempotencyRef: deliveryFixture.idempotencyKey,
        channelRef: 'telegram-channel:w17h4',
        threadRef: 'telegram-thread:w17h4',
        renderRef: 'render:w17h4-delivery-1',
        attemptRef: 'delivery-attempt:w17h4-1',
        providerAcknowledged: true,
        businessCompleted: false,
        providerMessageRef: deliveryFixture.successResult.externalMessageRef.messageId,
        status: 'provider-acknowledged-business-pending',
        correlationRef: deliveryFixture.correlationRef,
      });
      return Object.freeze({
        ok: true,
        deliveryRef: deliveryFixture.deliveryRef,
        providerAcknowledged: true,
        businessCompleted: false,
        safeProviderMessageRef: deliveryFixture.successResult.externalMessageRef.messageId,
        correlationRef: deliveryFixture.correlationRef,
      });
    },
  });
  const replayDelivery = await deliveryExecutor.submitOnce({
    idempotencyKey: deliveryFixture.idempotencyKey,
    execute() {
      fakeProviderDeliveries.push(Object.freeze({ kind: 'duplicate-provider-delivery-call' }));
      deliveryBoundary.write('delivery-attempt-store:attempt:w17h4-duplicate', {
        recordKind: 'duplicate-delivery-attempt-record',
        deliveryRef: 'operation:w17h4-duplicate-delivery',
      });
      return Object.freeze({ ok: true, deliveryRef: 'operation:w17h4-duplicate-delivery' });
    },
  });

  assert.equal(firstDelivery.executionStatus, 'executed');
  assert.equal(replayDelivery.executionStatus, 'duplicate');
  assert.equal(fakeProviderDeliveries.length, 1, 'duplicate delivery replay must not call the fake provider twice');
  assert.deepEqual(deliveryExecutor.executedKeys(), [deliveryFixture.idempotencyKey]);
  assert.equal(deliveryBoundary.size(), 1);
  assert.deepEqual(
    deliveryBoundary.snapshot().map((entry) => entry.key),
    [deliveryRecordKey],
  );
  assert.equal(deliveryBoundary.read(deliveryRecordKey).businessCompleted, false);

  const issued = expectOk(
    callbackStore.issue({
      tokenHandle: OPAQUE_CALLBACK_HANDLE_CANARY,
      recordRef: 'callback-token-record:w17h4-1',
      issuedAt: '2026-06-26T02:00:00.000Z',
      rawCallbackPayload: RAW_CALLBACK_PAYLOAD_CANARY,
    }),
  );
  const duplicateIssue = expectOk(
    callbackStore.issue({
      tokenHandle: OPAQUE_CALLBACK_HANDLE_CANARY,
      recordRef: 'callback-token-record:w17h4-1',
      issuedAt: '2026-06-26T02:00:00.000Z',
    }),
  );
  const verified = expectOk(
    callbackStore.verify({
      tokenHandle: OPAQUE_CALLBACK_HANDLE_CANARY,
      verifiedAt: '2026-06-26T02:01:00.000Z',
    }),
  );
  const consumed = expectOk(
    callbackStore.consume({
      tokenHandle: OPAQUE_CALLBACK_HANDLE_CANARY,
      consumedAt: '2026-06-26T02:02:00.000Z',
      permission: Object.freeze({ status: 'allowed', decisionRef: 'permission:w17h4-allow' }),
    }),
  );
  const duplicateConsume = expectOk(
    callbackStore.consume({
      tokenHandle: OPAQUE_CALLBACK_HANDLE_CANARY,
      consumedAt: '2026-06-26T02:02:00.000Z',
      permission: Object.freeze({ status: 'allowed', decisionRef: 'permission:w17h4-allow' }),
    }),
  );
  const callbackSnapshot = expectOk(callbackStore.snapshot());

  assert.equal(issued.replayStatus, 'fresh');
  assert.equal(duplicateIssue.replayStatus, 'duplicate');
  assert.equal(verified.replayStatus, 'fresh');
  assert.equal(consumed.consumedThisAttempt, true);
  assert.equal(duplicateConsume.status, 'already-consumed');
  assert.equal(duplicateConsume.replayStatus, 'duplicate');
  assert.equal(duplicateConsume.consumedThisAttempt, false);
  assert.equal(duplicateConsume.record.tokenConsumed, true);
  assert.equal(duplicateConsume.record.consumeAttempts, 2);
  assert.equal(duplicateConsume.record.duplicateConsumes, 1);
  assert.equal(callbackSnapshot.records.length, 1);
  assert.equal(callbackSnapshot.consumedCount, 1);
  assert.equal(callbackSnapshot.deniedCount, 0);

  assertNoUnsafePublicOutput([
    firstReserve,
    firstCommandMarker,
    completedInbound,
    replayReserve,
    replayCommandMarker,
    replayCompletedInbound,
    inboundStore.getRecords(),
    inboundStore.getProcessingMarkers(),
    commandDispatches,
    firstDelivery,
    replayDelivery,
    deliveryBoundary.snapshot(),
    issued,
    duplicateIssue,
    verified,
    consumed,
    duplicateConsume,
    callbackSnapshot,
  ]);
});
