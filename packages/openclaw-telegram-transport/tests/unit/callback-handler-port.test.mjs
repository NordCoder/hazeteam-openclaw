import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSafeCallbackPortJson,
  normalizeCallbackProviderInput,
  processCallbackBoundary,
} from '../../dist/callback-handler-port.js';

const BASE_INPUT = Object.freeze({
  providerKind: 'telegram',
  callbackRef: 'callback:unit-0001',
  correlationRef: 'corr:unit-0001',
  channelRef: 'channel:telegram:test',
  chatRef: 'chat:workspace-test',
  threadRef: 'thread:agent-coder',
  messageRef: 'message:approval-card',
  actorRef: 'actor:alice',
  callbackData: 'hz:token:approval-0001',
  receivedAt: '2026-06-25T10:00:00Z',
  occurredAt: '2026-06-25T09:59:59Z',
  expectedContext: {
    workspaceRef: 'workspace:test',
    agentRef: 'agent:coder',
    hostSessionRef: 'host-session:coder',
    bindingRef: 'binding:telegram-coder',
    actionRef: 'action:approve',
    approvalRef: 'approval:unit-0001',
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

function json(value) {
  return JSON.stringify(value);
}

function assertNoLeak(value, terms = PROTECTED_TERMS) {
  const output = json(value);
  assert.equal(typeof output, 'string');

  for (const term of terms) {
    assert.equal(output.includes(term), false, `public output leaked ${term}`);
  }

  assert.equal(isSafeCallbackPortJson(value), true);
}

function createPorts(options = {}) {
  const calls = [];
  const permissionStatus = options.permissionStatus ?? 'allowed';
  const verifyStatus = options.verifyStatus ?? 'valid';
  const consumeStatus = options.consumeStatus ?? 'consumed';

  return {
    calls,
    ports: {
      permissions: {
        checkPermission(input) {
          calls.push('permission');
          assert.equal(input.phase, 'before-token-consume');
          assert.equal(input.callbackRef, 'callback:unit-0001');
          assert.equal(input.correlationRef, 'corr:unit-0001');
          return Object.freeze({
            status: permissionStatus,
            reasonCode: permissionStatus === 'allowed' ? 'permission-allowed' : 'actor-not-authorized',
            detailsRef: 'details:permission-unit',
          });
        },
      },
      tokens: {
        verifyToken(input) {
          calls.push('verify');
          assert.equal(input.tokenRef, 'token:approval-0001');
          assert.equal(input.expectedContext.workspaceRef, 'workspace:test');
          return Object.freeze({
            status: verifyStatus,
            detailsRef: 'details:verify-unit',
          });
        },
        consumeToken(input) {
          calls.push('consume');
          assert.equal(input.tokenRef, 'token:approval-0001');
          return Object.freeze({
            status: consumeStatus,
            detailsRef: 'details:consume-unit',
          });
        },
      },
    },
  };
}

test('valid callback normalizes token ref and consumes only after permission', async () => {
  const { calls, ports } = createPorts();
  const result = await processCallbackBoundary(BASE_INPUT, ports);

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.value.descriptor.payloadKind, 'token-ref');
  assert.equal(result.value.descriptor.tokenRef, 'token:approval-0001');
  assert.equal(result.value.decision.status, 'token-consumed');
  assert.equal(result.value.decision.tokenConsumed, true);
  assert.equal(result.value.decision.businessAccepted, true);
  assert.equal(result.value.decision.reasonCode, 'token-consumed-after-permission');
  assertNoLeak(result);
});

test('token consume is skipped when permission is denied', async () => {
  const { calls, ports } = createPorts({ permissionStatus: 'denied' });
  const result = await processCallbackBoundary(BASE_INPUT, ports);

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['permission']);
  assert.equal(result.value.decision.status, 'permission-denied');
  assert.equal(result.value.decision.tokenConsumed, false);
  assert.equal(result.value.providerAcknowledgement.displayText, 'Not allowed');
  assertNoLeak(result);
});

test('duplicate callback returns safe replay status without business success', async () => {
  const { calls, ports } = createPorts({ consumeStatus: 'already-consumed' });
  const result = await processCallbackBoundary(BASE_INPUT, ports);

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['permission', 'verify', 'consume']);
  assert.equal(result.value.decision.status, 'token-consumed');
  assert.equal(result.value.decision.replayStatus, 'duplicate-safe');
  assert.equal(result.value.decision.tokenConsumed, false);
  assert.equal(result.value.decision.businessAccepted, false);
  assert.equal(result.value.providerAcknowledgement.displayText, 'Already processed');
  assertNoLeak(result);
});

test('unsafe callback data is rejected and redacted from public output', async () => {
  const { calls, ports } = createPorts();
  const result = await processCallbackBoundary(
    {
      ...BASE_INPUT,
      callbackData:
        'hz:token:approval-0001 123456:ABC-private-token Bearer private-token https://internal.service.local /Users/anna/private rawCallbackPayload providerClientObject stack trace authorization:',
    },
    ports,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(calls, []);
  assert.equal(result.value.descriptor.payloadKind, 'invalid');
  assert.equal(result.value.descriptor.payloadStatus, 'rejected');
  assert.equal(result.value.descriptor.tokenRef, undefined);
  assert.equal(result.value.decision.status, 'invalid-payload');
  assert.equal(result.value.decision.tokenConsumed, false);
  assert.equal(result.value.providerAcknowledgement.displayText, 'Could not process safely');
  assertNoLeak(result);
});

test('safe action ref path stays acknowledgement-only and does not consume token', async () => {
  const { calls, ports } = createPorts();
  const result = await processCallbackBoundary(
    {
      ...BASE_INPUT,
      callbackData: 'action:action:open-help',
    },
    ports,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ['permission']);
  assert.equal(result.value.descriptor.payloadKind, 'action-ref');
  assert.equal(result.value.descriptor.actionRef, 'action:open-help');
  assert.equal(result.value.decision.status, 'acknowledged-only');
  assert.equal(result.value.decision.tokenConsumed, false);
  assertNoLeak(result);
});

test('provider acknowledgement is separate from business success', async () => {
  const { ports } = createPorts();
  const result = await processCallbackBoundary(BASE_INPUT, ports);

  assert.equal(result.ok, true);
  assert.equal(result.value.providerAcknowledgement.status, 'ack-required');
  assert.equal(result.value.providerAcknowledgement.acknowledgesBusinessSuccess, false);
  assert.equal(result.value.providerAcknowledgement.effects, 'none');
  assert.equal(result.value.providerAcknowledgement.willCallRemote, false);
  assert.equal(result.value.decision.businessAccepted, true);
  assert.notEqual(result.value.providerAcknowledgement.descriptorKind, result.value.decision.descriptorKind);
  assertNoLeak(result);
});

test('callback public outputs are JSON serializable', async () => {
  const descriptor = normalizeCallbackProviderInput(BASE_INPUT);
  const { ports } = createPorts();
  const result = await processCallbackBoundary(BASE_INPUT, ports);

  assert.deepEqual(JSON.parse(JSON.stringify(descriptor)), descriptor);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assertNoLeak(descriptor);
  assertNoLeak(result);
});
