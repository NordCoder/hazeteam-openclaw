import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createApprovalBridgeDecision,
  createApprovalBridgePermissionRequirement,
  createApprovalBridgeRequest,
  isApprovalBridgeDecision,
  isApprovalBridgeRequest,
  resolveApprovalBridgeDecision,
  submitApprovalBridgeRequest,
} from '../../../dist/approvals/approval-bridge.js';
import { allowPermission, denyPermission } from '../../../dist/contracts/index.js';

function assertNoForbiddenPublicFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawOpenClawApproval',
    'rawProviderObject',
    'rawProviderResponse',
    'providerObject',
    'provider',
    'rawRuntimeObject',
    'rawRuntimePayload',
    'runtimeObject',
    'rawToolPayload',
    'toolPayload',
    'approvalPayload',
    'rawApprovalPayload',
    'rawCallbackBody',
    'rawError',
    'stack',
    ['bot', 'Token'].join(''),
    ['api', 'Key'].join(''),
    ['sec', 'ret'].join(''),
    ['cred', 'ential'].join(''),
    'handler',
    'execute',
    'network',
    'filesystem',
    'filesystemPath',
    'database',
    'sdkClient',
    'openClawClient',
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

function createRecordingApprovalSource() {
  const requests = [];

  return {
    source: Object.freeze({
      submit(request) {
        requests.push(request);
        return Object.freeze({
          rawProviderResponse: { ignored: true },
          stack: 'ignored raw source stack',
        });
      },
    }),
    getRequests() {
      return Object.freeze([...requests]);
    },
  };
}

function createRecordingApprovalResolver() {
  const decisions = [];

  return {
    resolver: Object.freeze({
      resolve(decision) {
        decisions.push(decision);
        return Object.freeze({
          rawToolPayload: { ignored: true },
          stack: 'ignored raw resolver stack',
        });
      },
    }),
    getDecisions() {
      return Object.freeze([...decisions]);
    },
  };
}

const baseApprovalRequestInput = Object.freeze({
  approvalRef: 'approval:deploy-prod-1',
  title: 'Deploy production?',
  message: 'Please review deploy summary. api_key=abc123 should not leak.',
  approveTokenRef: 'token:approval-approve-1',
  rejectTokenRef: 'hz:token:approval-reject-1',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
  actorRef: 'actor:reviewer',
  subjectRef: 'approval-subject:deploy-prod-1',
  detailsRef: 'details:approval-details-1',
  correlationRef: 'correlation:approval-correlation-1',
});

const baseDecisionInput = Object.freeze({
  approvalRef: 'approval:deploy-prod-1',
  status: 'approved',
  actorRef: 'actor:reviewer',
  reason: 'Looks good. bot_token:abc123 should not leak.',
  detailsRef: 'details:approval-details-1',
  correlationRef: 'correlation:approval-correlation-1',
});

const safeOperationContext = Object.freeze({
  operationRef: 'operation:approval-operation-1',
  correlationRef: 'correlation:approval-context-1',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
  actorRef: 'actor:reviewer',
  detailsRef: 'details:approval-context-details-1',
  rawDebugRef: 'raw-debug:approval-debug-1',
  ignoredDisplayField: 'safe field that must not be preserved',
});

function createUnsafeOperationContext() {
  return {
    operationRef: 'operation:approval-operation-unsafe',
    correlationRef: 'correlation:approval-context-unsafe',
    rawApprovalPayload: { tool: 'deploy', value: 'unsafe-approval-context-value' },
    nested: {
      rawToolPayload: { providerObject: 'unsafe-tool-context-value' },
      stack: 'unsafe-stack-context-value',
    },
  };
}

function createAllowedApprovalPermissionDecision() {
  return allowPermission(
    createApprovalBridgePermissionRequirement({
      approvalRef: baseDecisionInput.approvalRef,
      actorRef: baseDecisionInput.actorRef,
      workspaceRef: 'workspace:workspace-alpha',
      agentRef: 'agent:coder',
    }),
  );
}

test('approval bridge request normalizes safe approval DTO and tokenized card payloads', () => {
  const request = createApprovalBridgeRequest(baseApprovalRequestInput);

  assert.equal(request.kind, 'openclaw-approval-request');
  assert.equal(request.approvalRef, 'approval:deploy-prod-1');
  assert.equal(request.message, 'Please review deploy summary. [redacted] should not leak.');
  assert.equal(request.approvePayload, 'hz:token:approval-approve-1');
  assert.equal(request.rejectPayload, 'hz:token:approval-reject-1');
  assert.equal(request.card.intent, 'action-request');
  assert.equal(request.card.title, 'Deploy production?');
  assert.deepEqual(
    request.card.buttonGroups[0].buttons.map((button) => ({
      label: button.label,
      payload: button.payload,
      style: button.style,
    })),
    [
      {
        label: 'Approve',
        payload: 'hz:token:approval-approve-1',
        style: 'primary',
      },
      {
        label: 'Reject',
        payload: 'hz:token:approval-reject-1',
        style: 'danger',
      },
    ],
  );
  assert.equal(Object.isFrozen(request), true);
  assert.equal(Object.isFrozen(request.card), true);
  assert.equal(isApprovalBridgeRequest(request), true);
  assertNoForbiddenPublicFields(request);
  assert.equal(JSON.stringify(request).includes('abc123'), false);
});

test('approval bridge submit calls injected source with safe DTO and ignores raw boundary return', async () => {
  const recording = createRecordingApprovalSource();

  const result = await submitApprovalBridgeRequest({
    source: recording.source,
    request: baseApprovalRequestInput,
  });

  assert.equal(result.ok, true);
  assert.equal(recording.getRequests().length, 1);
  assert.deepEqual(recording.getRequests()[0], result.value.request);
  assert.equal(result.value.request.approvePayload, 'hz:token:approval-approve-1');
  assert.equal(JSON.stringify(result).includes('rawProviderResponse'), false);
  assert.equal(JSON.stringify(result).includes('ignored raw source stack'), false);
  assertNoForbiddenPublicFields(result);
});

test('approval bridge submit preserves only normalized safe context in successful result', async () => {
  const recording = createRecordingApprovalSource();

  const result = await submitApprovalBridgeRequest({
    source: recording.source,
    request: baseApprovalRequestInput,
    context: safeOperationContext,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.context, {
    operationRef: 'operation:approval-operation-1',
    correlationRef: 'correlation:approval-context-1',
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
    actorRef: 'actor:reviewer',
    detailsRef: 'details:approval-context-details-1',
    rawDebugRef: 'raw-debug:approval-debug-1',
  });
  assert.equal('ignoredDisplayField' in result.context, false);
  assert.equal(recording.getRequests().length, 1);
  assertNoForbiddenPublicFields(result);
});

test('approval bridge rejects unsafe context before source submit without leaking raw values', async () => {
  const recording = createRecordingApprovalSource();

  const result = await submitApprovalBridgeRequest({
    source: recording.source,
    request: baseApprovalRequestInput,
    context: createUnsafeOperationContext(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal('context' in result, false);
  assert.equal(recording.getRequests().length, 0);
  assertNoForbiddenPublicFields(result);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('unsafe-approval-context-value'), false);
  assert.equal(serialized.includes('unsafe-tool-context-value'), false);
  assert.equal(serialized.includes('unsafe-stack-context-value'), false);
});

test('approval bridge decision normalizes safe decision DTO and permission requirement', () => {
  const decision = createApprovalBridgeDecision(baseDecisionInput);
  const requirement = createApprovalBridgePermissionRequirement({
    approvalRef: decision.approvalRef,
    actorRef: decision.actorRef,
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
    detailsRef: decision.detailsRef,
    correlationRef: decision.correlationRef,
  });

  assert.deepEqual(decision, {
    kind: 'openclaw-approval-decision',
    approvalRef: 'approval:deploy-prod-1',
    status: 'approved',
    actorRef: 'actor:reviewer',
    reason: 'Looks good. [redacted] should not leak.',
    detailsRef: 'details:approval-details-1',
    correlationRef: 'correlation:approval-correlation-1',
  });
  assert.deepEqual(requirement, {
    action: 'resolve-approval',
    resourceKind: 'approval',
    resourceRef: 'approval:deploy-prod-1',
    actorRef: 'actor:reviewer',
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
    detailsRef: 'details:approval-details-1',
    correlationRef: 'correlation:approval-correlation-1',
  });
  assert.equal(isApprovalBridgeDecision(decision), true);
  assertNoForbiddenPublicFields(decision);
  assert.equal(JSON.stringify(decision).includes('abc123'), false);
});

test('approval bridge resolve calls injected resolver after allowed permission decision', async () => {
  const recording = createRecordingApprovalResolver();

  const result = await resolveApprovalBridgeDecision({
    resolver: recording.resolver,
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });

  assert.equal(result.ok, true);
  assert.equal(recording.getDecisions().length, 1);
  assert.deepEqual(recording.getDecisions()[0], result.value.decision);
  assert.equal(result.value.decision.status, 'approved');
  assert.equal(JSON.stringify(result).includes('rawToolPayload'), false);
  assert.equal(JSON.stringify(result).includes('ignored raw resolver stack'), false);
  assertNoForbiddenPublicFields(result);
});

test('approval bridge resolve preserves only normalized safe context in successful result', async () => {
  const recording = createRecordingApprovalResolver();

  const result = await resolveApprovalBridgeDecision({
    resolver: recording.resolver,
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
    context: safeOperationContext,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.context, {
    operationRef: 'operation:approval-operation-1',
    correlationRef: 'correlation:approval-context-1',
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
    actorRef: 'actor:reviewer',
    detailsRef: 'details:approval-context-details-1',
    rawDebugRef: 'raw-debug:approval-debug-1',
  });
  assert.equal('ignoredDisplayField' in result.context, false);
  assert.equal(recording.getDecisions().length, 1);
  assertNoForbiddenPublicFields(result);
});

test('approval bridge rejects unsafe context before resolver call without leaking raw values', async () => {
  const recording = createRecordingApprovalResolver();

  const result = await resolveApprovalBridgeDecision({
    resolver: recording.resolver,
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
    context: createUnsafeOperationContext(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal('context' in result, false);
  assert.equal(recording.getDecisions().length, 0);
  assertNoForbiddenPublicFields(result);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('unsafe-approval-context-value'), false);
  assert.equal(serialized.includes('unsafe-tool-context-value'), false);
  assert.equal(serialized.includes('unsafe-stack-context-value'), false);
});

test('approval bridge resolve denies before resolver call when permission is denied', async () => {
  const recording = createRecordingApprovalResolver();
  const requirement = createApprovalBridgePermissionRequirement({
    approvalRef: baseDecisionInput.approvalRef,
    actorRef: baseDecisionInput.actorRef,
    workspaceRef: 'workspace:workspace-alpha',
    agentRef: 'agent:coder',
    detailsRef: 'details:denied-approval',
    correlationRef: 'correlation:denied-approval',
  });

  const result = await resolveApprovalBridgeDecision({
    resolver: recording.resolver,
    decision: baseDecisionInput,
    permissionDecision: denyPermission({
      requirement,
      reason: 'No approval role for this topic.',
      detailsRef: 'details:denied-approval',
      correlationRef: 'correlation:denied-approval',
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'forbidden');
  assert.equal(result.error.detailsRef, 'details:denied-approval');
  assert.equal(result.error.correlationRef, 'correlation:denied-approval');
  assert.equal(recording.getDecisions().length, 0);
  assertNoForbiddenPublicFields(result);
});

test('approval bridge resolve denies before resolver call when permission is missing', async () => {
  const recording = createRecordingApprovalResolver();

  const result = await resolveApprovalBridgeDecision({
    resolver: recording.resolver,
    decision: baseDecisionInput,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'forbidden');
  assert.equal(result.error.correlationRef, 'correlation:approval-correlation-1');
  assert.equal(recording.getDecisions().length, 0);
  assertNoForbiddenPublicFields(result);
});

test('approval bridge returns safe failures for missing or throwing injected boundaries', async () => {
  const missingSource = await submitApprovalBridgeRequest({
    request: baseApprovalRequestInput,
  });
  const throwingSource = await submitApprovalBridgeRequest({
    source: {
      submit() {
        throw new Error('provider api_key=abc123 stack /tmp/raw-path');
      },
    },
    request: baseApprovalRequestInput,
  });
  const missingResolver = await resolveApprovalBridgeDecision({
    decision: baseDecisionInput,
  });
  const throwingResolver = await resolveApprovalBridgeDecision({
    resolver: {
      resolve() {
        throw new Error('runtime bot_token:abc123 stack /tmp/raw-path');
      },
    },
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });

  assert.equal(missingSource.ok, false);
  assert.equal(missingSource.error.code, 'dependency-missing');
  assert.equal(throwingSource.ok, false);
  assert.equal(throwingSource.error.code, 'dependency-failed');
  assert.equal(throwingSource.error.message, 'Approval source boundary failed.');
  assert.equal(missingResolver.ok, false);
  assert.equal(missingResolver.error.code, 'dependency-missing');
  assert.equal(throwingResolver.ok, false);
  assert.equal(throwingResolver.error.code, 'dependency-failed');
  assert.equal(throwingResolver.error.message, 'Approval resolver boundary failed.');

  for (const result of [missingSource, throwingSource, missingResolver, throwingResolver]) {
    assertNoForbiddenPublicFields(result);
    assert.equal(JSON.stringify(result).includes('abc123'), false);
    assert.equal(JSON.stringify(result).includes('/tmp/raw-path'), false);
  }
});

test('approval bridge rejects unsafe raw approval payloads and non-opaque callbacks', () => {
  const request = createApprovalBridgeRequest(baseApprovalRequestInput);
  const decision = createApprovalBridgeDecision(baseDecisionInput);

  assert.throws(
    () =>
      createApprovalBridgeRequest({
        ...baseApprovalRequestInput,
        rawApprovalPayload: { tool: 'deploy' },
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createApprovalBridgeRequest({
        ...baseApprovalRequestInput,
        approveTokenRef: '{"approve":true}',
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createApprovalBridgeDecision({
        ...baseDecisionInput,
        rawToolPayload: { command: 'deploy' },
      }),
    TypeError,
  );
  assert.equal(isApprovalBridgeRequest({ ...baseApprovalRequestInput, approvalRef: 'bad/ref' }), false);
  assert.equal(isApprovalBridgeRequest({ ...request, card: { ...request.card, rawToolPayload: {} } }), false);
  assert.equal(isApprovalBridgeDecision({ ...baseDecisionInput, status: 'executed' }), false);
  assert.equal(isApprovalBridgeDecision({ ...decision, kind: undefined }), false);
});

test('approval bridge rejects unbounded approval request and decision fields', () => {
  assert.throws(
    () =>
      createApprovalBridgeRequest({
        ...baseApprovalRequestInput,
        title: 'x'.repeat(161),
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createApprovalBridgeRequest({
        ...baseApprovalRequestInput,
        message: 'x'.repeat(1_001),
      }),
    TypeError,
  );
  assert.throws(
    () =>
      createApprovalBridgeDecision({
        ...baseDecisionInput,
        reason: 'x'.repeat(241),
      }),
    TypeError,
  );
});
