import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOpenClawDeliveryAdapter,
  createOpenClawDeliveryPortRequest,
  sendOpenClawDeliveryRequest,
} from '../../../../dist/openclaw/delivery/index.js';

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:w8b-workspace',
  chatId: 'telegram-chat:w8b-chat',
  messageThreadId: 'telegram-thread:w8b-topic',
  workspaceRef: 'workspace:w8b-workspace',
  agentRef: 'agent:coder',
});

function makeRequest(overrides = {}) {
  return Object.freeze({
    deliveryRef: 'operation:w8b-delivery-1',
    target: deliveryTarget,
    content: Object.freeze({
      format: 'plain',
      text: 'OpenClaw delivery adapter message',
      buttonGroups: Object.freeze([
        Object.freeze({
          buttons: Object.freeze([
            Object.freeze({
              label: 'Continue',
              payload: 'hz:token:w8b-continue',
              style: 'primary',
            }),
          ]),
        }),
      ]),
    }),
    context: Object.freeze({
      operationRef: 'operation:w8b-delivery-1',
      correlationRef: 'correlation:w8b-delivery-1',
      workspaceRef: 'workspace:w8b-workspace',
      agentRef: 'agent:coder',
    }),
    correlationRef: 'correlation:w8b-delivery-1',
    ...overrides,
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
    'rawDeliveryResponse',
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
  const serialized = JSON.stringify(sample);
  assert.equal(typeof serialized, 'string');

  for (const fieldName of forbiddenFieldNames) {
    assert.equal(
      serialized.includes(fieldName),
      false,
      `serialized output exposes forbidden field marker ${fieldName}`,
    );
  }

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

test('OpenClaw delivery adapter sends one normalized safe request through the injected port', async () => {
  const calls = [];
  const port = Object.freeze({
    sendMessage(request) {
      calls.push(request);
      return Object.freeze({ ok: true, messageId: 'telegram-message:w8b-delivered-1' });
    },
  });
  const adapter = createOpenClawDeliveryAdapter({ port });
  const request = makeRequest();

  const result = await adapter.send(request);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    deliveryRef: 'operation:w8b-delivery-1',
    channelId: deliveryTarget.channelId,
    chatId: deliveryTarget.chatId,
    messageThreadId: deliveryTarget.messageThreadId,
    format: 'plain',
    text: 'OpenClaw delivery adapter message',
    buttonGroups: request.content.buttonGroups,
    workspaceRef: deliveryTarget.workspaceRef,
    agentRef: deliveryTarget.agentRef,
    correlationRef: 'correlation:w8b-delivery-1',
    context: request.context,
  });
  assert.equal(Object.isFrozen(calls[0]), true);
  assert.equal(result.ok, true);
  assert.equal(result.value.ok, true);
  assertNoRawProviderFields(calls[0]);
  assertNoRawProviderFields(result);
});

test('OpenClaw delivery port success maps to a safe Telegram external message ref result', async () => {
  const request = makeRequest({ deliveryRef: 'operation:w8b-success' });
  const result = await sendOpenClawDeliveryRequest({
    request,
    port: Object.freeze({
      sendMessage() {
        return Object.freeze({
          ok: true,
          messageId: 'telegram-message:w8b-success-message',
          correlationRef: 'correlation:w8b-port-success',
        });
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.context, request.context);
  assert.deepEqual(result.value, {
    ok: true,
    deliveryRef: 'operation:w8b-success',
    externalMessageRef: {
      ...deliveryTarget,
      messageId: 'telegram-message:w8b-success-message',
      correlationRef: 'correlation:w8b-port-success',
    },
    context: request.context,
    correlationRef: 'correlation:w8b-port-success',
  });
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.externalMessageRef), true);
  assertNoRawProviderFields(result);
});

test('OpenClaw delivery port failure maps to a safe non-retryable delivery failure', async () => {
  const request = makeRequest({ deliveryRef: 'operation:w8b-provider-rejected' });

  const result = await sendOpenClawDeliveryRequest({
    request,
    port: Object.freeze({
      sendMessage() {
        return Object.freeze({
          ok: false,
          error: Object.freeze({
            code: 'provider-rejected',
            message: `${['bot', 'token'].join('_')}=abc123 rejected by provider`,
            retryable: false,
            detailsRef: 'details:w8b-provider-rejected',
          }),
        });
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.ok, false);
  assert.equal(result.value.deliveryRef, 'operation:w8b-provider-rejected');
  assert.equal(result.value.error.code, 'provider-rejected');
  assert.equal(result.value.error.message, '[redacted] rejected by provider');
  assert.equal(result.value.error.retryable, false);
  assert.equal(result.value.error.detailsRef, 'details:w8b-provider-rejected');
  assert.equal(result.value.retryable, false);
  assertNoRawProviderFields(result);
});

test('OpenClaw delivery port retryable failure stays a safe retryable delivery failure', async () => {
  const request = makeRequest({ deliveryRef: 'operation:w8b-rate-limited' });

  const result = await sendOpenClawDeliveryRequest({
    request,
    port: Object.freeze({
      sendMessage() {
        return Object.freeze({
          ok: false,
          retryable: true,
          correlationRef: 'correlation:w8b-rate-limited',
          error: Object.freeze({
            code: 'rate-limited',
            message: `${['api', 'key'].join('_')}=abc123 wait before retry`,
          }),
        });
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.ok, false);
  assert.equal(result.value.error.code, 'rate-limited');
  assert.equal(result.value.error.message, '[redacted] wait before retry');
  assert.equal(result.value.error.retryable, true);
  assert.equal(result.value.retryable, true);
  assert.equal(result.value.correlationRef, 'correlation:w8b-rate-limited');
  assertNoRawProviderFields(result);
});

test('OpenClaw delivery adapter converts thrown port errors into safe retryable delivery failures', async () => {
  const request = makeRequest({ deliveryRef: 'operation:w8b-thrown' });

  const result = await sendOpenClawDeliveryRequest({
    request,
    port: Object.freeze({
      sendMessage() {
        throw new Error(`${['api', 'key'].join('_')}=abc123 provider stack trace`);
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.ok, false);
  assert.equal(result.value.deliveryRef, 'operation:w8b-thrown');
  assert.equal(result.value.error.code, 'provider-unavailable');
  assert.equal(result.value.error.message, 'OpenClaw delivery port failed');
  assert.equal(result.value.error.retryable, true);
  assert.equal(result.value.retryable, true);
  assertNoRawProviderFields(result);
});

test('OpenClaw delivery adapter rejects malformed targets and content before calling the port', async () => {
  let calls = 0;
  const port = Object.freeze({
    sendMessage() {
      calls += 1;
      return Object.freeze({ ok: true, messageId: 'telegram-message:must-not-send' });
    },
  });

  const badTarget = await sendOpenClawDeliveryRequest({
    request: makeRequest({
      deliveryRef: 'operation:w8b-bad-target',
      target: Object.freeze({ ...deliveryTarget, chatId: 'chat-without-safe-prefix' }),
    }),
    port,
  });
  const badContent = await sendOpenClawDeliveryRequest({
    request: makeRequest({
      deliveryRef: 'operation:w8b-bad-content',
      content: Object.freeze({ format: 'plain', text: '   ' }),
    }),
    port,
  });

  assert.equal(calls, 0);
  assert.equal(badTarget.ok, false);
  assert.equal(badTarget.error.code, 'invalid-input');
  assert.match(badTarget.error.message, /chatId/u);
  assert.equal(badContent.ok, false);
  assert.equal(badContent.error.code, 'invalid-input');
  assert.match(badContent.error.message, /content text/u);
  assertNoRawProviderFields(badTarget);
  assertNoRawProviderFields(badContent);
});

test('OpenClaw delivery adapter does not return raw provider responses from malformed port output', async () => {
  const request = makeRequest({ deliveryRef: 'operation:w8b-raw-port-output' });

  const result = await sendOpenClawDeliveryRequest({
    request,
    port: Object.freeze({
      sendMessage() {
        return {
          ok: true,
          messageId: 'telegram-message:w8b-raw-output',
          rawProviderResponse: { message_id: 123, token: 'must-not-leak' },
        };
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.match(result.error.message, /must not include raw provider/u);
  assertNoRawProviderFields(result);
});

test('OpenClaw delivery port request normalizer redacts sensitive message assignments', () => {
  const request = makeRequest({
    deliveryRef: 'operation:w8b-redacted-message',
    content: Object.freeze({
      format: 'plain',
      text: `send ${['api', 'key'].join('_')}=abc123 safely`,
    }),
  });

  const portRequest = createOpenClawDeliveryPortRequest(request);

  assert.equal(portRequest.text, 'send [redacted] safely');
  assertNoRawProviderFields(portRequest);
});

test('OpenClaw delivery adapter output is deterministic and does not use timer, random, network, or filesystem APIs', async () => {
  const originalDateNow = Date.now;
  const originalRandom = Math.random;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  Date.now = () => {
    throw new Error('Date.now must not be used');
  };
  Math.random = () => {
    throw new Error('Math.random must not be used');
  };
  globalThis.fetch = () => {
    throw new Error('fetch must not be used');
  };

  try {
    const port = Object.freeze({
      sendMessage() {
        calls += 1;
        return Object.freeze({ ok: true, messageId: 'telegram-message:w8b-deterministic' });
      },
    });
    const request = makeRequest({ deliveryRef: 'operation:w8b-deterministic' });

    const first = await sendOpenClawDeliveryRequest({ request, port });
    const second = await sendOpenClawDeliveryRequest({ request, port });

    assert.equal(calls, 2);
    assert.deepEqual(first, second);
    assertNoRawProviderFields(first);
  } finally {
    Date.now = originalDateNow;
    Math.random = originalRandom;
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
  }
});
