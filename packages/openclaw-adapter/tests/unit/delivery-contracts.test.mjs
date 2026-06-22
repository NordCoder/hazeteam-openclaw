import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationContext,
  createAdapterOperationRef,
  createAgentRef,
  createTelegramActionButton,
  createTelegramActionButtonPayload,
  createTelegramDeliverySafeError,
  createTelegramExternalMessageRef,
  createWorkspaceRef,
  isTelegramActionButtonPayload,
} from '../../dist/index.js';

const target = Object.freeze({
  channelId: 'telegram-channel:prod',
  chatId: 'telegram-chat:-1001234567890',
  messageThreadId: 'telegram-thread:42',
  workspaceRef: createWorkspaceRef('acme'),
  agentRef: createAgentRef('coder'),
});

const deliveryRef = createAdapterOperationRef('delivery-1');
const correlationRef = createAdapterCorrelationRef('corr-1');

function assertNoForbiddenPublicFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawProviderResponse',
    'rawDeliveryResponse',
    'rawError',
    'stack',
    'botToken',
    'apiKey',
    'secret',
    'toolPayload',
    'approvalPayload',
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

test('delivery target requires channel, chat, and thread coordinates', () => {
  assert.deepEqual(
    createTelegramExternalMessageRef({
      target,
      messageId: 'telegram-message:101',
      correlationRef,
    }),
    {
      channelId: 'telegram-channel:prod',
      chatId: 'telegram-chat:-1001234567890',
      messageThreadId: 'telegram-thread:42',
      messageId: 'telegram-message:101',
      workspaceRef: createWorkspaceRef('acme'),
      agentRef: createAgentRef('coder'),
      correlationRef,
    },
  );

  for (const missingCoordinate of ['channelId', 'chatId', 'messageThreadId']) {
    const invalidTarget = { ...target };
    delete invalidTarget[missingCoordinate];

    assert.throws(
      () =>
        createTelegramExternalMessageRef({
          target: invalidTarget,
          messageId: 'telegram-message:102',
        }),
      TypeError,
    );
  }
});

test('action payload helper creates and accepts opaque hz token payloads', () => {
  assert.equal(createTelegramActionButtonPayload('token:approve-1'), 'hz:token:approve-1');
  assert.equal(createTelegramActionButtonPayload('hz:token:approve-1'), 'hz:token:approve-1');

  assert.equal(isTelegramActionButtonPayload('hz:token:approve-1'), true);
  assert.equal(isTelegramActionButtonPayload('token:approve-1'), false);
});

test('action payload helper rejects JSON and action payload shapes', () => {
  for (const unsafePayload of [
    '{"action":"approve"}',
    'hz:{"action":"approve"}',
    'approve action',
    '../token',
    '',
  ]) {
    assert.equal(isTelegramActionButtonPayload(unsafePayload), false);
    assert.throws(() => createTelegramActionButtonPayload(unsafePayload), TypeError);
  }
});

test('action button helper returns label and opaque payload only', () => {
  const button = createTelegramActionButton({
    label: '  Approve  ',
    payload: 'token:approve-1',
    style: 'primary',
  });

  assert.deepEqual(button, {
    label: 'Approve',
    payload: 'hz:token:approve-1',
    style: 'primary',
  });
  assert.equal(Object.isFrozen(button), true);
  assertNoForbiddenPublicFields(button);

  assert.throws(
    () =>
      createTelegramActionButton({
        label: 'Approve',
        payload: 'token:approve-1',
        style: 'unsafe',
      }),
    TypeError,
  );
});

test('button group carries readonly buttons', () => {
  const button = createTelegramActionButton({
    label: 'Refresh',
    payload: 'token:refresh-1',
    style: 'secondary',
  });
  const group = Object.freeze({
    buttons: Object.freeze([button]),
  });

  assert.equal(group.buttons[0], button);
  assert.equal(Object.isFrozen(group.buttons), true);
  assert.throws(() => group.buttons.push(button), TypeError);
});

test('external message ref is safe and deterministic', () => {
  const firstRef = createTelegramExternalMessageRef({
    target,
    messageId: 'telegram-message:555',
    correlationRef,
  });
  const secondRef = createTelegramExternalMessageRef({
    target,
    messageId: 'telegram-message:555',
    correlationRef,
  });

  assert.deepEqual(firstRef, secondRef);
  assert.deepEqual(Object.keys(firstRef), [
    'channelId',
    'chatId',
    'messageThreadId',
    'messageId',
    'workspaceRef',
    'agentRef',
    'correlationRef',
  ]);
  assertNoForbiddenPublicFields(firstRef);
});

test('delivery success result shape is stable and safe', () => {
  const externalMessageRef = createTelegramExternalMessageRef({
    target,
    messageId: 'telegram-message:777',
    correlationRef,
  });
  const context = createAdapterOperationContext({
    operationRef: deliveryRef,
    correlationRef,
    workspaceRef: target.workspaceRef,
    agentRef: target.agentRef,
  });
  const result = Object.freeze({
    ok: true,
    deliveryRef,
    externalMessageRef,
    context,
    correlationRef,
  });

  assert.equal(result.ok, true);
  assert.equal(result.externalMessageRef.messageId, 'telegram-message:777');
  assertNoForbiddenPublicFields(result);
});

test('delivery failure result shape carries safe error and refs', () => {
  const detailsRef = createAdapterDetailsRef('delivery-provider-unavailable');
  const error = createTelegramDeliverySafeError({
    code: 'provider-unavailable',
    message: 'provider unavailable bot_token=12345',
    retryable: true,
    detailsRef,
    correlationRef,
  });
  const result = Object.freeze({
    ok: false,
    deliveryRef,
    error,
    retryable: error.retryable,
    detailsRef,
    correlationRef,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'provider-unavailable');
  assert.equal(result.error.retryable, true);
  assert.equal(result.error.message.includes('12345'), false);
  assertNoForbiddenPublicFields(result);
});

test('safe error rejects unsupported codes and normalizes unsafe input', () => {
  assert.throws(
    () =>
      createTelegramDeliverySafeError({
        code: 'provider-stacktrace',
        message: 'unsupported',
      }),
    TypeError,
  );

  const normalized = createTelegramDeliverySafeError({
    code: 'timeout',
    message: 'timeout\napi_key=abcdef',
  });

  assert.equal(normalized.code, 'timeout');
  assert.equal(normalized.message, 'timeout [redacted]');
  assert.equal(normalized.message.includes('abcdef'), false);
});

test('public delivery samples do not expose provider response or error fields', () => {
  const button = createTelegramActionButton({
    label: 'Open',
    payload: 'token:open-1',
  });
  const content = Object.freeze({
    format: 'markdown',
    text: '*Ready*',
    buttonGroups: Object.freeze([
      Object.freeze({
        buttons: Object.freeze([button]),
      }),
    ]),
  });
  const request = Object.freeze({
    deliveryRef,
    target,
    content,
    correlationRef,
  });
  const success = Object.freeze({
    ok: true,
    deliveryRef,
    externalMessageRef: createTelegramExternalMessageRef({
      target,
      messageId: 'telegram-message:900',
      correlationRef,
    }),
  });
  const failure = Object.freeze({
    ok: false,
    deliveryRef,
    error: createTelegramDeliverySafeError({
      code: 'provider-rejected',
      message: 'rejected',
      retryable: false,
    }),
  });

  for (const sample of [request, success, failure]) {
    assertNoForbiddenPublicFields(sample);
  }
});
