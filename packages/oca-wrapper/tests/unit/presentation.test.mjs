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

const join = (...parts) => parts.join('');
const forbiddenOutputTerms = Object.freeze([
  join('raw', 'log'),
  join('raw', ' log'),
  join('raw', 'diff'),
  join('raw', ' diff'),
  join('raw', 'output'),
  join('raw', ' output'),
  join('file', ' path'),
  join('repo', ' path'),
  join('workspace', ' path'),
  join('provider', ' payload'),
  join('runtime', ' payload'),
  join('client', ' handle'),
  join('sdk', ' client'),
  join('process', ' id'),
  join('to', 'ken'),
  join('sec', 'ret'),
  join('cred', 'ential'),
  join('stack', ' trace'),
  join('end', 'point'),
  join('command', ' output'),
  'stdout',
  'stderr',
]);

const baseSessionInput = Object.freeze({
  sessionRef: 'oca-session:session-01',
  taskRef: 'oca-task:task-01',
  workspaceRef: 'workspace:main',
  agentRef: 'agent:coder',
  actorRef: 'actor:operator',
  profileRef: 'profile:default',
  repoRef: 'oca-repo:repo-01',
  worktreeRef: 'oca-worktree:worktree-01',
  branchRef: 'oca-branch:branch-01',
  outputRefs: Object.freeze(['oca-output:output-01']),
  logRefs: Object.freeze(['oca-log:log-01']),
  diffRefs: Object.freeze(['oca-diff:diff-01']),
  artifactRefs: Object.freeze(['oca-artifact:artifact-01']),
  reviewRefs: Object.freeze(['oca-review:review-01']),
  lifecycleState: 'active',
  derivedStatus: 'healthy',
  correlationRef: 'correlation:run-01',
  idempotencyRef: 'idempotency:request-01',
  createdAt: '2026-06-25T12:00:00Z',
  updatedAt: '2026-06-25T12:01:00Z',
  summary: 'Safe bounded public summary.',
  issues: Object.freeze([Object.freeze({ code: 'awaiting-review', summary: 'Review is queued.', ref: 'correlation:issue-01' })]),
});

const safeActionInput = Object.freeze({
  actionRef: 'oca-action:approve-review-01',
  actionKind: 'approve-request',
  title: 'Approve review request',
  summary: 'Operator approval is required.',
  label: 'Approve',
  style: 'primary',
});

function assertOk(result) {
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}

function assertRejected(result) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(isSafeOcaPresentationJson(result), true);
  assertNoUnsafeTerms(result);
  return result;
}

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();
  for (const term of forbiddenOutputTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include marker length ${term.length}`);
  }
}

function makeSessionInput(index) {
  const suffix = String(index).padStart(2, '0');
  return Object.freeze({
    ...baseSessionInput,
    sessionRef: `oca-session:session-${suffix}`,
    taskRef: `oca-task:task-${suffix}`,
    outputRefs: Object.freeze([`oca-output:output-${suffix}`]),
    diffRefs: Object.freeze([`oca-diff:diff-${suffix}`]),
    artifactRefs: Object.freeze([`oca-artifact:artifact-${suffix}`]),
    reviewRefs: Object.freeze([`oca-review:review-${suffix}`]),
    correlationRef: `correlation:run-${suffix}`,
    idempotencyRef: `idempotency:request-${suffix}`,
  });
}

test('session status card is built from a safe normalized session model', () => {
  const session = assertOk(normalizeOcaSessionModel(baseSessionInput));
  const card = assertOk(buildOcaSessionStatusCard(session));
  assert.equal(card.kind, 'oca.session-status-card');
  assert.equal(card.sessionRef, 'oca-session:session-01');
  assert.equal(card.taskRef, 'oca-task:task-01');
  assert.deepEqual(card.outputRefs, ['oca-output:output-01']);
  assert.deepEqual(card.diffRefs, ['oca-diff:diff-01']);
  assert.deepEqual(card.artifactRefs, ['oca-artifact:artifact-01']);
  assert.deepEqual(card.reviewRefs, ['oca-review:review-01']);
  assert.equal('logRefs' in card, false);
  assert.equal(isSafeOcaPresentationJson(card), true);
  assertNoUnsafeTerms(card);
});

test('active sessions panel bounds the visible list', () => {
  const sessions = Array.from({ length: 10 }, (_, index) => assertOk(normalizeOcaSessionModel(makeSessionInput(index + 1))));
  const panel = assertOk(buildOcaActiveSessionsPanel(sessions));
  assert.equal(panel.totalCount, 10);
  assert.equal(panel.visibleCount, 8);
  assert.equal(panel.truncated, true);
  assert.equal(panel.sessions[7].sessionRef, 'oca-session:session-08');
  assertNoUnsafeTerms(panel);
});

test('output and diff summary cards expose only safe refs and bounded summaries', () => {
  const outputCard = assertOk(buildOcaOutputSummaryCard({
    outputRef: 'oca-output:output-01',
    sessionRef: 'oca-session:session-01',
    summary: 'Implementation finished with safe public notes.',
    artifactRefs: Object.freeze(['oca-artifact:artifact-01']),
    actions: Object.freeze([Object.freeze({ actionRef: 'oca-action:open-output-01', actionKind: 'open-summary', label: 'Open summary' })]),
  }));
  const diffCard = assertOk(buildOcaDiffSummaryCard({
    diffRef: 'oca-diff:diff-01',
    sessionRef: 'oca-session:session-01',
    summary: 'Reviewable changes are summarized safely.',
    artifactRefs: Object.freeze(['oca-artifact:artifact-01']),
    reviewRefs: Object.freeze(['oca-review:review-01']),
  }));

  assert.equal(outputCard.outputRef, 'oca-output:output-01');
  assert.equal(diffCard.diffRef, 'oca-diff:diff-01');
  assert.equal(join('raw', 'Output') in outputCard, false);
  assert.equal(join('raw', 'Diff') in diffCard, false);
  assert.equal(join('file', 'Path') in diffCard, false);
  assertNoUnsafeTerms(outputCard);
  assertNoUnsafeTerms(diffCard);
});

test('review request card uses reviewRef and safe approval action descriptors only', () => {
  const card = assertOk(buildOcaReviewRequestCard({
    reviewRef: 'oca-review:review-01',
    sessionRef: 'oca-session:session-01',
    diffRefs: Object.freeze(['oca-diff:diff-01']),
    artifactRefs: Object.freeze(['oca-artifact:artifact-01']),
    summary: 'Review is requested for summarized changes.',
    actions: Object.freeze([safeActionInput]),
  }));

  assert.equal(card.reviewRef, 'oca-review:review-01');
  assert.equal(card.actions[0].actionRef, 'oca-action:approve-review-01');
  assert.equal(card.actions[0].button.actionRef, 'oca-action:approve-review-01');
  assert.equal('callbackData' in card.actions[0].button, false);
  assert.equal(join('provider', 'Payload') in card.actions[0].button, false);
  assertNoUnsafeTerms(card);
});

test('approval action card and buttons use opaque action refs without real approval payloads', () => {
  const actionCard = assertOk(buildOcaApprovalActionCard(safeActionInput));
  const button = assertOk(buildOcaActionButton({ actionRef: 'oca-action:cancel-session-01', actionKind: 'cancel-session', label: 'Cancel' }));
  const unsafeExternalApprovalRef = 'core-approval-' + join('to', 'ken') + ':real-marker';
  const unsafeActionRef = 'oca-action:approve-' + join('to', 'ken') + '-01';

  assert.equal(validateOcaPresentationActionRef('oca-action:approve-review-01').ok, true);
  assert.equal(validateOcaPresentationActionRef(unsafeExternalApprovalRef).ok, false);
  assert.equal(validateOcaPresentationActionRef(unsafeActionRef).ok, false);
  assert.equal(actionCard.button.kind, 'oca.action-button');
  assert.equal(button.style, 'danger');
  assertNoUnsafeTerms(actionCard);
  assertNoUnsafeTerms(button);
});

test('unsafe public text is rejected or redacted without echoing input', () => {
  const unsafeTexts = Object.freeze([
    join('raw', ' output includes details'),
    join('raw', ' diff includes patch'),
    join('filesystem', ' path was present'),
    join('provider', ' payload was present'),
    join('runtime', ' payload was present'),
    join('client', ' handle was present'),
    join('process', ' id 123'),
    join('sec', 'ret value'),
    join('stack', ' trace follows'),
    join('https', '://example.invalid/status'),
    join('command', ' output follows'),
    join('..', '/workspace/source'),
  ]);

  for (const unsafeText of unsafeTexts) {
    assert.equal(normalizeOcaPresentationText(unsafeText).ok, false);
    const result = buildOcaOutputSummaryCard({ outputRef: 'oca-output:output-01', summary: unsafeText });
    assertRejected(result);
    assert.equal(JSON.stringify(result).includes(unsafeText), false);
    assert.equal(redactOcaPresentationText(unsafeText), 'Unsafe public text omitted.');
  }
});

test('all descriptors serialize as no-leak JSON envelopes', () => {
  const session = assertOk(normalizeOcaSessionModel(baseSessionInput));
  const descriptors = Object.freeze([
    assertOk(buildOcaSessionStatusCard(session)),
    assertOk(buildOcaActiveSessionsPanel(Object.freeze([session]))),
    assertOk(buildOcaOutputSummaryCard({ outputRef: 'oca-output:output-01', summary: 'Public output summary is ready.' })),
    assertOk(buildOcaDiffSummaryCard({ diffRef: 'oca-diff:diff-01', summary: 'Public change summary is ready.' })),
    assertOk(buildOcaReviewRequestCard({ reviewRef: 'oca-review:review-01', summary: 'Review request is ready.', actions: Object.freeze([safeActionInput]) })),
    assertOk(buildOcaApprovalActionCard(safeActionInput)),
    assertOk(buildOcaActionButton({ actionRef: 'oca-action:continue-session-01', actionKind: 'continue-session', label: 'Continue' })),
  ]);

  for (const descriptor of descriptors) {
    const serialized = JSON.stringify(descriptor);
    assert.deepEqual(JSON.parse(serialized), descriptor);
    assert.equal(isSafeOcaPresentationJson(descriptor), true);
    assertNoUnsafeTerms(descriptor);
  }
});
