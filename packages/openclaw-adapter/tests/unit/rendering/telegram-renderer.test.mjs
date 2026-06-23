import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTelegramRenderDeliveryRequest,
  createTelegramRenderFragment,
  isTelegramRenderFragment,
  renderSafePresentationLike,
  renderTelegramCardDescriptor,
  renderTelegramInput,
} from '../../../dist/rendering/telegram-renderer.js';
import {
  createTelegramActionButtonDescriptor,
  createTelegramButtonGroupDescriptor,
  createTelegramCardDescriptor,
  createTelegramTextBlock,
} from '../../../dist/commands/ui-descriptors.js';

function assertNoForbiddenPublicFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawProviderObject',
    'rawProviderResponse',
    'providerObject',
    'provider',
    'rawCallbackBody',
    'rawError',
    'stack',
    ['bot', 'Token'].join(''),
    ['api', 'Key'].join(''),
    ['sec', 'ret'].join(''),
    ['cred', 'ential'].join(''),
    'handler',
    'execute',
    'dispatch',
    'router',
    'toolPayload',
    'rawToolPayload',
    'approvalPayload',
    'externalMessageRef',
    'deliveryAttempt',
    'providerAck',
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

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:workspace-alpha',
  chatId: 'telegram-chat:chat-alpha',
  messageThreadId: 'telegram-thread:topic-alpha',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
});

test('card renderer converts safe Telegram UI descriptors into plain delivery fragments', () => {
  const approveButton = createTelegramActionButtonDescriptor({
    label: 'Approve',
    payload: 'hz:token:approve-render-1',
    style: 'primary',
  });
  const card = createTelegramCardDescriptor({
    intent: 'action-request',
    title: 'Action required',
    body: [
      createTelegramTextBlock({ text: '  Deploy production?  ', tone: 'strong' }),
      createTelegramTextBlock({ text: 'Token stays opaque.', tone: 'muted' }),
    ],
    buttonGroups: [createTelegramButtonGroupDescriptor({ buttons: [approveButton] })],
  });

  const fragment = renderTelegramCardDescriptor(card);

  assert.deepEqual(fragment, {
    kind: 'telegram-render-fragment',
    content: {
      format: 'plain',
      text: 'Action required\n\nDeploy production?\n\n(Token stays opaque.)',
      buttonGroups: [
        {
          buttons: [
            {
              label: 'Approve',
              payload: 'hz:token:approve-render-1',
              style: 'primary',
            },
          ],
        },
      ],
    },
  });
  assert.equal(Object.isFrozen(fragment), true);
  assert.equal(Object.isFrozen(fragment.content), true);
  assert.equal(Object.isFrozen(fragment.content.buttonGroups), true);
  assert.equal(Object.isFrozen(fragment.content.buttonGroups[0].buttons), true);
  assertNoForbiddenPublicFields(fragment);
});

test('safe presentation-like input renders deterministically without provider wiring', () => {
  const fragment = renderSafePresentationLike({
    intent: 'command-help',
    title: 'Topic help',
    body: [
      { text: '/help — show commands' },
      { text: '/status — show status', tone: 'code' },
    ],
    buttonGroups: [
      {
        buttons: [
          {
            label: 'Open status',
            payload: 'token:status-render-1',
            style: 'secondary',
          },
        ],
      },
    ],
  });

  assert.equal(
    fragment.content.text,
    'Topic help\n\n/help — show commands\n\n    /status — show status',
  );
  assert.equal(fragment.content.buttonGroups[0].buttons[0].payload, 'hz:token:status-render-1');
  assert.equal(isTelegramRenderFragment(fragment), true);
  assertNoForbiddenPublicFields(fragment);
});

test('delivery request renderer wraps safe render content without owning delivery attempts', () => {
  const request = createTelegramRenderDeliveryRequest({
    deliveryRef: 'operation:render-delivery-1',
    correlationRef: 'correlation:render-correlation-1',
    target: deliveryTarget,
    source: {
      title: 'Rendered response',
      body: [{ text: 'Ready to deliver through a later pump.' }],
    },
    context: Object.freeze({
      operationRef: 'operation:render-delivery-1',
      correlationRef: 'correlation:render-correlation-1',
      workspaceRef: 'workspace:workspace-alpha',
      agentRef: 'agent:coder',
    }),
  });

  assert.deepEqual(request, {
    deliveryRef: 'operation:render-delivery-1',
    target: deliveryTarget,
    content: {
      format: 'plain',
      text: 'Rendered response\n\nReady to deliver through a later pump.',
    },
    context: {
      operationRef: 'operation:render-delivery-1',
      correlationRef: 'correlation:render-correlation-1',
      workspaceRef: 'workspace:workspace-alpha',
      agentRef: 'agent:coder',
    },
    correlationRef: 'correlation:render-correlation-1',
  });
  assert.equal('externalMessageRef' in request, false);
  assert.equal('deliveryAttempt' in request, false);
  assert.equal('providerAck' in request, false);
  assertNoForbiddenPublicFields(request);
});

test('renderer accepts already-rendered plain fragments and revalidates callback payloads', () => {
  const fragment = createTelegramRenderFragment({
    format: 'plain',
    text: 'Already rendered',
    buttonGroups: [
      {
        buttons: [
          {
            label: 'Continue',
            payload: 'hz:token:continue-render-1',
            style: 'primary',
          },
        ],
      },
    ],
  });

  assert.deepEqual(renderTelegramInput(fragment), fragment);
  assert.equal(fragment.content.buttonGroups[0].buttons[0].payload, 'hz:token:continue-render-1');
  assert.throws(
    () =>
      createTelegramRenderFragment({
        format: 'markdown',
        text: 'Not accepted by this safe renderer shell',
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramRenderFragment({
        format: 'plain',
        text: 'unsafe payload',
        buttonGroups: [{ buttons: [{ label: 'Unsafe', payload: '{"approve":true}' }] }],
      }),
    TypeError,
  );
});

test('renderer rejects raw provider, sensitive, storage, and delivery attempt fields', () => {
  assert.throws(
    () =>
      renderSafePresentationLike({
        title: 'Unsafe',
        rawTelegramUpdate: { update_id: 1 },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      renderTelegramCardDescriptor({
        kind: 'telegram-card-descriptor',
        intent: 'action-request',
        title: 'Unsafe',
        body: [createTelegramTextBlock({ text: 'ok' })],
        approvalPayload: { approve: true },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramRenderDeliveryRequest({
        deliveryRef: 'operation:render-delivery-unsafe',
        target: {
          ...deliveryTarget,
          providerAck: { ok: true },
        },
        source: { title: 'Unsafe target' },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramRenderDeliveryRequest({
        deliveryRef: 'operation:render-delivery-unsafe',
        target: deliveryTarget,
        source: { title: 'Unsafe operation' },
        externalMessageRef: { messageId: 'telegram-message:already-delivered' },
      }),
    TypeError,
  );

  for (const unsafeFieldName of [
    ['sec', 'ret'].join(''),
    ['api', 'Key'].join(''),
    ['bot', 'Token'].join(''),
    ['pass', 'word'].join(''),
    ['cred', 'ential'].join(''),
  ]) {
    assert.throws(
      () =>
        renderSafePresentationLike({
          title: 'Unsafe sensitive field',
          [unsafeFieldName]: 'unsafe-value',
        }),
      TypeError,
    );
  }
});

test('renderer redacts sensitive text assignments without parsing callback payloads', () => {
  const fragment = renderSafePresentationLike({
    title: 'Safe summary',
    body: [
      { text: `${['api', 'key'].join('')}=abc123 remains hidden` },
      { text: `${['bot', 'token'].join('')}:abc123 remains hidden` },
    ],
    buttonGroups: [
      {
        buttons: [
          {
            label: 'Opaque callback',
            payload: 'hz:token:redaction-render-1',
          },
        ],
      },
    ],
  });

  assert.equal(
    fragment.content.text,
    'Safe summary\n\n[redacted] remains hidden\n\n[redacted] remains hidden',
  );
  assert.equal(fragment.content.buttonGroups[0].buttons[0].payload, 'hz:token:redaction-render-1');
});

test('delivery request renderer rejects unsafe refs and unbounded output', () => {
  assert.throws(
    () =>
      createTelegramRenderDeliveryRequest({
        deliveryRef: 'delivery:not-an-operation-ref',
        target: deliveryTarget,
        source: { title: 'Bad ref' },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramRenderDeliveryRequest({
        deliveryRef: 'operation:render-delivery-bad-target',
        target: {
          ...deliveryTarget,
          chatId: 'telegram-chat:bad/path',
        },
        source: { title: 'Bad target' },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      renderTelegramCardDescriptor(
        createTelegramCardDescriptor({
          title: 'Long render',
          body: [
            createTelegramTextBlock({ text: 'x'.repeat(2_000) }),
            createTelegramTextBlock({ text: 'y'.repeat(2_000) }),
            createTelegramTextBlock({ text: 'z'.repeat(2_000) }),
          ],
        }),
      ),
    TypeError,
  );
});
