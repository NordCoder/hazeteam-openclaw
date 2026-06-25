import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OCA_SAFE_REF_PREFIXES,
  OCA_SESSION_DERIVED_STATUSES,
  OCA_SESSION_LIFECYCLE_STATES,
  canTransitionOcaSessionLifecycle,
  cloneOcaSessionModel,
  deriveOcaSessionStatus,
  isSafeOcaSessionModelJson,
  normalizeOcaSessionModel,
  validateOcaArtifactRef,
  validateOcaBranchRef,
  validateOcaDiffRef,
  validateOcaLogRef,
  validateOcaOutputRef,
  validateOcaRepoRef,
  validateOcaReviewRef,
  validateOcaSessionLifecycleTransition,
  validateOcaSessionRef,
  validateOcaTaskRef,
  validateOcaWorktreeRef,
} from '../../dist/session-model.js';

const validSessionInput = Object.freeze({
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
  issues: Object.freeze([
    Object.freeze({
      code: 'awaiting-review',
      summary: 'Review is queued.',
      ref: 'correlation:issue-01',
    }),
  ]),
});

const refCases = Object.freeze([
  ['session', OCA_SAFE_REF_PREFIXES.session, validateOcaSessionRef, 'oca-session:session-01'],
  ['task', OCA_SAFE_REF_PREFIXES.task, validateOcaTaskRef, 'oca-task:task-01'],
  ['repo', OCA_SAFE_REF_PREFIXES.repo, validateOcaRepoRef, 'oca-repo:repo-01'],
  ['worktree', OCA_SAFE_REF_PREFIXES.worktree, validateOcaWorktreeRef, 'oca-worktree:worktree-01'],
  ['branch', OCA_SAFE_REF_PREFIXES.branch, validateOcaBranchRef, 'oca-branch:branch-01'],
  ['output', OCA_SAFE_REF_PREFIXES.output, validateOcaOutputRef, 'oca-output:output-01'],
  ['log', OCA_SAFE_REF_PREFIXES.log, validateOcaLogRef, 'oca-log:log-01'],
  ['diff', OCA_SAFE_REF_PREFIXES.diff, validateOcaDiffRef, 'oca-diff:diff-01'],
  ['artifact', OCA_SAFE_REF_PREFIXES.artifact, validateOcaArtifactRef, 'oca-artifact:artifact-01'],
  ['review', OCA_SAFE_REF_PREFIXES.review, validateOcaReviewRef, 'oca-review:review-01'],
]);

const forbiddenOutputTerms = Object.freeze([
  'rawlog',
  'rawdiff',
  'rawoutput',
  'rawpath',
  'filepath',
  'repopath',
  'workspacepath',
  'providerpayload',
  'runtimepayload',
  'clienthandle',
  'sdkclient',
  'processid',
  'token',
  'secret',
  'credential',
  'stack',
  'endpoint',
  'commandoutput',
]);

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenOutputTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

test('valid refs for all OCA ref kinds use bounded safe prefixes', () => {
  for (const [kind, prefix, validator, value] of refCases) {
    assert.equal(value.startsWith(prefix), true, `${kind} value should use the expected prefix`);
    const result = validator(value);
    assert.equal(result.ok, true, `${kind} ref should be valid`);
    assert.equal(result.value, value);
  }
});

test('invalid refs are rejected without echoing unsafe input values', () => {
  const unsafeRefs = Object.freeze([
    '',
    'oca-session:bad value',
    'oca-session:bad/value',
    'oca-session:bad..value',
    'https://invalid.example/value',
    'git@invalid:repo',
    'oca-session:12345',
    'oca-session:{bad}',
    'oca-session:contains-token',
    'oca-session:stack-trace',
    'oca-session:' + 'a'.repeat(100),
  ]);

  for (const unsafeRef of unsafeRefs) {
    const result = validateOcaSessionRef(unsafeRef);
    assert.equal(result.ok, false, `${unsafeRef || 'empty'} should be invalid`);
    assert.equal(result.issues.length > 0, true);

    const serialized = JSON.stringify(result);
    if (unsafeRef.length > 0) {
      assert.equal(serialized.includes(unsafeRef), false, 'validation result must not echo unsafe input');
    }
    assert.equal(isSafeOcaSessionModelJson(result), true);
  }
});

test('valid session descriptor normalizes to JSON-safe bounded public DTO', () => {
  const result = normalizeOcaSessionModel(validSessionInput);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.outputRefs, ['oca-output:output-01']);
  assert.deepEqual(result.value.logRefs, ['oca-log:log-01']);
  assert.deepEqual(result.value.diffRefs, ['oca-diff:diff-01']);
  assert.deepEqual(result.value.artifactRefs, ['oca-artifact:artifact-01']);
  assert.deepEqual(result.value.reviewRefs, ['oca-review:review-01']);
  assert.equal(result.value.derivedStatus, 'healthy');
  assert.equal(result.value.summary, 'Safe bounded public summary.');
  assert.equal(isSafeOcaSessionModelJson(result.value), true);
  assertNoUnsafeTerms(result.value);
});

test('session model outputs are JSON-serializable and clone without shared mutable arrays', () => {
  const result = normalizeOcaSessionModel(validSessionInput);
  assert.equal(result.ok, true);

  const clone = cloneOcaSessionModel(result.value);
  assert.deepEqual(JSON.parse(JSON.stringify(clone)), JSON.parse(JSON.stringify(result.value)));
  assert.notEqual(clone.outputRefs, result.value.outputRefs);
  assert.notEqual(clone.issues, result.value.issues);
  assert.equal(isSafeOcaSessionModelJson(clone), true);
});

test('no-leak helper rejects unsafe public field names and unsafe string markers', () => {
  const result = normalizeOcaSessionModel(validSessionInput);
  assert.equal(result.ok, true);
  assert.equal(isSafeOcaSessionModelJson(result.value), true);

  for (const unsafeValue of [
    { rawLog: 'blocked' },
    { rawDiff: 'blocked' },
    { rawOutput: 'blocked' },
    { rawPath: 'blocked' },
    { filePath: 'blocked' },
    { repoPath: 'blocked' },
    { workspacePath: 'blocked' },
    { providerPayload: 'blocked' },
    { runtimePayload: 'blocked' },
    { clientHandle: 'blocked' },
    { sdkClient: 'blocked' },
    { processId: 'blocked' },
    { token: 'blocked' },
    { secret: 'blocked' },
    { credential: 'blocked' },
    { stack: 'blocked' },
    { endpoint: 'blocked' },
    { commandOutput: 'blocked' },
    { summary: 'unsafe raw output marker' },
  ]) {
    assert.equal(isSafeOcaSessionModelJson(unsafeValue), false);
  }
});

test('lifecycle states and derived statuses are exact', () => {
  assert.deepEqual(OCA_SESSION_LIFECYCLE_STATES, [
    'planned',
    'requested',
    'approval-required',
    'starting',
    'active',
    'waiting-for-input',
    'waiting-for-approval',
    'producing-output',
    'completed',
    'failed',
    'cancelled',
    'expired',
    'archived',
  ]);
  assert.deepEqual(OCA_SESSION_DERIVED_STATUSES, ['healthy', 'degraded', 'blocked', 'stale', 'terminal']);
});

test('derived status mapping is conservative and flag-aware', () => {
  assert.equal(deriveOcaSessionStatus('approval-required'), 'blocked');
  assert.equal(deriveOcaSessionStatus('waiting-for-approval'), 'blocked');
  assert.equal(deriveOcaSessionStatus('waiting-for-input'), 'blocked');
  assert.equal(deriveOcaSessionStatus('active'), 'healthy');
  assert.equal(deriveOcaSessionStatus('producing-output'), 'healthy');
  assert.equal(deriveOcaSessionStatus('active', { degraded: true }), 'degraded');
  assert.equal(deriveOcaSessionStatus('producing-output', { stale: true }), 'stale');
  assert.equal(deriveOcaSessionStatus('completed', { stale: true, degraded: true, blocked: true }), 'terminal');
});

test('allowed lifecycle transition examples validate', () => {
  for (const [from, to] of [
    ['planned', 'requested'],
    ['requested', 'starting'],
    ['approval-required', 'waiting-for-approval'],
    ['starting', 'active'],
    ['active', 'producing-output'],
    ['producing-output', 'completed'],
    ['completed', 'archived'],
  ]) {
    assert.equal(canTransitionOcaSessionLifecycle(from, to), true, `${from} should transition to ${to}`);
    assert.equal(validateOcaSessionLifecycleTransition(from, to).ok, true);
  }
});

test('terminal states do not transition back to active work states', () => {
  for (const terminalState of ['completed', 'failed', 'cancelled', 'expired', 'archived']) {
    assert.equal(canTransitionOcaSessionLifecycle(terminalState, 'active'), false, `${terminalState} must not become active`);
    assert.equal(validateOcaSessionLifecycleTransition(terminalState, 'active').ok, false);
  }
});

test('archived transition is constrained to terminal states only', () => {
  for (const terminalState of ['completed', 'failed', 'cancelled', 'expired']) {
    assert.equal(canTransitionOcaSessionLifecycle(terminalState, 'archived'), true, `${terminalState} may archive`);
  }

  for (const nonTerminalState of ['planned', 'requested', 'approval-required', 'starting', 'active', 'waiting-for-input', 'waiting-for-approval', 'producing-output']) {
    assert.equal(canTransitionOcaSessionLifecycle(nonTerminalState, 'archived'), false, `${nonTerminalState} must not archive directly`);
  }

  assert.equal(canTransitionOcaSessionLifecycle('archived', 'archived'), false);
});

test('bounded summary is accepted and unsafe summaries are rejected', () => {
  const accepted = normalizeOcaSessionModel({
    ...validSessionInput,
    summary: 'A'.repeat(240),
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value.summary.length, 240);

  for (const summary of ['', 'A'.repeat(241), 'unsafe raw output marker', 'unsafe/value']) {
    const rejected = normalizeOcaSessionModel({
      ...validSessionInput,
      summary,
    });
    assert.equal(rejected.ok, false);
    assert.equal(isSafeOcaSessionModelJson(rejected), true);
  }
});

test('invalid descriptor output stays safe and derived status mismatch is rejected', () => {
  const result = normalizeOcaSessionModel({
    ...validSessionInput,
    lifecycleState: 'approval-required',
    derivedStatus: 'healthy',
    repoRef: 'oca-repo:bad/value',
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.code === 'status-mismatch'), true);
  assert.equal(result.issues.some((issue) => issue.field === 'repoRef'), true);
  assert.equal(JSON.stringify(result).includes('oca-repo:bad/value'), false);
  assert.equal(isSafeOcaSessionModelJson(result), true);
  assertNoUnsafeTerms(result);
});
