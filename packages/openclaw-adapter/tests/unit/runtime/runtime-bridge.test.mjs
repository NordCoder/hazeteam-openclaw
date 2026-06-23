import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOpenClawRuntimeBridge,
  dispatchOpenClawRuntime,
  summarizeOpenClawRuntimeBridgeReadiness,
} from '../../../dist/runtime/runtime-bridge.js';
import { createFakeOpenClawRuntime } from '../../../../openclaw-testkit/dist/fakes/fake-runtime.js';

function assertNoForbiddenPublicFields(sample) {
  const forbiddenFieldNames = [
    'rawRuntimePayload',
    'runtimePayload',
    'rawToolPayload',
    'toolPayload',
    'rawProviderObject',
    'rawProviderResponse',
    'providerObject',
    'provider',
    'sdkClient',
    'openClawClient',
    'deploymentHandle',
    'platformHandle',
    'storagePath',
    'storageRoot',
    'filesystemPath',
    'rawLog',
    'stack',
    ['bot', 'Token'].join(''),
    ['api', 'Key'].join(''),
    ['sec', 'ret'].join(''),
    ['cred', 'ential'].join(''),
    ['pass', 'word'].join(''),
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

function assertNoForbiddenText(sample) {
  const serialized = JSON.stringify(sample);

  assert.equal(serialized.includes('abc123'), false);
  assert.equal(serialized.includes('/tmp/openclaw'), false);
  assert.equal(serialized.includes('Error: boom'), false);
  assert.equal(serialized.includes('provider-object'), false);
}

const safeRequest = Object.freeze({
  dispatchRef: 'operation:runtime-dispatch-1',
  intent: Object.freeze({
    kind: 'run-command',
    text: 'Show current status',
    resourceRef: 'resource:status-1',
  }),
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
  actorRef: 'actor:operator',
  correlationRef: 'correlation:runtime-correlation-1',
});

test('runtime bridge dispatches a normalized request to an injected fake runtime', () => {
  const runtime = createFakeOpenClawRuntime();
  const bridge = createOpenClawRuntimeBridge({ runtime });

  const result = bridge.dispatch(safeRequest);

  assert.equal(result.ok, true);
  assert.deepEqual(runtime.getDispatches(), [safeRequest]);
  assert.deepEqual(result.value, {
    dispatchRef: 'operation:runtime-dispatch-1',
    output: {
      outputRef: 'runtime-output:fake-1',
      message: 'Fake runtime dispatch completed',
    },
    correlationRef: 'correlation:runtime-correlation-1',
  });
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.output), true);
  assertNoForbiddenPublicFields(result);
});

test('runtime bridge converts runtime failure results into safe adapter failures', () => {
  const runtime = createFakeOpenClawRuntime({
    outcome: 'failure',
    failureCode: 'timeout',
    failureMessage: `${['api', 'key'].join('_')}=abc123 timed out`,
    retryable: true,
  });

  const result = dispatchOpenClawRuntime({ runtime, request: safeRequest });

  assert.equal(result.ok, false);
  assert.deepEqual(result.error, {
    code: 'dependency-failed',
    message: '[redacted] timed out',
    retryable: true,
    correlationRef: 'correlation:runtime-correlation-1',
  });
  assert.equal(runtime.getDispatches().length, 1);
  assertNoForbiddenPublicFields(result);
  assertNoForbiddenText(result);
});

test('runtime bridge turns thrown runtime errors into safe failures without stack leakage', () => {
  const runtime = Object.freeze({
    dispatch() {
      throw new Error(`Error: boom at /tmp/openclaw ${['api', 'key'].join('_')}=abc123`);
    },
  });

  const result = dispatchOpenClawRuntime({ runtime, request: safeRequest });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.equal(result.error.message, 'Runtime boundary threw during dispatch.');
  assert.equal(result.error.correlationRef, 'correlation:runtime-correlation-1');
  assertNoForbiddenPublicFields(result);
  assertNoForbiddenText(result);
});

test('runtime bridge rejects unsafe runtime result payloads instead of exposing them', () => {
  const runtime = Object.freeze({
    dispatch() {
      return {
        ok: true,
        dispatchRef: 'operation:runtime-dispatch-1',
        output: {
          outputRef: 'runtime-output:unsafe-result-1',
          message: 'Looks fine',
        },
        rawToolPayload: {
          providerObject: 'provider-object',
        },
      };
    },
  });

  const result = dispatchOpenClawRuntime({ runtime, request: safeRequest });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.equal(result.error.message, 'Runtime boundary returned an unsafe or invalid result.');
  assertNoForbiddenPublicFields(result);
  assertNoForbiddenText(result);
});

test('runtime bridge returns safe not-configured results for missing runtime ports', () => {
  const bridge = createOpenClawRuntimeBridge();
  const dispatchResult = bridge.dispatch(safeRequest);
  const readiness = bridge.getReadiness();

  assert.equal(dispatchResult.ok, false);
  assert.deepEqual(dispatchResult.error, {
    code: 'dependency-missing',
    message: 'Runtime boundary is not configured.',
  });
  assert.equal(readiness.status, 'not-ready');
  assert.equal(readiness.checks[0].component, 'runtime');
  assert.equal(readiness.checks[0].status, 'fail');
  assertNoForbiddenPublicFields(dispatchResult);
  assertNoForbiddenPublicFields(readiness);
});

test('runtime bridge creation and readiness do not start dispatch loops', () => {
  let dispatchCount = 0;
  let readinessCount = 0;
  const runtime = Object.freeze({
    dispatch() {
      dispatchCount += 1;
      return {
        ok: true,
        dispatchRef: 'operation:runtime-dispatch-1',
        output: {
          outputRef: 'runtime-output:loop-check-1',
          message: 'Dispatched once',
        },
      };
    },
    getReadiness() {
      readinessCount += 1;
      return { status: 'ready', message: 'Runtime ready' };
    },
  });

  const bridge = createOpenClawRuntimeBridge({ runtime });

  assert.equal(dispatchCount, 0);
  assert.equal(readinessCount, 0);
  assert.equal(bridge.getReadiness().status, 'ready');
  assert.equal(dispatchCount, 0);
  assert.equal(readinessCount, 1);

  const result = bridge.dispatch(safeRequest);
  assert.equal(result.ok, true);
  assert.equal(dispatchCount, 1);
  assert.equal(readinessCount, 1);
});

test('runtime bridge normalizes readiness into safe bounded adapter DTOs', () => {
  const runtime = Object.freeze({
    dispatch() {
      throw new Error('not used');
    },
    getReadiness() {
      return {
        status: 'ready',
        message: `Ready with ${['bot', 'token'].join('_')}=abc123 at /tmp/openclaw/runtime`,
      };
    },
  });

  const readiness = summarizeOpenClawRuntimeBridgeReadiness({ runtime });

  assert.equal(readiness.status, 'ready');
  assert.equal(readiness.checks[0].status, 'pass');
  assert.equal(readiness.checks[0].message, 'Ready with [redacted] at [redacted]');
  assertNoForbiddenPublicFields(readiness);
  assertNoForbiddenText(readiness);
});

test('runtime bridge rejects unsafe requests before calling the runtime boundary', () => {
  let dispatchCount = 0;
  const runtime = Object.freeze({
    dispatch() {
      dispatchCount += 1;
      return {
        ok: true,
        dispatchRef: 'operation:runtime-dispatch-1',
        output: {
          outputRef: 'runtime-output:should-not-run',
          message: 'Should not run',
        },
      };
    },
  });

  const result = dispatchOpenClawRuntime({
    runtime,
    request: {
      ...safeRequest,
      intent: {
        ...safeRequest.intent,
        rawRuntimePayload: { unsafe: true },
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-input');
  assert.equal(dispatchCount, 0);
  assertNoForbiddenPublicFields(result);
});

test('runtime bridge rejects mismatched refs and unbounded runtime output', () => {
  const mismatchedRuntime = Object.freeze({
    dispatch() {
      return {
        ok: true,
        dispatchRef: 'operation:other-dispatch',
        output: {
          outputRef: 'runtime-output:mismatch',
          message: 'Mismatched',
        },
      };
    },
  });
  const unboundedRuntime = Object.freeze({
    dispatch() {
      return {
        ok: true,
        dispatchRef: 'operation:runtime-dispatch-1',
        output: {
          outputRef: 'runtime-output:unbounded',
          message: 'x'.repeat(2_000),
        },
      };
    },
  });

  const mismatchedResult = dispatchOpenClawRuntime({ runtime: mismatchedRuntime, request: safeRequest });
  const unboundedResult = dispatchOpenClawRuntime({ runtime: unboundedRuntime, request: safeRequest });

  assert.equal(mismatchedResult.ok, false);
  assert.equal(mismatchedResult.error.code, 'dependency-failed');
  assert.equal(unboundedResult.ok, false);
  assert.equal(unboundedResult.error.code, 'dependency-failed');
  assertNoForbiddenPublicFields(mismatchedResult);
  assertNoForbiddenPublicFields(unboundedResult);
});
