import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createActorRef,
  createAdapterCorrelationRef,
  createAdapterDetailsRef,
  createAdapterOperationContext,
  createAdapterOperationRef,
  createAdapterRawDebugRef,
  createAgentRef,
  createWorkspaceRef,
} from '../../dist/contracts/index.js';

test('createAdapterOperationContext preserves required operation and correlation refs', () => {
  const operationRef = createAdapterOperationRef('op-1');
  const correlationRef = createAdapterCorrelationRef('corr-1');

  const context = createAdapterOperationContext({ operationRef, correlationRef });

  assert.equal(context.operationRef, operationRef);
  assert.equal(context.correlationRef, correlationRef);
  assert.equal(Object.isFrozen(context), true);
});

test('createAdapterOperationContext preserves optional safe refs', () => {
  const operationRef = createAdapterOperationRef('op-2');
  const correlationRef = createAdapterCorrelationRef('corr-2');
  const workspaceRef = createWorkspaceRef('workspace-1');
  const agentRef = createAgentRef('agent-1');
  const actorRef = createActorRef('actor-1');
  const detailsRef = createAdapterDetailsRef('details-1');
  const rawDebugRef = createAdapterRawDebugRef('debug-1');

  const context = createAdapterOperationContext({
    operationRef,
    correlationRef,
    workspaceRef,
    agentRef,
    actorRef,
    detailsRef,
    rawDebugRef,
  });

  assert.equal(context.workspaceRef, workspaceRef);
  assert.equal(context.agentRef, agentRef);
  assert.equal(context.actorRef, actorRef);
  assert.equal(context.detailsRef, detailsRef);
  assert.equal(context.rawDebugRef, rawDebugRef);
});

test('operation context does not expose raw payload or mutable handle fields', () => {
  const context = createAdapterOperationContext({
    operationRef: createAdapterOperationRef('op-3'),
    correlationRef: createAdapterCorrelationRef('corr-3'),
  });

  for (const unsafeField of [
    'rawPayload',
    'rawUpdate',
    'telegramUpdate',
    'rawOpenClawEvent',
    'sdkClient',
    'client',
    'handle',
  ]) {
    assert.equal(Object.hasOwn(context, unsafeField), false, `${unsafeField} should not exist`);
  }
});
