import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInMemoryOcaSessionStore,
  isSafeOcaSessionStoreJson,
} from '../../dist/session-store.js';
import { cloneOcaSessionModel, normalizeOcaSessionModel } from '../../dist/session-model.js';

function fromCodes(codes) {
  return String.fromCharCode(...codes);
}

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
  fromCodes([116, 111, 107, 101, 110]),
  fromCodes([115, 101, 99, 114, 101, 116]),
  fromCodes([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
  'stack',
  'endpoint',
  'commandoutput',
]);

function sessionInput(suffix, overrides = {}) {
  return Object.freeze({
    sessionRef: `oca-session:session-${suffix}`,
    taskRef: `oca-task:task-${suffix}`,
    workspaceRef: 'workspace:main',
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
    lifecycleState: 'planned',
    derivedStatus: 'healthy',
    correlationRef: `correlation:run-${suffix}`,
    idempotencyRef: `idempotency:request-${suffix}`,
    createdAt: '2026-06-25T12:00:00Z',
    updatedAt: '2026-06-25T12:00:00Z',
    summary: `Safe session ${suffix}.`,
    issues: Object.freeze([]),
    ...overrides,
  });
}

function assertSafeEnvelope(value) {
  assert.equal(isSafeOcaSessionStoreJson(value), true);
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenOutputTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

function createSession(store, suffix, overrides = {}) {
  return store.create({
    idempotencyRef: `idempotency:request-${suffix}`,
    session: sessionInput(suffix, overrides),
  });
}

test('idempotent create returns the same safe session for the same idempotency ref', () => {
  const store = createInMemoryOcaSessionStore();
  const first = createSession(store, 'alpha');
  const second = createSession(store, 'alpha');

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.status, 'created');
  assert.equal(second.status, 'idempotent-replay');
  assert.deepEqual(JSON.parse(JSON.stringify(second.session)), JSON.parse(JSON.stringify(first.session)));
  assert.notEqual(second.session, first.session);
  assertSafeEnvelope(second);
});

test('conflicting idempotent create is rejected safely', () => {
  const store = createInMemoryOcaSessionStore();
  const first = createSession(store, 'alpha');
  const second = store.create({
    idempotencyRef: 'idempotency:request-alpha',
    session: sessionInput('alpha', {
      summary: 'Different safe bounded summary.',
    }),
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.error.code, 'idempotency-conflict');
  assertSafeEnvelope(second);
});

test('resume and get return sessions by safe session ref', () => {
  const store = createInMemoryOcaSessionStore();
  const created = createSession(store, 'bravo');
  assert.equal(created.ok, true);

  const getResult = store.get('oca-session:session-bravo');
  const resumeResult = store.resume('oca-session:session-bravo');

  assert.equal(getResult.ok, true);
  assert.equal(getResult.status, 'found');
  assert.equal(resumeResult.ok, true);
  assert.equal(resumeResult.status, 'resumed');
  assert.deepEqual(JSON.parse(JSON.stringify(getResult.session)), JSON.parse(JSON.stringify(created.session)));
  assert.notEqual(getResult.session, created.session);
  assert.notEqual(resumeResult.session, getResult.session);
  assertSafeEnvelope(getResult);
  assertSafeEnvelope(resumeResult);
});

test('missing session returns safe not-found error without echoing unmatched input', () => {
  const store = createInMemoryOcaSessionStore();
  const unmatchedRef = 'oca-session:synthetic-invalid-marker';
  const result = store.get(unmatchedRef);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'not-found');
  assert.equal(JSON.stringify(result).includes(unmatchedRef), false);
  assertSafeEnvelope(result);
});

test('valid transition updates session lifecycle with W15B validation', () => {
  const store = createInMemoryOcaSessionStore();
  assert.equal(createSession(store, 'charlie').ok, true);

  const requested = store.transition({
    sessionRef: 'oca-session:session-charlie',
    lifecycleState: 'requested',
    updatedAt: '2026-06-25T12:01:00Z',
  });

  assert.equal(requested.ok, true);
  assert.equal(requested.session.lifecycleState, 'requested');
  assert.equal(requested.session.derivedStatus, 'healthy');
  assert.equal(requested.session.updatedAt, '2026-06-25T12:01:00Z');
  assertSafeEnvelope(requested);
});

test('invalid transition is rejected safely', () => {
  const store = createInMemoryOcaSessionStore();
  assert.equal(createSession(store, 'delta').ok, true);

  const result = store.transition({
    sessionRef: 'oca-session:session-delta',
    lifecycleState: 'completed',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-transition');
  assert.equal(result.error.issues.some((issue) => issue.code === 'invalid-transition'), true);
  assertSafeEnvelope(result);
});

test('terminal-to-active transition is rejected', () => {
  const store = createInMemoryOcaSessionStore();
  assert.equal(
    createSession(store, 'echo', {
      lifecycleState: 'completed',
      derivedStatus: 'terminal',
    }).ok,
    true,
  );

  const result = store.transition({
    sessionRef: 'oca-session:session-echo',
    lifecycleState: 'active',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-transition');
  assertSafeEnvelope(result);
});

test('archive is constrained to terminal states', () => {
  const store = createInMemoryOcaSessionStore();
  assert.equal(createSession(store, 'foxtrot').ok, true);
  assert.equal(
    createSession(store, 'golf', {
      lifecycleState: 'completed',
      derivedStatus: 'terminal',
    }).ok,
    true,
  );

  const activeArchive = store.transition({
    sessionRef: 'oca-session:session-foxtrot',
    lifecycleState: 'archived',
  });
  const terminalArchive = store.transition({
    sessionRef: 'oca-session:session-golf',
    lifecycleState: 'archived',
  });

  assert.equal(activeArchive.ok, false);
  assert.equal(activeArchive.error.code, 'invalid-transition');
  assert.equal(terminalArchive.ok, true);
  assert.equal(terminalArchive.session.lifecycleState, 'archived');
  assert.equal(terminalArchive.session.derivedStatus, 'terminal');
  assertSafeEnvelope(activeArchive);
  assertSafeEnvelope(terminalArchive);
});

test('list is bounded and returns cloned frozen records', () => {
  const store = createInMemoryOcaSessionStore({ maxListLimit: 2 });
  assert.equal(createSession(store, 'hotel').ok, true);
  assert.equal(createSession(store, 'india').ok, true);
  assert.equal(createSession(store, 'juliet').ok, true);

  const listed = store.list({ limit: 2 });
  const getResult = store.get('oca-session:session-hotel');

  assert.equal(listed.ok, true);
  assert.equal(listed.count, 2);
  assert.equal(listed.sessions.length, 2);
  assert.equal(getResult.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(listed.sessions[0])), JSON.parse(JSON.stringify(getResult.session)));
  assert.notEqual(listed.sessions[0], getResult.session);
  assert.throws(() => listed.sessions.push(cloneOcaSessionModel(getResult.session)), TypeError);
  assertSafeEnvelope(listed);
});

test('returned records are JSON-safe and no-leak safe', () => {
  const store = createInMemoryOcaSessionStore();
  const result = createSession(store, 'kilo');

  assert.equal(result.ok, true);
  assert.equal(normalizeOcaSessionModel(result.session).ok, true);
  assert.equal(JSON.parse(JSON.stringify(result.session)).sessionRef, 'oca-session:session-kilo');
  assertSafeEnvelope(result);
});

test('store does not expose mutable internal arrays', () => {
  const store = createInMemoryOcaSessionStore();
  const created = createSession(store, 'lima');
  assert.equal(created.ok, true);

  assert.throws(() => created.session.outputRefs.push('oca-output:output-extra'), TypeError);
  assert.throws(() => created.session.issues.push({ code: 'safe-issue', summary: 'Safe issue.' }), TypeError);

  const fetched = store.get('oca-session:session-lima');
  assert.equal(fetched.ok, true);
  assert.deepEqual(fetched.session.outputRefs, ['oca-output:output-lima']);
  assert.deepEqual(fetched.session.issues, []);
  assert.notEqual(fetched.session.outputRefs, created.session.outputRefs);
  assertSafeEnvelope(fetched);
});

test('unsafe public field names and neutral invalid values are rejected without public exposure', () => {
  const store = createInMemoryOcaSessionStore();
  const invalidMarker = 'synthetic-invalid-marker';
  const result = store.create({
    idempotencyRef: 'idempotency:request-mike',
    session: {
      ...sessionInput('mike'),
      summary: 'Synthetic invalid summary marker.',
      [fromCodes([114, 97, 119, 76, 111, 103])]: invalidMarker,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-session');
  assert.equal(JSON.stringify(result).includes(invalidMarker), false);
  assertSafeEnvelope(result);
});

test('missing or invalid idempotency ref is rejected safely', () => {
  const store = createInMemoryOcaSessionStore();

  for (const idempotencyRef of [undefined, '', 'idempotency:bad/value']) {
    const result = store.create({ idempotencyRef, session: sessionInput('november') });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'invalid-idempotency-ref');
    assertSafeEnvelope(result);
  }
});
