import assert from 'node:assert/strict';
import test from 'node:test';

import { createTelegramRenderDeliveryRequest } from '../../../dist/rendering/telegram-renderer.js';

const deliveryTarget = Object.freeze({
  channelId: 'telegram-channel:workspace-alpha',
  chatId: 'telegram-chat:chat-alpha',
  messageThreadId: 'telegram-thread:topic-alpha',
});

test('delivery request renderer normalizes operation context to allowed adapter refs only', () => {
  const request = createTelegramRenderDeliveryRequest({
    deliveryRef: 'operation:render-context-1',
    target: deliveryTarget,
    source: { title: 'Context render' },
    context: {
      operationRef: 'operation:render-context-1',
      correlationRef: 'correlation:render-context-1',
      workspaceRef: 'workspace:workspace-alpha',
      agentRef: 'agent:coder',
      actorRef: 'actor:user-alpha',
      detailsRef: 'details:render-context-details',
      displayOnlyNote: 'must not leak',
    },
  });

  assert.deepEqual(request.context, {
    operationRef: 'operation:render-context-1',
    correlationRef: 'correlation:render-context-1',
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
    actorRef: 'actor:user-alpha',
    detailsRef: 'details:render-context-details',
  });
  assert.equal('displayOnlyNote' in request.context, false);
});

test('delivery request renderer rejects unsafe context fields and invalid context refs', () => {
  assert.throws(
    () =>
      createTelegramRenderDeliveryRequest({
        deliveryRef: 'operation:render-context-unsafe',
        target: deliveryTarget,
        source: { title: 'Unsafe context' },
        context: {
          operationRef: 'operation:render-context-unsafe',
          correlationRef: 'correlation:render-context-unsafe',
          providerAck: { ok: true },
        },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createTelegramRenderDeliveryRequest({
        deliveryRef: 'operation:render-context-bad-ref',
        target: deliveryTarget,
        source: { title: 'Bad context ref' },
        context: {
          operationRef: 'operation:render-context-bad-ref',
          correlationRef: 'operation:not-a-correlation-ref',
        },
      }),
    TypeError,
  );
});
