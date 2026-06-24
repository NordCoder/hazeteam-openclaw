import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOpenClawApprovalBridge,
  resolveOpenClawApprovalBridgeDecision,
  submitOpenClawApprovalBridgeRequest,
  summarizeOpenClawApprovalBridgeReadiness,
} from '../../../../dist/openclaw/approval/index.js';
import {
  createApprovalBridgePermissionRequirement,
} from '../../../../dist/approvals/approval-bridge.js';
import { allowPermission, denyPermission } from '../../../../dist/contracts/index.js';

function assertNoForbiddenPublicFields(sample) {
  const forbiddenFieldNames = [
    'rawUpdate',
    'telegramUpdate',
    'rawTelegramUpdate',
    'rawOpenClawEvent',
    'rawOpenClawApproval',
    'rawOpenClawResponse',
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

function createAllowedApprovalPermissionDecision() {
  return allowPermission(
    createApprovalBridgePermissionRequirement({
      approvalRef: baseDecisionInput.approvalRef,
      actorRef: baseDecisionInput.actorRef,
      workspaceRef: baseApprovalRequestInput.workspaceRef,
      agentRef: baseApprovalRequestInput.agentRef,
      detailsRef: baseDecisionInput.detailsRef,
      correlationRef: baseDecisionInput.correlationRef,
    }),
  );
}

function createDeniedApprovalPermissionDecision() {
  return denyPermission({
    requirement: createApprovalBridgePermissionRequirement({
      approvalRef: baseDecisionInput.approvalRef,
      actorRef: baseDecisionInput.actorRef,
      workspaceRef: baseApprovalRequestInput.workspaceRef,
      agentRef: baseApprovalRequestInput.agentRef,
      detailsRef: 'details:denied-approval',
      correlationRef: 'correlation:denied-approval',
    }),
    reason: 'No approval grant for this actor.',
    detailsRef: 'details:denied-approval',
    correlationRef: 'correlation:denied-approval',
  });
}

function createRecordingApprovalPort(overrides = {}) {
  const submittedRequests = [];
  const resolvedDecisions = [];
  const consumedCallbackTokens = [];

  return {
    approvalPort: Object.freeze({
      submitApproval(request) {
        submittedRequests.push(request);
        if (overrides.submitApproval !== undefined) {
          return overrides.submitApproval(request);
        }

        return Object.freeze({
          ok: true,
          state: Object.freeze({
            approvalRef: request.approvalRef,
            status: 'submitted',
            detailsRef: request.detailsRef,
            correlationRef: request.correlationRef,
          }),
        });
      },
      resolveApproval(decision) {
        resolvedDecisions.push(decision);
        if (overrides.resolveApproval !== undefined) {
          return overrides.resolveApproval(decision);
        }

        return Object.freeze({
          ok: true,
          state: Object.freeze({
            approvalRef: decision.approvalRef,
            status: decision.status,
            detailsRef: decision.detailsRef,
            correlationRef: decision.correlationRef,
          }),
        });
      },
      getReadiness() {
        if (overrides.getReadiness !== undefined) {
          return overrides.getReadiness();
        }

        return Object.freeze({ status: 'ready', message: 'OpenClaw approval port is ready.' });
      },
      consumeCallbackToken(tokenRef) {
        consumedCallbackTokens.push(tokenRef);
        throw new Error('callback token consumption must not be called by this bridge');
      },
    }),
    getSubmittedRequests() {
      return Object.freeze([...submittedRequests]);
    },
    getResolvedDecisions() {
      return Object.freeze([...resolvedDecisions]);
    },
    getConsumedCallbackTokens() {
      return Object.freeze([...consumedCallbackTokens]);
    },
  };
}

test('OpenClaw approval bridge reports missing approval port as dependency-missing and not-ready', () => {
  const submitResult = submitOpenClawApprovalBridgeRequest({ request: baseApprovalRequestInput });
  const resolveResult = resolveOpenClawApprovalBridgeDecision({
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });
  const readiness = summarizeOpenClawApprovalBridgeReadiness();
  const bridgeReadiness = createOpenClawApprovalBridge().getReadiness();

  assert.equal(submitResult.ok, false);
  assert.equal(submitResult.error.code, 'dependency-missing');
  assert.equal(resolveResult.ok, false);
  assert.equal(resolveResult.error.code, 'dependency-missing');
  assert.equal(readiness.status, 'not-ready');
  assert.equal(readiness.checks[0].component, 'approval');
  assert.equal(readiness.checks[0].status, 'fail');
  assert.equal(bridgeReadiness.status, 'not-ready');
  assertNoForbiddenPublicFields(submitResult);
  assertNoForbiddenPublicFields(resolveResult);
  assertNoForbiddenPublicFields(readiness);
});

test('OpenClaw approval bridge submit calls injected port with normalized safe approval DTO', () => {
  const recording = createRecordingApprovalPort();

  const result = submitOpenClawApprovalBridgeRequest({
    approvalPort: recording.approvalPort,
    request: baseApprovalRequestInput,
  });

  assert.equal(result.ok, true);
  assert.equal(recording.getSubmittedRequests().length, 1);
  assert.deepEqual(recording.getSubmittedRequests()[0], result.value.request);
  assert.equal(result.value.request.approvePayload, 'hz:token:approval-approve-1');
  assert.equal(result.value.request.rejectPayload, 'hz:token:approval-reject-1');
  assert.equal(result.value.request.message, 'Please review deploy summary. [redacted] should not leak.');
  assert.equal(result.value.state.approvalRef, 'approval:deploy-prod-1');
  assert.equal(result.value.state.status, 'submitted');
  assert.equal(JSON.stringify(result).includes('abc123'), false);
  assert.equal(recording.getConsumedCallbackTokens().length, 0);
  assertNoForbiddenPublicFields(result);
});

test('OpenClaw approval bridge resolve calls injected port with normalized safe decision DTO', () => {
  const recording = createRecordingApprovalPort();

  const result = resolveOpenClawApprovalBridgeDecision({
    approvalPort: recording.approvalPort,
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });

  assert.equal(result.ok, true);
  assert.equal(recording.getResolvedDecisions().length, 1);
  assert.deepEqual(recording.getResolvedDecisions()[0], result.value.decision);
  assert.equal(result.value.decision.status, 'approved');
  assert.equal(result.value.decision.reason, 'Looks good. [redacted] should not leak.');
  assert.equal(result.value.state.approvalRef, 'approval:deploy-prod-1');
  assert.equal(result.value.state.status, 'approved');
  assert.equal(JSON.stringify(result).includes('abc123'), false);
  assert.equal(recording.getConsumedCallbackTokens().length, 0);
  assertNoForbiddenPublicFields(result);
});

test('OpenClaw approval bridge maps port success state to safe approval result', () => {
  const recording = createRecordingApprovalPort({
    submitApproval(request) {
      return Object.freeze({
        ok: true,
        approvalRef: request.approvalRef,
        status: 'submitted',
        detailsRef: 'details:submitted-state',
        correlationRef: 'correlation:submitted-state',
      });
    },
    resolveApproval(decision) {
      return Object.freeze({
        ok: true,
        state: Object.freeze({
          approvalRef: decision.approvalRef,
          status: 'rejected',
          detailsRef: 'details:resolved-state',
          correlationRef: 'correlation:resolved-state',
        }),
      });
    },
  });

  const submitResult = submitOpenClawApprovalBridgeRequest({
    approvalPort: recording.approvalPort,
    request: baseApprovalRequestInput,
  });
  const resolveResult = resolveOpenClawApprovalBridgeDecision({
    approvalPort: recording.approvalPort,
    decision: { ...baseDecisionInput, status: 'rejected' },
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });

  assert.equal(submitResult.ok, true);
  assert.deepEqual(submitResult.value.state, {
    approvalRef: 'approval:deploy-prod-1',
    status: 'submitted',
    detailsRef: 'details:submitted-state',
    correlationRef: 'correlation:submitted-state',
  });
  assert.equal(resolveResult.ok, true);
  assert.deepEqual(resolveResult.value.state, {
    approvalRef: 'approval:deploy-prod-1',
    status: 'rejected',
    detailsRef: 'details:resolved-state',
    correlationRef: 'correlation:resolved-state',
  });
  assertNoForbiddenPublicFields(submitResult);
  assertNoForbiddenPublicFields(resolveResult);
});

test('OpenClaw approval bridge maps port failure and thrown errors to safe adapter errors', () => {
  const failing = createRecordingApprovalPort({
    submitApproval() {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: 'timeout',
          message: 'provider api_key=abc123 failed under /tmp/raw/provider/path',
          retryable: true,
          detailsRef: 'details:submit-failure',
          correlationRef: 'correlation:submit-failure',
        }),
      });
    },
    resolveApproval() {
      throw new Error('runtime bot_token:abc123 stack /tmp/raw-runtime-path');
    },
  });

  const submitResult = submitOpenClawApprovalBridgeRequest({
    approvalPort: failing.approvalPort,
    request: baseApprovalRequestInput,
  });
  const resolveResult = resolveOpenClawApprovalBridgeDecision({
    approvalPort: failing.approvalPort,
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });

  assert.equal(submitResult.ok, false);
  assert.equal(submitResult.error.code, 'dependency-failed');
  assert.equal(submitResult.error.retryable, true);
  assert.equal(submitResult.error.detailsRef, 'details:submit-failure');
  assert.equal(submitResult.error.correlationRef, 'correlation:submit-failure');
  assert.equal(resolveResult.ok, false);
  assert.equal(resolveResult.error.code, 'dependency-failed');
  assert.equal(resolveResult.error.message, 'OpenClaw approval resolve port threw safely.');

  for (const result of [submitResult, resolveResult]) {
    assertNoForbiddenPublicFields(result);
    assert.equal(JSON.stringify(result).includes('abc123'), false);
    assert.equal(JSON.stringify(result).includes('/tmp/raw'), false);
    assert.equal(JSON.stringify(result).includes('stack'), false);
  }
});

test('OpenClaw approval bridge rejects raw approval payloads and unsafe port results without exposing secrets', () => {
  const rawInputRecording = createRecordingApprovalPort();
  const rawResultRecording = createRecordingApprovalPort({
    submitApproval() {
      return Object.freeze({
        ok: true,
        rawApprovalPayload: Object.freeze({ command: 'deploy', value: 'unsafe-approval-value' }),
      });
    },
  });

  const invalidInput = submitOpenClawApprovalBridgeRequest({
    approvalPort: rawInputRecording.approvalPort,
    request: {
      ...baseApprovalRequestInput,
      rawApprovalPayload: { command: 'deploy', value: 'unsafe-input-value' },
    },
  });
  const invalidPortResult = submitOpenClawApprovalBridgeRequest({
    approvalPort: rawResultRecording.approvalPort,
    request: baseApprovalRequestInput,
  });

  assert.equal(invalidInput.ok, false);
  assert.equal(invalidInput.error.code, 'invalid-input');
  assert.equal(rawInputRecording.getSubmittedRequests().length, 0);
  assert.equal(invalidPortResult.ok, false);
  assert.equal(invalidPortResult.error.code, 'dependency-failed');
  assert.equal(rawResultRecording.getSubmittedRequests().length, 1);

  for (const result of [invalidInput, invalidPortResult]) {
    assertNoForbiddenPublicFields(result);
    assert.equal(JSON.stringify(result).includes('unsafe-input-value'), false);
    assert.equal(JSON.stringify(result).includes('unsafe-approval-value'), false);
  }
});

test('OpenClaw approval bridge does not bypass permission checks or consume callback tokens', () => {
  const recording = createRecordingApprovalPort();

  const denied = resolveOpenClawApprovalBridgeDecision({
    approvalPort: recording.approvalPort,
    decision: baseDecisionInput,
    permissionDecision: createDeniedApprovalPermissionDecision(),
  });
  const missingPermission = resolveOpenClawApprovalBridgeDecision({
    approvalPort: recording.approvalPort,
    decision: baseDecisionInput,
  });
  const allowed = resolveOpenClawApprovalBridgeDecision({
    approvalPort: recording.approvalPort,
    decision: baseDecisionInput,
    permissionDecision: createAllowedApprovalPermissionDecision(),
  });

  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, 'forbidden');
  assert.equal(denied.error.detailsRef, 'details:denied-approval');
  assert.equal(denied.error.correlationRef, 'correlation:denied-approval');
  assert.equal(missingPermission.ok, false);
  assert.equal(missingPermission.error.code, 'forbidden');
  assert.equal(allowed.ok, true);
  assert.equal(recording.getResolvedDecisions().length, 1);
  assert.equal(recording.getConsumedCallbackTokens().length, 0);
  assertNoForbiddenPublicFields(denied);
  assertNoForbiddenPublicFields(missingPermission);
  assertNoForbiddenPublicFields(allowed);
});

test('OpenClaw approval bridge output is deterministic and avoids real infra fields', () => {
  const recording = createRecordingApprovalPort({
    getReadiness() {
      return Object.freeze({ status: 'ready', message: 'approval boundary ready' });
    },
  });
  const firstBridge = createOpenClawApprovalBridge({ approvalPort: recording.approvalPort });
  const secondBridge = createOpenClawApprovalBridge({ approvalPort: recording.approvalPort });

  const firstSubmit = firstBridge.submit(baseApprovalRequestInput);
  const secondSubmit = secondBridge.submit(baseApprovalRequestInput);
  const firstReadiness = firstBridge.getReadiness();
  const secondReadiness = summarizeOpenClawApprovalBridgeReadiness({
    approvalPort: recording.approvalPort,
  });

  assert.deepEqual(firstSubmit, secondSubmit);
  assert.deepEqual(firstReadiness, secondReadiness);
  assert.equal(firstReadiness.status, 'ready');
  assert.equal(JSON.stringify(firstSubmit).includes('generatedAt'), false);
  assert.equal(JSON.stringify(firstReadiness).includes('generatedAt'), false);
  assertNoForbiddenPublicFields(firstSubmit);
  assertNoForbiddenPublicFields(firstReadiness);
});
