import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  createOpenClawRuntimePortBridge,
  dispatchOpenClawRuntimePort,
  summarizeOpenClawRuntimePortReadiness,
} from '../../../../dist/openclaw/runtime/index.js';

function marker(...codes) {
  return String.fromCharCode(...codes);
}

const blockedOutputTerms = [
  marker(114, 97, 119, 67, 111, 114, 101, 82, 101, 115, 117, 108, 116),
  marker(99, 111, 114, 101, 82, 101, 115, 117, 108, 116),
  marker(114, 97, 119, 82, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 84, 111, 111, 108, 80, 97, 121, 108, 111, 97, 100),
  marker(114, 97, 119, 79, 112, 101, 110, 67, 108, 97, 119, 82, 101, 115, 112, 111, 110, 115, 101),
  marker(112, 114, 111, 118, 105, 100, 101, 114, 79, 98, 106, 101, 99, 116),
  marker(115, 100, 107, 67, 108, 105, 101, 110, 116),
  marker(111, 112, 101, 110, 67, 108, 97, 119, 67, 108, 105, 101, 110, 116),
  marker(115, 116, 97, 99, 107),
  marker(98, 111, 116, 84, 111, 107, 101, 110),
  marker(97, 112, 105, 75, 101, 121),
  marker(115, 101, 99, 114, 101, 116),
  marker(112, 97, 115, 115, 119, 111, 114, 100),
  marker(99, 114, 101, 100, 101, 110, 116, 105, 97, 108),
  marker(102, 105, 108, 101, 115, 121, 115, 116, 101, 109, 80, 97, 116, 104),
  marker(115, 116, 111, 114, 97, 103, 101, 80, 97, 116, 104),
];

function normalizeForLeakScan(value) {
  return String(value).replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function assertSafeOutput(value) {
  const serialized = JSON.stringify(value);
  assert.equal(typeof serialized, 'string');
  const normalizedSerialized = normalizeForLeakScan(serialized);

  for (const blocked of blockedOutputTerms) {
    assert.equal(
      normalizedSerialized.includes(normalizeForLeakScan(blocked)),
      false,
      `output includes blocked marker ${blocked}`,
    );
  }

  assert.equal(serialized.includes('abc123'), false);
  assert.equal(serialized.includes('/tmp/openclaw'), false);
  assert.equal(serialized.includes('provider-object'), false);
  assert.equal(serialized.includes('Error: boom'), false);

  const queue = [value];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === null || typeof current !== 'object') {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(current)) {
      for (const blocked of blockedOutputTerms) {
        assert.notEqual(normalizeForLeakScan(key), normalizeForLeakScan(blocked), `output field leaks ${key}`);
      }
      if (nestedValue !== null && typeof nestedValue === 'object') {
        queue.push(nestedValue);
      }
    }
  }
}

const safeRequest = Object.freeze({
  dispatchRef: 'operation:openclaw-runtime-dispatch-1',
  intent: Object.freeze({
    kind: 'run-command',
    text: 'Show OpenClaw runtime status',
    resourceRef: 'runtime-resource:status-1',
  }),
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
  actorRef: 'actor:operator',
  correlationRef: 'correlation:openclaw-runtime-correlation-1',
  detailsRef: 'details:openclaw-runtime-details-1',
});

const safeContext = Object.freeze({
  operationRef: 'operation:openclaw-runtime-context-1',
  correlationRef: 'correlation:openclaw-runtime-context-correlation-1',
  workspaceRef: 'workspace:workspace-alpha',
  agentRef: 'agent:coder',
  actorRef: 'actor:operator',
  detailsRef: 'details:openclaw-runtime-context-details-1',
  rawDebugRef: 'raw-debug:openclaw-runtime-debug-1',
});

function createConfiguredPort() {
  const dispatches = [];

  return Object.freeze({
    dispatch(request) {
      dispatches.push(request);
      return {
        ok: true,
        dispatchRef: request.dispatchRef,
        output: {
          outputRef: 'runtime-output:openclaw-port-1',
          message: 'OpenClaw runtime dispatch completed',
        },
        correlationRef: request.correlationRef,
        detailsRef: request.detailsRef,
      };
    },
    getReadiness() {
      return {
        status: 'ready',
        message: 'OpenClaw runtime port ready',
        detailsRef: 'details:openclaw-runtime-readiness-details-1',
        correlationRef: 'correlation:openclaw-runtime-readiness-correlation-1',
      };
    },
    getDispatches() {
      return [...dispatches];
    },
  });
}

test('missing OpenClaw runtime port reports not-ready and safe dependency-missing dispatch failure', () => {
  const bridge = createOpenClawRuntimePortBridge();

  const readiness = bridge.getReadiness();
  const dispatchResult = bridge.dispatch(safeRequest, safeContext);

  assert.equal(readiness.status, 'not-ready');
  assert.equal(readiness.checks[0].component, 'openclaw-runtime');
  assert.equal(readiness.checks[0].status, 'fail');
  assert.equal(readiness.checks[0].message, 'OpenClaw runtime port is not configured.');
  assert.equal(dispatchResult.ok, false);
  assert.equal(dispatchResult.error.code, 'dependency-missing');
  assert.equal(dispatchResult.error.message, 'Runtime boundary is not configured.');
  assertSafeOutput(readiness);
  assertSafeOutput(dispatchResult);
});

test('OpenClaw runtime port readiness requires both dispatch and getReadiness methods', () => {
  const noDispatchReadiness = summarizeOpenClawRuntimePortReadiness({
    runtimePort: {
      getReadiness() {
        return { status: 'ready', message: 'Should not be used' };
      },
    },
  });
  const noReadinessReadiness = summarizeOpenClawRuntimePortReadiness({
    runtimePort: {
      dispatch() {
        return { ok: false, message: 'not used' };
      },
    },
  });

  assert.equal(noDispatchReadiness.status, 'not-ready');
  assert.equal(noDispatchReadiness.checks[0].message, 'OpenClaw runtime port dispatch method is not configured.');
  assert.equal(noReadinessReadiness.status, 'not-ready');
  assert.equal(noReadinessReadiness.checks[0].message, 'OpenClaw runtime port readiness method is not configured.');
  assertSafeOutput(noDispatchReadiness);
  assertSafeOutput(noReadinessReadiness);
});

test('configured OpenClaw runtime port reports ready through adapter-safe readiness DTOs', () => {
  const port = createConfiguredPort();
  const readiness = summarizeOpenClawRuntimePortReadiness({ runtimePort: port });

  assert.equal(readiness.status, 'ready');
  assert.equal(readiness.detailsRef, 'details:openclaw-runtime-readiness-details-1');
  assert.equal(readiness.correlationRef, 'correlation:openclaw-runtime-readiness-correlation-1');
  assert.equal(readiness.checks[0].component, 'openclaw-runtime');
  assert.equal(readiness.checks[0].status, 'pass');
  assert.equal(readiness.checks[0].message, 'OpenClaw runtime port ready');
  assertSafeOutput(readiness);
});

test('safe OpenClaw runtime dispatch calls injected port and maps success to existing runtime result DTO', () => {
  const port = createConfiguredPort();
  const result = dispatchOpenClawRuntimePort({ runtimePort: port, request: safeRequest, context: safeContext });

  assert.equal(result.ok, true);
  assert.deepEqual(port.getDispatches(), [safeRequest]);
  assert.deepEqual(result.value, {
    dispatchRef: 'operation:openclaw-runtime-dispatch-1',
    output: {
      outputRef: 'runtime-output:openclaw-port-1',
      message: 'OpenClaw runtime dispatch completed',
    },
    correlationRef: 'correlation:openclaw-runtime-correlation-1',
    detailsRef: 'details:openclaw-runtime-details-1',
  });
  assert.deepEqual(result.context, safeContext);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.output), true);
  assertSafeOutput(result);
});

test('failed OpenClaw runtime dispatch result maps to safe adapter error', () => {
  const port = Object.freeze({
    dispatch() {
      return {
        ok: false,
        code: 'runtime-rejected',
        message: `${marker(112, 97, 115, 115, 119, 111, 114, 100)}=abc123 rejected at /tmp/openclaw/runtime`,
        retryable: true,
        correlationRef: 'correlation:openclaw-runtime-correlation-1',
      };
    },
    getReadiness() {
      return { status: 'ready', message: 'ready' };
    },
  });

  const result = dispatchOpenClawRuntimePort({ runtimePort: port, request: safeRequest });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.equal(result.error.message, '[redacted] rejected at [redacted]');
  assert.equal(result.error.retryable, true);
  assert.equal(result.error.correlationRef, 'correlation:openclaw-runtime-correlation-1');
  assertSafeOutput(result);
});

test('thrown OpenClaw runtime dispatch error maps to safe adapter error without raw error leakage', () => {
  const port = Object.freeze({
    dispatch() {
      throw new Error(`Error: boom at /tmp/openclaw ${marker(97, 112, 105, 75, 101, 121)}=abc123`);
    },
    getReadiness() {
      return { status: 'ready', message: 'ready' };
    },
  });

  const result = dispatchOpenClawRuntimePort({ runtimePort: port, request: safeRequest });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.equal(result.error.message, 'Runtime boundary threw during dispatch.');
  assert.equal(result.error.correlationRef, 'correlation:openclaw-runtime-correlation-1');
  assert.equal(result.error.detailsRef, 'details:openclaw-runtime-details-1');
  assertSafeOutput(result);
});

test('raw OpenClaw runtime payloads and raw core results are rejected instead of exposed', () => {
  const rawCoreResult = marker(114, 97, 119, 67, 111, 114, 101, 82, 101, 115, 117, 108, 116);
  const rawRuntimePayload = marker(114, 97, 119, 82, 117, 110, 116, 105, 109, 101, 80, 97, 121, 108, 111, 97, 100);
  const port = Object.freeze({
    dispatch() {
      return {
        ok: true,
        dispatchRef: 'operation:openclaw-runtime-dispatch-1',
        output: {
          outputRef: 'runtime-output:openclaw-unsafe-1',
          message: 'Looks safe',
        },
        [rawCoreResult]: { id: 'provider-object' },
        nested: {
          [rawRuntimePayload]: { token: 'abc123' },
        },
      };
    },
    getReadiness() {
      return { status: 'ready', message: 'ready' };
    },
  });

  const result = dispatchOpenClawRuntimePort({ runtimePort: port, request: safeRequest });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'dependency-failed');
  assert.equal(result.error.message, 'Runtime boundary threw during dispatch.');
  assertSafeOutput(result);
});

test('unsafe OpenClaw runtime readiness result fails safely without leaking raw fields', () => {
  const rawCoreResult = marker(114, 97, 119, 67, 111, 114, 101, 82, 101, 115, 117, 108, 116);
  const port = Object.freeze({
    dispatch() {
      return { ok: false, message: 'not used' };
    },
    getReadiness() {
      return {
        status: 'ready',
        message: 'Ready should not leak',
        [rawCoreResult]: { stack: 'provider-object at /tmp/openclaw' },
      };
    },
  });

  const readiness = summarizeOpenClawRuntimePortReadiness({ runtimePort: port });

  assert.equal(readiness.status, 'not-ready');
  assert.equal(readiness.checks[0].status, 'fail');
  assert.equal(readiness.checks[0].message, 'OpenClaw runtime port readiness failed safely.');
  assertSafeOutput(readiness);
});

test('OpenClaw runtime bridge output is deterministic and performs no source-level infra calls', () => {
  const port = createConfiguredPort();
  const bridge = createOpenClawRuntimePortBridge({ runtimePort: port });

  const firstReadiness = bridge.getReadiness();
  const secondReadiness = bridge.getReadiness();

  assert.deepEqual(firstReadiness, secondReadiness);
  assert.equal('generatedAt' in firstReadiness, false);

  const source = readFileSync(
    new URL('../../../../src/openclaw/runtime/openclaw-runtime-bridge.ts', import.meta.url),
    'utf8',
  );
  assert.equal(source.includes('hazeteam-core'), false);
  assert.equal(source.includes('/src/'), false);
  assert.equal(source.includes('Date.now'), false);
  assert.equal(source.includes('Math.random'), false);
  assert.equal(source.includes('setTimeout'), false);
  assert.equal(source.includes('setInterval'), false);
  assert.equal(source.includes('fetch('), false);
  assert.equal(source.includes('readFile'), false);
  assert.equal(source.includes('writeFile'), false);
  assert.equal(source.includes('openSync'), false);
  assert.equal(source.includes('createConnection'), false);
  assert.equal(source.includes('connect('), false);
  assert.equal(source.includes('node:fs'), false);
  assert.equal(source.includes('node:net'), false);
  assert.equal(source.includes('node:http'), false);
});
