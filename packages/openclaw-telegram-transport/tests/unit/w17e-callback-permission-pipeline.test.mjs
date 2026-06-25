import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSafeTelegramCallbackPermissionPipelineJson,
  normalizeTelegramCallbackDescriptor,
  processTelegramCallbackPermissionPipeline,
} from '../../dist/callbacks/callback-permission-pipeline.js';

const BASE_INPUT = Object.freeze({
  providerKind: 'telegram',
  callbackRef: 'callback:w17e-0001',
  correlationRef: 'corr:w17e-0001',
  channelRef: 'channel:telegram:w17e',
  chatRef: 'chat:workspace-w17e',
  threadRef: 'thread:agent-coder',
  messageRef: 'message:approval-card',
  actorRef: 'actor:alice',
  callbackData: 'hz:token:approval-0001',
  permissionRef: 'permission:approve',
  idempotencyRef: 'idem:callback-0001',
  profileRef: 'profile:fake-e2e',
  receivedAt: '2026-06-25T10:00:00Z',
  expectedContext: {
    workspaceRef: 'workspace:test',
    agentRef: 'agent:coder',
    hostSessionRef: 'host-session:coder',
    bindingRef: 'binding:telegram-coder',
    actionRef: 'action:approve',
    approvalRef: 'approval:w17e-0001',
  },
});

const PROTECTED_TERMS = [
  '123456:ABC-private-token',
  'Bearer private-token',
  'https://internal.service.local',
  '/Users/anna/private',
  'rawCallbackPayload',
  'providerClientObject',
  'stack trace',
  'authorization:',
];

function assertNoLeak(value, terms = PROTECTED_TERMS) {
  const output = JSON.stringify(value);
  assert.equal(typeof output, 'string');

  for (const term of terms) {
    assert.equal(output.includes(term), false, `public output leaked ${term}`);
  }

  assert.equal(isSafeTelegramCallbackPermissionPipelineJson(value), true);
  assert.deepEqual(JSON.parse(output), value);
}

function createPorts(options = {}) {
  const calls = [];
  const permissionStatus = options.permissionStatus ?? 'allowed';
  const verifyStatus = options.verifyStatus ?? 'verified';
  const consumeStatus = options.consumeStatus ?? 'consumed';

  return {
    calls,
    ports: {
      permissions: {
        checkPermission(input) {
          calls.push('permission');
          assert.equal(input.phase, 'before-token-consume');
          assert.equal(input.callbackRef, 'callback:w17e-0001');
          assert.equal(input.correlationRef, 'corr:w17e-0001');
          assert.equal(input.permissionRef, 'permission:approve');
          return Object.freeze({
            status: permissionStatus,
            reasonCode: permissionStatus === 'allowed' ? 'permission-allowed' : 'actor-not-authorized',
            detailsRef: 'details:permission-w17e',
          });
        },
      },
      tokens: {
        verifyToken(input) {
          calls.push('verify');
          assert.equal(input.tokenRef, 'token:approval-0001');
          assert.equal(input.expectedContext.workspaceRef, 'workspace:test');
          return Object.freeze({ status: verifyStatus, detailsRef: 'details:verify-w17e' });
        },
        consumeToken(input) {
          calls.push('consume');
          assert.equal(input.tokenRef, 'token:approval-0001');
          assert.equal(input.expectedContext.bindingRef, 'binding:telegram-coder');
          return Object.freeze({ status: consumeStatus, detailsRef: 'details:consume-w17e' });
        },
      },
    },
  };
}

test('allowed callback verifies and consumes an opaque token only after permission', async () => {
  const { calls, ports } = createPorts();
  const result = await processTelegramCallbackPermissionPipeline(BASE_INPUT, ports);

  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.descriptor.payloadKind, 'callback-token');
  assert.equal(result.descriptor.tokenRef, 'token:approval-0001');
  assert.equal(result.decision.status, 'authorized-token-consumed');
  assert.equal(result.decision.permissionAllowed, true);
  assert.equal(result.decision.tokenVerified, true);
  assert.equal(result.decision.tokenConsumed, true);
  assert.equal(result.decision.businessCompleted, false);
  assert.equal(result.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assertNoLeak(result);
});

test('denied permission skips token verification and consume', async () => {
  const { calls, ports } = createPorts({ permissionStatus: 'denied' });
  const result = await processTelegramCallbackPermissionPipeline(BASE_INPUT, ports);

  assert.deepEqual(calls, ['permission']);
  assert.equal(result.decision.status, 'permission-denied');
  assert.equal(result.decision.permissionAllowed, false);
  assert.equal(result.decision.tokenVerified, false);
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Not allowed');
  assertNoLeak(result);
});

test('expired token is safe and is not consumed', async () => {
  const { calls, ports } = createPorts({ verifyStatus: 'expired' });
  const result = await processTelegramCallbackPermissionPipeline(BASE_INPUT, ports);

  assert.deepEqual(calls, ['permission', 'verify']);
  assert.equal(result.decision.status, 'token-expired');
  assert.equal(result.decision.permissionAllowed, true);
  assert.equal(result.decision.tokenVerified, false);
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Action expired');
  assertNoLeak(result);
});

test('duplicate callback reported during verify is replay-safe and skips consume', async () => {
  const { calls, ports } = createPorts({ verifyStatus: 'already-consumed' });
  const result = await processTelegramCallbackPermissionPipeline(BASE_INPUT, ports);

  assert.deepEqual(calls, ['permission', 'verify']);
  assert.equal(result.decision.status, 'duplicate-callback');
  assert.equal(result.decision.replayStatus, 'duplicate-safe');
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Already processed');
  assertNoLeak(result);
});

test('duplicate callback reported during consume is replay-safe without business completion', async () => {
  const { calls, ports } = createPorts({ consumeStatus: 'already-consumed' });
  const result = await processTelegramCallbackPermissionPipeline(BASE_INPUT, ports);

  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.decision.status, 'duplicate-callback');
  assert.equal(result.decision.replayStatus, 'duplicate-safe');
  assert.equal(result.decision.tokenVerified, true);
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.decision.businessCompleted, false);
  assertNoLeak(result);
});

test('malformed callback input is rejected without permission or token calls and without echoing input', async () => {
  const { calls, ports } = createPorts();
  const result = await processTelegramCallbackPermissionPipeline(
    {
      ...BASE_INPUT,
      callbackData:
        'hz:token:approval-0001 123456:ABC-private-token Bearer private-token https://internal.service.local /Users/anna/private rawCallbackPayload providerClientObject stack trace authorization:',
    },
    ports,
  );

  assert.deepEqual(calls, []);
  assert.equal(result.descriptor.payloadKind, 'malformed');
  assert.equal(result.descriptor.payloadStatus, 'rejected');
  assert.equal(result.decision.status, 'unsafe-payload-rejected');
  assert.equal(result.decision.tokenConsumed, false);
  assert.equal(result.providerAcknowledgement.displayText, 'Could not process safely');
  assertNoLeak(result);
});

test('action callback path requires permission but stays provider acknowledgement only', async () => {
  const { calls, ports } = createPorts();
  const result = await processTelegramCallbackPermissionPipeline(
    {
      ...BASE_INPUT,
      callbackData: 'action:action:open-help',
    },
    ports,
  );

  assert.deepEqual(calls, ['permission']);
  assert.equal(result.descriptor.payloadKind, 'action-ref');
  assert.equal(result.descriptor.tokenPresence, 'absent');
  assert.equal(result.decision.status, 'provider-ack-only');
  assert.equal(result.decision.permissionAllowed, true);
  assert.equal(result.decision.tokenVerified, false);
  assert.equal(result.decision.tokenConsumed, false);
  assertNoLeak(result);
});

test('descriptor normalization returns JSON-serializable safe refs only', () => {
  const descriptor = normalizeTelegramCallbackDescriptor(BASE_INPUT);

  assert.equal(descriptor.descriptorVersion, 'w17e');
  assert.equal(descriptor.effects, 'none');
  assert.equal(descriptor.willCallRemote, false);
  assert.equal(descriptor.tokenRef, 'token:approval-0001');
  assertNoLeak(descriptor);
});
