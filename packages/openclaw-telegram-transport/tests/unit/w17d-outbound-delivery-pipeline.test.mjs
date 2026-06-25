import assert from 'node:assert/strict';
import test from 'node:test';

import { isSafeTelegramOutboundPublicJson } from '../../dist/contracts/outbound-delivery.js';
import {
  createTelegramOutboundDeliveryPort,
  deliverTelegramOutboundRequest,
} from '../../dist/delivery/outbound-delivery-pipeline.js';
import { createTelegramOutboundDeliveryRequest } from '../../dist/outbound/outbound-delivery-request.js';

const PROTECTED_TERMS = [
  '123456:ABC-private-delivery',
  'Bearer private-delivery',
  'https://provider.internal/send',
  '/Users/anna/private',
  'chat_id=987654321',
  'thread_id=123456789',
  'private-stack-frame',
  'providerBody',
  'providerPayload',
  'authorization',
];

function assertNoLeak(value) {
  const encoded = JSON.stringify(value);
  assert.equal(typeof encoded, 'string');

  for (const term of PROTECTED_TERMS) {
    assert.equal(encoded.includes(term), false, `outbound delivery output leaked ${term}`);
  }
}

function requestInput(overrides = {}) {
  return {
    provider: 'telegram',
    deliveryRef: 'delivery:w17d:0001',
    correlationRef: 'corr:w17d:0001',
    idempotencyRef: 'idem:w17d:0001',
    deliveryAttemptRef: 'attempt:w17d:0001',
    target: {
      channelRef: 'channel:telegram:w17d',
      chatRef: 'chat:workspace:w17d',
      threadRef: 'thread:agent:w17d',
      workspaceRef: 'workspace:w17d',
      agentRef: 'agent:w17d',
      hostSessionRef: 'host-session:w17d',
      bindingRef: 'binding:telegram:w17d',
    },
    content: {
      format: 'plain',
      text: 'Safe W17D outbound delivery text',
      buttonRows: [
        {
          buttons: [
            {
              label: 'Approve',
              actionRef: 'action:approve:w17d',
            },
          ],
        },
      ],
      attachmentRefs: ['attachment:w17d:0001'],
    },
    ...overrides,
  };
}

function safeRequest(overrides = {}) {
  const build = createTelegramOutboundDeliveryRequest(requestInput(overrides));
  assert.equal(build.ok, true);
  return build.request;
}

test('outbound request builder accepts only safe adapter and transport values', () => {
  const build = createTelegramOutboundDeliveryRequest(requestInput());

  assert.equal(build.ok, true);
  assert.equal(build.request.descriptorKind, 'telegram-outbound-delivery-request');
  assert.equal(build.request.provider, 'telegram');
  assert.equal(build.request.target.threadRef, 'thread:agent:w17d');
  assert.equal(build.request.content.buttonRows[0].buttons[0].actionRef, 'action:approve:w17d');
  assert.equal(isSafeTelegramOutboundPublicJson(build.request), true);
  assertNoLeak(build.request);
});

test('missing provider port blocks safely before provider invocation', async () => {
  const result = await deliverTelegramOutboundRequest({}, safeRequest({ deliveryRef: 'delivery:w17d:missing-port' }));

  assert.equal(result.ok, false);
  assert.equal(result.deliveryStatus, 'not-attempted');
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.providerAcknowledgement.status, 'not-attempted');
  assert.equal(result.businessSuccess, false);
  assert.equal(result.businessResult.status, 'not-evaluated');
  assert.equal(result.businessResult.reason, 'delivery-not-attempted');
  assert.equal(result.error.reasonCode, 'blocked-missing-provider-port');
  assert.equal(result.error.diagnosticCode, 'missing-provider-port');
  assert.equal(isSafeTelegramOutboundPublicJson(result), true);
  assertNoLeak(result);
});

test('successful provider acknowledgement stays separate from business success', async () => {
  const providerCalls = [];
  const port = createTelegramOutboundDeliveryPort({
    providerPort: {
      deliver(providerRequest) {
        providerCalls.push(providerRequest);
        return {
          accepted: true,
          providerMessageRef: 'message:telegram:w17d-0001',
          acknowledgementRef: 'ack:telegram:w17d-0001',
          idempotencyRef: providerRequest.idempotencyRef,
          deliveryAttemptRef: providerRequest.deliveryAttemptRef,
          providerBody: {
            authorization: 'Bearer private-delivery',
          },
        };
      },
    },
  });

  assert.equal(port.providerClientConstructed, false);
  assert.equal(port.defaultNetworkBehavior, 'none');

  const result = await port.deliver(safeRequest({ deliveryRef: 'delivery:w17d:success' }));

  assert.equal(providerCalls.length, 1);
  assert.equal(providerCalls[0].descriptorKind, 'telegram-outbound-provider-delivery-request');
  assert.equal(providerCalls[0].content.text, 'Safe W17D outbound delivery text');
  assert.equal(result.ok, true);
  assert.equal(result.deliveryStatus, 'provider-acknowledged');
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.providerAcknowledgement.status, 'accepted');
  assert.equal(result.providerAcknowledgement.messageRef, 'message:telegram:w17d-0001');
  assert.equal(result.businessSuccess, false);
  assert.equal(result.businessResult.success, false);
  assert.equal(result.businessResult.reason, 'provider-ack-is-not-business-success');
  assert.equal(Object.hasOwn(result, 'markDelivered'), false);
  assert.equal(isSafeTelegramOutboundPublicJson(result), true);
  assertNoLeak(result);
});

test('provider rejection normalizes unsafe provider acknowledgement fields out of public output', async () => {
  const result = await deliverTelegramOutboundRequest(
    {
      providerPort: {
        deliver() {
          return {
            accepted: false,
            reasonCode: 'https://provider.internal/send',
            retryable: false,
            diagnosticCode: 'Bearer private-delivery',
            acknowledgementRef: '/Users/anna/private',
            idempotencyRef: 'idem:w17d:rejected',
            deliveryAttemptRef: 'attempt:w17d:rejected',
            providerPayload: {
              authorization: 'Bearer private-delivery',
            },
          };
        },
      },
    },
    safeRequest({ deliveryRef: 'delivery:w17d:rejected' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.deliveryStatus, 'provider-rejected');
  assert.equal(result.providerAcknowledgement.status, 'rejected');
  assert.equal(result.error.reasonCode, 'provider-rejected');
  assert.equal(result.error.diagnosticCode, 'provider-returned-failure');
  assert.equal(result.retryable, false);
  assert.equal(Object.hasOwn(result.providerAcknowledgement, 'acknowledgementRef'), false);
  assert.equal(isSafeTelegramOutboundPublicJson(result), true);
  assertNoLeak(result);
});

test('thrown provider failures are redacted and remain non-business results', async () => {
  const result = await deliverTelegramOutboundRequest(
    {
      providerPort: {
        async deliver() {
          throw new Error(
            'provider failed Bearer private-delivery at https://provider.internal/send /Users/anna/private chat_id=987654321 thread_id=123456789 private-stack-frame providerPayload',
          );
        },
      },
    },
    safeRequest({ deliveryRef: 'delivery:w17d:thrown' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.deliveryStatus, 'provider-rejected');
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSuccess, false);
  assert.equal(result.error.reasonCode, 'provider-rejected');
  assert.equal(result.error.diagnosticCode, 'provider-threw');
  assert.equal(result.retryable, true);
  assert.equal(isSafeTelegramOutboundPublicJson(result), true);
  assertNoLeak(result);
});

test('unsafe outbound request input is rejected without preserving unsafe content', () => {
  const build = createTelegramOutboundDeliveryRequest(
    requestInput({
      deliveryRef: 'delivery:w17d:unsafe',
      content: {
        format: 'plain',
        text: 'Bearer private-delivery https://provider.internal/send /Users/anna/private providerPayload',
      },
    }),
  );

  assert.equal(build.ok, false);
  assert.equal(build.reasonCode, 'invalid-request');
  assert.equal(build.diagnosticCode, 'invalid-delivery-content');
  assert.equal(isSafeTelegramOutboundPublicJson(build), true);
  assertNoLeak(build);
});

test('readiness blocks missing credentials before injected provider port is called', async () => {
  let calls = 0;
  const result = await deliverTelegramOutboundRequest(
    {
      readiness: {
        providerPortStatus: 'available',
        credentialStatus: 'missing',
        willCallRemote: false,
      },
      providerPort: {
        deliver() {
          calls += 1;
          return {
            accepted: true,
            providerMessageRef: 'message:telegram:should-not-run',
          };
        },
      },
    },
    safeRequest({ deliveryRef: 'delivery:w17d:missing-secret' }),
  );

  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.deliveryStatus, 'not-attempted');
  assert.equal(result.error.reasonCode, 'blocked-missing-secret');
  assert.equal(result.error.diagnosticCode, 'missing-secret');
  assert.equal(result.providerAcknowledgement.status, 'not-attempted');
  assert.equal(result.businessSuccess, false);
  assert.equal(isSafeTelegramOutboundPublicJson(result), true);
  assertNoLeak(result);
});
