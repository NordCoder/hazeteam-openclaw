import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adapterOk,
  createTelegramAdapterResultDeliveryRequest,
} from '../../packages/openclaw-adapter/dist/index.js';
import { isSafeTelegramOutboundPublicJson } from '../../packages/openclaw-telegram-transport/dist/contracts/outbound-delivery.js';
import { createTelegramOutboundDeliveryPort } from '../../packages/openclaw-telegram-transport/dist/delivery/outbound-delivery-pipeline.js';
import { createTelegramOutboundDeliveryRequest } from '../../packages/openclaw-telegram-transport/dist/outbound/outbound-delivery-request.js';
import { createFakeDeliveryAttemptRecordBoundary } from '../../packages/openclaw-testkit/dist/fakes/delivery-attempts/index.js';

const FORBIDDEN_PUBLIC_MARKERS = [
  'Bearer w17h2-provider-value',
  'authorization',
  'https://provider.invalid/w17h2/send',
  '/tmp/w17h2-provider/socket',
  'chat_id=123456789',
  'thread_id=987654321',
  'stack trace: provider frame',
  'rawProviderPayload',
  'rawProviderResponse',
  'rawRuntimeValue',
  'providerClient',
  'providerHandle',
  'sdkHandle',
  'filesystemPath',
  'endpoint',
];

function assertJsonSerializable(value, label) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string', `${label} must serialize to JSON`);
  assert.deepEqual(JSON.parse(encoded), value, `${label} must be JSON-round-trippable`);
  return encoded;
}

function assertNoUnsafePublicMarkers(value, label) {
  const encoded = assertJsonSerializable(value, label);

  for (const marker of FORBIDDEN_PUBLIC_MARKERS) {
    assert.equal(encoded.includes(marker), false, `${label} leaked ${marker}`);
  }
}

function createAdapterDeliveryRequest() {
  const adapterResult = adapterOk({
    title: 'W17H2 outbound delivery',
    body: [
      {
        text: 'Safe fake outbound request prepared for provider acknowledgement.',
      },
    ],
    buttonGroups: [
      {
        buttons: [
          {
            label: 'Acknowledge',
            payload: 'hz:w17h2:acknowledge',
            style: 'primary',
          },
        ],
      },
    ],
  });

  const deliveryRequestResult = createTelegramAdapterResultDeliveryRequest({
    deliveryRef: 'operation:w17h2outbounddelivery',
    target: {
      channelId: 'telegram-channel:w17h2safe',
      chatId: 'telegram-chat:w17h2safe',
      messageThreadId: 'telegram-thread:w17h2safe',
      workspaceRef: 'workspace:w17h2safe',
      agentRef: 'agent:w17h2safe',
    },
    result: adapterResult,
    correlationRef: 'correlation:w17h2outboundflow',
  });

  assert.equal(deliveryRequestResult.ok, true);
  assertNoUnsafePublicMarkers(deliveryRequestResult.value, 'adapter-rendered delivery request');
  return deliveryRequestResult.value;
}

function createOutboundRequest(adapterDeliveryRequest) {
  const build = createTelegramOutboundDeliveryRequest({
    provider: 'telegram',
    deliveryRef: adapterDeliveryRequest.deliveryRef,
    target: {
      channelRef: adapterDeliveryRequest.target.channelId,
      chatRef: adapterDeliveryRequest.target.chatId,
      threadRef: adapterDeliveryRequest.target.messageThreadId,
      workspaceRef: adapterDeliveryRequest.target.workspaceRef,
      agentRef: adapterDeliveryRequest.target.agentRef,
      hostSessionRef: 'host-session:w17h2safe',
      bindingRef: 'binding:w17h2safe',
    },
    content: {
      format: adapterDeliveryRequest.content.format,
      text: adapterDeliveryRequest.content.text,
      buttonRows: adapterDeliveryRequest.content.buttonGroups?.map((group) => ({
        buttons: group.buttons.map((button) => ({
          label: button.label,
          actionRef: button.payload,
        })),
      })),
    },
    correlationRef: adapterDeliveryRequest.correlationRef,
    idempotencyRef: 'idempotency:w17h2outboundflow',
    deliveryAttemptRef: 'attempt:w17h2outboundflow',
  });

  assert.equal(build.ok, true, build.safeMessage);
  assert.equal(build.request.descriptorKind, 'telegram-outbound-delivery-request');
  assert.equal(build.request.content.text.includes('provider acknowledgement'), true);
  assert.equal(isSafeTelegramOutboundPublicJson(build.request), true);
  assertNoUnsafePublicMarkers(build.request, 'transport outbound delivery request');
  return build.request;
}

function recordFakeDeliveryAttempt(store, result) {
  const record = {
    recordKind: 'w17h2-fake-delivery-attempt',
    attemptRef: result.deliveryAttemptRef,
    deliveryRef: result.deliveryRef,
    deliveryStatus: result.deliveryStatus,
    providerAckStatus: result.providerAcknowledgement.status,
    providerAccepted: result.providerAcknowledged,
    providerMessageRef: result.providerAcknowledgement.messageRef,
    acknowledgementRef: result.providerAcknowledgement.acknowledgementRef,
    businessResultStatus: result.businessResult.status,
    businessResultReason: result.businessResult.reason,
    businessSuccess: result.businessSuccess,
  };

  store.write(`delivery-attempt-store:${result.deliveryAttemptRef}`, record);
  return store.read(`delivery-attempt-store:${result.deliveryAttemptRef}`);
}

test('W17H2 outbound fake E2E keeps provider acknowledgement separate from business success', async () => {
  const adapterDeliveryRequest = createAdapterDeliveryRequest();
  const outboundRequest = createOutboundRequest(adapterDeliveryRequest);
  const fakeAttemptStore = createFakeDeliveryAttemptRecordBoundary();
  const providerRequests = [];

  const deliveryPort = createTelegramOutboundDeliveryPort({
    readiness: {
      providerPortStatus: 'available',
      credentialStatus: 'available',
      willCallRemote: false,
    },
    providerPort: {
      deliver(providerRequest) {
        providerRequests.push(providerRequest);
        return {
          accepted: true,
          providerMessageRef: 'message:telegram:w17h2accepted',
          acknowledgementRef: 'ack:telegram:w17h2accepted',
          idempotencyRef: providerRequest.idempotencyRef,
          deliveryAttemptRef: providerRequest.deliveryAttemptRef,
          rawProviderPayload: {
            authorization: 'Bearer w17h2-provider-value',
            endpoint: 'https://provider.invalid/w17h2/send',
            filesystemPath: '/tmp/w17h2-provider/socket',
            chat_id: 'chat_id=123456789',
            thread_id: 'thread_id=987654321',
            stack: 'stack trace: provider frame',
          },
          rawProviderResponse: {
            rawRuntimeValue: 'runtime-only-provider-value',
          },
          providerClient: {
            providerHandle: 'provider-runtime-handle',
            sdkHandle: 'telegram-sdk-handle',
          },
        };
      },
    },
  });

  assert.equal(deliveryPort.providerClientConstructed, false);
  assert.equal(deliveryPort.defaultNetworkBehavior, 'none');

  const deliveryResult = await deliveryPort.deliver(outboundRequest);
  const attemptRecord = recordFakeDeliveryAttempt(fakeAttemptStore, deliveryResult);
  const snapshot = fakeAttemptStore.snapshot();

  assert.equal(providerRequests.length, 1);
  assert.equal(providerRequests[0].descriptorKind, 'telegram-outbound-provider-delivery-request');
  assert.equal(providerRequests[0].deliveryRef, outboundRequest.deliveryRef);
  assert.equal(providerRequests[0].deliveryAttemptRef, outboundRequest.deliveryAttemptRef);
  assert.equal(isSafeTelegramOutboundPublicJson(providerRequests[0]), true);
  assertNoUnsafePublicMarkers(providerRequests[0], 'fake provider delivery request');

  assert.equal(deliveryResult.ok, true);
  assert.equal(deliveryResult.deliveryStatus, 'provider-acknowledged');
  assert.notEqual(deliveryResult.deliveryStatus, 'delivered');
  assert.equal(deliveryResult.providerAcknowledged, true);
  assert.equal(deliveryResult.providerAcknowledgement.status, 'accepted');
  assert.equal(deliveryResult.providerAcknowledgement.messageRef, 'message:telegram:w17h2accepted');
  assert.equal(deliveryResult.providerAcknowledgement.acknowledgementRef, 'ack:telegram:w17h2accepted');
  assert.equal(deliveryResult.businessResult.status, 'not-evaluated');
  assert.equal(deliveryResult.businessResult.success, false);
  assert.equal(deliveryResult.businessResult.reason, 'provider-ack-is-not-business-success');
  assert.equal(deliveryResult.businessSuccess, false);
  assert.equal(Object.hasOwn(deliveryResult, 'delivered'), false);
  assert.equal(Object.hasOwn(deliveryResult, 'deliveredAt'), false);
  assert.equal(Object.hasOwn(deliveryResult, 'markDelivered'), false);
  assert.equal(Object.hasOwn(deliveryResult, 'businessCompleted'), false);
  assert.equal(isSafeTelegramOutboundPublicJson(deliveryResult), true);
  assertNoUnsafePublicMarkers(deliveryResult, 'delivery result');

  assert.equal(fakeAttemptStore.size(), 1);
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].key, 'delivery-attempt-store:attempt:w17h2outboundflow');
  assert.deepEqual(attemptRecord, snapshot[0].record);
  assert.equal(attemptRecord.providerAckStatus, 'accepted');
  assert.equal(attemptRecord.providerAccepted, true);
  assert.equal(attemptRecord.deliveryStatus, 'provider-acknowledged');
  assert.equal(attemptRecord.businessResultStatus, 'not-evaluated');
  assert.equal(attemptRecord.businessResultReason, 'provider-ack-is-not-business-success');
  assert.equal(attemptRecord.businessSuccess, false);
  assert.equal(Object.hasOwn(attemptRecord, 'delivered'), false);
  assert.equal(Object.hasOwn(attemptRecord, 'deliveredAt'), false);
  assert.equal(Object.hasOwn(attemptRecord, 'markDelivered'), false);
  assertNoUnsafePublicMarkers(attemptRecord, 'fake delivery attempt record');
  assertNoUnsafePublicMarkers(snapshot, 'fake delivery attempt snapshot');
});
