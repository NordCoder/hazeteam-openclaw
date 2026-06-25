import assert from 'node:assert/strict';
import test from 'node:test';

import * as oca from '../../dist/index.js';

const safeSessionRef = 'oca-session:session-alpha';
const safeTaskRef = 'oca-task:task-alpha';
const safeRepoRef = 'oca-repo:repo-alpha';
const safeWorktreeRef = 'oca-worktree:worktree-alpha';
const safeBranchRef = 'oca-branch:branch-alpha';
const safeOutputRef = 'oca-output:output-alpha';
const safeLogRef = 'oca-log:log-alpha';
const safeDiffRef = 'oca-diff:diff-alpha';
const safeArtifactRef = 'oca-artifact:artifact-alpha';
const safeReviewRef = 'oca-review:review-alpha';
const safeIdempotencyRef = 'idempotency:fan-alpha';
const safeRequestRef = 'request:fan-alpha';

const expectedRootFunctions = Object.freeze([
  'describeOcaWrapper',
  'getOcaWrapperCapabilityDescriptor',
  'listOcaWrapperOperationDescriptors',
  'normalizeOcaSessionModel',
  'createInMemoryOcaSessionStore',
  'createFakeOcaClient',
  'handleOcaOperation',
  'createOcaApprovalRuntimeToolIntegration',
  'handleOcaApprovalRuntimeToolRequest',
  'buildOcaSessionStatusCard',
  'buildOcaActiveSessionsPanel',
  'buildOcaApprovalActionCard',
  'redactOcaPresentationText',
]);

const forbiddenOutputTerms = Object.freeze([
  chars([114, 97, 119, 108, 111, 103]),
  chars([114, 97, 119, 100, 105, 102, 102]),
  chars([114, 97, 119, 111, 117, 112, 117, 116]),
  chars([114, 97, 119, 112, 97, 116, 104]),
  chars([102, 105, 108, 101, 112, 97, 116, 104]),
  chars([114, 101, 112, 111, 112, 97, 116, 104]),
  chars([119, 111, 114, 107, 115, 112, 97, 99, 101, 112, 97, 116, 104]),
  chars([112, 114, 111, 118, 105, 100, 101, 114, 112, 97, 121, 108, 111, 97, 100]),
  chars([114, 117, 110, 116, 105, 109, 101, 112, 97, 121, 108, 111, 97, 100]),
  chars([99, 108, 105, 101, 110, 116, 104, 97, 110, 100, 108, 101]),
  chars([115, 100, 107, 99, 108, 105, 101, 110, 116]),
  chars([112, 114, 111, 99, 101, 115, 115, 105, 100]),
  chars([116, 111, 107, 101, 110]),
  chars([115, 101, 99, 114, 101, 116]),
  chars([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
  chars([115, 116, 97, 99, 107]),
  chars([101, 110, 100, 112, 111, 105, 110]),
  chars([99, 111, 109, 109, 97, 110, 100, 111, 117, 116, 112, 117, 116]),
]);

function chars(codes) {
  return String.fromCharCode(...codes);
}

function makeSafeSessionInput() {
  return Object.freeze({
    sessionRef: safeSessionRef,
    taskRef: safeTaskRef,
    workspaceRef: 'workspace:main',
    agentRef: 'agent:coder',
    actorRef: 'actor:operator',
    profileRef: 'profile:default',
    repoRef: safeRepoRef,
    worktreeRef: safeWorktreeRef,
    branchRef: safeBranchRef,
    outputRefs: Object.freeze([safeOutputRef]),
    logRefs: Object.freeze([safeLogRef]),
    diffRefs: Object.freeze([safeDiffRef]),
    artifactRefs: Object.freeze([safeArtifactRef]),
    reviewRefs: Object.freeze([safeReviewRef]),
    lifecycleState: 'planned',
    derivedStatus: 'healthy',
    correlationRef: 'correlation:fan-alpha',
    idempotencyRef: safeIdempotencyRef,
    createdAt: '2026-06-25T12:00:00Z',
    updatedAt: '2026-06-25T12:00:00Z',
    summary: 'Safe fake session is ready.',
    issues: Object.freeze([]),
  });
}

function makeSpyRuntime() {
  let calls = 0;
  const fakeClient = Object.freeze({
    runOperation(request) {
      calls += 1;
      return Object.freeze({
        ok: true,
        operationRef: request.operationRef,
        executionPosture: 'fake',
        fakeExecution: 'called',
        state: 'succeeded',
        effect: request.effect,
        refs: Object.freeze({
          ...(request.sessionRef === undefined ? {} : { sessionRef: request.sessionRef }),
          ...(request.taskRef === undefined ? {} : { taskRef: request.taskRef }),
          ...(request.outputRef === undefined ? {} : { outputRef: request.outputRef }),
          ...(request.diffRef === undefined ? {} : { diffRef: request.diffRef }),
          ...(request.reviewRef === undefined ? {} : { reviewRef: request.reviewRef }),
        }),
        summary: 'Fake operation completed with safe bounded output.',
        resultRefs: Object.freeze([request.sessionRef ?? request.taskRef ?? safeOutputRef]),
      });
    },
  });

  return {
    get calls() {
      return calls;
    },
    integration: oca.createOcaApprovalRuntimeToolIntegration({ fakeClient }),
  };
}

function makeApprovalDecision(blocked) {
  assert.equal(blocked.status, 'approval-required');
  assert.ok(blocked.requirement);

  return Object.freeze({
    kind: 'explicit-approval',
    approved: true,
    requirementRef: blocked.requirement.requirementRef,
    operationRef: 'hazeteam.oca.start-session',
    effect: 'external-effect',
    idempotencyRef: safeIdempotencyRef,
    requestRef: safeRequestRef,
    decisionRef: 'approval-decision:fan-alpha',
  });
}

function assertJsonRoundTrip(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
}

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenOutputTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

function assertSafePublicOutput(value, predicate = undefined) {
  assertJsonRoundTrip(value);
  if (predicate !== undefined) {
    assert.equal(predicate(value), true);
  }
  assertNoUnsafeTerms(value);
}

test('package root exposes W15 public fan-in surfaces', () => {
  for (const exportName of expectedRootFunctions) {
    assert.equal(typeof oca[exportName], 'function', `${exportName} should be exported from package root`);
  }

  assert.ok(Array.isArray(oca.OCA_WRAPPER_OPERATION_REFS));
  assert.equal(oca.OCA_WRAPPER_OPERATION_REFS.includes('hazeteam.oca.get-status'), true);
});

test('root W15 surfaces compose into a bounded fake E2E readiness flow', () => {
  const descriptor = oca.getOcaWrapperCapabilityDescriptor();
  const description = oca.describeOcaWrapper();
  const operations = oca.listOcaWrapperOperationDescriptors();

  assert.equal(descriptor.capabilityRef, 'oca-wrapper');
  assert.equal(operations.some((operation) => operation.operationRef === 'hazeteam.oca.start-session'), true);
  assert.equal(description.capability.capabilityRef, descriptor.capabilityRef);
  assertSafePublicOutput(descriptor, oca.isSafeOcaCapabilityDescriptorJson);
  assertSafePublicOutput(description, oca.isSafeOcaCapabilityDescriptorJson);

  const normalized = oca.normalizeOcaSessionModel(makeSafeSessionInput());
  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.sessionRef, safeSessionRef);
  assertSafePublicOutput(normalized.value, oca.isSafeOcaSessionModelJson);

  const store = oca.createInMemoryOcaSessionStore({ maxListLimit: 4 });
  const created = store.create({
    idempotencyRef: safeIdempotencyRef,
    session: normalized.value,
  });
  const resumed = store.resume(safeSessionRef);
  const listed = store.list({ limit: 2 });

  assert.equal(created.ok, true);
  assert.equal(created.status, 'created');
  assert.equal(resumed.ok, true);
  assert.equal(resumed.status, 'resumed');
  assert.equal(listed.ok, true);
  assert.equal(listed.sessions.length, 1);
  assertSafePublicOutput(created, oca.isSafeOcaSessionStoreJson);
  assertSafePublicOutput(resumed, oca.isSafeOcaSessionStoreJson);
  assertSafePublicOutput(listed, oca.isSafeOcaSessionStoreJson);

  const readOnly = oca.handleOcaOperation(
    {
      operationRef: 'hazeteam.oca.get-status',
      sessionRef: safeSessionRef,
    },
    { fakeClient: oca.createFakeOcaClient() },
  );

  assert.equal(readOnly.ok, true);
  assert.equal(readOnly.status, 'executed');
  assert.equal(readOnly.effect, 'read-only');
  assert.equal(readOnly.fakeExecution, 'called');
  assertSafePublicOutput(readOnly, oca.isSafeOcaOperationHandlerJson);

  const spy = makeSpyRuntime();
  const startRequest = Object.freeze({
    operationRef: 'hazeteam.oca.start-session',
    taskRef: safeTaskRef,
    idempotencyRef: safeIdempotencyRef,
    requestRef: safeRequestRef,
  });
  const blocked = spy.integration.handle(startRequest);

  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 'approval-required');
  assert.equal(blocked.fakeExecution, 'not-called');
  assert.equal(blocked.approval.required, true);
  assert.equal(blocked.approval.state, 'pending');
  assert.equal(spy.calls, 0);
  assertSafePublicOutput(blocked, oca.isSafeOcaApprovalRuntimeJson);

  const approved = spy.integration.handle({
    ...startRequest,
    approvalDecision: makeApprovalDecision(blocked),
  });

  assert.equal(approved.ok, true);
  assert.equal(approved.status, 'executed');
  assert.equal(approved.fakeExecution, 'called');
  assert.equal(approved.approval.state, 'approved');
  assert.equal(spy.calls, 1);
  assertSafePublicOutput(approved, oca.isSafeOcaApprovalRuntimeJson);

  const statusCard = oca.buildOcaSessionStatusCard(created.session);
  const sessionsPanel = oca.buildOcaActiveSessionsPanel(listed.sessions);
  const approvalCard = oca.buildOcaApprovalActionCard({
    actionRef: 'oca-action:approve-alpha',
    actionKind: 'approve-request',
    title: 'Approve fake request',
    summary: 'Approve safe fake execution.',
    label: 'Approve',
    style: 'primary',
    disabled: false,
  });

  assert.equal(statusCard.ok, true);
  assert.equal(statusCard.value.sessionRef, safeSessionRef);
  assert.equal(sessionsPanel.ok, true);
  assert.equal(sessionsPanel.value.visibleCount, 1);
  assert.equal(approvalCard.ok, true);
  assert.equal(approvalCard.value.button.actionKind, 'approve-request');

  for (const presentation of [statusCard, sessionsPanel, approvalCard]) {
    assertSafePublicOutput(presentation, oca.isSafeOcaPresentationJson);
  }

  for (const publicOutput of [descriptor, description, normalized, created, resumed, listed, readOnly, blocked, approved, statusCard, sessionsPanel, approvalCard]) {
    assertSafePublicOutput(publicOutput);
  }
});
