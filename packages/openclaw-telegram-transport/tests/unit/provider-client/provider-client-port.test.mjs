import assert from 'node:assert/strict';
import test from 'node:test';

let providerClientModule;
async function providerClient() {
  if (providerClientModule === undefined) {
    providerClientModule = await import('../../../dist/provider-client/index.js');
  }

  return providerClientModule;
}

const PROTECTED_TERMS = [
  '123456:ABC-private-provider',
  'Bearer provider-secret',
  'https://provider.internal/send',
  '/Users/anna/private',
  'chat_id=987654321',
  'thread_id=123456789',
  'rawProviderPayload',
  'providerPayload',
  'stackTrace',
  'clientHandle',
  'providerHandle',
];

function encoded(value) {
  return JSON.stringify(value);
}

async function assertNoLeak(value) {
  const { isSafeProviderClientPortJson } = await providerClient();
  const output = encoded(value);
  assert.equal(typeof output, 'string');
  assert.equal(isSafeProviderClientPortJson(value), true);

  for (const term of PROTECTED_TERMS) {
    assert.equal(output.includes(term), false, `provider-client output leaked ${term}`);
  }
}

function deliveryRequest(overrides = {}) {
  return {
    descriptorKind: 'provider-client-delivery-call-request',
    descriptorVersion: 'w18b',
    provider: 'telegram',
    deliveryRef: 'delivery:w18b:0001',
    correlationRef: 'corr:w18b:0001',
    idempotencyRef: 'idem:w18b:0001',
    deliveryAttemptRef: 'attempt:w18b:0001',
    targetRef: 'target:telegram:w18b',
    routeRef: 'route:telegram:w18b',
    content: {
      format: 'plain',
      text: 'Safe provider delivery text',
      actionRefs: ['action:w18b:approve'],
      attachmentRefs: ['attachment:w18b:0001'],
    },
    jsonSerializable: true,
    ...overrides,
  };
}

function callbackAckRequest(overrides = {}) {
  return {
    descriptorKind: 'provider-client-callback-acknowledgement-request',
    descriptorVersion: 'w18b',
    provider: 'telegram',
    callbackRef: 'callback:w18b:0001',
    correlationRef: 'corr:w18b:callback:0001',
    acknowledgementStatus: 'ack-required',
    displayText: 'Processing',
    acknowledgesBusinessSuccess: false,
    jsonSerializable: true,
    ...overrides,
  };
}

test('default local import and port construction are inert', async () => {
  let networkCalls = 0;
  const hadFetch = Object.prototype.hasOwnProperty.call(globalThis, 'fetch');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function blockedFetch() {
    networkCalls += 1;
    throw new Error('network should not run');
  };

  try {
    const {
      createInjectedProviderClientPort,
      describeProviderClientPortBoundary,
      isSafeProviderClientPortJson,
    } = await providerClient();

    const descriptor = describeProviderClientPortBoundary();
    assert.equal(networkCalls, 0);
    assert.equal(descriptor.providerClientConstructedByDefault, false);
    assert.equal(descriptor.networkBehaviorByDefault, 'none');
    assert.equal(descriptor.processEnvReads, false);
    assert.equal(descriptor.requiresInjectedPort, true);
    assert.equal(descriptor.providerAcknowledgementIsBusinessSuccess, false);
    assert.equal(isSafeProviderClientPortJson(descriptor), true);

    let deliveryCalls = 0;
    const port = createInjectedProviderClientPort({
      deliver() {
        deliveryCalls += 1;
        return { ok: true, providerMessageRef: 'message:telegram:constructed' };
      },
    });

    assert.equal(deliveryCalls, 0);
    assert.equal(port.providerClientConstructed, false);
    assert.equal(port.willCallRemoteWithoutInvocation, false);
    assert.equal(port.effects, 'none-until-invoked');
    assert.equal(networkCalls, 0);
  } finally {
    if (hadFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete globalThis.fetch;
    }
  }
});

test('readiness reports ready, missing port, and blocked credential without constructing clients', async () => {
  const { createInjectedProviderClientPort, createProviderClientPortReadiness } = await providerClient();
  const port = createInjectedProviderClientPort({
    deliver() {
      return { ok: true, providerMessageRef: 'message:telegram:ready' };
    },
  });

  const ready = createProviderClientPortReadiness({
    provider: 'telegram',
    port,
    credentialStatus: 'configured-redacted',
  });
  const missingPort = createProviderClientPortReadiness({
    provider: 'telegram',
    credentialStatus: 'configured-redacted',
  });
  const blockedCredential = createProviderClientPortReadiness({
    provider: 'telegram',
    port,
    credentialStatus: 'missing',
  });

  assert.equal(ready.status, 'ready');
  assert.equal(ready.providerPortStatus, 'available');
  assert.equal(ready.providerClientConstructed, false);
  assert.equal(ready.willCallRemote, false);
  assert.equal(missingPort.status, 'blocked-missing-port');
  assert.equal(missingPort.providerPortStatus, 'missing');
  assert.equal(blockedCredential.status, 'blocked-missing-credential');
  assert.equal(blockedCredential.credentialStatus, 'missing');
  await assertNoLeak(ready);
  await assertNoLeak(missingPort);
  await assertNoLeak(blockedCredential);
});

test('missing provider port returns a safe blocked delivery result', async () => {
  const { callProviderDelivery } = await providerClient();
  const result = await callProviderDelivery(
    { provider: 'telegram', credentialStatus: 'configured-redacted' },
    deliveryRequest({ deliveryRef: 'delivery:w18b:missing-port' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.providerAckStatus, 'not-attempted');
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSuccess, false);
  assert.equal(result.error.reasonCode, 'missing-provider-port');
  assert.equal(result.error.classification, 'blocked-missing-port');
  await assertNoLeak(result);
});

test('blocked credential prevents provider invocation safely', async () => {
  const { callProviderDelivery, createInjectedProviderClientPort } = await providerClient();
  let calls = 0;
  const port = createInjectedProviderClientPort({
    deliver() {
      calls += 1;
      return { ok: true, providerMessageRef: 'message:telegram:should-not-run' };
    },
  });

  const result = await callProviderDelivery(
    { provider: 'telegram', port, credentialStatus: 'invalid' },
    deliveryRequest({ deliveryRef: 'delivery:w18b:blocked-credential' }),
  );

  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.providerAckStatus, 'not-attempted');
  assert.equal(result.error.reasonCode, 'credential-blocked');
  assert.equal(result.error.classification, 'blocked-missing-credential');
  await assertNoLeak(result);
});

test('provider acknowledged delivery is normalized without marking business success', async () => {
  const { callProviderDelivery, createInjectedProviderClientPort } = await providerClient();
  const calls = [];
  const port = createInjectedProviderClientPort({
    deliver(request) {
      calls.push(request);
      assert.equal(Object.hasOwn(request, 'chatRef'), false);
      assert.equal(Object.hasOwn(request, 'threadRef'), false);
      return {
        ok: true,
        providerMessageRef: 'message:telegram:w18b-ack',
        idempotencyRef: request.idempotencyRef,
        deliveryAttemptRef: request.deliveryAttemptRef,
      };
    },
  });

  const result = await callProviderDelivery(
    { provider: 'telegram', port, credentialStatus: 'configured-redacted' },
    deliveryRequest({ deliveryRef: 'delivery:w18b:ack' }),
  );

  assert.equal(calls.length, 1);
  assert.equal(result.ok, true);
  assert.equal(result.providerAckStatus, 'provider-acknowledged');
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.providerMessageRef.messageRef, 'message:telegram:w18b-ack');
  assert.equal(result.businessSuccess, false);
  assert.equal(result.businessStatus, 'not-marked-delivered');
  assert.equal(Object.hasOwn(result, 'chatRef'), false);
  assert.equal(Object.hasOwn(result, 'threadRef'), false);
  await assertNoLeak(result);
});

test('provider rejected delivery is classified and redacted', async () => {
  const { callProviderDelivery, createInjectedProviderClientPort } = await providerClient();
  const port = createInjectedProviderClientPort({
    deliver() {
      return {
        ok: false,
        reasonCode: 'rate-limited',
        retryable: true,
        detailsRef: 'details:w18b:rate-limit',
        rawProviderPayload: '123456:ABC-private-provider',
        providerPayload: { authorization: 'Bearer provider-secret' },
      };
    },
  });

  const result = await callProviderDelivery(
    { provider: 'telegram', port, credentialStatus: 'configured-redacted' },
    deliveryRequest({ deliveryRef: 'delivery:w18b:rejected' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.providerAckStatus, 'provider-rejected');
  assert.equal(result.providerAcknowledged, false);
  assert.equal(result.businessSuccess, false);
  assert.equal(result.error.reasonCode, 'rate-limited');
  assert.equal(result.error.classification, 'provider-returned-failure');
  assert.equal(result.retryable, true);
  assert.equal(result.detailsRef, 'details:w18b:rate-limit');
  await assertNoLeak(result);
});

test('thrown provider failure is redacted and classified', async () => {
  const { callProviderDelivery, createInjectedProviderClientPort } = await providerClient();
  const port = createInjectedProviderClientPort({
    async deliver() {
      throw new Error(
        'provider failed Bearer provider-secret https://provider.internal/send /Users/anna/private chat_id=987654321 thread_id=123456789 rawProviderPayload providerPayload stackTrace clientHandle providerHandle',
      );
    },
  });

  const result = await callProviderDelivery(
    { provider: 'telegram', port, credentialStatus: 'configured-redacted' },
    deliveryRequest({ deliveryRef: 'delivery:w18b:thrown' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.providerAckStatus, 'provider-rejected');
  assert.equal(result.error.reasonCode, 'provider-rejected');
  assert.equal(result.error.classification, 'provider-threw');
  assert.equal(result.retryable, true);
  await assertNoLeak(result);
});

test('malformed unsafe provider result becomes a redacted failed-safe result', async () => {
  const { callProviderDelivery, createInjectedProviderClientPort } = await providerClient();
  const port = createInjectedProviderClientPort({
    deliver() {
      return {
        providerPayload: 'Bearer provider-secret',
        rawProviderPayload: 'https://provider.internal/send',
        stackTrace: '/Users/anna/private',
        clientHandle: 'provider-client-object',
      };
    },
  });

  const result = await callProviderDelivery(
    { provider: 'telegram', port, credentialStatus: 'configured-redacted' },
    deliveryRequest({ deliveryRef: 'delivery:w18b:malformed' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.providerAckStatus, 'provider-rejected');
  assert.equal(result.error.reasonCode, 'provider-rejected');
  assert.equal(result.error.classification, 'malformed-provider-result');
  await assertNoLeak(result);
});

test('callback acknowledgement descriptor preserves provider ack versus business success separation', async () => {
  const { acknowledgeProviderCallback, createInjectedProviderClientPort } = await providerClient();
  const port = createInjectedProviderClientPort({
    acknowledgeCallback(request) {
      assert.equal(request.acknowledgesBusinessSuccess, false);
      return {
        ok: true,
        acknowledgementRef: 'ack:w18b:callback',
      };
    },
  });

  const result = await acknowledgeProviderCallback(
    { provider: 'telegram', port, credentialStatus: 'configured-redacted' },
    callbackAckRequest(),
  );

  assert.equal(result.ok, true);
  assert.equal(result.providerAckStatus, 'provider-acknowledged');
  assert.equal(result.providerAcknowledged, true);
  assert.equal(result.businessSuccess, false);
  assert.equal(result.businessStatus, 'not-business-success');
  assert.equal(result.acknowledgementRef, 'ack:w18b:callback');
  await assertNoLeak(result);
});

test('public outputs are JSON serializable and unsafe requests do not leak', async () => {
  const { callProviderDelivery, createInjectedProviderClientPort } = await providerClient();
  let calls = 0;
  const port = createInjectedProviderClientPort({
    deliver() {
      calls += 1;
      return { ok: true, providerMessageRef: 'message:telegram:unsafe-should-not-run' };
    },
  });

  const result = await callProviderDelivery(
    { provider: 'telegram', port, credentialStatus: 'configured-redacted' },
    deliveryRequest({
      deliveryRef: 'delivery:w18b:unsafe-request',
      content: {
        format: 'plain',
        text: 'Bearer provider-secret https://provider.internal/send /Users/anna/private rawProviderPayload providerPayload chat_id=987654321 thread_id=123456789',
      },
    }),
  );

  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.providerAckStatus, 'not-attempted');
  assert.equal(result.error.reasonCode, 'invalid-request');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  await assertNoLeak(result);
});
