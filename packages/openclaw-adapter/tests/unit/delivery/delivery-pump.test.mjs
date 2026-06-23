import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTelegramDeliveryPump,
  createTelegramDeliveryPumpRequest,
  pumpTelegramDeliveryRequest,
} from '../../../dist/delivery/delivery-pump.js';
import {
  createTelegramRenderDeliveryRequest,
  createTelegramRenderFragment,
} from '../../../dist/rendering/telegram-renderer.js';

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:workspace-alpha',
  chatId: 'telegram-chat:chat-alpha',
  messageThreadId: 'telegram-thread:topic-alpha',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
});

function makeRenderedRequest(deliveryRef = 'operation:delivery-pump-1') {
  return createTelegramRenderDeliveryRequest({
    deliveryRef,
    correlationRef: 'correlation:delivery-pump-1',
    target: deliveryTarget,
    source: {
      title: 'Rendered response',
      body: [{ text: 'Ready for deterministic delivery.' }],
      buttonGroups: [
        {
          buttons: [
            {
              label: 'Continue',
              payload: 'hz:token:delivery-pump-1',
              style: 'primary',
            },
          ],
        },
      ],
    },
    context: Object.freeze({
      operationRef: deliveryRef,
      correlationRef: 'correlation:delivery-pump-1',
      workspaceRef: 'workspace:workspace-alpha',
      agentRef: 'agent:coder',
    }),
  });
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
    correlationRef: request.correlationRef,
  });
}

function assertNoRawProviderFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawProviderObject',
    'rawProviderResponse',
    'providerObject',
    'providerAck',
    'sdkClient',
    'openClawClient',
    'platformHandle',
    'deploymentHandle',
    'filesystemPath',
    'storageRoot',
    'stack',
    ['bot', 'Token'].join(''),
    ['api', 'Key'].join(''),
    ['sec', 'ret'].join(''),
    ['cred', 'ential'].join(''),
    ['pass', 'word'].join(''),
  ];

  const queue = [sample];
  while (queue.length > 0) {
    const current = queue.pop();

    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const fieldName of forbiddenFieldNames) {
      assert.equal(fieldName in current, false, `sample exposes forbidden field ${fieldName}`);
    }

    for (const value of Object.values(current)) {
      if (value !== null && typeof value === 'object') {
        queue.push(value);
      }
    }
  }
}

test('delivery pump sends one safe rendered request through the injected sink and returns a delivered decision', () => {
  const requests = [];
  const sink = Object.freeze({
    submit(request) {
      requests.push(request);
      return successFor(request);
    },
  });
  const pump = createTelegramDeliveryPump({ sink });
  const request = makeRenderedRequest();

  const result = pump.deliver(request);

  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], request);
  assert.deepEqual(result.context, request.context);
  assert.deepEqual(result.value, {
    kind: 'delivered',
    deliveryRef: 'operation:delivery-pump-1',
    deliveryResult: {
      ok: true,
      deliveryRef: 'operation:delivery-pump-1',
      externalMessageRef: {
        ...deliveryTarget,
        messageId: 'telegram-message:delivered-1',
        correlationRef: 'correlation:delivery-pump-1',
      },
      context: request.context,
      correlationRef: 'correlation:delivery-pump-1',
    },
    externalMessageRef: {
      ...deliveryTarget,
      messageId: 'telegram-message:delivered-1',
      correlationRef: 'correlation:delivery-pump-1',
    },
    sinkCalled: true,
    retryable: false,
    shouldMarkDelivered: true,
    shouldMarkFailed: false,
    shouldRetry: false,
  });
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.externalMessageRef), true);
  assertNoRawProviderFields(result);
});

test('delivery pump converts safe sink failures into deterministic retry decisions', () => {
  const request = makeRenderedRequest('operation:delivery-pump-failure');
  const sink = Object.freeze({
    submit(submittedRequest) {
      return Object.freeze({
        ok: false,
        deliveryRef: submittedRequest.deliveryRef,
        error: Object.freeze({
          code: 'rate-limited',
          message: `${['bot', 'token'].join('_')}=abc123 wait before retry`,
          retryable: true,
          detailsRef: 'details:rate-limit-1',
        }),
        retryable: true,
      });
    },
  });

  const result = pumpTelegramDeliveryRequest({ request, sink });

  assert.equal(result.ok, true);
  assert.equal(result.value.kind, 'failed');
  assert.equal(result.value.deliveryRef, 'operation:delivery-pump-failure');
  assert.equal(result.value.error.code, 'rate-limited');
  assert.equal(result.value.error.message, '[redacted] wait before retry');
  assert.equal(result.value.error.detailsRef, 'details:rate-limit-1');
  assert.equal(result.value.retryable, true);
  assert.equal(result.value.shouldMarkDelivered, false);
  assert.equal(result.value.shouldMarkFailed, true);
  assert.equal(result.value.shouldRetry, true);
  assertNoRawProviderFields(result);
});

test('delivery pump reports invalid rendered requests before calling the sink', () => {
  const request = {
    ...makeRenderedRequest('operation:delivery-pump-invalid'),
    rawProviderResponse: { ok: true },
  };
  let calls = 0;
  const sink = Object.freeze({
    submit(submittedRequest) {
      calls += 1;
      return successFor(submittedRequest);
    },
  });

  const result = pumpTelegramDeliveryRequest({ request, sink });

  assert.equal(result.ok, false);
  assert.equal(calls, 0);
  assert.equal(result.error.code, 'invalid-input');
  assert.match(result.error.message, /must not include raw provider/u);
  assertNoRawProviderFields(result);
});

test('delivery pump returns a safe dependency error when the sink is missing', () => {
  const request = makeRenderedRequest('operation:delivery-pump-missing-sink');

  const result = pumpTelegramDeliveryRequest({ request, sink: undefined });

  assert.equal(result.ok, false);
  assert.deepEqual(result.context, request.context);
  assert.equal(result.error.code, 'dependency-missing');
  assert.equal(result.error.retryable, true);
  assert.equal(result.error.correlationRef, 'correlation:delivery-pump-1');
  assertNoRawProviderFields(result);
});

test('delivery pump converts thrown sink failures into safe retryable failed decisions', () => {
  const request = makeRenderedRequest('operation:delivery-pump-throw');
  const sink = Object.freeze({
    submit() {
      throw new Error(`${['api', 'key'].join('_')}=abc123 raw stack trace`);
    },
  });

  const result = pumpTelegramDeliveryRequest({ request, sink });

  assert.equal(result.ok, true);
  assert.equal(result.value.kind, 'failed');
  assert.equal(result.value.error.code, 'provider-unavailable');
  assert.equal(result.value.error.message, 'Telegram delivery sink failed');
  assert.equal(result.value.retryable, true);
  assert.equal(result.value.shouldMarkFailed, true);
  assert.equal(result.value.shouldRetry, true);
  assertNoRawProviderFields(result);
});

test('delivery pump accepts already-rendered fragments through an explicit safe request wrapper', () => {
  const fragment = createTelegramRenderFragment({
    format: 'plain',
    text: 'Already rendered pump fragment',
    buttonGroups: [
      {
        buttons: [
          {
            label: 'Open',
            payload: 'hz:token:fragment-delivery-1',
          },
        ],
      },
    ],
  });
  const request = createTelegramDeliveryPumpRequest({
    deliveryRef: 'operation:fragment-delivery-1',
    target: deliveryTarget,
    fragment,
    correlationRef: 'correlation:fragment-delivery-1',
  });

  assert.deepEqual(request, {
    deliveryRef: 'operation:fragment-delivery-1',
    target: deliveryTarget,
    content: fragment.content,
    correlationRef: 'correlation:fragment-delivery-1',
  });

  assert.throws(
    () =>
      createTelegramDeliveryPumpRequest({
        deliveryRef: 'operation:fragment-delivery-bad',
        target: deliveryTarget,
        fragment: {
          kind: 'telegram-render-fragment',
          content: {
            format: 'markdown',
            text: 'not accepted by the safe delivery pump shell',
          },
        },
      }),
    TypeError,
  );
});

test('delivery pump rejects sink results that do not preserve safe request refs', () => {
  const request = makeRenderedRequest('operation:delivery-pump-mismatch');
  let calls = 0;
  const sink = Object.freeze({
    submit(submittedRequest) {
      calls += 1;
      return {
        ...successFor(submittedRequest),
        deliveryRef: 'operation:other-delivery',
      };
    },
  });

  const result = pumpTelegramDeliveryRequest({ request, sink });

  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.match(result.error.message, /deliveryRef must match/u);
  assertNoRawProviderFields(result);
});

test('delivery pump rejects unsafe sink result fields instead of passing them through', () => {
  const request = makeRenderedRequest('operation:delivery-pump-unsafe-result');
  const sink = Object.freeze({
    submit(submittedRequest) {
      return {
        ...successFor(submittedRequest),
        rawProviderResponse: { message_id: 1 },
      };
    },
  });

  const result = pumpTelegramDeliveryRequest({ request, sink });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.match(result.error.message, /must not include raw provider/u);
  assertNoRawProviderFields(result);
});

test('delivery pump rejects non-boolean retry flags from sink results', () => {
  const request = makeRenderedRequest('operation:delivery-pump-bad-retryable');
  const sink = Object.freeze({
    submit(submittedRequest) {
      return {
        ok: false,
        deliveryRef: submittedRequest.deliveryRef,
        error: {
          code: 'provider-unavailable',
          message: 'retry flag must stay boolean',
          retryable: 'yes',
        },
      };
    },
  });

  const result = pumpTelegramDeliveryRequest({ request, sink });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.match(result.error.message, /retryable must be a boolean/u);
  assertNoRawProviderFields(result);
});
