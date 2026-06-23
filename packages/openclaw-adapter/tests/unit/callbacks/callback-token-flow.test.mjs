import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
} from '../../../dist/contracts/index.js';
import { evaluateOpenClawTelegramPermission } from '../../../dist/permissions/index.js';
import {
  parseOpenClawTelegramCallbackPayload,
  runOpenClawTelegramCallbackTokenFlow,
} from '../../../dist/callbacks/callback-token-flow.js';

const actor = Object.freeze({
  actorRef: 'actor:user-1',
  trust: 'trusted',
});

const permissionContext = Object.freeze({
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:coder',
  topic: Object.freeze({
    trust: 'trusted-binding',
    status: 'active',
    workspaceRef: 'workspace:acme',
    agentRef: 'agent:coder',
  }),
  callbackTokenPhase: 'before-token-consume',
  detailsRef: 'details:callback-flow',
  correlationRef: 'correlation:callback-flow',
});

const callbackGrant = Object.freeze({
  requirement: Object.freeze({
    action: 'consume-callback',
    resourceKind: 'callback',
    actorRef: 'actor:user-1',
    workspaceRef: 'workspace:acme',
    agentRef: 'agent:coder',
  }),
});

const expectedTokenContext = Object.freeze({
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:coder',
  actionRef: 'callback-action:approve-1',
  outboxRef: 'outbox:item-1',
  bindingRef: 'binding:telegram-topic-1',
});

const safeOperationContext = Object.freeze({
  operationRef: 'operation:callback-flow',
  correlationRef: 'correlation:callback-flow',
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:coder',
  actorRef: 'actor:user-1',
  detailsRef: 'details:callback-flow',
  rawDebugRef: 'raw-debug:callback-flow',
});

function createSuccessfulVerifier(calls) {
  return (request) => {
    calls.push('verify');
    assert.equal(request.tokenRef, 'token:approve-1');
    assert.equal(request.expectedContext.workspaceRef, 'workspace:acme');
    assert.equal(request.expectedContext.actionRef, 'callback-action:approve-1');
    assert.equal(request.callbackPayload.kind, 'openclaw-telegram-callback-payload');
    assert.equal(request.callbackPayload.prefix, 'hz');
    assert.equal('payload' in request.callbackPayload, false);
    assert.equal('provider' in request, false);

    return adapterOk(
      Object.freeze({
        status: 'verified',
        tokenRef: request.tokenRef,
        verificationRef: 'verification:approve-1',
      }),
    );
  };
}

function createSuccessfulConsumer(calls) {
  return (request) => {
    calls.push('consume');
    assert.deepEqual(calls, ['permission', 'verify', 'consume']);
    assert.equal(request.tokenRef, 'token:approve-1');
    assert.equal(request.verification.status, 'verified');
    assert.equal(request.verification.verificationRef, 'verification:approve-1');
    assert.equal(request.expectedContext.bindingRef, 'binding:telegram-topic-1');

    return adapterOk(
      Object.freeze({
        status: 'consumed',
        tokenRef: request.tokenRef,
        consumptionRef: 'consumption:approve-1',
      }),
    );
  };
}

test('parses canonical opaque OpenClaw Telegram callback payloads', () => {
  const result = parseOpenClawTelegramCallbackPayload(' hz:token:approve-1 ');

  assert.equal(result.ok, true);
  assert.equal(result.value.kind, 'openclaw-telegram-callback-payload');
  assert.equal(result.value.prefix, 'hz');
  assert.equal(result.value.tokenRef, 'token:approve-1');
  assert.equal(Object.isFrozen(result.value), true);
});

test('rejects malformed callback payloads with safe bounded errors', () => {
  for (const payload of [null, '', 'token:approve-1', 'hz:', 'hz:token/approve', 'hz:token approve']) {
    const result = parseOpenClawTelegramCallbackPayload(payload);

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'invalid-input');
    assert.equal(result.error.message.includes(String(payload)), false);
    assert.equal(result.error.message.includes('\n'), false);
    assert.equal(result.error.message.includes('rawProviderPayload'), false);
    assert.equal(result.error.message.includes('stack'), false);
  }
});

test('runs permission before verify and consume for valid callbacks', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: createSuccessfulVerifier(calls),
    consumeToken: createSuccessfulConsumer(calls),
  });

  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.ok, true);
  assert.equal(result.value.status, 'token-consumed');
  assert.equal(result.value.tokenConsumed, true);
  assert.equal(result.value.permission.status, 'allowed');
  assert.equal(result.value.verification.verificationRef, 'verification:approve-1');
  assert.equal(result.value.consumption.consumptionRef, 'consumption:approve-1');
});

test('safe operation context is normalized in result and token boundaries', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    context: safeOperationContext,
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: (request) => {
      calls.push('verify');
      assert.deepEqual(request.context, safeOperationContext);
      assert.equal(Object.isFrozen(request.context), true);
      return adapterOk(
        Object.freeze({
          status: 'verified',
          tokenRef: request.tokenRef,
          verificationRef: 'verification:approve-1',
        }),
      );
    },
    consumeToken: (request) => {
      calls.push('consume');
      assert.deepEqual(request.context, safeOperationContext);
      assert.equal(Object.isFrozen(request.context), true);
      return adapterOk(
        Object.freeze({
          status: 'consumed',
          tokenRef: request.tokenRef,
          consumptionRef: 'consumption:approve-1',
        }),
      );
    },
  });

  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.ok, true);
  assert.equal(result.value.status, 'token-consumed');
  assert.deepEqual(result.context, safeOperationContext);
  assert.equal(Object.isFrozen(result.context), true);
  assert.equal('rawToolPayload' in result.context, false);
  assert.equal('rawProviderObject' in result.context, false);
});

test('unsafe operation context is rejected before permission verifier or consumer boundaries', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    context: Object.freeze({
      operationRef: 'operation:callback-flow',
      correlationRef: 'correlation:callback-flow',
      rawToolPayload: Object.freeze({
        rawProviderObject: 'provider-object-leak',
      }),
    }),
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: () => {
      calls.push('verify');
      throw new Error('verifier must not be called with unsafe context');
    },
    consumeToken: () => {
      calls.push('consume');
      throw new Error('consumer must not be called with unsafe context');
    },
  });

  assert.deepEqual(calls, []);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(result.error.message, 'Callback operation context is malformed.');
  assert.equal(result.error.message.includes('rawToolPayload'), false);
  assert.equal(result.error.message.includes('rawProviderObject'), false);
  assert.equal(result.error.message.includes('provider-object-leak'), false);
  assert.equal('context' in result, false);
});

test('denied and unknown actors do not verify or consume callback tokens', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor: Object.freeze({ trust: 'unknown' }),
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: () => {
      calls.push('verify');
      throw new Error('verifier must not be called for denied actors');
    },
    consumeToken: () => {
      calls.push('consume');
      throw new Error('consumer must not be called for denied actors');
    },
  });

  assert.deepEqual(calls, ['permission']);
  assert.equal(result.ok, true);
  assert.equal(result.value.status, 'permission-denied');
  assert.equal(result.value.tokenConsumed, false);
  assert.equal(result.value.permission.status, 'denied');
  assert.equal(result.value.permission.reason, 'Actor context is not trusted.');
});

test('untrusted or inactive callback binding context does not verify or consume callback tokens', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext: Object.freeze({
      ...permissionContext,
      topic: Object.freeze({
        trust: 'trusted-binding',
        status: 'paused',
        workspaceRef: 'workspace:acme',
        agentRef: 'agent:coder',
      }),
    }),
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: () => {
      calls.push('verify');
      throw new Error('verifier must not be called for inactive bindings');
    },
    consumeToken: () => {
      calls.push('consume');
      throw new Error('consumer must not be called for inactive bindings');
    },
  });

  assert.deepEqual(calls, ['permission']);
  assert.equal(result.ok, true);
  assert.equal(result.value.status, 'permission-denied');
  assert.equal(result.value.tokenConsumed, false);
  assert.equal(result.value.permission.status, 'denied');
  assert.equal(result.value.permission.reason, 'Topic binding is not active.');
});

test('token verification failure prevents token consume', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: () => {
      calls.push('verify');
      return adapterErr(
        createAdapterSafeError({
          code: 'conflict',
          message: 'Callback token is expired or mismatched.',
          retryable: false,
        }),
      );
    },
    consumeToken: () => {
      calls.push('consume');
      throw new Error('consumer must not be called after failed verification');
    },
  });

  assert.deepEqual(calls, ['permission', 'verify']);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'conflict');
  assert.equal(result.error.message, 'Callback token is expired or mismatched.');
});

test('token consume failure is safe and does not report callback acceptance', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
    verifyToken: createSuccessfulVerifier(calls),
    consumeToken: () => {
      calls.push('consume');
      return adapterErr(
        createAdapterSafeError({
          code: 'conflict',
          message: 'Callback token has already been consumed.',
          retryable: false,
        }),
      );
    },
  });

  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'conflict');
  assert.equal(result.error.message, 'Callback token has already been consumed.');
  assert.equal('value' in result, false);
});

test('unsafe expected context fails before verifier or consumer boundaries', () => {
  const calls = [];
  const result = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext: Object.freeze({
      workspaceRef: 'workspace:acme',
      agentRef: 'agent:coder',
      actionRef: 'callback-action:approve 1',
    }),
    verifyToken: () => {
      calls.push('verify');
      throw new Error('verifier must not be called with unsafe context');
    },
    consumeToken: () => {
      calls.push('consume');
      throw new Error('consumer must not be called with unsafe context');
    },
  });

  assert.deepEqual(calls, []);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(result.error.message, 'Callback token expected context is malformed.');
  assert.equal(result.error.message.includes('approve 1'), false);
});
