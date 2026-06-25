import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOcaActionButton,
  buildOcaActiveSessionsPanel,
  buildOcaApprovalActionCard,
  buildOcaDiffSummaryCard,
  buildOcaOutputSummaryCard,
  buildOcaReviewRequestCard,
  buildOcaSessionStatusCard,
  isSafeOcaPresentationJson,
  normalizeOcaPresentationText,
  redactOcaPresentationText,
  validateOcaPresentationActionRef,
} from '../../dist/presentation.js';
import { normalizeOcaSessionModel } from '../../dist/session-model.js';

function chars(codes) {
  return String.fromCharCode(...codes);
}

function sessionInput(suffix, overrides = {}) {
  return Object.freeze({
    sessionRef: `oca-session:session-${suffix}`,
    taskRef: `oca-task:task-${suffix}`,
    workspaceRef: 'workspace:lifeos',
    agentRef: 'agent:coder',
    actorRef: 'actor:operator',
    profileRef: 'profile:default',
    repoRef: 'oca-repo:repo-main',
    worktreeRef: `oca-worktree:worktree-${suffix}`,
    branchRef: `oca-branch:branch-${suffix}`,
    outputRefs: Object.freeze([`oca-output:output-${suffix}`]),
    logRefs: Object.freeze([`oca-log:log-${suffix}`]),
    diffRefs: Object.freeze([`oca-diff:diff-${suffix}`]),
    artifactRefs: Object.freeze([`oca-artifact:artifact-${suffix}`]),
    reviewRefs: Object.freeze([`oca-review:review-${suffix}`]),
    lifecycleState: 'active',
    derivedStatus: 'healthy',
    correlationRef: `correlation:run-${suffix}`,
    idempotencyRef: `idempotency:request-${suffix}`,
    createdAt: '2026-06-25T12:00:00Z',
    updatedAt: '2026-06-25T12:01:00Z',
    summary: `Safe session ${suffix}.`,
    issues: Object.freeze([{ code: 'safe-note', summary: 'Safe operator note.' }]),
    ...overrides,
  });
}

function assertSafeDescriptor(result) {
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);
  assert.equal(isSafeOcaPresentationJson(result.value), true);
}

function safeActionButton() {
  const button = buildOcaActionButton({
    actionRef: 'oca-action:continue-alpha',
    actionKind: 'continue-session',
    label: 'Continue',
    style: 'primary',
  });

  assertSafeDescriptor(button);
  return button.value;
}

test('session status card is provider-agnostic and safe', () => {
  const session = sessionInput('alpha');
  const normalized = normalizeOcaSessionModel(session);
  const result = buildOcaSessionStatusCard(session);

  assert.equal(normalized.ok, true);
  assertSafeDescriptor(result);
  assert.equal(result.value.kind, 'oca.session-status-card');
  assert.equal(result.value.sessionRef, 'oca-session:session-alpha');
  assert.equal(result.value.outputCount, 1);
  assert.equal(result.value.diffCount, 1);
  assert.equal(result.value.artifactCount, 1);
  assert.equal(result.value.reviewCount, 1);
  assert.deepEqual(result.value.publicIssues, [{ code: 'safe-note', summary: 'Safe operator note.' }]);
});

test('active sessions panel is bounded and reports truncation', () => {
  const sessions = Array.from({ length: 9 }, (_, index) => sessionInput(`panel-${index}`));
  const result = buildOcaActiveSessionsPanel(sessions);

  assertSafeDescriptor(result);
  assert.equal(result.value.kind, 'oca.active-sessions-panel');
  assert.equal(result.value.totalCount, 9);
  assert.equal(result.value.visibleCount, 8);
  assert.equal(result.value.truncated, true);
  assert.equal(result.value.sessions.length, 8);
});

test('output and diff summary cards expose refs and action descriptors only', () => {
  const output = buildOcaOutputSummaryCard({
    outputRef: 'oca-output:output-alpha',
    sessionRef: 'oca-session:session-alpha',
    summary: 'Safe bounded output summary.',
    artifactRefs: ['oca-artifact:artifact-alpha'],
    actions: [safeActionButton()],
  });
  const diff = buildOcaDiffSummaryCard({
    diffRef: 'oca-diff:diff-alpha',
    sessionRef: 'oca-session:session-alpha',
    summary: 'Safe bounded change summary.',
    artifactRefs: ['oca-artifact:artifact-alpha'],
    reviewRefs: ['oca-review:review-alpha'],
    actions: [safeActionButton()],
  });

  assertSafeDescriptor(output);
  assertSafeDescriptor(diff);
  assert.equal(output.value.kind, 'oca.output-summary-card');
  assert.equal(diff.value.kind, 'oca.diff-summary-card');
  assert.equal(output.value.actions[0].actionRef, 'oca-action:continue-alpha');
  assert.equal(diff.value.reviewRefs[0], 'oca-review:review-alpha');
});

test('review request and approval cards use safe opaque action refs', () => {
  const approval = buildOcaApprovalActionCard({
    actionRef: 'oca-action:approve-review-alpha',
    actionKind: 'approve-request',
    title: 'Approve review',
    summary: 'Approval is required before the action proceeds.',
    label: 'Approve',
  });

  assertSafeDescriptor(approval);
  assert.equal(approval.value.kind, 'oca.approval-action-card');
  assert.equal(approval.value.button.actionRef, 'oca-action:approve-review-alpha');
  assert.equal(approval.value.button.style, 'primary');

  const review = buildOcaReviewRequestCard({
    reviewRef: 'oca-review:review-alpha',
    sessionRef: 'oca-session:session-alpha',
    summary: 'Safe review summary.',
    diffRefs: ['oca-diff:diff-alpha'],
    artifactRefs: ['oca-artifact:artifact-alpha'],
    actions: [approval.value],
  });

  assertSafeDescriptor(review);
  assert.equal(review.value.kind, 'oca.review-request-card');
  assert.equal(review.value.actions[0].actionRef, 'oca-action:approve-review-alpha');
});

test('action refs reject unsafe or non-opaque forms', () => {
  const valid = validateOcaPresentationActionRef('oca-action:continue-alpha');
  const numericOnly = validateOcaPresentationActionRef('oca-action:12345');
  const urlLike = validateOcaPresentationActionRef(chars([104, 116, 116, 112, 115, 58, 47, 47]) + 'synthetic-invalid-marker');

  assert.equal(valid.ok, true);
  assert.equal(numericOnly.ok, false);
  assert.equal(urlLike.ok, false);
});

test('unsafe text is rejected or redacted without echoing unsafe markers', () => {
  const sensitiveMarker = ['contains ', chars([116, 111, 107, 101, 110]), ' marker'].join('');
  const normalized = normalizeOcaPresentationText(sensitiveMarker, 'summary');
  const redacted = redactOcaPresentationText(sensitiveMarker, 'Safe fallback summary.');
  const card = buildOcaOutputSummaryCard({
    outputRef: 'oca-output:output-bravo',
    summary: sensitiveMarker,
  });

  assert.equal(normalized.ok, false);
  assert.equal(redacted, 'Safe fallback summary.');
  assert.equal(card.ok, false);
  assert.equal(JSON.stringify(card).includes(sensitiveMarker), false);
  assert.equal(isSafeOcaPresentationJson({ safe: sensitiveMarker }), false);
});
