import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveApprovalBridgeDecisionWithPermission } from '../../../dist/approvals/index.js';
import { evaluateOpenClawTelegramPermission } from '../../../dist/permissions/index.js';

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
  detailsRef: 'details:approval-composition',
  correlationRef: 'correlation:approval-composition',
});

const approvalGrant = Object.freeze({
  requirement: Object.freeze({
    action: 'resolve-approval',
    resourceKind: 'approval',
    actorRef: 'actor:user-1',
    workspaceRef: 'workspace:acme',
    agentRef: 'agent:coder',
  }),
});

const approvalDecision = Object.freeze({
  approvalRef: 'approval:item-1',
  status: 'approved',
  actorRef: 'actor:user-1',
  reason: 'approved by test actor',
  detailsRef: 'details:approval-decision',
  correlationRef: 'correlation:approval-decision',
});

function assertNoUnsafeApprovalOutput(value) {
  const serialized = JSON.stringify(value);

  assert.equal(serialized.includes('rawApprovalPayload'), false);
  assert.equal(serialized.includes('rawProviderResponse'), false);
  assert.equal(serialized.includes('provider-object-leak'), false);
  assert.equal(serialized.includes('botToken='), false);
  assert.equal(serialized.includes('/tmp/'), false);
  assert.equal(serialized.includes('at Object.'), false);
}

test('approval composition evaluates permission before resolver boundary', async () => {
  const calls = [];
  const result = await resolveApprovalBridgeDecisionWithPermission({
    resolver: Object.freeze({
      resolve: (decision) => {
        calls.push('resolve');
        assert.equal(decision.approvalRef, 'approval:item-1');
        assert.equal(decision.status, 'approved');
        assertNoUnsafeApprovalOutput(decision);
      },
    }),
    decision: approvalDecision,
    actor,
    permissionContext,
    permissionGrants: [approvalGrant],
    permissionEvaluator: (input) => {
      calls.push('permission');
      assert.equal(input.requirement.action, 'resolve-approval');
      assert.equal(input.requirement.resourceKind, 'approval');
      assert.equal(input.requirement.resourceRef, 'approval:item-1');
      return evaluateOpenClawTelegramPermission(input);
    },
  });

  assert.deepEqual(calls, ['permission', 'resolve']);
  assert.equal(result.ok, true);
  assert.equal(result.value.decision.approvalRef, 'approval:item-1');
  assert.equal(result.value.permission.status, 'allowed');
  assertNoUnsafeApprovalOutput(result.value);
});

test('approval composition denied permission does not cross resolver boundary', async () => {
  const calls = [];
  const result = await resolveApprovalBridgeDecisionWithPermission({
    resolver: Object.freeze({
      resolve: () => {
        calls.push('resolve');
        throw new Error('resolver must not be called when permission is denied');
      },
    }),
    decision: approvalDecision,
    actor: Object.freeze({ trust: 'unknown' }),
    permissionContext,
    permissionGrants: [approvalGrant],
    permissionEvaluator: (input) => {
      calls.push('permission');
      return evaluateOpenClawTelegramPermission(input);
    },
  });

  assert.deepEqual(calls, ['permission']);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'forbidden');
  assert.equal(result.error.message, 'Approval resolution permission denied before resolver boundary call.');
  assert.equal(result.error.correlationRef, 'correlation:approval-composition');
  assertNoUnsafeApprovalOutput(result.error);
});

test('approval composition safe-fails before resolver for unsafe decision input', async () => {
  const calls = [];
  const result = await resolveApprovalBridgeDecisionWithPermission({
    resolver: Object.freeze({
      resolve: () => {
        calls.push('resolve');
        throw new Error('resolver must not be called for unsafe decision input');
      },
    }),
    decision: Object.freeze({
      approvalRef: 'approval:item-1',
      status: 'approved',
      actorRef: 'actor:user-1',
      rawApprovalPayload: Object.freeze({
        providerObject: 'provider-object-leak',
      }),
    }),
    actor,
    permissionContext,
    permissionGrants: [approvalGrant],
  });

  assert.deepEqual(calls, []);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(result.error.message, 'Approval composition decision is invalid or unsafe.');
  assertNoUnsafeApprovalOutput(result.error);
});
