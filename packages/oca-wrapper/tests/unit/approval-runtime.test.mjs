import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOcaApprovalRuntimeToolIntegration,
  handleOcaApprovalRuntimeToolRequest,
  isSafeOcaApprovalRuntimeJson,
} from '../../dist/approval-runtime.js';
import { getOcaOperationPolicy } from '../../dist/operation-handlers.js';

const safeSessionRef = 'oca-session:session-01';
const otherSafeSessionRef = 'oca-session:session-02';
const safeTaskRef = 'oca-task:task-01';
const safeOutputRef = 'oca-output:output-01';
const safeDiffRef = 'oca-diff:diff-01';
const safeReviewRef = 'oca-review:review-01';
const safeIdempotencyRef = 'idempotency:request-01';
const safeRequestRef = 'request:tool-request-01';

const forbiddenOutputTerms = Object.freeze([
  chars([114, 97, 119, 108, 111, 103]),
  chars([114, 97, 119, 100, 105, 102, 102]),
  chars([114, 97, 119, 111, 117, 116, 112, 117, 116]),
  chars([114, 97, 119, 112, 97, 116, 104]),
  chars([102, 105, 108, 101, 112, 97, 116, 104]),
  chars([114, 101, 112, 111, 112, 97, 116, 104]),
  chars([119, 111, 114, 107, 115, 112, 97, 99, 101, 112, 97, 116, 104]),
  chars([112, 114, 111, 118, 105, 100, 101, 114, 112, 97, 121, 108, 111, 97, 100]),
  chars([114, 117, 110, 116, 105, 109, 101, 112, 97, 121, 108, 111, 97, 100]),
  chars([99, 97, 108, 108, 98, 97, 99, 107, 100, 97, 116, 97]),
  chars([99, 104, 97, 116, 105, 100]),
  chars([116, 104, 114, 101, 97, 100, 105, 100]),
  chars([99, 108, 105, 101, 110, 116, 104, 97, 110, 100, 108, 101]),
  chars([115, 100, 107, 99, 108, 105, 101, 110, 116]),
  chars([112, 114, 111, 99, 101, 115, 115, 105, 100]),
  chars([116, 111, 107, 101, 110]),
  chars([115, 101, 99, 114, 101, 116]),
  chars([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
  chars([115, 116, 97, 99, 107]),
  chars([101, 110, 100, 112, 111, 105, 110, 116]),
  chars([99, 111, 109, 109, 97, 110, 100, 111, 117, 116, 112, 117, 116]),
  chars([103, 105, 116, 64]),
  chars([104, 116, 116, 112, 115, 58, 47, 47]),
]);

function chars(codes) {
  return String.fromCharCode(...codes);
}

function assertJsonSafe(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assert.equal(isSafeOcaApprovalRuntimeJson(value), true);
  assertNoUnsafeTerms(value);
}

function assertNoUnsafeTerms(value) {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const term of forbiddenOutputTerms) {
    assert.equal(serialized.includes(term), false, `serialized output must not include ${term}`);
  }
}

function makeSpyRuntime() {
  let calls = 0;

  const fakeClient = Object.freeze({
    runOperation(request) {
      calls += 1;
      const refs = Object.freeze({
        ...(request.sessionRef === undefined ? {} : { sessionRef: request.sessionRef }),
        ...(request.taskRef === undefined ? {} : { taskRef: request.taskRef }),
        ...(request.outputRef === undefined ? {} : { outputRef: request.outputRef }),
        ...(request.diffRef === undefined ? {} : { diffRef: request.diffRef }),
        ...(request.reviewRef === undefined ? {} : { reviewRef: request.reviewRef }),
      });

      return Object.freeze({
        ok: true,
        operationRef: request.operationRef,
        executionPosture: 'fake',
        fakeExecution: 'called',
        state: 'succeeded',
        effect: request.effect,
        refs,
        summary: 'Fake operation completed with safe bounded output.',
        resultRefs: Object.freeze([request.sessionRef ?? request.outputRef ?? request.diffRef ?? request.reviewRef ?? 'oca-output:synthetic-01']),
      });
    },
  });

  return {
    get calls() {
      return calls;
    },
    integration: createOcaApprovalRuntimeToolIntegration({ fakeClient }),
  };
}

function makeDecision(blocked, operationRef, effect, extra = {}) {
  assert.equal(blocked.status, 'approval-required');
  assert.ok(blocked.requirement);

  return Object.freeze({
    kind: 'explicit-approval',
    approved: true,
    requirementRef: blocked.requirement.requirementRef,
    operationRef,
    effect,
    ...extra,
  });
}

test('read-only status operation executes without approval', () => {
  const spy = makeSpyRuntime();
  const result = spy.integration.handle({
    operationRef: 'hazeteam.oca.get-status',
    sessionRef: safeSessionRef,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'executed');
  assert.equal(result.effect, 'read-only');
  assert.equal(result.approval.required, false);
  assert.equal(result.approval.state, 'not-required');
  assert.equal(result.fakeExecution, 'called');
  assert.equal(spy.calls, 1);
  assertJsonSafe(result);
});

test('approval-required operation returns blocked result before fake execution', () => {
  const spy = makeSpyRuntime();
  const result = spy.integration.handle({
    operationRef: 'hazeteam.oca.start-session',
    taskRef: safeTaskRef,
    idempotencyRef: safeIdempotencyRef,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'approval-required');
  assert.equal(result.effect, 'external-effect');
  assert.equal(result.approval.required, true);
  assert.equal(result.approval.state, 'pending');
  assert.equal(result.fakeExecution, 'not-called');
  assert.equal(result.idempotency.idempotencyRef, safeIdempotencyRef);
  assert.ok(result.requirement);
  assert.equal(result.requirement.idempotency.idempotencyRef, safeIdempotencyRef);
  assert.equal(spy.calls, 0);
  assertJsonSafe(result);
});

test('approval-required operation does not call fake execution path before approval', () => {
  const spy = makeSpyRuntime();
  const first = spy.integration.handle({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    requestRef: safeRequestRef,
  });
  const second = spy.integration.handle({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    requestRef: safeRequestRef,
  });

  assert.equal(first.status, 'approval-required');
  assert.equal(second.status, 'approval-required');
  assert.equal(first.fakeExecution, 'not-called');
  assert.equal(second.fakeExecution, 'not-called');
  assert.equal(spy.calls, 0);
  assertJsonSafe(first);
  assertJsonSafe(second);
});

test('approved operation delegates after explicit safe approval decision', () => {
  const spy = makeSpyRuntime();
  const request = Object.freeze({
    operationRef: 'hazeteam.oca.start-session',
    taskRef: safeTaskRef,
    idempotencyRef: safeIdempotencyRef,
  });
  const blocked = spy.integration.handle(request);
  const result = spy.integration.handle({
    ...request,
    approvalDecision: makeDecision(blocked, 'hazeteam.oca.start-session', 'external-effect', {
      idempotencyRef: safeIdempotencyRef,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'executed');
  assert.equal(result.approval.required, true);
  assert.equal(result.approval.state, 'approved');
  assert.equal(result.fakeExecution, 'called');
  assert.equal(result.operationResult.status, 'executed');
  assert.equal(spy.calls, 1);
  assertJsonSafe(result);
});

test('arbitrary truthy approval marker is rejected before fake execution', () => {
  const spy = makeSpyRuntime();
  const result = spy.integration.handle({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    approved: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid-approval');
  assert.equal(result.fakeExecution, 'not-called');
  assert.equal(spy.calls, 0);
  assertJsonSafe(result);
});

test('review submit operation is repository mutation and approval-required', () => {
  const policy = getOcaOperationPolicy('hazeteam.oca.review-submit');
  assert.equal(policy.approval, 'approval-required-repository-mutation');
  assert.equal(policy.effect, 'repository-mutation');

  const spy = makeSpyRuntime();
  const blocked = spy.integration.handle({
    operationRef: 'hazeteam.oca.review-submit',
    sessionRef: safeSessionRef,
    reviewRef: safeReviewRef,
    requestRef: safeRequestRef,
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 'approval-required');
  assert.equal(blocked.effect, 'repository-mutation');
  assert.equal(blocked.fakeExecution, 'not-called');
  assert.equal(spy.calls, 0);
  assertJsonSafe(blocked);
});

test('invalid operation input returns safe error without echoing unsafe marker', () => {
  const marker = 'synthetic-invalid-marker';
  const result = handleOcaApprovalRuntimeToolRequest({
    operationRef: marker,
    sessionRef: marker,
    inputSummary: marker,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid-operation');
  assert.equal(result.fakeExecution, 'not-called');
  assert.equal(JSON.stringify(result).includes(marker), false);
  assertJsonSafe(result);
});

test('invalid approval decision returns safe error without echoing unsafe marker', () => {
  const marker = 'invalid-approval-marker';
  const spy = makeSpyRuntime();
  const result = spy.integration.handle({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    approvalDecision: marker,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid-approval');
  assert.equal(result.fakeExecution, 'not-called');
  assert.equal(JSON.stringify(result).includes(marker), false);
  assert.equal(spy.calls, 0);
  assertJsonSafe(result);
});

test('approval requirement descriptor is deterministic for same safe request refs', () => {
  const first = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    idempotencyRef: safeIdempotencyRef,
    requestRef: safeRequestRef,
  });
  const second = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    idempotencyRef: safeIdempotencyRef,
    requestRef: safeRequestRef,
  });
  const other = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: otherSafeSessionRef,
    idempotencyRef: safeIdempotencyRef,
    requestRef: safeRequestRef,
  });

  assert.equal(first.status, 'approval-required');
  assert.equal(second.status, 'approval-required');
  assert.equal(other.status, 'approval-required');
  assert.deepEqual(first.requirement, second.requirement);
  assert.equal(first.requirement.requirementRef, second.requirement.requirementRef);
  assert.notEqual(first.requirement.requirementRef, other.requirement.requirementRef);
  assertJsonSafe(first);
  assertJsonSafe(second);
  assertJsonSafe(other);
});

test('public result JSON is no-leak safe for representative envelopes', () => {
  const readOnly = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.get-output',
    sessionRef: safeSessionRef,
    outputRef: safeOutputRef,
  });
  const summary = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.diff-get',
    sessionRef: safeSessionRef,
    diffRef: safeDiffRef,
  });
  const blocked = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.review-submit',
    sessionRef: safeSessionRef,
    reviewRef: safeReviewRef,
  });
  const invalid = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: 'unsafe-marker-alpha',
  });

  for (const envelope of [readOnly, summary, blocked, invalid]) {
    assertJsonSafe(envelope);
  }
});

test('unsafe public terms do not appear in public output', () => {
  const blocked = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
  });
  const decision = makeDecision(blocked, 'hazeteam.oca.cancel', 'external-effect');
  const approved = handleOcaApprovalRuntimeToolRequest({
    operationRef: 'hazeteam.oca.cancel',
    sessionRef: safeSessionRef,
    approvalDecision: decision,
  });

  assertJsonSafe(blocked);
  assertJsonSafe(approved);
  assertNoUnsafeTerms([blocked, approved]);
});
