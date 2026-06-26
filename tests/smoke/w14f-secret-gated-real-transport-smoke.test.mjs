import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRealSmokeGateInputFromEnvironment,
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from '../../packages/openclaw-telegram-transport/dist/real-smoke-gate.js';

const SAFE_NON_PASS_STATUSES = Object.freeze([
  'skipped',
  'blocked-missing-profile',
  'blocked-network-gate-closed',
  'blocked-operator-ack-missing',
  'blocked-unsafe-operation-class',
  'blocked-missing-safe-test-ref',
  'blocked-missing-secret',
  'blocked-missing-port',
  'failed-safe',
]);

test('W14F secret-gated real transport smoke is skipped or safely blocked by gate state', () => {
  const input = createRealSmokeGateInputFromEnvironment(process.env);
  const report = evaluateRealSmokeGate(input);
  const output = JSON.stringify(report);

  assert.equal(report.willCallRemote, false);
  assert.equal(report.remoteAttempt, 'not-attempted');
  assert.equal(report.effects, 'none');
  assert.notEqual(report.status, 'passed', 'W14F cannot pass real transport smoke until a real port is injected by a later scoped slice');
  assert.ok(
    SAFE_NON_PASS_STATUSES.includes(report.status),
    `unexpected W14F smoke gate status: ${report.status}`,
  );
  assert.equal(isSafeRealSmokeGateReportJson(report), true);
  assert.equal(output.includes('process.env'), false);
  assert.equal(output.includes('providerClientObject'), false);

  console.log(JSON.stringify({
    descriptorKind: report.descriptorKind,
    descriptorVersion: report.descriptorVersion,
    status: report.status,
    providerKind: report.providerKind,
    operationClass: report.operationClass,
    correlationRef: report.correlationRef,
    configuredDependencyCount: report.configuredDependencyCount,
    blockedReason: report.blockedReason,
    providerAckResult: report.providerAckResult,
    businessResult: report.businessResult,
    providerPortStatus: report.providerPortStatus,
    attemptReport: report.attemptReport,
    redactedFailure: report.redactedFailure,
    cleanupPolicy: report.cleanupPolicy,
    noLeakResult: report.noLeakResult,
    remoteAttempt: report.remoteAttempt,
    willCallRemote: report.willCallRemote,
  }));
});
