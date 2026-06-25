import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adapterErr,
  adapterOk,
  createAdapterSafeError,
} from '../../../dist/contracts/index.js';
import { evaluateOpenClawTelegramPermission } from '../../../dist/permissions/index.js';
import {
  createOpenClawTelegramCallbackSafeResponse,
  runOpenClawTelegramCallbackTokenFlow,
} from '../../../dist/callbacks/index.js';

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
  detailsRef: 'details:callback-safe-response',
  correlationRef: 'correlation:callback-safe-response',
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
  bindingRef: 'binding:telegram-topic-1',
});

function assertNoCallbackHandleLeak(value) {
  const serialized = JSON.stringify(value);

  assert.equal(serialized.includes('token:approve-1'), false);
  assert.equal(serialized.includes('hz:token:approve-1'), false);
  assert.equal(serialized.includes('callbackPayload'), false);
  assert.equal(serialized.includes('rawProviderPayload'), false);
  assert.equal(serialized.includes('rawCallbackPayload'), false);
  assert.equal(serialized.includes('provider-object-leak'), false);
  assert.equal(serialized.includes('/tmp/'), false);
  assert.equal(serialized.includes('at Object.'), false);
}

test('callback safe response projects accepted callback without token or raw payload fields', () => {
  const flowResult = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: evaluateOpenClawTelegramPermission,
    verifyToken: (request) =>
      adapterOk(
        Object.freeze({
          status: 'verified',
          tokenRef: request.tokenRef,
          verificationRef: 'verification:approve-1',
          detailsRef: 'details:verified-callback',
        }),
      ),
    consumeToken: (request) =>
      adapterOk(
        Object.freeze({
          status: 'consumed',
          tokenRef: request.tokenRef,
          consumptionRef: 'consumption:approve-1',
          correlationRef: 'correlation:consumed-callback',
        }),
      ),
  });

  assert.equal(flowResult.ok, true);

  const response = createOpenClawTelegramCallbackSafeResponse(flowResult);

  assert.equal(response.kind, 'openclaw-telegram-callback-safe-response');
  assert.equal(response.status, 'accepted');
  assert.equal(response.tokenConsumed, true);
  assert.equal(response.permissionStatus, 'allowed');
  assert.equal(response.verificationStatus, 'verified');
  assert.equal(response.consumptionStatus, 'consumed');
  assert.equal(response.detailsRef, 'details:verified-callback');
  assert.equal(response.correlationRef, 'correlation:consumed-callback');
  assert.equal('tokenRef' in response, false);
  assert.equal('callbackPayload' in response, false);
  assertNoCallbackHandleLeak(response);
});

test('callback safe response preserves denied state without consuming or leaking token handles', () => {
  const flowResult = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor: Object.freeze({ trust: 'unknown' }),
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: evaluateOpenClawTelegramPermission,
    verifyToken: () => {
      throw new Error('verifier must not be called for denied permission');
    },
    consumeToken: () => {
      throw new Error('consumer must not be called for denied permission');
    },
  });

  assert.equal(flowResult.ok, true);
  assert.equal(flowResult.value.status, 'permission-denied');

  const response = createOpenClawTelegramCallbackSafeResponse(flowResult);

  assert.equal(response.status, 'permission-denied');
  assert.equal(response.tokenConsumed, false);
  assert.equal(response.permissionStatus, 'denied');
  assert.equal(response.reason, 'Actor context is not trusted.');
  assert.equal('tokenRef' in response, false);
  assert.equal('callbackPayload' in response, false);
  assertNoCallbackHandleLeak(response);
});

test('callback safe response redacts dependency failure messages that mention opaque handles', () => {
  const flowResult = runOpenClawTelegramCallbackTokenFlow({
    payload: 'hz:token:approve-1',
    actor,
    permissionContext,
    permissionGrants: [callbackGrant],
    expectedTokenContext,
    permissionEvaluator: evaluateOpenClawTelegramPermission,
    verifyToken: (request) =>
      adapterOk(
        Object.freeze({
          status: 'verified',
          tokenRef: request.tokenRef,
          verificationRef: 'verification:approve-1',
        }),
      ),
    consumeToken: () =>
      adapterErr(
        createAdapterSafeError({
          code: 'conflict',
          message: 'Replay rejected for hz:token:approve-1 and token:approve-1.',
          retryable: false,
          detailsRef: 'details:replay-rejected',
        }),
      ),
  });

  assert.equal(flowResult.ok, false);

  const response = createOpenClawTelegramCallbackSafeResponse(flowResult);

  assert.equal(response.status, 'failed-safe');
  assert.equal(response.tokenConsumed, false);
  assert.equal(response.failure.code, 'conflict');
  assert.equal(response.failure.message, 'Replay rejected for [redacted-callback-handle] and [redacted-callback-handle]');
  assert.equal(response.detailsRef, 'details:replay-rejected');
  assert.equal('tokenRef' in response, false);
  assertNoCallbackHandleLeak(response);
});
