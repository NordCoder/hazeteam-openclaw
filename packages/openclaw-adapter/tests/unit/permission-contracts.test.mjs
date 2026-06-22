import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowPermission,
  denyPermission,
  isPermissionAllowed,
  isPermissionDenied,
} from '../../dist/contracts/index.js';

const requirement = Object.freeze({
  action: 'consume-callback',
  resourceKind: 'callback',
  actorRef: 'actor:user-1',
  workspaceRef: 'workspace:acme',
  agentRef: 'agent:coder',
  resourceRef: 'callback:button-1',
  correlationRef: 'correlation:flow-1',
});

test('allowPermission creates an allowed decision', () => {
  const decision = allowPermission(requirement);

  assert.equal(decision.status, 'allowed');
  assert.equal(isPermissionAllowed(decision), true);
  assert.equal(isPermissionDenied(decision), false);
  assert.equal(decision.requirement.action, 'consume-callback');
  assert.equal(decision.requirement.resourceKind, 'callback');
  assert.equal(decision.requirement.actorRef, 'actor:user-1');
  assert.equal(decision.requirement.workspaceRef, 'workspace:acme');
  assert.equal(decision.requirement.agentRef, 'agent:coder');
});

test('denyPermission creates a denied decision with a safe bounded reason', () => {
  const decision = denyPermission({
    requirement,
    reason: `external account denied opaque_value=123456\n${'x'.repeat(220)}`,
    detailsRef: 'details:permission-1',
  });

  assert.equal(decision.status, 'denied');
  assert.equal(isPermissionAllowed(decision), false);
  assert.equal(isPermissionDenied(decision), true);
  assert.equal(decision.reason.includes('123456'), false);
  assert.equal(decision.reason.includes('\n'), false);
  assert.equal(decision.reason.length <= 160, true);
  assert.equal(decision.detailsRef, 'details:permission-1');
});

test('permission requirement carries action resource actor workspace and agent refs', () => {
  const decision = denyPermission({ requirement, reason: 'actor cannot use this callback' });

  assert.deepEqual(
    Object.keys(decision.requirement).sort(),
    ['action', 'actorRef', 'agentRef', 'correlationRef', 'resourceKind', 'resourceRef', 'workspaceRef'],
  );
  assert.equal(decision.requirement.action, 'consume-callback');
  assert.equal(decision.requirement.resourceKind, 'callback');
});

test('permission helpers reject unsupported actions and resource kinds', () => {
  assert.throws(
    () => allowPermission({ ...requirement, action: 'delete-world' }),
    TypeError,
  );
  assert.throws(
    () => denyPermission({
      requirement: { ...requirement, resourceKind: 'provider-account' },
      reason: 'unsupported',
    }),
    TypeError,
  );
});

test('permission decisions do not expose provider account payload fields', () => {
  const decision = denyPermission({ requirement, reason: 'external role lookup denied' });

  assert.equal('tokenRecord' in decision, false);
  assert.equal('rolePayload' in decision, false);
  assert.equal('accountPayload' in decision, false);
});
