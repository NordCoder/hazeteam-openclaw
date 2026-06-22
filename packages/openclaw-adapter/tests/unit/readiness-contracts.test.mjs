import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAdapterReadinessCheck,
  summarizeAdapterReadiness,
} from '../../dist/contracts/index.js';

test('createAdapterReadinessCheck creates pass warn fail and unknown checks safely', () => {
  const checks = [
    createAdapterReadinessCheck({ component: 'core', status: 'pass', message: 'core ports present' }),
    createAdapterReadinessCheck({ component: 'delivery', status: 'warn', message: 'delivery degraded' }),
    createAdapterReadinessCheck({ component: 'runtime', status: 'fail', message: 'runtime missing' }),
    createAdapterReadinessCheck({ component: 'permission', status: 'unknown', message: 'policy not checked' }),
  ];

  assert.deepEqual(
    checks.map((check) => check.status),
    ['pass', 'warn', 'fail', 'unknown'],
  );
  assert.equal(Object.isFrozen(checks[0]), true);

  for (const check of checks) {
    assert.deepEqual(
      Object.keys(check).sort(),
      ['component', 'message', 'status'],
      'check exposes only safe default fields',
    );
  }
});

test('summarizeAdapterReadiness returns ready when every check passes', () => {
  const readiness = summarizeAdapterReadiness({
    checks: [
      createAdapterReadinessCheck({ component: 'core', status: 'pass', message: 'core ready' }),
      createAdapterReadinessCheck({ component: 'adapter', status: 'pass', message: 'adapter ready' }),
    ],
  });

  assert.equal(readiness.status, 'ready');
  assert.equal(readiness.checks.length, 2);
  assert.equal(Object.isFrozen(readiness), true);
});

test('summarizeAdapterReadiness returns degraded when any check warns without failures', () => {
  const readiness = summarizeAdapterReadiness({
    checks: [
      createAdapterReadinessCheck({ component: 'core', status: 'pass', message: 'core ready' }),
      createAdapterReadinessCheck({ component: 'delivery', status: 'warn', message: 'delivery limited' }),
    ],
  });

  assert.equal(readiness.status, 'degraded');
});

test('summarizeAdapterReadiness returns not-ready when any check fails', () => {
  const readiness = summarizeAdapterReadiness({
    checks: [
      createAdapterReadinessCheck({ component: 'core', status: 'pass', message: 'core ready' }),
      createAdapterReadinessCheck({ component: 'runtime', status: 'fail', message: 'runtime unavailable' }),
      createAdapterReadinessCheck({ component: 'delivery', status: 'warn', message: 'delivery limited' }),
    ],
  });

  assert.equal(readiness.status, 'not-ready');
});

test('summarizeAdapterReadiness handles empty and unknown checks safely', () => {
  assert.equal(summarizeAdapterReadiness({ checks: [] }).status, 'unknown');

  const readiness = summarizeAdapterReadiness({
    checks: [
      createAdapterReadinessCheck({ component: 'permission', status: 'unknown', message: 'not evaluated' }),
    ],
  });

  assert.equal(readiness.status, 'unknown');
});

test('readiness checks redact assignment-like values and do not expose raw error fields', () => {
  const check = createAdapterReadinessCheck({
    component: 'openclaw-channel',
    status: 'fail',
    message: 'provider failure opaque_value=123456\nwith details',
    detailsRef: 'details:readiness-1',
    correlationRef: 'correlation:flow-1',
  });

  assert.equal(check.message.includes('123456'), false);
  assert.equal(check.message.includes('\n'), false);
  assert.deepEqual(
    Object.keys(check).sort(),
    ['component', 'correlationRef', 'detailsRef', 'message', 'status'],
  );
  assert.equal('rawError' in check, false);
  assert.equal('stack' in check, false);
});
