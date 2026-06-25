import assert from 'node:assert/strict';
import test from 'node:test';

import { OCA_WRAPPER_OPERATION_REFS } from '../../dist/capability-descriptor.js';
import { createFakeOcaClient } from '../../dist/fake-client.js';
import {
  getOcaOperationPolicy,
  handleOcaOperation,
  isSafeOcaOperationHandlerJson,
  listOcaOperationPolicies,
} from '../../dist/operation-handlers.js';
import { validateOcaSessionRef } from '../../dist/session-model.js';

const safeSessionRef = 'oca-session:session-01';
const safeTaskRef = 'oca-task:task-01';
const safeOutputRef = 'oca-output:output-01';
const safeDiffRef = 'oca-diff:diff-01';
const safeReviewRef = 'oca-review:review-01';

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
  chars([116, 111, 107, 101, 110]),
  chars([115, 101, 99, 114, 101, 116]),
  chars([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
  'stack',
  'endpoint',
  'commandoutput',
  '/home/',
  '/users/',
  'c:\\',
  'git@',
  'https://',
]);

function chars(codes) {
  return String.fromCharCode(...codes);
}

function assertJsonSafe(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assert.equal(isSafeOcaOperationHandlerJson(value), true);
  assertNoUnsafeTerms(value);
}

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenOutputTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

function makeSpyClient() {
  const fake = createFakeOcaClient();
  let calls = 0;

  return {
    get calls() {
      return calls;
    },
    fakeClient: Object.freeze({
      runOperation(request) {
        calls += 1;
        return fake.runOperation(request);
      },
    }),
  };
}

test('fake client returns deterministic success and failure envelopes', () => {
  const fakeClient = createFakeOcaClient();

  const success = fakeClient.runOperation({
    operationRef: 'hazeteam.oca.get-status',
    effect: 'read-only',
    sessionRef: safeSessionRef,
  });
  const successAgain = fakeClient.runOperation({
    operationRef: 'hazeteam.oca.get-status',
    effect: 'read-only',
    sessionRef: safeSessionRef,
  });

  assert.equal(success.ok, true);
  assert.equal(success.executionPosture, 'fake');
  assert.equal(success.fakeExecution, 'called');
  assert.deepEqual(success, successAgain);
  assert.equal(success.refs.sessionRef, safeSessionRef);
  assertJsonSafe(success);

  const failure = fakeClient.runOperation({
    operationRef: 'hazeteam.oca.get-status',
    effect: 'read-only',
    sessionRef: safeSessionRef,
    fakeFailure: true,
  });

  assert.equal(failure.ok, false);
  assert.equal(failure.state, 'failed');
  assert.equal(failure.issues[0].code, 'fake-failure');
  assertJsonSafe(failure);
});

test('read-only operations execute through fake path without approval', () => {
  const spy = makeSpyClient();
  const result = handleOcaOperation(
    {
      operationRef: 'hazeteam.oca.get-status',
      sessionRef: safeSessionRef,
    },
    { fakeClient: spy.fakeClient },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'executed');
  assert.equal(result.effect, 'read-only');
  assert.equal(result.approval.required, false);
  assert.equal(result.approval.state, 'not-required');
  assert.equal(result.fakeExecution, 'called');
  assert.equal(spy.calls, 1);
  assertJsonSafe(result);
});

test('approval-required operations block before fake execution without approval marker', () => {
  const spy = makeSpyClient();
  const result = handleOcaOperation(
    {
      operationRef: 'hazeteam.oca.start-session',
      taskRef: safeTaskRef,
    },
    { fakeClient: spy.fakeClient },
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 'approval-blocked');
  assert.equal(result.effect, 'external-effect');
  assert.equal(result.approval.required, true);
  assert.equal(result.approval.state, 'pending');
  assert.equal(result.fakeExecution, 'not-called');
  assert.equal(spy.calls, 0);
  assertJsonSafe(result);
});

test('approved fake external-effect path executes only with explicit safe marker', () => {
  const spy = makeSpyClient();
  const result = handleOcaOperation(
    {
      operationRef: 'hazeteam.oca.start-session',
      taskRef: safeTaskRef,
      approved: true,
    },
    { fakeClient: spy.fakeClient },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'executed');
  assert.equal(result.effect, 'external-effect');
  assert.equal(result.approval.required, true);
  assert.equal(result.approval.state, 'approved-marker');
  assert.equal(result.fakeExecution, 'called');
  assert.equal(spy.calls, 1);
  assertJsonSafe(result);
});

test('review-submit is repository mutation classified and approval gated', () => {
  const policy = getOcaOperationPolicy('hazeteam.oca.review-submit');
  assert.equal(policy.approval, 'approval-required-repository-mutation');
  assert.equal(policy.effect, 'repository-mutation');
  assert.equal(policy.mutating, true);

  const blocked = handleOcaOperation({
    operationRef: 'hazeteam.oca.review-submit',
    sessionRef: safeSessionRef,
    reviewRef: safeReviewRef,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 'approval-blocked');
  assert.equal(blocked.effect, 'repository-mutation');
  assert.equal(blocked.fakeExecution, 'not-called');
  assertJsonSafe(blocked);

  const executed = handleOcaOperation({
    operationRef: 'hazeteam.oca.review-submit',
    sessionRef: safeSessionRef,
    reviewRef: safeReviewRef,
    approved: true,
  });
  assert.equal(executed.ok, true);
  assert.equal(executed.effect, 'repository-mutation');
  assert.equal(executed.idempotency.classification, 'approval-gated-once');
  assert.equal(executed.idempotency.required, 'required-for-replay-guard');
  assertJsonSafe(executed);
});

test('idempotency classification is present for all mutating operations', () => {
  const policies = listOcaOperationPolicies();
  assert.deepEqual(
    policies.map((policy) => policy.operationRef),
    [...OCA_WRAPPER_OPERATION_REFS],
  );

  for (const policy of policies.filter((currentPolicy) => currentPolicy.mutating)) {
    assert.notEqual(policy.idempotency, 'read-repeatable', `${policy.operationRef} must not be read-repeatable`);
    assert.notEqual(policy.idempotencyRequired, 'not-required', `${policy.operationRef} must require an idempotency posture`);
    assert.equal(policy.effect === 'external-effect' || policy.effect === 'repository-mutation', true);
  }
});

test('invalid input is rejected without echoing neutral invalid markers', () => {
  const unsafeValue = 'synthetic-invalid-marker';
  const invalidOperation = handleOcaOperation({
    operationRef: unsafeValue,
    sessionRef: unsafeValue,
    inputSummary: unsafeValue,
  });

  assert.equal(invalidOperation.ok, false);
  assert.equal(invalidOperation.status, 'invalid-input');
  assert.equal(invalidOperation.fakeExecution, 'not-called');
  assert.equal(JSON.stringify(invalidOperation).includes(unsafeValue), false);
  assertJsonSafe(invalidOperation);

  const invalidRef = handleOcaOperation({
    operationRef: 'hazeteam.oca.get-output',
    sessionRef: unsafeValue,
    outputRef: safeOutputRef,
  });

  assert.equal(invalidRef.ok, false);
  assert.equal(invalidRef.status, 'invalid-input');
  assert.equal(JSON.stringify(invalidRef).includes(unsafeValue), false);
  assertJsonSafe(invalidRef);
});

test('JSON serialization and no-leak checks cover representative result envelopes', () => {
  const envelopes = [
    handleOcaOperation({ operationRef: 'hazeteam.oca.list' }),
    handleOcaOperation({ operationRef: 'hazeteam.oca.get-output', sessionRef: safeSessionRef, outputRef: safeOutputRef }),
    handleOcaOperation({ operationRef: 'hazeteam.oca.diff-get', sessionRef: safeSessionRef, diffRef: safeDiffRef }),
    handleOcaOperation({ operationRef: 'hazeteam.oca.cancel', sessionRef: safeSessionRef }),
    handleOcaOperation({ operationRef: 'hazeteam.oca.cancel', sessionRef: safeSessionRef, approved: true, fakeFailure: true }),
  ];

  for (const envelope of envelopes) {
    assertJsonSafe(envelope);
  }
});

test('W15B safe refs remain accepted as operation inputs', () => {
  const valid = validateOcaSessionRef(safeSessionRef);
  assert.equal(valid.ok, true);

  const result = handleOcaOperation({
    operationRef: 'hazeteam.oca.branch-summarize',
    sessionRef: valid.value,
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.refs.sessionRef, safeSessionRef);
  assertJsonSafe(result);
});
