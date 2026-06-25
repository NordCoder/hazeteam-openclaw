import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRealSmokeGateInputFromEnvironment,
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from '../../packages/openclaw-telegram-transport/dist/real-smoke-gate.js';

test('W14F secret-gated real transport smoke is skipped or safely blocked by gate state', () => {
  const input = createRealSmokeGateInputFromEnvironment(process.env);
  const report = evaluateRealSmokeGate(input);
  const output = JSON.stringify(report);

  assert.equal(report.willCallRemote, false);
  assert.equal(report.remoteAttempt, 'not-attempted');
  assert.equal(report.effects, 'none');
  assert.notEqual(report.status, 'passed', 'W14F cannot pass real transport smoke until a real port is injected by a later scoped slice');
  assert.ok(
    ['skipped', 'blocked-by-profile', 'blocked-by-secret', 'blocked-by-missing-port', 'failed-safe'].includes(report.status),
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
    cleanupPolicy: report.cleanupPolicy,
    noLeakResult: report.noLeakResult,
    remoteAttempt: report.remoteAttempt,
    willCallRemote: report.willCallRemote,
  }));
});
