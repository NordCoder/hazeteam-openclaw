import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTelegramAdapterResultDeliveryRequest,
  renderTelegramAdapterResult,
} from '../../../dist/rendering/adapter-result-renderer.js';
import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
} from '../../../dist/contracts/result.js';

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:workspace-alpha',
  chatId: 'telegram-chat:chat-alpha',
  messageThreadId: 'telegram-thread:topic-alpha',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
});

function assertNoProviderDeliveryOrSecretFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawProviderObject',
    'rawProviderPayload',
    'rawProviderResponse',
    'providerObject',
    'providerAck',
    'rawProviderAck',
    'externalMessageRef',
    'deliveryAttempt',
    'deliveryResult',
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

test('adapter result renderer converts a safe success result into a render fragment', () => {
  const result = renderTelegramAdapterResult({
    result: adapterOk({
      title: 'Adapter command completed',
      body: [{ text: 'Business result is ready for rendering.' }],
      buttonGroups: [
        {
          buttons: [
            {
              label: 'Continue',
              payload: 'hz:token:adapter-result-success',
              style: 'primary',
            },
          ],
        },
      ],
    }),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    kind: 'telegram-render-fragment',
    content: {
      format: 'plain',
      text: 'Adapter command completed\n\nBusiness result is ready for rendering.',
      buttonGroups: [
        {
          buttons: [
            {
              label: 'Continue',
              payload: 'hz:token:adapter-result-success',
              style: 'primary',
            },
          ],
        },
      ],
    },
  });
  assertNoProviderDeliveryOrSecretFields(result);
});

test('adapter result delivery composition creates a pre-provider delivery request only', () => {
  const context = Object.freeze({
    operationRef: 'operation:adapter-result-delivery-1',
    correlationRef: 'correlation:adapter-result-delivery-1',
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
  });
  const result = createTelegramAdapterResultDeliveryRequest({
    deliveryRef: 'operation:adapter-result-delivery-1',
    target: deliveryTarget,
    correlationRef: 'correlation:adapter-result-delivery-1',
    context,
    result: adapterOk(
      {
        title: 'Rendered response',
        body: [{ text: 'This request still has no provider acknowledgement.' }],
      },
      context,
    ),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    deliveryRef: 'operation:adapter-result-delivery-1',
    target: deliveryTarget,
    content: {
      format: 'plain',
      text: 'Rendered response\n\nThis request still has no provider acknowledgement.',
    },
    context,
    correlationRef: 'correlation:adapter-result-delivery-1',
  });
  assert.equal('externalMessageRef' in result.value, false);
  assert.equal('deliveryAttempt' in result.value, false);
  assert.equal('providerAck' in result.value, false);
  assertNoProviderDeliveryOrSecretFields(result);
});

test('adapter result renderer converts failures into safe error presentation without raw details', () => {
  const result = createTelegramAdapterResultDeliveryRequest({
    deliveryRef: 'operation:adapter-result-failure-1',
    target: deliveryTarget,
    result: adapterErr(
      createAdapterSafeError({
        code: 'dependency-failed',
        message: `${['api', 'key'].join('_')}=abc123 provider call failed`,
        retryable: true,
        detailsRef: 'details:dependency-failure',
        correlationRef: 'correlation:adapter-result-failure-1',
      }),
    ),
    correlationRef: 'correlation:adapter-result-failure-1',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.content, {
    format: 'plain',
    text: 'Adapter operation failed\n\n[redacted] provider call failed',
  });
  assert.equal(result.value.correlationRef, 'correlation:adapter-result-failure-1');
  assertNoProviderDeliveryOrSecretFields(result);
});

test('adapter result delivery composition rejects provider acknowledgement shaped success values', () => {
  const result = createTelegramAdapterResultDeliveryRequest({
    deliveryRef: 'operation:adapter-result-unsafe-ack',
    target: deliveryTarget,
    result: adapterOk({
      title: 'Unsafe success value',
      providerAck: { ok: true, messageId: 'telegram-message:unsafe' },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.match(result.error.message, /delivery acknowledgement/u);
  assertNoProviderDeliveryOrSecretFields(result);
});

test('adapter result delivery composition rejects raw provider payload shaped failure values', () => {
  const result = createTelegramAdapterResultDeliveryRequest({
    deliveryRef: 'operation:adapter-result-unsafe-failure',
    target: deliveryTarget,
    result: {
      ok: false,
      error: {
        code: 'dependency-failed',
        message: 'unsafe provider payload must not pass through',
        rawProviderResponse: { message_id: 123 },
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.match(result.error.message, /raw provider/u);
  assertNoProviderDeliveryOrSecretFields(result);
});
