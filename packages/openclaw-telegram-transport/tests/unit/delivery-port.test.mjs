import assert from 'node:assert/strict';
import test from 'node:test';

import { parseTransportConfig } from '../../dist/index.js';
import {
  createInjectedDeliveryPort,
  deliverRenderedRequest,
  isSafeDeliveryResultJson,
} from '../../dist/delivery-port.js';

function encoded(value) {
  return JSON.stringify(value);
}

function assertNoLeak(value, protectedTerms) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');

  for (const term of protectedTerms) {
    assert.equal(output.includes(term), false, `delivery output leaked ${term}`);
  }
}

const PROTECTED_TERMS = [
  '123456:ABC-private-delivery',
  'Bearer private-delivery',
  'https://provider.internal/send',
  '/Users/anna/private',
  'chat_id=987654321',
  'thread_id=123456789',
  'private-stack-frame',
  'rawDeliveryBody',
  'providerPayload',
];

function renderedRequest(overrides = {}) {
  return {
    descriptorKind: 'rendered-delivery-request',
    provider: 'telegram',
    deliveryRef: 'delivery:unit:0001',
    correlationRef: 'corr:unit:0001',
    idempotencyRef: 'idem:delivery:0001',
    deliveryAttemptRef: 'attempt:delivery:0001',
    target: {
      channelRef: 'channel:telegram:unit',
      chatRef: 'chat:workspace:unit',
      threadRef: 'thread:agent:unit',
      workspaceRef: 'workspace:unit',
      agentRef: 'agent:unit',
      hostSessionRef: 'host-session:unit',
      bindingRef: 'binding:telegram:unit',
    },
    content: {
      descriptorKind: 'rendered-delivery-content',
      format: 'plain',
      text: 'Safe rendered delivery text',
      buttonGroups: [
        {
          buttons: [
            {
              label: 'Approve',
              actionRef: 'action:approve:0001',
            },
          ],
        },
      ],
      attachmentRefs: ['attachment:unit:0001'],
    },
    ...overrides,
  };
}

test('successful fake delivery invokes only injected client and returns safe external message ref', async () => {
  const calls = [];
  const port = createInjectedDeliveryPort({
    client: {
      deliver(request) {
        calls.push(request);
        return {
          ok: true,
          externalMessageRef: 'message:telegram:unit-0001',
          idempotencyRef: request.idempotencyRef,
          deliveryAttemptRef: request.deliveryAttemptRef,
        };
      },
    },
  });

  assert.equal(port.providerClientConstructed, false);
  assert.equal(port.willCallRemoteWithoutClient, false);

  const result = await port.deliver(renderedRequest());

  assert.equal(calls.length, 1);
  assert.equal(calls[0].descriptorKind, 'provider-delivery-client-request');
  assert.equal(calls[0].content.text, 'Safe rendered delivery text');
  assert.equal(result.ok, true);
  assert.equal(result.deliveryStatus, 'provider-acknowledged');
  assert.equal(result.externalMessageRef.messageRef, 'message:telegram:unit-0001');
  assert.equal(result.idempotencyRef, 'idem:delivery:0001');
  assert.equal(result.deliveryAttemptRef, 'attempt:delivery:0001');
  assert.equal(isSafeDeliveryResultJson(result), true);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('provider acknowledgement is separated from business success', async () => {
  const result = await deliverRenderedRequest(
    {
      client: {
        deliver() {
          return {
            ok: true,
            externalMessageRef: 'message:telegram:ack-only',
          };
        },
      },
    },
    renderedRequest({ deliveryRef: 'delivery:unit:ack-separation' }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.deliveryStatus, 'provider-acknowledged');
  assert.equal(result.businessSuccess, false);
  assert.equal(result.businessStatus, 'not-marked-delivered');
  assert.equal(Object.hasOwn(result, 'markDelivered'), false);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('failed provider delivery returns safe reason codes and redacts thrown details', async () => {
  const port = createInjectedDeliveryPort({
    client: {
      async deliver() {
        throw new Error(
          'provider failed Bearer private-delivery at https://provider.internal/send /Users/anna/private chat_id=987654321 thread_id=123456789 private-stack-frame rawDeliveryBody providerPayload',
        );
      },
    },
  });

  const result = await port.deliver(renderedRequest({ deliveryRef: 'delivery:unit:thrown-failure' }));

  assert.equal(result.ok, false);
  assert.equal(result.deliveryStatus, 'provider-rejected');
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSuccess, false);
  assert.equal(result.error.reasonCode, 'provider-rejected');
  assert.equal(result.error.diagnosticCode, 'provider-threw');
  assert.equal(result.retryable, true);
  assert.equal(isSafeDeliveryResultJson(result), true);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('failed provider acknowledgement normalizes unsafe provider fields out of output', async () => {
  const result = await deliverRenderedRequest(
    {
      client: {
        deliver() {
          return {
            ok: false,
            reasonCode: 'provider-rejected',
            retryable: false,
            diagnosticCode: 'https://provider.internal/send',
            detailsRef: '/Users/anna/private',
            rawDeliveryBody: '123456:ABC-private-delivery',
            providerPayload: {
              authorization: 'Bearer private-delivery',
            },
          };
        },
      },
    },
    renderedRequest({ deliveryRef: 'delivery:unit:ack-failure' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.reasonCode, 'provider-rejected');
  assert.equal(result.error.diagnosticCode, 'provider-returned-failure');
  assert.equal(result.retryable, false);
  assert.equal(Object.hasOwn(result, 'detailsRef'), false);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('disabled and missing-secret readiness prevent client invocation safely', async () => {
  const disabledConfig = parseTransportConfig({
    profile: 'test',
    providers: {
      telegram: {
        enabled: false,
      },
    },
  });
  const missingSecretConfig = parseTransportConfig({
    profile: 'real-smoke',
    providers: {
      telegram: {
        mode: 'real',
      },
    },
  });
  let calls = 0;
  const client = {
    deliver() {
      calls += 1;
      return {
        ok: true,
        externalMessageRef: 'message:telegram:should-not-run',
      };
    },
  };

  const disabled = await deliverRenderedRequest(
    {
      client,
      readiness: disabledConfig.readiness,
    },
    renderedRequest({ deliveryRef: 'delivery:unit:disabled' }),
  );
  const missingSecret = await deliverRenderedRequest(
    {
      client,
      readiness: missingSecretConfig.readiness,
    },
    renderedRequest({ deliveryRef: 'delivery:unit:missing-secret' }),
  );

  assert.equal(calls, 0);
  assert.equal(disabled.ok, false);
  assert.equal(disabled.error.reasonCode, 'provider-unavailable');
  assert.equal(disabled.error.diagnosticCode, 'provider-disabled');
  assert.equal(disabled.retryable, false);
  assert.equal(missingSecret.ok, false);
  assert.equal(missingSecret.error.reasonCode, 'provider-unavailable');
  assert.equal(missingSecret.error.diagnosticCode, 'missing-secret');
  assert.equal(missingSecret.retryable, true);
  assertNoLeak(disabled, PROTECTED_TERMS);
  assertNoLeak(missingSecret, PROTECTED_TERMS);
});

test('delivery results are JSON serializable safe public outputs', async () => {
  const result = await deliverRenderedRequest(
    {
      client: {
        deliver() {
          return {
            ok: true,
            externalMessageRef: 'message:telegram:json-0001',
          };
        },
      },
    },
    renderedRequest({ deliveryRef: 'delivery:unit:json' }),
  );

  const decoded = JSON.parse(JSON.stringify(result));
  assert.deepEqual(decoded, result);
  assert.equal(isSafeDeliveryResultJson(result), true);
  assertNoLeak(result, PROTECTED_TERMS);
});

test('unsafe rendered delivery request is rejected without leaking content', async () => {
  let calls = 0;
  const result = await deliverRenderedRequest(
    {
      client: {
        deliver() {
          calls += 1;
          return {
            ok: true,
            externalMessageRef: 'message:telegram:unsafe-content',
          };
        },
      },
    },
    renderedRequest({
      deliveryRef: 'delivery:unit:unsafe-content',
      content: {
        descriptorKind: 'rendered-delivery-content',
        format: 'plain',
        text: 'Bearer private-delivery https://provider.internal/send /Users/anna/private rawDeliveryBody providerPayload',
      },
    }),
  );

  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.deliveryStatus, 'not-attempted');
  assert.equal(result.error.reasonCode, 'invalid-request');
  assert.equal(result.error.diagnosticCode, 'invalid-rendered-content');
  assert.equal(isSafeDeliveryResultJson(result), true);
  assertNoLeak(result, PROTECTED_TERMS);
});
