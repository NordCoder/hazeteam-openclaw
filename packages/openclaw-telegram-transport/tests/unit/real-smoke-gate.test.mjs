import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRealSmokeGateInputFromEnvironment,
  evaluateRealSmokeGate,
  isSafeRealSmokeGateReportJson,
} from '../../dist/real-smoke-gate.js';

function encoded(value) {
  return JSON.stringify(value);
}

function assertNoLeak(value, protectedTerms) {
  const output = encoded(value);
  assert.equal(typeof output, 'string');
  assert.equal(isSafeRealSmokeGateReportJson(value), true);

  for (const term of protectedTerms) {
    assert.equal(output.includes(term), false, `real smoke output leaked ${term}`);
  }
}

const PROTECTED_TERMS = [
  '123456:ABC-private-token',
  'Bearer private-token',
  'providerClientObject',
  'process.env',
  'TELEGRAM_PRIVATE_VALUE',
  'OPENCLAW_PRIVATE_VALUE',
];

const READY_CONFIG = Object.freeze({
  profile: 'real-smoke',
  providers: {
    telegram: {
      mode: 'real',
      credentialRef: 'secret:telegram:smoke-bot',
      transportRef: 'tg-channel:smoke-topic',
      sourceClass: 'env',
    },
    openclaw: {
      mode: 'real',
      credentialRef: 'secret:openclaw:smoke-api',
      transportRef: 'openclaw-profile:smoke',
      sourceClass: 'env',
    },
  },
});

test('default gate is skipped and side-effect free', () => {
  const report = evaluateRealSmokeGate();

  assert.equal(report.status, 'skipped');
  assert.equal(report.blockedReason, 'not-enabled');
  assert.equal(report.willCallRemote, false);
  assert.equal(report.remoteAttempt, 'not-attempted');
  assert.equal(report.providerAckResult, 'not-attempted');
  assert.equal(report.businessResult, 'not-attempted');
  assert.equal(report.noLeakResult, 'passed');
  assert.equal(report.effects, 'none');
  assertNoLeak(report, PROTECTED_TERMS);
});

test('explicit enablement still blocks without the real smoke profile and network gate', () => {
  const wrongProfile = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'test',
    config: { profile: 'test' },
  });

  assert.equal(wrongProfile.status, 'blocked-by-profile');
  assert.equal(wrongProfile.blockedReason, 'profile-not-real-smoke');
  assert.equal(wrongProfile.willCallRemote, false);

  const missingNetworkGate = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    config: READY_CONFIG,
  });

  assert.equal(missingNetworkGate.status, 'blocked-by-profile');
  assert.equal(missingNetworkGate.blockedReason, 'network-gate-not-enabled');
  assert.equal(missingNetworkGate.willCallRemote, false);
  assertNoLeak(missingNetworkGate, PROTECTED_TERMS);
});

test('unsafe operation classes are blocked before any remote attempt', () => {
  const report = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    operationClass: 'destructive',
    config: READY_CONFIG,
  });

  assert.equal(report.status, 'blocked-by-profile');
  assert.equal(report.blockedReason, 'unsafe-operation-class');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('missing test transport refs block before secret checks', () => {
  const report = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    config: {
      profile: 'real-smoke',
      providers: {
        telegram: {
          mode: 'real',
          credentialRef: 'secret:telegram:smoke-bot',
        },
        openclaw: {
          mode: 'real',
          credentialRef: 'secret:openclaw:smoke-api',
        },
      },
    },
  });

  assert.equal(report.status, 'blocked-by-profile');
  assert.equal(report.blockedReason, 'missing-safe-test-ref');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('missing real smoke credentials block safely', () => {
  const report = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    config: {
      profile: 'real-smoke',
      providers: {
        telegram: {
          mode: 'real',
          transportRef: 'tg-channel:smoke-topic',
        },
        openclaw: {
          mode: 'real',
          credentialRef: 'secret:openclaw:smoke-api',
          transportRef: 'openclaw-profile:smoke',
        },
      },
    },
  });

  assert.equal(report.status, 'blocked-by-secret');
  assert.equal(report.blockedReason, 'missing-or-invalid-secret-ref');
  assert.equal(report.willCallRemote, false);
  assert.deepEqual(
    report.configuredDependencies.map((dependency) => dependency.credentialStatus),
    ['missing', 'configured-redacted'],
  );
  assertNoLeak(report, PROTECTED_TERMS);
});

test('configured gate reports missing port while sibling transport ports are absent', () => {
  const report = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    operationClass: 'ephemeral-write',
    cleanupPolicy: 'manual',
    correlationRef: 'corr:w14f-smoke-0001',
    config: READY_CONFIG,
  });

  assert.equal(report.status, 'blocked-by-missing-port');
  assert.equal(report.blockedReason, 'transport-port-not-implemented');
  assert.equal(report.transportPortStatus, 'missing');
  assert.equal(report.providerAckResult, 'not-attempted');
  assert.equal(report.businessResult, 'not-attempted');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('gate can become ready only when an injected transport port is marked available', () => {
  const report = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    transportPortStatus: 'available',
    config: READY_CONFIG,
  });

  assert.equal(report.status, 'ready-to-run');
  assert.equal(report.blockedReason, 'none');
  assert.equal(report.transportPortStatus, 'available');
  assert.equal(report.providerAckResult, 'not-attempted');
  assert.equal(report.businessResult, 'not-attempted');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});

test('provider acknowledgement and business success are distinct result classes', () => {
  const failedBusiness = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    transportPortStatus: 'available',
    config: READY_CONFIG,
    attempt: {
      providerAckResult: 'provider-acknowledged',
      businessResult: 'business-failed-safe',
    },
  });

  assert.equal(failedBusiness.status, 'failed-safe');
  assert.equal(failedBusiness.blockedReason, 'business-attempt-failed-safe');
  assert.equal(failedBusiness.providerAckResult, 'provider-acknowledged');
  assert.equal(failedBusiness.businessResult, 'business-failed-safe');

  const passed = evaluateRealSmokeGate({
    enabled: '1',
    profile: 'real-smoke',
    allowNetwork: '1',
    operatorAcknowledged: '1',
    transportPortStatus: 'available',
    config: READY_CONFIG,
    attempt: {
      providerAckResult: 'provider-acknowledged',
      businessResult: 'business-succeeded',
    },
  });

  assert.equal(passed.status, 'passed');
  assert.equal(passed.providerAckResult, 'provider-acknowledged');
  assert.equal(passed.businessResult, 'business-succeeded');
  assertNoLeak(failedBusiness, PROTECTED_TERMS);
  assertNoLeak(passed, PROTECTED_TERMS);
});

test('environment edge converts process input to a redacted gate input', () => {
  const envInput = createRealSmokeGateInputFromEnvironment({
    HAZETEAM_OPENCLAW_REAL_SMOKE: '1',
    HAZETEAM_OPENCLAW_SMOKE_PROFILE: 'real-smoke',
    HAZETEAM_OPENCLAW_SMOKE_ALLOW_NETWORK: '1',
    HAZETEAM_OPENCLAW_SMOKE_OPERATOR_ACK: '1',
    HAZETEAM_OPENCLAW_SMOKE_TELEGRAM_CREDENTIAL_REF: '123456:ABC-private-token',
    HAZETEAM_OPENCLAW_SMOKE_TELEGRAM_TRANSPORT_REF: 'tg-channel:smoke-topic',
    HAZETEAM_OPENCLAW_SMOKE_OPENCLAW_CREDENTIAL_REF: 'secret:openclaw:smoke-api',
    HAZETEAM_OPENCLAW_SMOKE_OPENCLAW_TRANSPORT_REF: 'openclaw-profile:smoke',
    HAZETEAM_OPENCLAW_SMOKE_CORRELATION_REF: 'corr:w14f-env-smoke',
  });
  const report = evaluateRealSmokeGate(envInput);

  assert.equal(report.status, 'blocked-by-secret');
  assert.equal(report.configuredDependencies[0].credentialRef, 'secret:telegram:telegram-bot-token:redacted');
  assert.equal(report.willCallRemote, false);
  assertNoLeak(report, PROTECTED_TERMS);
});
